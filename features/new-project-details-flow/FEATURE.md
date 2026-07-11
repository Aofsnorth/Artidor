# Feature: New-Project Details Flow

## Problem

When a user creates a new project, the right-hand Properties panel sometimes renders as an empty shell instead of showing the Details tab with project metadata. This happens because the editor's singleton selection manager can still hold element refs from the previous project. `PropertiesPanel` sees `selectedElements.length > 0`, tries to render the element inspector, but the resolved `elementWithTrack` is undefined, so the panel returns `null`.

## Goal

After creating a new project, the Properties panel must immediately display the populated Details tab (project name, duration, frame rate, resolution, background, activity) with no stale element selection interfering.

## Non-Goals

- Redesigning the entire properties panel tab system.
- Changing how element inspector tabs are rendered when an element is selected.
- Adding persistence for the global active inspector tab beyond the existing session snapshot.

## Roadmap Alignment

Supports the current focus on **Stabilization** and editor reliability.

- [x] P1 Important
- [ ] P0 Critical
- [ ] P2 Nice to Have
- [ ] Not on roadmap, approval required

## What's New

- [x] Yes — minor user-facing workflow fix: new projects now land with the Details tab visible and populated.

Reason: This is a visible editor workflow change that users will notice on first project creation.

## Acceptance Criteria

- [ ] Creating a new project clears any stale timeline element selection.
- [ ] Creating a new project sets the active inspector tab to Details.
- [ ] The Details view reads the active project and displays populated fields.
- [ ] All new UI strings in the Details view are translatable (`properties.details.*` / `projectDetails.*`).
- [ ] `bunx tsc --noEmit`, `bun run lint:web`, and `bun test apps/web/src` pass.

## Affected Areas

- [x] `apps/web`
- [ ] `rust`
- [ ] `packages/mcp-server`
- [ ] `docs`
- [x] tests
