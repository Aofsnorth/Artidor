# Effects Catalogue + Web Performance Optimization

## Owner request

1. Implement the Alight Motion-style effects catalogue in the existing `rust/crates/effects` crate following the current `EffectPass` / `EffectUniformBuffer` architecture.
2. After the effects work, deep-research and optimize `apps/web` performance to the maximum, with focus on export speed, timeline preview, and video preview.

## Scope

### Effects (phase 1)

- Work through the target groups in small batches, one group per iteration.
- For each effect: add a `.wgsl` shader, register it in `pipeline.rs`, add a uniform-packing arm, and expose it in `apps/desktop-web/src/ui/assets/effects.rs` and `apps/desktop-native/src/ui/assets/effects.rs`.
- Extend `EffectCategory` in the two UI files as new groups are introduced.
- Mark 3D/path/text-anim effects as 2D approximations or out-of-scope in the final report.

### Web performance (phase 2)

- Deep research on web video editor performance best practices.
- Audit `apps/web` hot paths (export, timeline, preview).
- Implement highest-impact, lowest-risk optimizations (no architectural rewrites without explicit approval).

## First batch

Group: **Opacity / Visibility**
- `blink` (2D approximation, uses `u_time` + `u_speed` + `u_amount`)
- `block-dissolve` (uses `u_amount` as progress, `u_block_size`, `u_seed`)
- `feather` (alpha-channel 2D Gaussian blur, `u_amount` as radius)
- `dissolve` (noise-driven dissolve, `u_amount` as progress, `u_seed`)
- `opacity-pressure` (2D approximation: directional opacity pressure, `u_amount`, `u_pressure`, `u_direction`)

## Category additions

- Add `Opacity` to `EffectCategory` in both desktop UI files with label "Opacity / Visibility".

## Verification

- `cargo test -p effects` (naga WGSL parse for all shaders)
- `cargo test -p desktop-native` (effects.rs tests)
- `cargo check -p desktop-web` if available
- `cargo clippy -p effects` clean

## Notes

- `EffectUniformBuffer` currently has `resolution` (vec2) + `direction` (vec2) + `scalars` (vec4). New effects will be packed to fit within these slots.
- `u_time` is treated as a user-keyframeable parameter; the engine does not auto-inject it.
