# Risks — Preset Library Enrichment

## UI consistency risk
- Enriched previews may drift away from Artidor's current editor style.
- Too many visual styles may make libraries feel chaotic.

## Performance risk
- Complex preview cards may slow asset tabs.
- Generated thumbnails/effects may increase paint/layout cost.

## Repetitive content risk
- New presets may still become clones if only colors/numbers differ.
- More presets can worsen browsing if quality is low.

## Layout regression risk
- Richer previews may overflow existing card layout.
- Longer names may clip or make cards uneven.

## Maintainability risk
- Hardcoded preview logic per preset can become difficult to update.
- Large preset files can become noisy if not grouped clearly.

## Mitigations
- Prefer data-driven definitions.
- Enrich in phases by category.
- Keep previews lightweight.
- Preserve existing card layout constraints.
- Run visual/performance QA after each phase.
