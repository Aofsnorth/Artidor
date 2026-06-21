# Maintenance Log

## Entry 001 - Initial workflow setup

- Date/time: 2026-06-20
- User request summary: Create workflow folder and planning files for Keyframe Delete and Alignment.
- Action taken: Created required workflow files and filled initial feature/planning/risk/QA templates.
- Files created/updated: RULES.MD, FEATURE.MD, PLAN.MD, STATE.MD, TODO.MD, QA.MD, RISKS.MD, MAINTENANCE.MD.
- User approval required: Yes, review FEATURE.MD and PLAN.MD before implementation unless Auto Approve applies.
- Current status: Awaiting review.

## Entry 002 - Implementation

- Date/time: 2026-06-20
- User request summary: User approved the feature and requested the delete/alignment behavior.
- Action taken: Added `Delete keyframe` to the keyframe context menu, added double-click delete for keyframes, updated keyframe diamond hit size constant, and added a What's New entry.
- Files created/updated:
  - `apps/web/src/components/editor/panels/timeline/keyframe-context-menu.tsx`
  - `apps/web/src/components/editor/panels/timeline/timeline-element.tsx`
  - `apps/web/src/components/editor/panels/timeline/layout.ts`
  - `apps/web/src/lib/whats-new/feed.ts`
- User approval required: Implementation already approved.
- Current status: Implemented and passing automated checks; awaiting manual verification.

## Entry 003 - Keyframe playhead centering fix

- Date/time: 2026-06-20
- User request summary: New keyframes landed slightly right of the playhead line; user asked to fix so the diamond centers on the playhead.
- Action taken: Wrapped the timeline keyframe `HugeiconsIcon` in an inline-flex span so the icon center matches the button center, removing the right offset caused by the SVG intrinsic content box.
- Files created/updated:
  - `apps/web/src/components/editor/panels/timeline/timeline-element.tsx`
  - `apps/web/src/lib/whats-new/feed.ts`
- User approval required: Approval not required; small visible fix.
- Current status: Implemented and passing automated checks; awaiting manual verification.
