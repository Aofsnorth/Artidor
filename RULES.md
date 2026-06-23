# Artidor Engineering Rules

These rules apply to humans and AI agents.

## Core Rules

1. Make the smallest safe change.
2. Do not refactor unrelated code.
3. Do not add dependencies unless explicitly justified.
4. Do not edit generated files.
5. Do not edit `.env*` files.
6. Do not commit secrets, tokens, keys, private credentials, cookies, or session data.
7. Do not weaken tests to make them pass.
8. Do not suppress TypeScript errors with `any` unless justified.
9. Do not ignore Rust warnings/errors without justification.
10. Do not push directly to `main`.
11. Do not force-push shared branches.
12. Do not merge without CI passing.
13. Do not ship unreviewed security-sensitive changes.
14. Prefer typed boundaries over dynamic/implicit behavior.

## Architecture Rules

React components own rendering and interaction, not domain logic.

Rust owns platform-agnostic core logic:
- timeline math
- compositor logic
- media primitives
- GPU effects
- mask/effect validation

The AI copilot must operate through typed tools.

## Production Code Rules

Code must be written as if this product is used by real paying users.

Required standards:

- Readable over clever.
- Explicit over magical.
- Typed over dynamic.
- Tested over assumed.
- Secure by default.
- Fail safely.
- Preserve user data.
- Preserve backward compatibility.
- Avoid unnecessary dependencies.
- Avoid global side effects.
- Avoid hidden coupling.

## SOLID Guidance

Use SOLID practically, not dogmatically.

### Single Responsibility

Each module/function should have one clear reason to change.

Bad:
- UI component that renders, validates, saves, logs, and transforms timeline data.

Good:
- UI renders.
- Hook coordinates.
- Core validates.
- Service persists.

### Open/Closed

Prefer extending through typed interfaces or command/tool registries instead of editing many unrelated files.

### Liskov Substitution

Do not create types/classes that look compatible but break expected behavior.

### Interface Segregation

Do not pass giant objects when a small typed interface is enough.

### Dependency Inversion

Core logic should not depend directly on UI framework, browser-only APIs, or provider-specific AI code.

## Bug Prevention Rules

Before finalizing any code:

- Check null/undefined cases.
- Check empty input.
- Check large input.
- Check invalid input.
- Check async failure.
- Check browser compatibility.
- Check undo/redo impact.
- Check persistence impact.
- Check export/render impact.
- Check security impact.

## Forbidden Code Smells

Avoid:

- Massive files without reason.
- Functions doing too many things.
- `any` as escape hatch.
- Duplicate logic.
- Magic numbers without explanation.
- Silent catch blocks.
- Console spam.
- TODO without issue/context.
- Unvalidated external input.
- Direct mutation of shared state.
- Tight coupling between UI and core logic.

## Dependency Rules

Before adding dependency:
- Explain why existing platform/API is insufficient.
- Check package maintenance.
- Check license.
- Check bundle impact.
- Check security.
- Add tests around usage.

## Done Definition

A change is done only when:
- Code is implemented.
- QA is documented.
- Tests are updated or skip reason is documented.
- Security implications are checked.
- Rollback plan exists for risky changes.
