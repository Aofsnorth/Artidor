# Risks

## Technical risks
- Stale/invalid UI state.
- Ambiguous selected targets.
- Coupling to existing editor state.

## UX risks
- Confusing affordances.
- Restoring state users did not expect.
- Layout clipping on small panels.

## Security risks
- Must not store sensitive data, API keys, auth data, media blobs, or project content in unsafe local session storage.

## Performance risks
- Excessive writes or re-renders.
- Large localStorage payloads.

## Possible regressions
- Timeline selection.
- Inspector tabs.
- Asset/template cards.
- Existing project save behavior.

## Rollback plan
Revert feature-scoped files and ignore/remove feature-scoped persisted session data.
