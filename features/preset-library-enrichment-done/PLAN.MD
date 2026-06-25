# Plan — Preset Library Enrichment

## Likely files involved
- `apps/web/src/lib/presets/effects.ts`
- `apps/web/src/components/editor/panels/assets/views/effects.tsx`
- `apps/web/src/lib/presets/transitions.ts`
- `apps/web/src/components/editor/panels/assets/views/transitions.tsx`
- `apps/web/src/lib/presets/overlays.ts`
- `apps/web/src/components/editor/panels/assets/views/overlays.tsx`
- `apps/web/src/lib/presets/motion.ts`
- `apps/web/src/components/editor/panels/assets/views/animations.tsx`
- `apps/web/src/lib/text/presets.ts`
- `apps/web/src/components/editor/panels/assets/views/text.tsx`
- Related shared asset card/preview components if used.

## Categories to audit
- Effects
- Transitions
- Overlays
- Motion
- Text templates
- Other similar preset/card libraries if discovered during implementation

## Placeholder detection approach
1. Search for generic names: `Effect XX`, `Wash N`, `Preset N`, `Text`, `Caption text`, `Your Title`.
2. Detect generated ranges like `Array.from({ length: ... })`.
3. Compare preview logic for repeated visuals with only color/number changes.
4. Compare preset behavior data for duplicate keyframes/filters/uniforms.
5. Group results by severity:
   - clearly placeholder
   - repetitive / too similar
   - acceptable but could be improved

## Initial audit summary
### Effects
- Priority: high.
- Issue: effect preset data exists, but UI preview/application path appears to route many items through generic/dummy contrast-style behavior.
- Enrichment direction: stronger creative names and previews for glitch, film burn, chromatic shift, CRT, VHS, bloom wash, prism, strobe, dust, dream haze, comic pop, halftone.

### Transitions
- Priority: medium.
- Issue: fewer clear placeholders, but many direction/easing variants can feel similar.
- Enrichment direction: stronger visual distinction for wipe, blur, zoom, spin, flash, glitch cut, whip, stretch, dissolve, ripple, light leak, luma, direction-based moves.

### Overlays
- Priority: highest.
- Issue: generated `Wash 1..150` style entries are clearly placeholder-like.
- Enrichment direction: replace generated washes with intentional groups: light leaks, frames, vignettes, flashes, textures, dust, scratches, grain, weather, film artifacts.

### Motion
- Priority: high.
- Issue: many presets are similar 2-keyframe variants or mirror pairs.
- Enrichment direction: clearer personalities: bounce, drift, float, shake, punch, whip, cinematic slide, smooth zoom, parallax, elastic pop, snap-in, reveal, loops.

### Text
- Priority: medium-high.
- Issue: early entries use generic placeholder copy and several styles are mostly color/font tweaks.
- Enrichment direction: richer typography, spacing, preview composition, and named styles; keep simple fundamentals only if intentionally labeled.

## Enrichment strategy per category
- Preserve stable preset IDs where current projects may reference them.
- Replace visible generic names with intentional labels.
- Improve preview visuals in the smallest component-level changes possible.
- Prefer data-driven preset definition enrichment over UI rewrites.
- Keep category count reasonable; remove/merge obvious filler only if safe.
- Mark temporary fallbacks clearly in planning before implementation.

## Implementation phases
1. Phase 0: Confirm audit and priorities with user.
2. Phase 1: Overlays generated-placeholder cleanup.
3. Phase 2: Effects preview/behavior parity and creative naming.
4. Phase 3: Motion uniqueness pass.
5. Phase 4: Text template preview/style pass.
6. Phase 5: Transitions polish pass.
7. Phase 6: QA, performance check, docs/log updates.

## Testing plan
- Visual scan for distinctiveness per category.
- Preview uniqueness check against adjacent cards.
- Interaction check: apply/select presets still works.
- Responsiveness check in asset panel/grid.
- Performance check: tab switch/render time not significantly worse.
- Commands: `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, relevant tests, `bun run build:web`.

## Rollback plan
- Revert category file changes independently.
- Preserve old preset data snapshots in git history.
- If a preview renderer regresses performance, keep enriched names/data and rollback preview complexity.
