# QA

## Verification Checkpoints

1. **Drop-down option check**: Open the track editor UI and check if the menu options show "Camera track" instead of "Camera layer".
2. **Add track check**: Verify that selecting "Camera track" creates a new camera track at the correct height and appends a camera element.
3. **TypeScript Build check**: Run `tsc --noEmit` and ensure it outputs no compilation errors.
