//! Editor actions — user-defined structs that GPUI converts from keystrokes
//! into logical operations. Each action is a unit struct registered via the
//! `actions!` macro.

use gpui::actions;

actions!(
    editor,
    [
        // App
        Quit,

        // Playback
        PlayPause,
        Stop,
        StepForward,
        StepBackward,
        JumpToStart,
        JumpToEnd,
        ToggleLoop,

        // Editing
        SplitAtPlayhead,
        DeleteSelected,
        DuplicateSelected,
        SelectAll,
        DeselectAll,

        // View
        ZoomIn,
        ZoomOut,
        ZoomToFit,
        ToggleFullscreen,

        // Project
        ImportMedia,
        SaveProject,
        OpenProject,
        NewProject,
        ExportVideo,

        // Panels
        ToggleAssetsPanel,
        ToggleInspectorPanel,
        ToggleTimeline,
        FocusViewport,

        // AI
        ToggleAICopilot,
    ]
);
