# Documentation Policy

This repository requires documentation for all meaningful code changes.

AI agents and human contributors must update or create documentation whenever they write, modify, or move code.

## Prime Rule

If code is changed, documentation must be considered.

If the edited code has no documentation yet, the contributor must add the minimum useful documentation in the same change.

Do not leave newly touched production code undocumented.

## When Documentation Is Required

Documentation is required when changing:

* exported functions
* exported types/interfaces
* public APIs
* editor commands
* AI copilot tools
* MCP tools
* timeline behavior
* export/render behavior
* storage/persistence behavior
* Rust core logic
* security-sensitive logic
* user-facing UI behavior
* complex hooks
* non-obvious state management
* performance-sensitive code
* error handling behavior
* configuration files
* CI/harness/security workflows

## Existing Code Without Documentation

When editing existing code that does not have documentation:

1. Add documentation for the part being touched.
2. Do not document the entire file unless necessary.
3. Prefer small, accurate documentation over large generic documentation.
4. Explain behavior, constraints, and risks.
5. Do not add fake or vague documentation.

Example:

Bad:

```ts
// This function handles stuff.
```

Good:

```ts
/**
 * Converts timeline seconds into frame-aligned media time.
 * This must stay deterministic because undo/redo, export, and preview rendering
 * depend on stable frame boundaries.
 */
```

## TypeScript Documentation Rules

Use JSDoc for:

* exported functions
* exported classes
* exported types/interfaces
* complex hooks
* AI tool definitions
* editor command handlers
* timeline/export/storage utilities

Required format:

```ts
/**
 * Short description of what this does.
 *
 * Important behavior:
 * - ...
 *
 * Edge cases:
 * - ...
 *
 * Security / data notes:
 * - ...
 */
```

Do not add JSDoc to every tiny local variable.

Document intent, constraints, and edge cases, not obvious syntax.

## React / UI Documentation Rules

For complex components, document:

* purpose
* important props
* state ownership
* side effects
* editor/timeline impact
* accessibility behavior
* performance considerations

Example:

```ts
/**
 * TimelinePanel renders the editable timeline surface.
 *
 * It owns UI interaction state only. Timeline domain mutations must go through
 * EditorCore commands so undo/redo and persistence remain consistent.
 */
```

## Rust Documentation Rules

Use Rustdoc for:

* public structs
* public enums
* public traits
* public functions
* timeline/time/compositor/effects logic
* unsafe or performance-sensitive logic

Example:

```rust
/// Represents media time using deterministic ticks instead of floating-point seconds.
///
/// This avoids frame drift across 24/25/29.97/30/60/120 fps timelines.
```

If `unsafe` is used, documentation must explain why it is safe.

## AI Copilot Tool Documentation

Every AI tool must document:

* purpose
* input schema
* output schema
* side effects
* permission level
* failure behavior
* editor state affected

Template:

```md
## Tool: <tool_name>

Purpose:
Inputs:
Outputs:
Side effects:
Permission level:
Failure behavior:
Security notes:
```

## MCP Documentation

Every MCP tool must document:

* tool name
* allowed operations
* denied operations
* input validation
* audit logging
* secret handling
* permission level

MCP tools must never be undocumented.

## Security Documentation

Security-sensitive code must include documentation for:

* trust boundary
* input validation
* permission checks
* secret handling
* failure mode
* logging behavior
* user data impact

Security documentation must not reveal secrets or exploit instructions.

## User-Facing Documentation

If a change affects users, update at least one of:

* `README.md`
* `docs/`
* `apps/web/src/lib/whats-new/feed.ts`
* `apps/web/src/app/changelog/page.tsx`
* feature-specific documentation

User-facing documentation is required for:

* new features
* changed workflows
* changed UI behavior
* changed export behavior
* changed AI copilot behavior
* security/privacy changes
* breaking changes

## Documentation Quality Standard

Documentation must be:

* accurate
* specific
* short enough to maintain
* close to the code when possible
* updated with behavior changes
* useful to future maintainers
* honest about limitations

Avoid:

* vague comments
* outdated claims
* marketing language inside code comments
* comments that repeat the code
* huge documentation blocks for simple logic
* documenting incorrect assumptions

## Documentation Checklist

Before finishing a task:

* [ ] Did I touch code?
* [ ] Did I touch undocumented code?
* [ ] Did I add minimum useful documentation?
* [ ] Did I update existing outdated documentation?
* [ ] Did I document edge cases?
* [ ] Did I document security or data impact?
* [ ] Did I update user-facing docs if behavior changed?
* [ ] Did I update What's New if users should know?
* [ ] Did I avoid vague or fake documentation?

## Done Rule

A code change is not complete until documentation is either:

1. updated, or
2. explicitly marked as not needed with a clear reason.

Accepted reason examples:

* "No documentation update needed because this only fixes a typo in an internal test."
* "No documentation update needed because this only changes formatting."
* "No documentation update needed because this updates a generated lockfile only."

Unaccepted reason examples:

* "No docs needed."
* "Small change."
* "Obvious."
* "Later."
