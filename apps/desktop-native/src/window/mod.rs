//! Window module — per-window state, main window proc, helpers.
//!
//! Mirrors `apps/desktop-web/src/state/editor_state.rs` + window proc.

pub mod shortcuts;

use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::WindowsAndMessaging::{GWLP_USERDATA, GetClientRect, GetWindowLongPtrW};

use crate::render::Renderer;
use crate::state::{History, Project};
use crate::theme::TIMELINE_MIN_SECONDS;
use crate::ui::font::FontCache;

/// Drag mode for clip interaction (move vs trim right edge).
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum DragMode {
    /// Moving the whole clip (drag from the body).
    Move,
    /// Trimming the right edge (drag from the last 8px).
    TrimRight,
}

/// Active drag state for a clip being moved or trimmed.
#[derive(Clone, Copy, Debug)]
pub struct DragState {
    pub track_index: usize,
    pub element_index: usize,
    pub mode: DragMode,
    /// The pixel x where the drag started.
    pub start_x: i32,
    /// The element's start_seconds at drag start.
    pub start_seconds: f64,
    /// The element's duration at drag start.
    pub start_duration: f64,
}

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
    /// Active clip drag (set on WM_LBUTTONDOWN over a clip, cleared on
    /// WM_LBUTTONUP). None when no drag is in progress.
    pub drag: Option<DragState>,
    /// Undo/redo history (snapshot stack). Push before mutating actions.
    pub history: History,
    /// Timeline zoom: pixels per second. Default 20, range [4, 400].
    /// Higher = more zoomed in. Ctrl+wheel or +/- to change.
    pub zoom_pps: f64,
    /// Timeline horizontal scroll offset, in seconds. 0 = start of
    /// timeline. Wheel scroll (no Ctrl) to change.
    pub scroll_seconds: f64,
    /// Cached GDI fonts (Segoe UI at 5 sizes). Created once, reused
    /// across paints. Deleted on window destroy.
    pub fonts: FontCache,
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
            drag: None,
            history: History::new(),
            zoom_pps: 20.0,
            scroll_seconds: 0.0,
            fonts: FontCache::new(),
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

/// Convert a time (seconds) to a pixel x within the timeline clip area,
/// given zoom (pps) + scroll offset (seconds) + the clip area's left x.
pub fn time_to_x(seconds: f64, zoom_pps: f64, scroll_seconds: f64, clip_area_left: i32) -> i32 {
    clip_area_left + ((seconds - scroll_seconds) * zoom_pps) as i32
}

/// Convert a pixel x within the timeline clip area back to time (seconds).
pub fn x_to_time(px: i32, zoom_pps: f64, scroll_seconds: f64, clip_area_left: i32) -> f64 {
    scroll_seconds + (px - clip_area_left) as f64 / zoom_pps
}

/// Clamp zoom to a sensible range [4, 400] pps.
pub fn clamp_zoom(z: f64) -> f64 {
    z.clamp(4.0, 400.0)
}

/// Clamp scroll so it never goes negative.
pub fn clamp_scroll(s: f64) -> f64 {
    s.max(0.0)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn time_to_x_round_trips() {
        let z = 50.0;
        let scroll = 10.0;
        let left = 200;
        let t = 15.0;
        let px = time_to_x(t, z, scroll, left);
        // (15 - 10) * 50 = 250, + 200 = 450
        assert_eq!(px, 450);
        assert!((x_to_time(px, z, scroll, left) - t).abs() < 1e-9);
    }

    #[test]
    fn clamp_zoom_bounds_range() {
        assert_eq!(clamp_zoom(1.0), 4.0);
        assert_eq!(clamp_zoom(1000.0), 400.0);
        assert_eq!(clamp_zoom(50.0), 50.0);
    }

    #[test]
    fn clamp_scroll_never_negative() {
        assert_eq!(clamp_scroll(-5.0), 0.0);
        assert_eq!(clamp_scroll(10.0), 10.0);
    }
}
