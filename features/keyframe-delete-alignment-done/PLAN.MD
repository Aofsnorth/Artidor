# Plan

## Likely files involved

To be confirmed by source audit before code edits.

## Components/modules affected

Editor UI components related to: Keyframe Delete and Alignment.

## Data/state changes

Prefer local UI state only. Avoid project data model changes unless approved.

## UI changes

Small, visible changes scoped to the requested workflow.

## API changes

None expected.

## Implementation plan

1. Audit current source files and behavior.
2. Identify smallest safe implementation path.
3. Implement one reviewable step.
4. Run checks.
5. Manual QA.
6. Update workflow files.

## Testing plan

- Targeted manual QA from QA.MD.
- `bun run lint:web`.
- `cd apps/web && bunx tsc --noEmit`.
- `bun run build:web`.
- Targeted tests if compatible.

## Rollback plan

Revert files changed for this feature only and remove any added session/local UI state if applicable.
