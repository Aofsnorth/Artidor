//! Window module — per-window state, main window proc, helpers.
//!
//! Mirrors `apps/desktop-web/src/state/editor_state.rs` + window proc.

pub mod shortcuts;

use windows::Win32::Foundation::{HWND, RECT};
use windows::Win32::UI::WindowsAndMessaging::{
    GWLP_USERDATA, GetClientRect, GetWindowLongPtrW, MoveWindow, ShowWindow, SW_HIDE, SW_SHOW,
};

use crate::render::Renderer;
use crate::state::AssetsTab;
use crate::state::{History, Project};
use crate::theme::TIMELINE_MIN_SECONDS;
use crate::ui::font::FontCache;
use crate::ui::header::HeaderButtons;
use crate::ui::viewport_toolbar::ToolbarButtons;
use crate::ui::home::HomeState;
use crate::ui::projects::ProjectsState;

/// App mode: home screen, project hub, or editor.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum AppMode {
    /// Home / landing screen with hero + primary CTAs.
    Home,
    /// Project hub with the full recent-projects list.
    Projects,
    /// Editor mode with the full panel layout.
    Editor,
}

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
    /// App mode: home, project hub, or editor.
    pub mode: AppMode,
    /// Home screen state (hero, CTAs, recent-preview).
    pub home: HomeState,
    /// Project hub state (full recent-projects list).
    pub projects: ProjectsState,
    /// Last auto-save timestamp (Unix epoch ms). Auto-save runs every
    /// 30s if `dirty` is true.
    pub last_autosave_ms: i64,
    /// True if the project has been modified since the last auto-save.
    pub dirty: bool,
    /// Header button rects for click hit-testing.
    pub header_btns: HeaderButtons,
    /// Active assets panel tab (Media/Effects/Templates/etc).
    pub active_tab: AssetsTab,
    /// Tab button rects from the last paint, for click hit-testing.
    pub tab_rects: Vec<RECT>,
    /// Viewport toolbar button rects for click hit-testing.
    pub toolbar_btns: ToolbarButtons,
    /// Loop playback toggle.
    pub looping: bool,
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
            mode: AppMode::Home,
            home: HomeState::new(),
            projects: ProjectsState::new(),
            last_autosave_ms: 0,
            dirty: false,
            header_btns: HeaderButtons::default(),
            active_tab: AssetsTab::Assets,
            tab_rects: Vec::new(),
            toolbar_btns: ToolbarButtons::default(),
            looping: false,
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

/// Show, hide, or reposition the viewport child window based on the
/// current `AppMode`. The child must be hidden on Home/Projects so it
/// does not obscure the landing UI, and shown + sized inside the editor
/// preview panel.
pub fn sync_viewport_child(hwnd: HWND) {
    unsafe {
        if let Some(child) = child_hwnd(hwnd) {
            if let Some(state) = window_state(hwnd) {
                if state.mode == AppMode::Editor {
                    let mut client = RECT::default();
                    if GetClientRect(hwnd, &mut client).is_ok() {
                        let layout = crate::ui::layout::Layout::compute(
                            client.right - client.left,
                            client.bottom - client.top,
                        );
                        let vw = (layout.viewport.right - layout.viewport.left).max(0);
                        let vh = (layout.viewport.bottom - layout.viewport.top).max(0);
                        let _ = MoveWindow(child, layout.viewport.left, layout.viewport.top, vw, vh, true);
                    }
                    let _ = ShowWindow(child, SW_SHOW);
                } else {
                    let _ = ShowWindow(child, SW_HIDE);
                }
            }
        }
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
