# Risks

## Risks Identified

1. **Type Mismatch in Timeline Functions**: General commands modifying timeline elements (splitting, drag, updates) assume elements have standard properties. Changing `CameraElement` to extend `BaseTimelineElement` actually *reduces* risk by unifying it with other elements.
2. **Animation Field Conflicts**: `CameraElement` originally used a custom `CameraAnimations` structure. If any code relies on this custom structure (though none does), changing it to `ElementAnimations` might cause regression. Mitigation: Verify that standard property animations can be mapped, or that no components read `CameraElement.animations` expecting the old layout.
