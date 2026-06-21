# Preset Library Enrichment

## Original user request
Create a feature workflow for `features/preset-library-enrichment` to upgrade editor preset libraries so placeholder/skeleton items become real, visually distinct, creative, premium presets across Effects, Transitions, Overlays, Motion, Text templates, and similar preset/card libraries.

## Interpreted feature goal
Audit current preset libraries, identify placeholder/repetitive/basic entries, then plan phased enrichment of names, preview visuals, and preset behavior while preserving app design language, interactions, layout stability, and performance.

## User story
As an editor user browsing preset libraries, I want presets to look complete, varied, creative, and intentional so each category feels premium and useful instead of placeholder-like.

## Acceptance criteria
- Placeholder/skeleton presets are identified by category and severity.
- Enrichment plan prioritizes quality/distinctiveness over raw count.
- Preset names avoid generic `Effect XX` style where possible.
- Previews communicate distinct creative identity.
- Similar clone-like presets are reduced or differentiated.
- Existing preset interactions still work.
- Grid/card layout remains stable.
- No unrelated systems are touched.
- No new dependencies are added unless justified and approved.
- Performance is not sacrificed for flashy previews.

## Non-goals
- Do not clone another app's library 1:1.
- Do not redesign the whole editor.
- Do not change auth, API keys, database, export/render pipeline, AI tools, Rust/WASM core, or WebGPU/WGSL.
- Do not do a massive unsafe rewrite.
- Do not add presets only for volume.

## Edge cases
- Preset preview renderer cannot express full preset behavior.
- Preset data is shared by renderer and UI.
- Some placeholders may be temporary fallbacks.
- Very large libraries may hurt asset tab render time.
- Existing projects may reference old preset IDs.

## Definition of Done
- `FEATURE.MD` and `PLAN.MD` reviewed/approved.
- Current preset libraries audited by category.
- Placeholder severity groups documented.
- Enrichment plan approved before implementation.
- Implementation, if approved, is phased and reviewable.
- Visual distinctiveness and responsiveness QA completed.
- Lint/typecheck/build pass.
- `MAINTENANCE.MD` logs each step.

## Questions for review
- Should old placeholder IDs be preserved for backward compatibility?
- Should enrichment prioritize fewer better presets or preserve current count?
- Which category should be upgraded first: Overlays, Effects, Motion, Transitions, or Text?
- Are any placeholder items intentionally kept as simple fundamentals?
