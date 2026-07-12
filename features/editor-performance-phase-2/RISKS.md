# Risks

| Risk | Level | Mitigation |
|---|---|---|
| Wrong audio cache key reuses another trim/track | High | Key source, trim start, duration, track; focused tests |
| Decode pool stalls after rejection | High | Settle every task; preserve null-on-decode-failure behavior |
| Timeline autoscroll becomes less smooth | Medium | Keep 60 Hz playback event owner; manual playback QA |
| Landing artwork becomes too dark | Low | Change only shared scrim; retain artwork and layout |

No dependencies, secrets, auth, persistence schema, or public API changes.
