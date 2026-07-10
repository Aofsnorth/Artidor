# Risks — Realtime Editor FPS Monitor

## Performance overhead risk

- FPS measurement could add overhead if it updates React state every frame.
- Mitigation: throttle visible updates and cancel rAF when disabled.

## UI overlap risk

- Bottom-left badge may cover timeline controls or small-screen UI.
- Mitigation: audit placement and use responsive safe positioning.

## Misleading FPS value risk

- Browser background throttling or idle state may show low FPS unrelated to editor performance.
- Mitigation: label as editor FPS and keep scope clear.

## Persistence/settings risk

- Wrong storage scope could make setting project-specific or not persist.
- Mitigation: use project-independent app setting/localStorage key.

## Compatibility risk

- SSR/localStorage access can cause hydration issues.
- Mitigation: read setting only client-side after mount.
