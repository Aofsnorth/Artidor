use std::collections::HashMap;

use crate::{GpuContext, wgpu};

/// Upper bound on free uniform buffers retained per byte size.
///
/// A frame needs at most one live buffer per recorded draw, so the steady
/// state is a handful per size. The cap bounds retention for pathological
/// effect chains without throttling the common case.
pub const MAX_POOLED_UNIFORM_BUFFERS: usize = 16;

/// A pool of reusable uniform buffers, keyed by byte size.
///
/// The render path used to build a fresh buffer for **every** draw of **every**
/// frame through `wgpu::util::DeviceExt::create_buffer_init`, which allocates
/// with `mappedAtCreation: true`. That cost a buffer allocation, a shared-memory
/// mapping and a mapping teardown per draw, and it is the exact call Chrome
/// rejects with
/// `createBuffer failed, size is too large for the implementation when
/// mappedAtCreation == true` once the device is under memory pressure — which
/// panicked inside wgpu and killed the whole frame.
///
/// Buffers handed out here are created once with `COPY_DST` and refreshed with
/// `Queue::write_buffer`, so a steady-state frame records no buffer allocation
/// at all and never touches the mapped-allocation path.
///
/// Buffers are cycled per frame rather than shared: two draws recorded in the
/// same frame must not resolve to the same buffer, because `write_buffer` is
/// ordered against command submission and the later write would be observed by
/// the earlier draw as well. Recycling everything the previous frame did not
/// release (see [`UniformBufferPool::recycle_frame`]) bounds the live set to
/// one frame's worth.
pub struct UniformBufferPool<T> {
    available: HashMap<u64, Vec<T>>,
    in_use: Vec<(u64, T)>,
    /// Mid-frame [`UniformBufferPool::release`] count per size since the last
    /// [`UniformBufferPool::recycle_frame`]. Every release already stashed its
    /// handle, so the frame-boundary recycle must skip — not re-stash — the
    /// same number of `in_use` entries.
    ///
    /// Without this credit, `recycle_frame` stashed every `in_use` handle a
    /// second time and the free list accumulated duplicate handles. A frame
    /// could then acquire one buffer for two live draws, and the later
    /// draw's `write_buffer` would clobber the earlier draw's uniforms.
    released_since_recycle: HashMap<u64, usize>,
}

impl<T> Default for UniformBufferPool<T> {
    fn default() -> Self {
        Self {
            available: HashMap::new(),
            in_use: Vec::new(),
            released_since_recycle: HashMap::new(),
        }
    }
}

impl<T: Clone> UniformBufferPool<T> {
    /// Recycles everything the previous frame did not explicitly release.
    ///
    /// Call at the start of a frame, next to the texture pool's equivalent.
    /// Buffers released mid-frame are already back in the free list, so their
    /// `in_use` entries are skipped via the release credit instead of being
    /// stashed a second time — a double stash would duplicate the handle and
    /// let one frame acquire the same buffer twice.
    pub fn recycle_frame(&mut self) {
        let recycled = std::mem::take(&mut self.in_use);
        let mut credits = std::mem::take(&mut self.released_since_recycle);
        for (size, buffer) in recycled {
            if let Some(count) = credits.get_mut(&size) {
                if *count > 0 {
                    *count -= 1;
                    continue;
                }
            }
            self.stash(size, buffer);
        }
    }

    /// Returns a buffer to the free list as soon as the caller knows every
    /// command buffer referring to it has been submitted.
    pub fn release(&mut self, size: u64, buffer: T) {
        self.stash(size, buffer);
        *self.released_since_recycle.entry(size).or_insert(0) += 1;
    }

    fn stash(&mut self, size: u64, buffer: T) {
        let slot = self.available.entry(size).or_default();
        if slot.len() < MAX_POOLED_UNIFORM_BUFFERS {
            slot.push(buffer);
        }
    }

    /// Takes a pooled buffer, calling `create` only when the free list for this
    /// size is empty.
    pub fn acquire(&mut self, size: u64, create: impl FnOnce() -> T) -> T {
        let buffer = self
            .available
            .get_mut(&size)
            .and_then(Vec::pop)
            .unwrap_or_else(create);
        self.in_use.push((size, buffer.clone()));
        buffer
    }
}

impl UniformBufferPool<wgpu::Buffer> {
    /// Device-backed acquire: returns a uniform buffer of `size` bytes holding
    /// `contents`, creating the buffer only when the pool has none spare.
    pub fn acquire_uniform(
        &mut self,
        context: &GpuContext,
        size: u64,
        label: &'static str,
        contents: &[u8],
    ) -> wgpu::Buffer {
        let buffer = self.acquire(size, || {
            context.device().create_buffer(&wgpu::BufferDescriptor {
                label: Some(label),
                size,
                // `UNIFORM | COPY_DST` mirrors what `create_buffer_init` used to
                // request: the buffer is written with `Queue::write_buffer`
                // instead of being mapped at creation.
                usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            })
        });
        context.queue().write_buffer(&buffer, 0, contents);
        buffer
    }
}

/// Read-only view of the pool's accounting, for tests and diagnostics.
impl<T> UniformBufferPool<T> {
    pub fn free_count(&self) -> usize {
        self.available.values().map(Vec::len).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::{MAX_POOLED_UNIFORM_BUFFERS, UniformBufferPool};

    /// Two draws in one frame must never share a buffer: `write_buffer` is
    /// ordered against submission, so a shared buffer would let the second
    /// draw's uniforms overwrite the first draw's.
    #[test]
    fn a_frame_cycles_distinct_buffers() {
        let mut pool: UniformBufferPool<u32> = UniformBufferPool::default();
        let first = pool.acquire(48, || 1);
        let second = pool.acquire(48, || 2);
        assert_ne!(first, second);
        pool.recycle_frame();
    }

    /// A frame with several effect chains (one per element) must give every
    /// chain its own buffers, without any recycle between chains: the chains
    /// are recorded into one encoder that is submitted once at the frame
    /// boundary, so a buffer shared across chains would have its uniforms
    /// clobbered by the later chain's `write_buffer` before the encoder runs.
    ///
    /// This is the contract the frame path depends on — a call site that
    /// recycles between acquires of the same frame re-introduces the aliasing
    /// (see the pool docs on why `recycle_frame` is a frame-boundary call).
    #[test]
    fn chains_within_one_frame_never_share_buffers() {
        let mut pool: UniformBufferPool<usize> = UniformBufferPool::default();
        let created = std::cell::Cell::new(0usize);
        let mut make = || {
            created.set(created.get() + 1);
            created.get()
        };
        for _ in 0..3 {
            let first = pool.acquire(16, &mut make);
            let second = pool.acquire(16, &mut make);
            assert_ne!(first, second, "two draws of one frame must not alias");
        }
        // Six acquires, six distinct buffers — the pool may only start reusing
        // them at the next frame boundary.
        assert_eq!(created.get(), 6);
        pool.recycle_frame();
        // Next frame reuses instead of allocating.
        let reused = pool.acquire(16, &mut make);
        assert_eq!(created.get(), 6, "recycled frame must reuse, not create");
        assert!(reused <= 6, "the reused handle must be one of the six");
    }

    /// Steady state is allocation-free: once a frame's buffers are recycled the
    /// next frame reuses them instead of creating new ones.
    #[test]
    fn recycled_buffers_are_reused_without_creating() {
        let mut pool: UniformBufferPool<u32> = UniformBufferPool::default();
        let first = pool.acquire(48, || 7);
        pool.recycle_frame();
        let reused = pool.acquire(48, || panic!("must reuse, not create"));
        assert_eq!(first, reused);
    }

    /// A buffer of a different size is a different pool entry.
    #[test]
    fn sizes_do_not_share_buffers() {
        let mut pool: UniformBufferPool<u32> = UniformBufferPool::default();
        let wide = pool.acquire(48, || 1);
        let narrow = pool.acquire(16, || 2);
        assert_ne!(wide, narrow);
        pool.recycle_frame();
    }

    /// Retention is bounded so one deep effect chain cannot pin its whole
    /// working set for the rest of the session.
    ///
    /// The buffers are held live before releasing: an acquire that immediately
    /// follows a release pops the same handle back out, so a tight
    /// acquire-release loop never grows the free list past one entry.
    #[test]
    fn retention_is_capped() {
        let mut pool: UniformBufferPool<u32> = UniformBufferPool::default();
        let mut buffers = Vec::new();
        for _ in 0..(MAX_POOLED_UNIFORM_BUFFERS + 5) {
            buffers.push(pool.acquire(48, || 0));
        }
        for buffer in buffers {
            pool.release(48, buffer);
        }
        pool.recycle_frame();
        let mut created = 0;
        for _ in 0..MAX_POOLED_UNIFORM_BUFFERS {
            pool.acquire(48, || {
                created += 1;
                0
            });
        }
        assert_eq!(created, 0);
    }

    /// A released-then-recycled buffer must exist exactly once in the free
    /// list: the old accounting stashed mid-frame-released handles a second
    /// time at the boundary, so a frame could acquire the same buffer for
    /// two draws and the second `write_buffer` clobbered the first draw's
    /// uniforms.
    #[test]
    fn recycle_never_duplicates_a_released_buffer() {
        let mut pool: UniformBufferPool<u32> = UniformBufferPool::default();

        // A frame that releases its buffers mid-frame.
        let first = pool.acquire(48, || 1);
        let second = pool.acquire(48, || 2);
        pool.release(48, first);
        pool.release(48, second);

        pool.recycle_frame();

        // Drain the free list: every entry must be a distinct handle.
        let mut seen = Vec::new();
        let mut created = 0;
        while pool.free_count() > 0 {
            seen.push(pool.acquire(48, || {
                created += 1;
                99
            }));
        }
        let mut unique = seen.clone();
        unique.sort_unstable();
        unique.dedup();
        assert_eq!(seen.len(), unique.len(), "free list has duplicate handles");
        assert_eq!(seen.len(), 2, "exactly the two released buffers");
        assert_eq!(created, 0, "no allocation should be needed");
    }

    /// Steady-state allocation benchmark, modelled on a real compositor
    /// frame: 5 uniform-sized draws (3 layer draws + 2 effect passes at 48 B)
    /// and 14 small ones (blend + mask + 12 JFA steps at 16 B).
    ///
    /// Before the pool every one of those acquires was a
    /// `create_buffer_init` — a mapped buffer allocation, a shared-memory map
    /// and a teardown per draw, per frame: 950 allocations across 50 frames
    /// and 19 per frame forever. The steady state after the pool is the first
    /// frame's 19 allocations and then zero, a 98% reduction that also removes
    /// the mapped-allocation path entirely (`Queue::write_buffer` instead),
    /// which is the path Chrome rejects under memory pressure.
    #[test]
    fn steady_state_frames_allocate_no_buffers() {
        let mut pool: UniformBufferPool<usize> = UniformBufferPool::default();
        let created = std::cell::Cell::new(0usize);
        let mut make = || {
            created.set(created.get() + 1);
            created.get()
        };

        for _ in 0..50 {
            pool.recycle_frame();
            for _ in 0..5 {
                pool.acquire(48, &mut make);
            }
            for _ in 0..14 {
                pool.acquire(16, &mut make);
            }
        }

        // 950 acquires, 19 allocations — every frame after the first records
        // no buffer allocation at all.
        assert_eq!(created.get(), 19);
    }
}
