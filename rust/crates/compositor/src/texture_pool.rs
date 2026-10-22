use std::collections::HashMap;

use gpu::{GpuContext, wgpu};

type TextureKey = (u32, u32);

/// Upper bound on free textures retained per size.
///
/// A frame needs at most three live full-size targets at any instant (the
/// accumulated scene, the incoming layer, and the blend target). A handful of
/// spares keeps the steady state at zero allocations, while the cap stops a
/// single unusually deep effect/mask chain from pinning its whole working set
/// for the rest of the session.
///
/// Without it, retention was `2 * items + 1` full-frame textures: 50 items at
/// 1080p BGRA8 is ~845 MB of VRAM held indefinitely, which is why GPU cost
/// grew with timeline length rather than staying flat.
pub(crate) const MAX_POOLED_PER_SIZE: usize = 8;

/// Global upper bound on free textures across every size.
///
/// The per-size cap alone let stale sizes accumulate forever: each distinct
/// preview/export size that ever appeared retained up to
/// [`MAX_POOLED_PER_SIZE`] textures. The active size is protected by evicting
/// from *other* sizes first, so a size change drains the old sizes instead of
/// pinning both working sets for the rest of the session.
pub(crate) const MAX_POOLED_TOTAL: usize = MAX_POOLED_PER_SIZE * 2;

/// A pool of reusable render targets, keyed by pixel dimensions.
///
/// Generic over the pooled type so the retention policy can be unit-tested
/// without a live GPU device; the compositor instantiates it over
/// `wgpu::Texture` and every other use is `TexturePool<wgpu::Texture>`.
pub struct TexturePool<T> {
    available: HashMap<TextureKey, Vec<T>>,
    in_use: Vec<(TextureKey, T)>,
    /// Mid-frame [`TexturePool::release`] count per key since the last
    /// [`TexturePool::recycle_frame`]. Every release already stashed its
    /// handle, so the frame-boundary recycle must skip — not re-stash — the
    /// same number of `in_use` entries.
    ///
    /// Without this credit, `recycle_frame` stashed every `in_use` handle a
    /// second time, and the free list accumulated duplicate handles to the
    /// same `wgpu::Texture`. A later frame then acquired one texture for two
    /// live roles — the render target of one pass and the sampled input of
    /// another in the same usage scope — which WebGPU rejects by invalidating
    /// the whole frame's command buffer: the frame presents empty, i.e. a
    /// black preview.
    released_since_recycle: HashMap<TextureKey, usize>,
}

impl<T> Default for TexturePool<T> {
    fn default() -> Self {
        Self {
            available: HashMap::new(),
            in_use: Vec::new(),
            released_since_recycle: HashMap::new(),
        }
    }
}

impl<T: Clone> TexturePool<T> {
    /// Recycles everything the previous frame did not explicitly release.
    ///
    /// Call this at the start of a frame. Textures released during the frame
    /// (see [`TexturePool::release`]) are already back in the free list, so
    /// their `in_use` entries are skipped here via the release credit instead
    /// of being stashed a second time — a double stash would put duplicate
    /// handles in the free list and let one frame acquire the same texture
    /// twice.
    pub fn recycle_frame(&mut self) {
        // Drained first so the stash loop can borrow `self` mutably.
        let recycled = std::mem::take(&mut self.in_use);
        let mut credits = std::mem::take(&mut self.released_since_recycle);
        for (key, texture) in recycled {
            if let Some(count) = credits.get_mut(&key) {
                if *count > 0 {
                    *count -= 1;
                    // This handle (or its re-acquired twin) already went back
                    // through `release`; stashing again would duplicate it.
                    continue;
                }
            }
            self.stash(key, texture);
        }
    }

    /// Returns a texture to the free list as soon as the caller knows it is
    /// dead, instead of waiting for the next frame boundary.
    ///
    /// Safe to call for a texture that passes already recorded into the
    /// *current* encoder have read or written: command buffers execute in
    /// submission order, so a later pass targeting the same texture still runs
    /// after the earlier one.
    ///
    /// Callers must acquire the replacement texture *before* releasing the one
    /// it reads from. Otherwise a pool holding a single texture would hand the
    /// same allocation back as both the source and the destination of one
    /// pass, which is undefined.
    pub fn release(&mut self, width: u32, height: u32, texture: T) {
        self.stash((width, height), texture);
        *self
            .released_since_recycle
            .entry((width, height))
            .or_insert(0) += 1;
    }

    fn stash(&mut self, key: TextureKey, texture: T) {
        if self
            .available
            .get(&key)
            .is_some_and(|slot| slot.len() >= MAX_POOLED_PER_SIZE)
        {
            return;
        }

        // Make room under the global bound by evicting from the other sizes,
        // never from the size currently being released into. This keeps the
        // active size's steady-state reuse intact while old sizes drain.
        while self.free_count() >= MAX_POOLED_TOTAL {
            let evict_key = self
                .available
                .iter()
                .filter(|(candidate, slot)| **candidate != key && !slot.is_empty())
                .max_by_key(|(candidate, slot)| (slot.len(), std::cmp::Reverse(**candidate)))
                .map(|(candidate, _)| *candidate);

            let Some(evict_key) = evict_key else {
                // Everything pooled belongs to the active size, which the
                // per-size cap already bounds. Drop the incoming texture.
                return;
            };

            if let Some(slot) = self.available.get_mut(&evict_key) {
                slot.pop();
                if slot.is_empty() {
                    self.available.remove(&evict_key);
                }
            }
        }

        self.available.entry(key).or_default().push(texture);
    }

    /// Takes a pooled target, calling `create` only when the free list for this
    /// size is empty.
    pub fn acquire(&mut self, width: u32, height: u32, create: impl FnOnce() -> T) -> T {
        let key = (width, height);
        let texture = match self.available.get_mut(&key) {
            Some(slot) => {
                let texture = slot.pop();
                if slot.is_empty() {
                    self.available.remove(&key);
                }
                texture
            }
            None => None,
        }
        .unwrap_or_else(create);
        self.in_use.push((key, texture.clone()));
        texture
    }
}

impl TexturePool<wgpu::Texture> {
    /// Device-backed acquire for the compositor.
    pub fn acquire_texture(
        &mut self,
        context: &GpuContext,
        width: u32,
        height: u32,
        label: &'static str,
    ) -> wgpu::Texture {
        self.acquire(width, height, || {
            context.create_render_texture(width, height, label)
        })
    }
}

/// Read-only view of the pool's accounting, for tests and diagnostics.
impl<T> TexturePool<T> {
    pub fn free_count(&self) -> usize {
        self.available.values().map(Vec::len).sum()
    }

    pub fn free_count_at(&self, width: u32, height: u32) -> usize {
        self.available.get(&(width, height)).map_or(0, Vec::len)
    }

    pub fn in_use_count(&self) -> usize {
        self.in_use.len()
    }
}
