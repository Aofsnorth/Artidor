//! Window module — per-window state, main window proc, helpers.
//!
//! Mirrors `apps/desktop-web/src/state/editor_state.rs` + window proc.

pub mod shortcuts;

use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::WindowsAndMessaging::{GWLP_USERDATA, GetClientRect, GetWindowLongPtrW};

use crate::render::Renderer;
use crate::state::Project;
use crate::theme::TIMELINE_MIN_SECONDS;

/// Per-window state for the main window. Holds the viewport child HWND
/// and the editor `Project` model. Stored in the parent's
/// `GWLP_USERDATA` (boxed) — idiomatic Win32 per-window state.
pub struct WindowState {
    pub child: Option<HWND>,
    pub project: Project,
    /// Index of the selected track (UI state, kept out of the model).
    pub selected_track: usize,
    /// Whether playback is active (Spacebar toggles).
    pub playing: bool,
    /// Selected element: (track_index, element_index).
    pub selected_element: Option<(usize, usize)>,
    /// Teleprompter text (Ctrl+P to set/clear).
    pub teleprompter_text: String,
    /// Whether the teleprompter overlay is visible.
    pub teleprompter_on: bool,
}

impl WindowState {
    /// Create a new window state with the given child HWND + project.
    pub fn new(child: HWND, project: Project) -> Self {
        Self {
            child: Some(child),
            project,
            selected_track: 0,
            playing: false,
            selected_element: None,
            teleprompter_text: String::new(),
            teleprompter_on: false,
        }
    }
}

/// Fetch the main window's `WindowState` from `GWLP_USERDATA`.
pub fn window_state(parent: HWND) -> Option<&'static WindowState> {
    unsafe {
        let raw = GetWindowLongPtrW(parent, GWLP_USERDATA) as *const WindowState;
        raw.as_ref()
    }
}

/// Fetch the main window's `WindowState` mutably.
pub fn window_state_mut(parent: HWND) -> Option<&'static mut WindowState> {
    unsafe {
        let raw = GetWindowLongPtrW(parent, GWLP_USERDATA) as *mut WindowState;
        raw.as_mut()
    }
}

/// Fetch the viewport child HWND from the main window's state.
pub fn child_hwnd(parent: HWND) -> Option<HWND> {
    window_state(parent).and_then(|s| s.child)
}

/// Fetch the per-window `Renderer` pointer from the child's GWLP_USERDATA.
pub fn renderer_for_child(parent: HWND) -> Option<&'static mut Renderer> {
    child_hwnd(parent).and_then(|child| crate::render::viewport::renderer_for(child))
}

/// The effective timeline duration for seeking / display, in seconds.
/// Uses the project's real duration if non-zero, else a minimum display
/// range so the timeline is usable for empty projects.
pub fn timeline_duration(project: &Project) -> f64 {
    if project.metadata.duration_seconds > 0.0 {
        project.metadata.duration_seconds
    } else {
        TIMELINE_MIN_SECONDS
    }
}

/// Client width of a window (0 on error).
pub fn client_width(hwnd: HWND) -> u32 {
    let mut rect = RECT::default();
    match unsafe { GetClientRect(hwnd, &mut rect) } {
        Ok(()) => (rect.right - rect.left).max(0) as u32,
        Err(_) => 0,
    }
}

/// Client height of a window (0 on error).
pub fn client_height(hwnd: HWND) -> u32 {
    let mut rect = RECT::default();
    match unsafe { GetClientRect(hwnd, &mut rect) } {
        Ok(()) => (rect.bottom - rect.top).max(0) as u32,
        Err(_) => 0,
    }
}
