# Web Editor Hardening Design

Date: 2026-07-10
Status: Approved
Scope: `apps/web` only. The Tauri application inherits the same web UI without native-only changes.

## Goal

Stabilize the Artidor web editor, improve low-end-PC behavior, make large asset catalogs searchable, add practical localization, and expand Alight Motion-style editing capabilities without claiming unverifiable parity with CapCut or absolute security.

## Delivery Strategy

Deliver six independently verifiable phases. Bugs and project safety precede feature expansion. No new dependency is planned.

1. Editor reliability
2. Search and visual consistency
3. Localization foundation
4. Effects phase B
5. Performance and audio/export verification
6. Security and scalability audit

Each phase keeps existing project files backward compatible. Domain behavior stays outside React where practical; UI state remains in React or existing Zustand stores.

## Phase 1: Editor Reliability

### Timeline media placement

Remove the image-specific override that forces an image dropped over the main track into a new overlay track. Placement follows the existing typed `image` element path. Images never expose audio controls. Add focused tests for main-track image placement and image element construction.

### Quick split tool

Add a persistent timeline tool mode bound to `B`. When active, the pointer uses a split/scissors cursor over splittable clips. Clicking a clip splits at the clicked frame-aligned timeline time through the existing timeline split command. `Escape`, switching tools, or pressing `B` again returns to Select. Locked tracks and non-splittable boundaries are rejected without mutation.

### Motion text centering

Keep animation preview labels centered using stable card dimensions, centered layout, text wrapping, and transform origins. Motion keyframes must not shift the preview label's base alignment.

### Color and Fill

Trace `graphicStyle.fillColor` and `fillOpacity` through preview, canvas renderer, GPU renderer, and export. Implement the smallest shared compositing behavior so white at 100% visibly tints/replaces the selected video as the control promises. Preserve opacity semantics and old project defaults.

### Project details card

Populate the empty card beside the audio meter with current project name, resolution, FPS, duration, track count, and media count. Values subscribe to existing editor state. Empty projects show zero values, not blank UI.

### Transcription loading

Represent model loading as one shared operation-level card. Clip and full-timeline transcription reuse that card instead of appending one per progress event. Concurrent starts are deduplicated or disabled while loading.

### Diagnostics

Fix source-level diagnostics caused by missing transcription modules/tests and touched-file warnings. Do not edit unrelated Markdown warnings or user changes unless required by validation.

## Phase 2: Search and Visual Consistency

### Search

Add one reusable local catalog-search field using existing input/icon components. Apply it to data-dense asset views: transitions, animations/motion, effects, text templates, filters, overlays, stickers, sounds, templates, presets, plugins, and similar registry-backed panels. Filtering is case-insensitive over names, categories, and keywords. Empty results show one compact state.

### Cards

Use the existing Transform/property visual language: low-radius surfaces, restrained borders, stable dimensions, short hover transitions, clear focus states. Avoid nested cards and layout-shifting hover effects.

### Preview palette

Transition and motion/template previews use a restrained neutral source palette. Transition previews use deterministic bundled/local imagery selected from a small set, not remote random URLs. The images remain naturally colored but muted, avoiding rainbow palettes and avoiding monochrome.

## Phase 3: Localization Foundation

Implement a lightweight typed dictionary system using React context and browser APIs. Initial locales: Indonesian and English. Detect browser language on first run; persist user choice locally. Add a language selector in Settings. Localize editor chrome and all UI touched in phases 1-4 first. Keep fallback-to-English behavior and interpolation explicit.

This phase does not promise every historical string is translated immediately. The dictionary structure supports incremental coverage without a new dependency.

## Phase 4: Effects Phase B

### Existing effect quality

Audit current effects against the requested Alight Motion groups. Fix names, categories, controls, previews, and renderer/export consistency for effects that already exist.

### Priority effects

Implement a bounded priority set selected for high utility and inexpensive GPU execution:

- Text: Count Up/Down, Text Spacing, Text Progress, Timecode, Text Randomizer, Change Text
- Matte/key: Chroma Key, Luma Key, Matte Choker, Solid Matte, Wipe, Radial Wipe
- Opacity: Blink, Block Dissolve, Feather, Fade In/Out, Dissolve
- Repeat/transform: Repeat, Grid Repeat, Linear Repeat, Radial Repeat, Offset, Auto Shake, Rotate, Transform, Raster Transform
- Blur: Box Blur, Directional Blur, Motion Blur, Gaussian Blur, Lens Blur, Zoom Blur, Sharpen, Unsharp Mask
- Image/edge: Glow, Inner Glow, Drop Shadow, Edge Glow, Find Edges, Contour, Halftone
- Color/light: Brightness/Contrast, Color Balance, Replace Color, HSL Mixer, RGB Mixer, Tint, Four Color Gradient, Gradient Overlay, Colorize
- Distortion/procedural: Mirror, Bulge/Pinch, Kaleidoscope, Polar Coordinates, Pixelate, Tile, Swirl, Turbulent Displace, Fractal Noise, Checkerboard, Grid, Starfield, Rain, Snow, Scanlines, VHS Noise

The remaining requested names appear in a researched catalog only when they map to existing functionality or have a defined implementation status. Unsupported effects are not presented as working.

### Border

Add Border to the Graphic inspector using the existing graphic parameter/keyframe system. Controls include enable, color, width, opacity, join/position where supported. Preview and export must match.

### Keyframes

Every mutable numeric/color control added or touched in effect, Color and Fill, border, stroke, shadow, and blend-related opacity uses the existing keyframe property controls. Boolean and discrete mode switches remain non-interpolated unless the engine already supports stepped keyframes.

### Blend modes

Expose the renderer-supported W3C/Canvas blend set: normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity, plus-darker, plus-lighter where platform support is verified. Persist typed values. Unsupported backend modes must fall back to normal explicitly.

### Performance

Effects use GPU passes already supported by the renderer. Previews remain visibility-gated and queue-bounded. Multi-pass effects have conservative preview quality and pass limits. No CPU per-pixel loop runs on the main thread.

## Phase 5: Performance, Audio, Export

Establish measurements before optimization: editor interaction latency, dropped preview frames, memory growth, effect-preview queue time, transcription/model loading, audio detection accuracy on fixtures, and export duration for representative projects.

Profile three times on the same fixtures. Optimize only evidenced bottlenecks. Likely targets include renderer subscriptions, frame allocation, media decode caching, timeline virtualization, effect pass reuse, and export warm-up. Add regression tests or benchmark scripts for changed logic.

Verify audio detection with silent, speech, music, short, long, mono, and stereo fixtures. Fix reproducible failures only. Preserve local-first media handling.

## Phase 6: Security and Scalability Audit

Perform a threat-model review and run available sensors: dependency audit, Semgrep, Gitleaks, lint, typecheck, tests, build, and targeted API review. Check XSS, CSRF, SSRF, auth/session boundaries, file parsing, media metadata validation, upload limits, rate limits, CSP, secrets, AI/MCP tool permissions, and denial-of-service paths.

Scalability to one million users requires architecture and load assumptions. Audit stateless routes, DB indexes/constraints, Redis/rate-limit behavior, caching, connection pools, background work, and failure modes. Run bounded local load tests against safe test endpoints when infrastructure permits. Report capacity evidence, bottlenecks, and remediation; do not claim guaranteed one-million-user safety.

## Data and Compatibility

- Existing project files continue loading with defaults for new properties.
- No migrations delete user data.
- Undo/redo routes through existing editor commands.
- User media stays local by default.
- Localization preference is device-local.
- New effects use stable IDs independent of translated labels.

## Testing

- Unit tests: image placement, split calculations/tool state, search normalization, locale fallback/interpolation, effect defaults/keyframes, blend parsing.
- Component tests where existing infrastructure permits: transcription singleton card, project details, catalog search.
- Renderer tests: Color and Fill, border, representative effects, fallback blend behavior.
- E2E/manual screenshots: motion centering, card consistency, split pointer, search states, locale switching, low-width layouts.
- Full sensors after each phase: Biome, TypeScript, Bun tests, production build; Playwright for UI phases.

## Risks

- Current worktree has extensive user edits in timeline, transitions, preview, renderer, transcription, and What's New files. Every patch must preserve those changes.
- Renderer and effect changes can diverge between preview and export.
- A complete requested effect catalog is too large for one safe implementation; phase B deliberately prioritizes working effects.
- Full localization is incremental; mixed language remains possible outside touched surfaces.
- Security and scale findings may require separate sensitive-path approval.

## Rollback

Each phase is file-scoped and independently revertible. New persisted fields use defaults. UI additions can be disabled without transforming project data. Effect IDs are additive; removing an effect leaves projects loadable with an explicit unsupported-effect fallback.

## Success Criteria

- Images dropped on the main track remain typed as images with no audio UI.
- `B` enables frame-aligned click-to-split with visible cursor state.
- Project details card is populated for new projects.
- One model-loading card appears per transcription operation.
- Dense catalogs are searchable.
- Motion/transition previews are centered and visually restrained.
- White Color and Fill at 100% visibly affects preview and export.
- Indonesian/English switching persists and falls back safely.
- Priority effects, Border, keyframes, and verified blend modes work in preview/export.
- Performance/security/scalability claims are backed by recorded commands and measurements.
