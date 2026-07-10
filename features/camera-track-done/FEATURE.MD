# Feature: Camera Track

## Original user request

Tolong ubah camera layer di add track jadi camera track (jadi camera track itu ada tracknya sendiri)

## Goal

Implement a dedicated camera track where camera elements reside, rather than having camera elements share the overlay track. Clicking "+ Add track" will present a "Camera track" option instead of "Camera layer", creating a new camera track.

## Non-Goals

- Changing other element types' track assignments (e.g. video, image, text still share overlay track).
- Rewriting the core rendering or timeline engine.

## Acceptance Criteria

- "Camera track" option exists in "+ Add track" dropdown.
- Selecting it inserts a new camera track (with `C1` prefix).
- A camera element is placed on this camera track.
- Camera element content displays camera-specific icon and name.
- Selecting the camera element shows the camera properties panel.
- All code passes TypeScript typechecking and linter checks.

## Affected Areas

- `apps/web/src/components/editor/panels/timeline/`
- `apps/web/src/components/editor/panels/properties/`
- `apps/web/src/lib/timeline/`
- `apps/web/src/core/managers/`
- `apps/web/src/lib/commands/`
