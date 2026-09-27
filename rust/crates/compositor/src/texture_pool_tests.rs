//! Tests for the texture pool's retention policy.
//!
//! The pool's job is to keep peak GPU memory independent of how many items a
//! frame contains. Retained bytes are the thing that actually regressed
//! (`2 * items + 1` full-frame textures, ~845 MB at 1080p for 50 items), so
//! every assertion below is about the free list staying bounded rather than
//! growing with frame complexity.
//!
//! `wgpu::Texture` cannot be constructed without a live device, so the pool is
//! generic over the pooled type and these tests pool a `usize` handle instead.
//! The accounting under test — what gets retained, when, and how much — is
//! identical either way.

use super::texture_pool::{MAX_POOLED_PER_SIZE, TexturePool};

type Pool = TexturePool<usize>;

/// Creates a fresh target, mimicking `GpuContext::create_render_texture`.
fn create() -> usize {
    next_id()
}

fn next_id() -> usize {
    use std::sync::atomic::{AtomicUsize, Ordering};
    static NEXT: AtomicUsize = AtomicUsize::new(1);
    NEXT.fetch_add(1, Ordering::Relaxed)
}

#[test]
fn fresh_pool_retains_nothing() {
    let pool = Pool::default();
    assert_eq!(pool.free_count(), 0);
    assert_eq!(pool.in_use_count(), 0);
}

#[test]
fn explicitly_released_targets_free_immediately_without_waiting_for_the_frame() {
    let mut pool = Pool::default();

    // A layer pass: acquire the layer target, then the blend target.
    let layer = pool.acquire(1920, 1080, create);
    let blend = pool.acquire(1920, 1080, create);
    assert_eq!(pool.in_use_count(), 2);
    assert_eq!(pool.free_count(), 0);

    // Once the blend is recorded, the layer target and the superseded scene
    // are dead and go back straight away.
    pool.release(1920, 1080, layer);
    pool.release(1920, 1080, blend);

    assert_eq!(
        pool.free_count(),
        2,
        "release must return targets during the frame, not at the next boundary"
    );
}

#[test]
fn retention_stays_flat_as_item_count_grows() {
    let mut pool = Pool::default();

    // Follows the real composite loop: acquire the cleared scene, then per item
    // acquire the layer and the blend target, then release the layer and the
    // superseded scene.
    let mut scene = pool.acquire(1920, 1080, create);
    for _ in 0..2 {
        let layer = pool.acquire(1920, 1080, create);
        let blend = pool.acquire(1920, 1080, create);
        pool.release(1920, 1080, layer);
        pool.release(1920, 1080, std::mem::replace(&mut scene, blend));
    }

    // The pool hands back released targets to later acquires, so the free list
    // settles at the size of the live working set (the in-flight scene plus one
    // spares) rather than growing with the item count. Only three targets are
    // ever live at once, so a 2-item and a 200-item frame retain the same.
    assert_eq!(
        pool.free_count(),
        2,
        "retention tracks the constant working set, not the item count"
    );
    // `in_use` is a log of everything acquired this frame, not the live set:
    // it is drained wholesale at the frame boundary.
    assert_eq!(pool.in_use_count(), 5);
}

#[test]
fn free_list_saturates_at_the_cap_instead_of_tracking_frame_complexity() {
    let mut pool = Pool::default();

    // A pathological frame: 200 distinct intermediates (a deep effect chain
    // working set) all released at once. Without a cap this would retain 200
    // full-frame textures (~1.7 GB at 1080p) for the rest of the session.
    //
    // The targets are held live before releasing: an acquire that immediately
    // follows a release pops the same handle back out, so a tight
    // acquire-release loop can never grow the free list past one entry —
    // under the old double-stash accounting this test "passed" with eight
    // duplicate handles to the SAME texture, which is exactly the aliasing
    // hazard the credit accounting removes.
    let mut targets = Vec::new();
    for _ in 0..200 {
        targets.push(pool.acquire(1920, 1080, create));
    }
    assert_eq!(pool.free_count(), 0, "everything is live");
    for target in targets {
        pool.release(1920, 1080, target);
    }
    pool.recycle_frame();

    assert_eq!(
        pool.free_count(),
        MAX_POOLED_PER_SIZE,
        "free list must saturate at the cap"
    );
}

#[test]
fn the_cap_is_applied_per_size_not_globally() {
    let mut pool = Pool::default();

    // Distinct live targets per size, then released: the cap bounds each
    // size's free list independently. (Held live first — see
    // `free_list_saturates_at_the_cap` for why an immediate acquire-release
    // loop cannot exercise the cap.)
    let mut full_hd = Vec::new();
    for _ in 0..(MAX_POOLED_PER_SIZE * 3) {
        full_hd.push(pool.acquire(1920, 1080, create));
    }
    for target in full_hd {
        pool.release(1920, 1080, target);
    }
    let mut half_hd = Vec::new();
    for _ in 0..(MAX_POOLED_PER_SIZE * 3) {
        half_hd.push(pool.acquire(1280, 720, create));
    }
    for target in half_hd {
        pool.release(1280, 720, target);
    }
    pool.recycle_frame();

    assert_eq!(pool.free_count_at(1920, 1080), MAX_POOLED_PER_SIZE);
    assert_eq!(pool.free_count_at(1280, 720), MAX_POOLED_PER_SIZE);
}

#[test]
fn a_recycled_target_is_reused_by_the_next_frame_instead_of_reallocated() {
    let mut pool = Pool::default();

    let first = pool.acquire(1920, 1080, create);
    assert_eq!(pool.free_count(), 0, "nothing free while in use");

    pool.recycle_frame();
    assert_eq!(pool.free_count(), 1);
    assert_eq!(pool.in_use_count(), 0);

    let reused = pool.acquire(1920, 1080, create);
    assert_eq!(
        reused, first,
        "the recycled entry should be handed straight back"
    );
    assert_eq!(pool.free_count(), 0);
}

#[test]
fn targets_of_different_sizes_are_never_handed_across() {
    let mut pool = Pool::default();

    let full_hd = pool.acquire(1920, 1080, create);
    pool.recycle_frame();

    // A different size must not reuse the 1080p allocation.
    let half_hd = pool.acquire(1280, 720, create);
    assert_ne!(half_hd, full_hd, "size mismatch must not alias");
    assert_eq!(pool.free_count_at(1920, 1080), 1, "1080p stays available");
    assert_eq!(
        pool.free_count_at(1280, 720),
        0,
        "720p had to allocate its own"
    );
}

#[test]
fn repeated_frames_stay_at_the_steady_state_allocation_count() {
    let mut pool = Pool::default();
    let mut created = 0usize;
    let mut make = || {
        created += 1;
        created
    };

    for _ in 0..50 {
        pool.recycle_frame();
        let mut scene = pool.acquire(1920, 1080, &mut make);
        for _ in 0..10 {
            let layer = pool.acquire(1920, 1080, &mut make);
            let blend = pool.acquire(1920, 1080, &mut make);
            pool.release(1920, 1080, layer);
            pool.release(1920, 1080, std::mem::replace(&mut scene, blend));
        }
    }

    assert_eq!(
        created, 3,
        "after warm-up, a frame must allocate nothing new"
    );
}

#[test]
fn recycle_never_duplicates_a_released_handle_in_the_free_list() {
    let mut pool = Pool::default();

    // One composite-loop frame: the scene, the incoming layer, and the blend
    // target are acquired; the superseded scene and the layer are released
    // mid-frame; the blend escapes as the new scene.
    let mut scene = pool.acquire(1920, 1080, create);
    for _ in 0..2 {
        let layer = pool.acquire(1920, 1080, create);
        let blend = pool.acquire(1920, 1080, create);
        pool.release(1920, 1080, layer);
        pool.release(1920, 1080, std::mem::replace(&mut scene, blend));
    }

    // Frame boundary: the escaped scene is the only entry that should newly
    // enter the free list. The old accounting stashed the mid-frame-released
    // handles a second time here, duplicating them.
    pool.recycle_frame();

    // Every free entry must be a distinct handle. Duplicates let one frame
    // acquire the same texture for two live roles — the writable attachment
    // of one pass and the sampled input of another in the same usage scope —
    // which WebGPU rejects by invalidating the whole command buffer: the
    // frame presents empty, i.e. a black preview.
    let mut seen = Vec::new();
    while pool.free_count() > 0 {
        seen.push(pool.acquire(1920, 1080, create));
    }
    let mut unique = seen.clone();
    unique.sort_unstable();
    unique.dedup();
    assert_eq!(
        seen.len(),
        unique.len(),
        "free list contains duplicate handles"
    );
}

#[test]
fn steady_state_frames_hand_out_only_distinct_textures() {
    let mut pool = Pool::default();

    // Warm the pool the way the compositor does: several frames of the
    // acquire/release cycle, each ending with one escaped scene texture.
    for _ in 0..3 {
        pool.recycle_frame();
        let mut scene = pool.acquire(1920, 1080, create);
        for _ in 0..2 {
            let layer = pool.acquire(1920, 1080, create);
            let blend = pool.acquire(1920, 1080, create);
            pool.release(1920, 1080, layer);
            pool.release(1920, 1080, std::mem::replace(&mut scene, blend));
        }
    }

    // The next frame's three live targets must be three distinct textures:
    // with duplicated free-list entries a frame received the same handle as
    // both its layer target and its blend target.
    pool.recycle_frame();
    let scene = pool.acquire(1920, 1080, create);
    let layer = pool.acquire(1920, 1080, create);
    let blend = pool.acquire(1920, 1080, create);
    assert_ne!(scene, layer, "scene and layer must not alias");
    assert_ne!(layer, blend, "layer and blend target must not alias");
    assert_ne!(scene, blend, "scene and blend target must not alias");
}

#[test]
fn a_released_and_reacquired_handle_is_returned_exactly_once() {
    let mut pool = Pool::default();

    // Acquire, release mid-frame, then re-acquire the recycled handle in the
    // same frame: the release credit must track the count, not the identity,
    // so the boundary recycle stashes the surviving entry exactly once.
    let first = pool.acquire(1920, 1080, create);
    pool.release(1920, 1080, first);
    let reacquired = pool.acquire(1920, 1080, create);
    assert_eq!(
        first, reacquired,
        "the released handle is handed straight back"
    );

    pool.recycle_frame();
    assert_eq!(
        pool.free_count(),
        1,
        "one live entry left the frame, exactly one free entry may exist"
    );
    let popped = pool.acquire(1920, 1080, create);
    assert_eq!(popped, first);
    assert_eq!(pool.free_count(), 0);
}
