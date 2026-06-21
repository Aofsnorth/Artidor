# Realtime Editor FPS Monitor

## Original user request
Create a feature workflow for `features/realtime-editor-fps-monitor`.

Feature name: Realtime Editor FPS Monitor.

Feature goal: Add a realtime FPS monitor while editing, displayed in the bottom-left area of the editor, with a setting to enable/disable it.

## Interpreted feature goal
Add a low-overhead editor UI FPS badge that measures realtime UI/render loop smoothness with `requestAnimationFrame`, plus a persistent project-independent setting to toggle it on/off.

## User story
As a user editing a project, I want to see realtime editor FPS while working, so I can know whether the editor is lagging or running smoothly. I also want to be able to turn the FPS card off from Settings.

## Acceptance criteria
- Small realtime FPS card/badge appears in bottom-left editor area when enabled.
- FPS reflects editor/render UI performance, not project/video FPS metadata.
- FPS value updates live while editing.
- FPS display is smoothed/averaged to avoid excessive flicker.
- Measurement overhead is very low.
- FPS card visually matches existing editor UI.
- FPS card does not block timeline controls or important UI.
- Responsive/small viewport layout does not break.
- Settings card/panel includes enable/disable toggle.
- Setting persists after reload/reopen.
- Disabled state stops rendering/measuring to avoid overhead.
- Export/render pipeline and project FPS metadata are untouched.

## Non-goals
- Do not create a full performance profiler.
- Do not add charts or historical graphs.
- Do not change video playback FPS.
- Do not change export settings.
- Do not touch auth, API keys, database, AI tools, Rust/WASM, WebGPU/WGSL, or export/render pipeline except approved audit.
- Do not rewrite Settings system.

## Edge cases
- Background tab throttles `requestAnimationFrame`.
- Browser battery saver or hidden window reduces frame rate.
- Timeline bottom-left controls may overlap.
- Mobile viewport may not have safe space.
- Disabled setting should not leave active rAF loop.
- Hydration/localStorage unavailable during SSR.

## Definition of Done
- `FEATURE.MD` and `PLAN.MD` reviewed/approved.
- Settings persistence path audited.
- Bottom-left editor UI placement audited.
- FPS measurement implemented with cleanup.
- Toggle persistence verified after reload.
- No overlap/responsive QA completed.
- Lint/typecheck/build pass.
- `MAINTENANCE.MD` logs changes.
- `STATE.MD` updated after approval/verification.

## Questions for review
- Should FPS monitor default be off or on?
- Should badge show color states, e.g. green/yellow/red?
- Should it be hidden during playback/export preview or always visible while enabled?
- Which Settings panel/card should host the toggle?
