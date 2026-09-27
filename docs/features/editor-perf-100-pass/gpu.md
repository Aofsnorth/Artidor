# GPU/Rust pass (editor-perf-100-pass)

Scope (OWN ONLY): `rust/crates/gpu/src/uniform_pool.rs` (new),
`rust/crates/gpu/src/lib.rs` (export),
`rust/crates/compositor/src/compositor.rs`,
`rust/crates/effects/src/pipeline.rs`,
`rust/crates/masks/src/feather.rs`, `rust/crates/masks/src/sdf.rs`,
plus the WASM rebuild of `rust/wasm`. The four JS tracks
(`react.md`, `renderer.md`, `bundle.md`, `export.md`) were already
complete; this track covers the Rust side of the frame hot path they
explicitly left read-only.

Rule check: smallest safe change, no new deps, no behavior change beyond
"frames keep rendering correctly"; every round below names a command and
its result.

## Baseline (verified by reading code first, not assumed)

- Every draw of every frame built its uniform buffer through
  `wgpu::util::DeviceExt::create_buffer_init` — 6 call sites
  (3 compositor: layer/mask/blend; 1 effects; 2 masks incl. one per JFA
  step). That is a `create_buffer` with `mappedAtCreation: true`, a
  shared-memory map, and a teardown **per draw per frame**.
- `mappedAtCreation` allocations are exactly the call Chrome rejects with
  `createBuffer failed, size is too large for the implementation when
  mappedAtCreation == true` once the device is under memory pressure —
  the panic that bricked the preview (see the bughunt evidence in the
  goal log). The uniform pool removes the failure mode, this track
  measures what it saves.
- The frame records ALL layers, effect chains and masks into ONE command
  encoder submitted once at the end of `render_frame`
  (`compositor.rs:324`). `Queue::write_buffer` writes staged before that
  submit are observed by every draw in it.

## Fix

- `UniformBufferPool<T>` (generic over the pooled handle, mirroring
  `TexturePool`): buffers created once per size with
  `UNIFORM | COPY_DST` (`mapped_at_creation: false`), refreshed with
  `Queue::write_buffer`, recycled at the frame boundary, capped at 16
  free buffers per byte size.
- Compositor: own pool + frame-boundary `recycle_frame()` in
  `render_frame` and `render_frame_to_bytes`; 3 draw sites acquire from
  the pool.
- Effects pipeline / feather / SDF: pools behind `Mutex` (the entry
  points are `&self` because the wasm runtime holds them behind a shared
  `RefCell` borrow), recycled at the frame boundary via
  `recycle_frame(&self)`; standalone `apply()` / `apply_mask_feather()`
  submit their own encoder, so they recycle once per call.
- No `render_source_to_texture` signature or call-site behavior change
  beyond the pool swap (`&mut self` to free the borrow for the pool).

## Review log (10 rounds)

### Round 1 — steady-state allocation count: 950 acquires → 19 allocations

Scenario: 50 modelled frames of a 3-layer composite with a 2-pass effect
chain and a feathered mask (5 uniform-size acquires at 48 B, 14 at 16 B
per frame — the JFA steps are the 12 of the 14).

Evidence: `uniform_pool.rs`
`steady_state_frames_allocate_no_buffers`.

Command: `cargo test -p gpu steady_state_frames_allocate_no_buffers`

Result: PASS. `created == 19` after 950 acquires — the first frame
allocates 19, every frame after that records **zero** buffer
allocations. Before the pool the same load performed 950
`create_buffer_init` calls (19/frame forever, each a mapped allocation +
map + teardown). 98% allocation reduction; the remaining 2% is
first-frame warm-up only. (Wall-clock GPU timing deliberately not
claimed: native timings on this machine would be single-run noise; the
allocation count is the deterministic quantity — each avoided mapped
allocation is a driver round-trip.)

### Round 2 — mapped allocation path eliminated from every draw

Command: `grep -rn "create_buffer_init" crates/gpu/src
crates/compositor/src crates/effects/src crates/masks/src` and
`grep -rn "mapped_at_creation: true"` over the same.

Result: 6 `acquire_uniform` call sites, 0 `mapped_at_creation: true`.
The only remaining `create_buffer_init` is `context.rs:95` — the
fullscreen quad vertex buffer, built once at GPU init, not per draw.
Every per-draw buffer now comes from the pool via `Queue::write_buffer`.

### Round 3 — frame-boundary recycle is a correctness contract, not just hygiene

Scenario: the first version of this change recycled the effects pool per
pass and the mask pools per application. Because the whole frame is ONE
encoder submitted once, the LIFO free list handed pass N+1 the same
buffer as pass N, and the later `write_buffer` (staged before submit)
clobbered the earlier draw's uniforms — a 2-pass adjust chain would run
its first pass with the second pass's values, and JFA steps 2..N would
all run with the last step's `step_size`.

Evidence: browser mechanism probe (headed Chromium, real adapter,
readback via `copyTextureToBuffer` — present is not involved):

- distinct-buffer case: pass1 reads (255,0,0,255), pass2 (0,0,255,255) —
  each draw sees its own uniforms.
- shared-buffer case: pass1 reads (0,0,255,255) **blue** even though red
  was written first — the later staged write wins. Mechanism confirmed
  in this browser, not just in the spec.

Fix: `recycle_frame` moved to the frame boundary (compositor calls
`effects.recycle_frame()` + `masks.recycle_frame()` next to its own
recycles; standalone paths recycle once per own-encoder submit).
Regression test `chains_within_one_frame_never_share_buffers` pins the
pool contract; the mechanism probe pins why it matters.

Command: `cargo test -p gpu chains_within_one_frame_never_share_buffers`

Result: PASS (6 distinct handles for 6 same-frame acquires, next frame
reuses without creating).

### Round 4 — retention is bounded, not frame-count dependent

Scenario: a pathological chain (200+ acquires of one size) must not pin
its whole working set for the rest of the session.

Evidence: `retention_is_capped` (saturates at
`MAX_POOLED_UNIFORM_BUFFERS` = 16 per size).

Command: `cargo test -p gpu retention_is_capped`

Result: PASS. Free list saturates at the cap; the cap is applied per
byte size, not globally (`sizes_do_not_share_buffers`).

### Round 5 — the panic cascade stays gone under load

Scenario: a real frame with THREE simultaneous effect passes (the
multi-adjust case that used to be the aliasing victim), scrubbed through
the live UI, then 6 s of continuous preview rendering.

Command: headed Playwright probe (`.tmp_uniform_verify.mjs`,
dev-server fresh start, `__BUF_FAIL__` instrumented `createBuffer`).

Result: `bufFail: []`, `consoleErrorCount: 0`, `pageErrors: 0`, store
holds `[exposure -100, tint-shift +100, sharpen +50]` and the values
persist through settle. No `createBuffer` size failure, no
`RefCell already borrowed`, no wgpu panic.

### Round 6 — WASM rebuilt and verified current

Command: `bun run build:wasm` from the repo root; `ls -la
rust/wasm/pkg/artidor_wasm_bg.wasm`.

Result: build succeeded (`wasm-opt` pass, 28.3 s); binary
3,111,775 bytes at 14:48, newer than every touched source file
(compositor.rs 14:25, others earlier). A fresh dev-server start picks it
up; Turbopack's cached chunk is the false-regression source documented
in the bughunt log, so the restart is part of the verification, not
a workaround.

### Round 7 — full Rust suite green

Command: `cargo test -p gpu -p compositor -p effects -p masks`

Result: 27 pass / 0 fail (gpu 6, compositor 9, effects 12). Includes the
pre-existing texture-pool retention tests — the uniform pool did not
regress texture accounting.

### Round 8 — app-level interaction verification (scrub persistence)

Scenario: same live UI run as round 5 — scrub Exposure to −100, then
Tint to +100, then Sharpness to +50, no resets between (three live
passes at once, previously impossible without the aliasing bug
corrupting the chain).

Result: field values `"-100"`, `"100"`, `"50"` after each scrub
(fields must scroll into view first — fields below the fold were the
earlier probes' false "not writable" verdict). Store echoes all three
effects; removing this run's probe counters
(`__BAT_RENDERS__`/`__IV_RENDERS__`/`__SCENE_UPDATES__`) changes none of
it (`tsc` + `biome check` clean on the three files).

### Round 9 — remaining per-draw allocations, audited honestly

`create_bind_group` (3 per layer draw) and `create_view` per texture
per draw are still per-call allocations. NOT fixed in this track:
a bind-group pool needs invalidation keyed on the sampled texture view
and uniform buffer identity — reuse across frames is only safe when the
underlying resources are pool-stable, which is a larger contract than
this change wanted to take. wgpu bind groups are refcounted and dropped
with the encoder; the measured panic class (mapped buffer allocation) is
gone, and no evidence of bind-group-driven pressure exists in the
bughunt logs. Documented, not changed.

### Round 10 — SwiftShader preview caveat, isolated

Rasterization on the test adapter is proven working (clear-only
readback = (255,0,0,255)), while present-to-canvas reads (0,0,0,0) —
so "black DOM preview" in the Playwright/SwiftShader environment is a
present limitation, NOT a render-path defect. The user's hardware GPU
renders the preview (user-confirmed). In-environment visual proof of
multi-pass correctness is therefore impossible; rounds 3 + 5 are the
substitute (mechanism proven with readback, integration proven
error-free).

## Validation

- `cargo test -p gpu -p compositor -p effects -p masks` → 27 pass,
  0 fail.
- `cargo check --target wasm32-unknown-unknown -p artidor-wasm` →
  clean (one pre-existing dead-code warning in texture_pool test
  helpers, untouched).
- `bun run build:wasm` → success, binary current.
- `bunx tsc --noEmit` (apps/web) → clean after probe-counter removal.
- `bunx biome check` on the three JS files touched by probe removal →
  clean.
- Browser evidence: rounds 3, 5, 8 above (`.tmp_bughunt/uniform-verify.json`).

## Honest non-improvements / gaps

- No wall-clock frame-time numbers: the only GPU available to the
  harness is SwiftShader software rendering; frame times there say
  nothing about the user's hardware. The deterministic allocation
  count (round 1) is the honest measurement.
- Bind groups / texture views per draw: audited, left alone (round 9).
- The standalone `applyEffectPasses` wasm path allocates one
  `render_texture_to_canvas` target per call; it is the effect-preview
  path, already deduped upstream by the renderer track's result cache.
- Present-to-canvas cannot be verified in-environment (round 10).

## Changed files (this track only)

- `rust/crates/gpu/src/uniform_pool.rs` (new: pool + 6 tests)
- `rust/crates/gpu/src/lib.rs` (export)
- `rust/crates/compositor/src/compositor.rs` (pool, frame-boundary
  recycles, 3 acquire sites)
- `rust/crates/effects/src/pipeline.rs` (pool, `recycle_frame`,
  acquire site)
- `rust/crates/masks/src/feather.rs`, `rust/crates/masks/src/sdf.rs`
  (pools, `recycle_frame`, acquire sites)
- `rust/wasm/pkg/*` (rebuilt)
- `apps/web` probe-counter removals only:
  `src/components/editor/panels/properties/tabs/basic-adjust-tab.tsx`,
  `src/components/editor/panels/properties/index.tsx`,
  `src/core/managers/scenes-manager.ts`

What's New not updated because: internal perf/correctness pass, no
user-visible change beyond effects applying correctly.
