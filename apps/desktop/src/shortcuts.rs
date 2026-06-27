//! Keyboard shortcut bindings.
//!
//! Registers GPUI `KeyBinding`s that map keystrokes to editor actions.
//! Uses `control` on Windows/Linux and `platform` (cmd) on macOS.

use crate::actions::*;
use gpui::{App, KeyBinding};

/// Registers all editor key bindings with the GPUI app.
pub fn register(cx: &mut App) {
    // Playback
    cx.bind_keys([
        KeyBinding::new("space", PlayPause, None),
        KeyBinding::new("escape", Stop, None),
        KeyBinding::new("right", StepForward, None),
        KeyBinding::new("left", StepBackward, None),
        KeyBinding::new("home", JumpToStart, None),
        KeyBinding::new("end", JumpToEnd, None),
        KeyBinding::new("l", ToggleLoop, None),
    ]);

    // Editing
    cx.bind_keys([
        KeyBinding::new("s", SplitAtPlayhead, None),
        KeyBinding::new("delete", DeleteSelected, None),
        KeyBinding::new("backspace", DeleteSelected, None),
        KeyBinding::new("ctrl-d", DuplicateSelected, None),
        KeyBinding::new("ctrl-a", SelectAll, None),
        KeyBinding::new("escape", DeselectAll, None),
    ]);

    // View
    cx.bind_keys([
        KeyBinding::new("plus", ZoomIn, None),
        KeyBinding::new("minus", ZoomOut, None),
        KeyBinding::new("0", ZoomToFit, None),
        KeyBinding::new("f11", ToggleFullscreen, None),
    ]);

    // Project
    cx.bind_keys([
        KeyBinding::new("ctrl-i", ImportMedia, None),
        KeyBinding::new("ctrl-s", SaveProject, None),
        KeyBinding::new("ctrl-o", OpenProject, None),
        KeyBinding::new("ctrl-n", NewProject, None),
        KeyBinding::new("ctrl-e", ExportVideo, None),
    ]);

    // Panels
    cx.bind_keys([
        KeyBinding::new("ctrl-b", ToggleAssetsPanel, None),
        KeyBinding::new("ctrl-j", ToggleInspectorPanel, None),
        KeyBinding::new("ctrl-t", ToggleTimeline, None),
    ]);

    // AI
    cx.bind_keys([KeyBinding::new("ctrl-shift-a", ToggleAICopilot, None)]);
}
