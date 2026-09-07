---
name: artidor-ui-verification
description: Verifies Artidor web UI changes using isolated Playwright contexts, route coverage, keyboard assertions and honest visual evidence. Use for editor UI polish, responsive navigation, dialogs, and screenshot regression work in this repository.
---

# Artidor UI verification

## When to use

- Editor panel, public navigation, projects, dialog or shared CSS changes.
- Browser QA must preserve real user projects and existing local changes.

## When NOT to use

- Pure Rust/core math changes: use focused unit tests.
- Production authentication, sharing or cloud upload verification without explicit scope.
- Replacing designer-skill: that remains the canonical visual design procedure.

## Procedure

1. Inspect the dirty diff and record the exact files this phase owns. Read shared primitives before overriding their styles.
2. Read `apps/web/package.json` for the actual dev port and confirm an existing server is reachable. Do not assume root Playwright config uses the same port. Do not stop/restart the user's server or run an unbounded server command.
3. Use installed Playwright from a Node `.mjs` script with a disposable `browser.newContext()`. Never attach to the user's browser profile. Close browser in `finally` and save partial QA results even when a route fails.
4. Test first-run onboarding separately; for ordinary editor screenshots, initialize the known `hasSeenOnboarding` key only on the app origin. Never read real credentials/storage.
5. After editor navigation, wait for both `.editing-screen` and the dev API's ready state before inserting fixtures. Core debug globals can appear before project hydration completes. If an action disappears, inspect captured state before retrying.
6. Use `window.__ARTIDOR_API__.run` only to seed disposable fixtures; check `ok`. Use actual buttons for behavior under test. Scope selectors to the panel and explicit ARIA label: an inspector tab and its section expander can share the same visible name.
7. Capture 375/768/1440 widths. Check document overflow AND dialog bounds/internal overflow. Use device descriptors for MobileGate; a narrow desktop viewport does not trigger mobile detection.
8. Verify one focusable search input per page, native button keyboard activation exactly once, sheet focus containment/Escape/return focus, and dropdown interaction. Opacity-zero does not remove hidden links from keyboard navigation; reuse Radix Sheet/Dialog rather than a custom hidden overlay.
9. Verify computed CSS, not just class strings. Tailwind v4 layers lose to unlayered universal rules. `scrollbar-width:none` plus `::-webkit-scrollbar{display:none}` defeats a width-only scrollbar utility. Avoid global selection suppression outside editor chrome.
10. Check reduced motion, labels and representative contrast. Capture screenshots, but do not claim visual review if the image tool returns no viewable content. A screenshot existing is not proof it was inspected.
11. Run relevant tests, lint and typecheck with bounded CPU-limited commands. Run heavy jobs serially. Record timeout/network/server failures distinctly from app assertions; never claim full route coverage after a stopped server.
12. Update What's New and feature QA notes with inspected surfaces, unresolved coverage, and rollback limited to this phase's hunks.

## Pitfalls

- Dictionary values can differ from intuitive names: inspect `dictionaries.ts` before writing exact role selectors.
- A dev route can redirect an unknown project ID; don't persist or assert the literal fixture route as final identity.
- Chrome error pages deny localStorage; an init script must check origin before accessing storage or it creates a false app error.
- Disable GPU only when testing fallback behavior. Headless unsupported WebGPU does not validate real playback quality.
- Read/write JSON as UTF-8 on Windows; default Python cp1252 cannot decode some app text.
- File-edit batches can partially apply before a later match fails. Continue from the reported success, never blindly replay the full batch.

## Verification

- `features/ui-polish-2026-09-06/inspect.mjs` captures asset tabs and baseline metrics against the existing server.
- `features/ui-polish-2026-09-06/verify.mjs` exercises navigation, inspector, projects, settings, routes and mobile gates. Read scripts before running; port and labels may evolve.
- No real media uploads, auth attempts, user storage mutation, dependencies, or generated-source edits.
- Every claimed pass has actual command output; unvisited routes and unavailable GPU/visual review remain explicit.
