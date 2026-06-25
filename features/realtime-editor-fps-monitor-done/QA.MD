# QA — Realtime Editor FPS Monitor

## Toggle on/off test
- Open Settings.
- Enable FPS monitor.
- Verify badge appears.
- Disable FPS monitor.
- Verify badge disappears.

## Reload persistence test
- Toggle setting.
- Reload editor.
- Verify setting persists.

## Editor FPS value updates test
- Enable monitor.
- Interact with editor.
- Verify displayed FPS updates live and does not flicker excessively.

## No UI overlap test
- Verify badge does not block timeline controls or important editor UI.
- Test hover/click around bottom-left editor area.

## Mobile/responsive test
- Test narrow viewport/panel widths.
- Verify badge remains readable or safely repositions/hides if needed.
- Verify no horizontal overflow.

## Performance overhead check
- Disable monitor and verify no visible badge/measurement loop.
- Enable monitor and verify no obvious new lag.
