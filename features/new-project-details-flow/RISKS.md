# Risks

## Technical Risks

- Clearing selection on `createNewProject` could affect callers that expect the previous selection to survive. Mitigation: creation of a new project is semantically a fresh context; preserving selection across projects is never correct.
- `loadProject` also needs selection cleared, otherwise switching projects via the projects page has the same empty-panel bug. This change is safe for the same reason.

## Security Risks

- None. No auth, secrets, or user media paths are touched.

## UX Risks

- If a user intentionally had elements selected and somehow triggered `createNewProject`, they would lose that selection. This is acceptable because creating a new project is a context switch.

## Performance Risks

- Negligible. Adding a small Zustand action and clearing a small array does not add measurable overhead.

## Mitigations

- Keep the change minimal: only clear selection and set the active tab in `createNewProject` (and `loadProject` for consistency). Do not refactor the broader panel tab system.
