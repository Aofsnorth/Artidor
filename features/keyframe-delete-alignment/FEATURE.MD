# Keyframe Delete and Alignment

## Original user request
Right click keyframe should show Delete Keyframe, double click keyframe deletes it, selected/new keyframe should align centered under playhead line.

## Interpreted feature goal
Deliver the requested behavior safely while preserving existing editor workflows and avoiding unrelated system rewrites.

## User story
As an Artidor editor user, I want this workflow to behave predictably and persistently so editing feels clear, fast, and consistent.

## Acceptance criteria
- Requested behavior works in the editor.
- Existing related interactions continue to work.
- No unrelated features are added.
- No sensitive areas are touched unless separately approved.
- Invalid or edge-case states fail safely.
- Lint, typecheck, build, and relevant tests pass when applicable.

## Non-goals
- No auth/API/env/database/export/Rust/WASM/WebGPU/payment changes.
- No large editor architecture rewrite unless explicitly approved.
- No new dependencies unless approved.

## Edge cases
- Missing stale state or deleted referenced items.
- Multiple selected elements or ambiguous targets.
- Small editor panel widths.
- Reload/reopen where related data no longer exists.

## Definition of Done
- FEATURE.MD and PLAN.MD approved.
- Implementation completed in small reviewable steps.
- QA.MD checklist completed.
- MAINTENANCE.MD logs every step.
- STATE.MD updated after approval.

## Questions for review
- Is the interpreted goal correct?
- Are any non-goals incorrect?
- Should this feature be split further before implementation?
