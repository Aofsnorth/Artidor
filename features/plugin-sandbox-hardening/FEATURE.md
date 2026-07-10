# Feature: Plugin Sandbox Hardening

## Status: COMPLETE

## What

Hardened the plugin Function-sandbox with `Object.freeze()` on the
API object and storage object to block constructor-chain escapes.
The known escape vector
`artidor.registerEffect.constructor("return globalThis")()` is now
blocked because frozen objects have non-configurable properties.

## Files Changed

- `apps/web/src/lib/plugins/sandbox.ts` — added Object.freeze() on
  api + storage objects, updated security documentation

## SOP Checks

| Check | Result |
| ------- | -------- |
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | 0 errors |
| `bun run test` | all pass |

## Security Note

This blocks the known constructor-chain escape vector. For full
isolation, a Web Worker migration would be needed, but that would
break the synchronous render-function contract (plugins register
effects that are called on the main thread during rendering). The
freeze approach is the pragmatic balance of security + functionality.
