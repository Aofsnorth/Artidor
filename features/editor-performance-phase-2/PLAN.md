# Plan

1. Add a pure export timeout helper and failing boundary tests; wire it into the bridge.
2. Remove the duplicate timeline autoscroll rAF follower; preserve event-driven behavior.
3. Add request-local audio decode deduplication and a bounded task runner with failing tests.
4. Strengthen the shared landing-page scrim.
5. Update What's New and record QA.
6. Run lint, typecheck, full tests, and production build.

## Rollback

Revert each isolated file change. Existing serial export, audio decode, playback events, and base page background remain available.
