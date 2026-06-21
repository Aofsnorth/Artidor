# Grid Template Card Placement

## Original user request
Create a feature workflow for `features/grid-template-card-placement`.

Feature name: Grid Template Card Placement.

Feature goal: Add a cleaner grid template/card placement system for the editor template/card UI, inspired by FlashCut template editor card placement behavior at `https://github.com/zstar1003/FlashCut/tree/main`.

Important: use the reference repo only as design/behavior inspiration. Do not blindly copy code. If code is referenced, check license and attribution requirements first.

## Interpreted feature goal
Improve the editor template/card browsing layout so template cards align in a responsive, organized, premium grid without changing existing template behavior or unrelated editor systems.

## User story
As a user browsing templates/cards in the editor, I want cards arranged in a cleaner grid/template layout, so template browsing feels more organized, premium, and easier to scan.

## Acceptance criteria
- Template/card placement is cleaner and more consistent.
- Cards align in a responsive grid.
- Card spacing, width, height, and preview placement feel intentional.
- Layout works well on desktop.
- Layout does not break smaller screens.
- Cards are not clipped.
- Card labels remain readable.
- Existing card actions/interactions still work.
- Existing template behavior is preserved.
- Export/render pipeline is untouched.
- No unrelated card systems are rewritten.
- No new dependencies are added unless justified and approved.

## Non-goals
- Do not clone FlashCut UI 1:1.
- Do not copy large code sections.
- Do not implement a full template editor rewrite.
- Do not change core project data model unless required and approved.
- Do not touch auth, API keys, database, AI tools, export/render pipeline, Rust/WASM, WebGPU/WGSL, payment, or sponsor code.

## Edge cases
- Very narrow asset panel widths.
- Long template labels.
- Missing preview images/assets.
- Empty template list.
- Large template list performance.
- Hover/action buttons near clipped card edges.
- User changes asset card size.
- Desktop window resized while panel is open.

## Definition of Done
- `FEATURE.MD` and `PLAN.MD` reviewed/approved.
- Current template card layout audited.
- FlashCut behavior audited for inspiration only.
- Implementation is small and reviewable.
- Existing interactions verified.
- Responsive QA at small/medium/desktop widths completed.
- Lint/typecheck/build pass.
- `MAINTENANCE.MD` logs changes.
- `STATE.MD` updated after approval/verification.

## Questions for review
- Should template card aspect ratio stay current or become fixed per card type?
- Should card size follow the existing asset-card-size setting?
- Is masonry acceptable if FlashCut uses it, or should this remain strict CSS grid?
- Which screen widths are highest priority for manual QA?
