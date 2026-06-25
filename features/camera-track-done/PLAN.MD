# Plan

## Approach

1. **Export BaseTimelineElement**: Export `BaseTimelineElement` in `apps/web/src/lib/timeline/types.ts` so other files can extend it.
2. **Update CreateTimelineElement Union**: Define `CreateCameraElement` in `types.ts` and add it to `CreateTimelineElement`.
3. **Make CameraElement Inherit BaseTimelineElement**: In `apps/web/src/lib/camera/index.ts`, make `CameraElement` extend `BaseTimelineElement` and change its `animations` property to use `ElementAnimations`. This unifies camera elements with other timeline elements and resolves all typecheck issues.
4. **Clean up & Re-typecheck**: Run the build and TypeScript compiler to verify all errors are resolved.

## Files to Read First

- [types.ts](file:///c:/Users/Arthe/Documents/MyProject/Artidor/apps/web/src/lib/timeline/types.ts)
- [index.ts](file:///c:/Users/Arthe/Documents/MyProject/Artidor/apps/web/src/lib/camera/index.ts)

## Files Expected to Change

- [types.ts](file:///c:/Users/Arthe/Documents/MyProject/Artidor/apps/web/src/lib/timeline/types.ts)
- [index.ts](file:///c:/Users/Arthe/Documents/MyProject/Artidor/apps/web/src/lib/camera/index.ts)

## Test Plan

- **Unit**: Verify build and typecheck with `bunx tsc --noEmit`.
- **Manual QA**: Select camera elements, check renaming/customName, and verify camera track creation.

## Rollback Plan

Revert git changes with `git checkout -- .`.
