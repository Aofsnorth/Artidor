//! Keyboard + mouse + timer handlers — extracted from the main window proc.
//!
//! Each handler takes the HWND + window state and returns `true` if the
//! window should be invalidated (repainted). Mirrors
//! `apps/desktop-web/src/shortcuts.rs`.

use windows::Win32::Foundation::{HWND, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::InvalidateRect;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetKeyState, VK_CONTROL, VK_DELETE, VK_DOWN, VK_LEFT, VK_RIGHT, VK_UP,
};
use windows::Win32::UI::WindowsAndMessaging::GetClientRect;
use windows::Win32::UI::WindowsAndMessaging::{KillTimer, SetTimer};

use crate::dialogs;
use crate::export;
use crate::render::viewport::renderer_for;
use crate::state::{self, Element, Track, TrackType};
use crate::theme::PLAYBACK_TIMER_ID;
use crate::ui::layout::Layout;
use crate::window::{
    DragMode, DragState, WindowState, child_hwnd, clamp_scroll, clamp_zoom, timeline_duration,
    window_state, window_state_mut,
};

/// Handle a WM_KEYDOWN message. Returns true if the window should repaint.
pub unsafe fn handle_keydown(hwnd: HWND, wparam: WPARAM) -> bool {
    unsafe {
        let key = wparam.0 as u16;
        let mut dirty = false;
        if let Some(state) = window_state_mut(hwnd) {
            let track_count = state.project.scene.tracks.len();
            match key {
                k if k == VK_LEFT.0 => {
                    dirty = state.project.seek_relative_frame(-1).is_some();
                }
                k if k == VK_RIGHT.0 => {
                    dirty = state.project.seek_relative_frame(1).is_some();
                }
                k if k == VK_UP.0 && track_count > 0 => {
                    if state.selected_track > 0 {
                        state.selected_track -= 1;
                        dirty = true;
                    }
                }
                k if k == VK_DOWN.0 && track_count > 0 => {
                    if state.selected_track + 1 < track_count {
                        state.selected_track += 1;
                        dirty = true;
                    }
                }
                // '+' = zoom in, '-' = zoom out (no Ctrl needed).
                0xBB | 0x6B => {
                    state.zoom_pps = clamp_zoom(state.zoom_pps * 1.25);
                    dirty = true;
                }
                0xBD | 0x2D => {
                    state.zoom_pps = clamp_zoom(state.zoom_pps / 1.25);
                    dirty = true;
                }
                0x54 => {
                    let types = [
                        TrackType::Video,
                        TrackType::Text,
                        TrackType::Audio,
                        TrackType::Graphic,
                    ];
                    let next_type = types[track_count % types.len()];
                    let id = format!("track-{}", track_count + 1);
                    let name = format!("{}", next_type.label());
                    state.history.push(&state.project);
                    state.project.add_track(Track::new(id, name, next_type));
                    state.selected_track = state.project.scene.tracks.len() - 1;
                    dirty = true;
                }
                0x4D if track_count > 0 => {
                    let sel = state.selected_track;
                    let track_id = state.project.scene.tracks[sel].id.clone();
                    state.history.push(&state.project);
                    let _ = state.project.toggle_track_mute(&track_id);
                    dirty = true;
                }
                0x45 if track_count > 0 && GetKeyState(VK_CONTROL.0 as i32) >= 0 => {
                    let sel = state.selected_track;
                    let track_id = state.project.scene.tracks[sel].id.clone();
                    let start = state.project.playhead.as_seconds();
                    let el_count = state.project.scene.tracks[sel].elements.len();
                    let el = Element::new(
                        format!("el-{}", el_count + 1),
                        format!("Clip {}", el_count + 1),
                        start,
                        5.0,
                    );
                    state.history.push(&state.project);
                    let _ = state.project.add_element(&track_id, el);
                    dirty = true;
                }
                0x20 => {
                    if state.playing {
                        state.playing = false;
                        let _ = KillTimer(Some(hwnd), PLAYBACK_TIMER_ID);
                    } else {
                        let duration = timeline_duration(&state.project);
                        if state.project.playhead.as_seconds() >= duration {
                            let _ = state.project.seek_seconds(0.0);
                        }
                        state.playing = true;
                        let fps = state.project.settings.fps;
                        let interval_ms = 1000 / (fps.numerator / fps.denominator).max(1);
                        let _ = SetTimer(Some(hwnd), PLAYBACK_TIMER_ID, interval_ms, None);
                    }
                    dirty = true;
                }
                k if k == VK_DELETE.0 => {
                    if let Some((ti, ei)) = state.selected_element {
                        if ti < state.project.scene.tracks.len() {
                            let track_id = state.project.scene.tracks[ti].id.clone();
                            if ei < state.project.scene.tracks[ti].elements.len() {
                                let element_id =
                                    state.project.scene.tracks[ti].elements[ei].id.clone();
                                state.history.push(&state.project);
                                state.project.remove_element(&track_id, &element_id);
                                state.selected_element = None;
                                dirty = true;
                            }
                        }
                    }
                }
                _ => {}
            }
        }

        // Ctrl+key shortcuts (checked after the main match to avoid
        // double-borrowing the window state).
        if key == 0x53 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            dirty |= handle_save(hwnd);
        }
        if key == 0x4F && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            dirty |= handle_open(hwnd);
        }
        if key == 0x49 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            dirty |= handle_import(hwnd);
        }
        if key == 0x52 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            dirty |= handle_rename(hwnd);
        }
        if key == 0x50 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            dirty |= handle_teleprompter(hwnd);
        }
        if key == 0x45 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            dirty |= handle_export(hwnd);
        }
        // Ctrl+Z = undo, Ctrl+Y = Ctrl+Shift+Z = redo.
        if key == 0x5A && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            if GetKeyState(windows::Win32::UI::Input::KeyboardAndMouse::VK_SHIFT.0 as i32) < 0 {
                dirty |= handle_redo(hwnd);
            } else {
                dirty |= handle_undo(hwnd);
            }
        }
        if key == 0x59 && GetKeyState(VK_CONTROL.0 as i32) < 0 {
            dirty |= handle_redo(hwnd);
        }

        if dirty {
            let _ = InvalidateRect(Some(hwnd), None, false);
        }
        dirty
    }
}

/// Handle WM_LBUTTONDOWN: click-to-select-clip or click-to-seek.
pub unsafe fn handle_lbuttondown(hwnd: HWND, lparam: windows::Win32::Foundation::LPARAM) -> bool {
    unsafe {
        let x = (lparam.0 & 0xFFFF) as i16 as i32;
        let y = ((lparam.0 >> 16) & 0xFFFF) as i16 as i32;
        if let Some(state) = window_state_mut(hwnd) {
            let mut client = RECT::default();
            if GetClientRect(hwnd, &mut client).is_ok() {
                let layout =
                    Layout::compute(client.right - client.left, client.bottom - client.top);
                let tl = &layout.timeline;
                let readout_h = 22;
                let list_bottom = tl.bottom - readout_h;
                let panel_w = tl.right - tl.left;
                let duration = timeline_duration(&state.project);

                // Step 1: hit-test clip blocks (pixel-accurate via zoom/scroll).
                let mut clicked_clip: Option<(usize, usize)> = None;
                if y >= tl.top && y <= list_bottom {
                    let mut row_y = tl.top + 8;
                    for (ti, track) in state.project.scene.tracks.iter().enumerate() {
                        if row_y + 28 > list_bottom {
                            break;
                        }
                        let row_top = row_y;
                        let row_bottom = row_y + 26;
                        let header_right = tl.left + 8 + 140;
                        let clip_area_left = header_right + 4;
                        let clip_area_right = tl.left + panel_w - 8 - 4;
                        if y >= row_top && y <= row_bottom {
                            for (ei, element) in track.elements.iter().enumerate() {
                                let clip_x = crate::window::time_to_x(
                                    element.start_seconds,
                                    state.zoom_pps,
                                    state.scroll_seconds,
                                    clip_area_left,
                                );
                                let clip_end_x = crate::window::time_to_x(
                                    element.end_seconds(),
                                    state.zoom_pps,
                                    state.scroll_seconds,
                                    clip_area_left,
                                );
                                let clip_w = (clip_end_x - clip_x).max(2);
                                if x >= clip_x && x <= clip_x + clip_w {
                                    clicked_clip = Some((ti, ei));
                                    break;
                                }
                            }
                            break;
                        }
                        row_y += 28;
                    }
                }

                if let Some((ti, ei)) = clicked_clip {
                    state.selected_element = Some((ti, ei));
                    state.selected_track = ti;
                    // Start a drag: trim if click is in the last 8px of
                    // the clip, else move. Push history so the drag can
                    // be undone as a single action.
                    let track = &state.project.scene.tracks[ti];
                    let element = &track.elements[ei];
                    let header_right = tl.left + 8 + 140;
                    let clip_area_left = header_right + 4;
                    let clip_x = crate::window::time_to_x(
                        element.start_seconds,
                        state.zoom_pps,
                        state.scroll_seconds,
                        clip_area_left,
                    );
                    let clip_end_x = crate::window::time_to_x(
                        element.end_seconds(),
                        state.zoom_pps,
                        state.scroll_seconds,
                        clip_area_left,
                    );
                    let clip_w = (clip_end_x - clip_x).max(2);
                    let mode = if x >= clip_x + clip_w - 8 {
                        DragMode::TrimRight
                    } else {
                        DragMode::Move
                    };
                    state.drag = Some(DragState {
                        track_index: ti,
                        element_index: ei,
                        mode,
                        start_x: x,
                        start_seconds: element.start_seconds,
                        start_duration: element.duration_seconds,
                    });
                    state.history.push(&state.project);
                    return true;
                } else if x >= tl.left + 8 && x <= tl.right - 8 && y >= tl.top && y <= list_bottom {
                    state.selected_element = None;
                    // Click-to-seek: convert pixel x to time via zoom/scroll.
                    let header_right = tl.left + 8 + 140;
                    let clip_area_left = header_right + 4;
                    let seconds = crate::window::x_to_time(
                        x,
                        state.zoom_pps,
                        state.scroll_seconds,
                        clip_area_left,
                    );
                    if seconds >= 0.0 && state.project.seek_seconds(seconds) {
                        return true;
                    }
                }
            }
        }
        false
    }
}

/// Handle WM_TIMER: advance the playhead one frame.
pub unsafe fn handle_timer(hwnd: HWND, wparam: WPARAM) -> bool {
    unsafe {
        if wparam.0 != PLAYBACK_TIMER_ID {
            return false;
        }
        if let Some(state) = window_state_mut(hwnd) {
            if state.playing {
                let duration = timeline_duration(&state.project);
                let current = state.project.playhead.as_seconds();
                if current >= duration {
                    state.playing = false;
                    let _ = KillTimer(Some(hwnd), PLAYBACK_TIMER_ID);
                    let _ = state.project.seek_seconds(0.0);
                } else {
                    let _ = state.project.seek_relative_frame(1);
                }
                return true;
            }
        }
        false
    }
}

// --- Ctrl+key action handlers ---

fn handle_save(hwnd: HWND) -> bool {
    if let Some(state) = window_state(hwnd) {
        let default_name = format!(
            "{}.{}",
            state.project.metadata.id,
            crate::state::persistence::PROJECT_EXT
        );
        let filters = [dialogs::Filter {
            label: "Artidor project (*.artpr.json)",
            extensions: "*.artpr.json",
        }];
        match dialogs::save_dialog(hwnd, "Save Project", &filters, "artpr.json", &default_name) {
            Ok(Some(path)) => {
                if let Some(state) = window_state_mut(hwnd) {
                    match crate::state::persistence::save_project(&path, &state.project) {
                        Ok(()) => {
                            let msg = format!("Saved project to:\n\n{}", path.display());
                            crate::window::shortcuts::message_box(&msg, false);
                        }
                        Err(e) => {
                            let msg = format!("Save failed:\n\n{e}");
                            crate::window::shortcuts::message_box(&msg, true);
                        }
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                let msg = format!("Save dialog error:\n\n{e}");
                crate::window::shortcuts::message_box(&msg, true);
            }
        }
    }
    false
}

fn handle_open(hwnd: HWND) -> bool {
    let filters = [dialogs::Filter {
        label: "Artidor project (*.artpr.json)",
        extensions: "*.artpr.json",
    }];
    match dialogs::open_dialog(hwnd, "Open Project", &filters) {
        Ok(Some(path)) => match crate::state::persistence::load_project(&path) {
            Ok(project) => {
                if let Some(state) = window_state_mut(hwnd) {
                    state.project = project;
                    state.selected_track = 0;
                    state.selected_element = None;
                    return true;
                }
            }
            Err(e) => {
                let msg = format!("Open failed:\n\n{e}");
                crate::window::shortcuts::message_box(&msg, true);
            }
        },
        Ok(None) => {}
        Err(e) => {
            let msg = format!("Open dialog error:\n\n{e}");
            crate::window::shortcuts::message_box(&msg, true);
        }
    }
    false
}

fn handle_import(hwnd: HWND) -> bool {
    let filters = [
        dialogs::Filter {
            label: "Media files (*.png;*.jpg;*.mp4;*.mp3)",
            extensions: "*.png;*.jpg;*.jpeg;*.mp4;*.mov;*.mp3;*.wav",
        },
        dialogs::Filter {
            label: "All files (*.*)",
            extensions: "*.*",
        },
    ];
    match dialogs::open_dialog(hwnd, "Import Media", &filters) {
        Ok(Some(path)) => {
            if let Some(state) = window_state_mut(hwnd) {
                let asset = state::MediaAsset::from_path(
                    format!("asset-{}", state.project.assets.len() + 1),
                    &path,
                );
                state.project.add_asset(asset);
                let msg = format!(
                    "Imported media:\n\n{}\n\nAdded to project assets.",
                    path.display()
                );
                message_box(&msg, false);
                return true;
            }
        }
        Ok(None) => {}
        Err(e) => {
            let msg = format!("Import dialog error:\n\n{e}");
            message_box(&msg, true);
        }
    }
    false
}

fn handle_rename(hwnd: HWND) -> bool {
    if let Some(state) = window_state(hwnd) {
        let current_name = state.project.metadata.name.clone();
        match dialogs::prompt_dialog(hwnd, "Rename Project", "Project name:", &current_name) {
            Ok(Some(new_name)) => {
                let now_ms = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                if let Some(state) = window_state_mut(hwnd) {
                    if state.project.rename(&new_name, now_ms) {
                        return true;
                    } else {
                        message_box("Name cannot be empty or whitespace-only.", true);
                    }
                }
            }
            Ok(None) => {}
            Err(e) => {
                let msg = format!("Rename dialog error:\n\n{e}");
                message_box(&msg, true);
            }
        }
    }
    false
}

fn handle_teleprompter(hwnd: HWND) -> bool {
    if let Some(state) = window_state(hwnd) {
        let current_text = state.teleprompter_text.clone();
        match dialogs::prompt_dialog(
            hwnd,
            "Teleprompter",
            "Scrolling text (empty = off):",
            &current_text,
        ) {
            Ok(Some(new_text)) => {
                if let Some(state) = window_state_mut(hwnd) {
                    let trimmed = new_text.trim();
                    if trimmed.is_empty() {
                        state.teleprompter_text.clear();
                        state.teleprompter_on = false;
                    } else {
                        state.teleprompter_text = new_text;
                        state.teleprompter_on = true;
                    }
                    return true;
                }
            }
            Ok(None) => {}
            Err(e) => {
                let msg = format!("Teleprompter dialog error:\n\n{e}");
                message_box(&msg, true);
            }
        }
    }
    false
}

fn handle_export(hwnd: HWND) -> bool {
    if let (Some(state), Some(child)) = (window_state(hwnd), child_hwnd(hwnd)) {
        if let Some(renderer) = renderer_for(child) {
            let default_name = format!("{}-export.mp4", state.project.metadata.id);
            let filters = [
                dialogs::Filter {
                    label: "MP4 video (*.mp4)",
                    extensions: "*.mp4",
                },
                dialogs::Filter {
                    label: "All files (*.*)",
                    extensions: "*.*",
                },
            ];
            match dialogs::save_dialog(hwnd, "Export Video", &filters, "mp4", &default_name) {
                Ok(Some(path)) => {
                    let project = state.project.clone();
                    let opts = export::ExportOptions::from_project(&project, &path, 30);
                    match renderer.export_video(&project, &opts) {
                        Ok(out) => {
                            let msg = format!(
                                "Exported video to:\n\n{}\n\n(top-1 native FFmpeg pipeline)",
                                out.display()
                            );
                            message_box(&msg, false);
                        }
                        Err(e) => {
                            let msg = format!(
                                "Export failed:\n\n{e}\n\n(Is ffmpeg installed or bundled?)"
                            );
                            message_box(&msg, true);
                        }
                    }
                }
                Ok(None) => {}
                Err(e) => {
                    let msg = format!("Export dialog error:\n\n{e}");
                    message_box(&msg, true);
                }
            }
        }
    }
    false
}

/// Show a simple modal MessageBox with the Artidor title.
/// Handle WM_MOUSEMOVE: if a drag is active, move or trim the clip.
pub unsafe fn handle_mousemove(hwnd: HWND, lparam: windows::Win32::Foundation::LPARAM) -> bool {
    unsafe {
        let x = (lparam.0 & 0xFFFF) as i16 as i32;
        if let Some(state) = window_state_mut(hwnd) {
            if let Some(drag) = state.drag {
                let mut client = RECT::default();
                if GetClientRect(hwnd, &mut client).is_ok() {
                    let layout =
                        Layout::compute(client.right - client.left, client.bottom - client.top);
                    let tl = &layout.timeline;
                    let panel_w = tl.right - tl.left;
                    let header_right = tl.left + 8 + 140;
                    let clip_area_left = header_right + 4;
                    let _clip_area_right = tl.left + panel_w - 8 - 4;
                    // Delta in seconds = delta_px / zoom_pps.
                    let delta_px = (x - drag.start_x) as f64;
                    let delta_seconds = delta_px / state.zoom_pps;

                    let track_id = state.project.scene.tracks[drag.track_index].id.clone();
                    let element_id = state.project.scene.tracks[drag.track_index].elements
                        [drag.element_index]
                        .id
                        .clone();

                    match drag.mode {
                        DragMode::Move => {
                            let new_start = (drag.start_seconds + delta_seconds).max(0.0);
                            state
                                .project
                                .move_element(&track_id, &element_id, new_start);
                        }
                        DragMode::TrimRight => {
                            let new_dur = (drag.start_duration + delta_seconds).max(0.1);
                            state.project.trim_element(&track_id, &element_id, new_dur);
                        }
                    }
                    return true;
                }
            }
        }
        false
    }
}

/// Handle WM_LBUTTONUP: end any active drag.
pub unsafe fn handle_lbuttonup(hwnd: HWND) -> bool {
    unsafe {
        if let Some(state) = window_state_mut(hwnd) {
            if state.drag.is_some() {
                state.drag = None;
                return true;
            }
        }
        false
    }
}

/// Handle WM_MOUSEWHEEL: Ctrl+wheel = zoom, wheel = horizontal scroll.
/// `wparam_hi` is the wheel delta (multiples of 120). `lparam` holds the
/// mouse position (screen coords). Returns true if the view changed.
pub unsafe fn handle_mousewheel(hwnd: HWND, wparam: WPARAM) -> bool {
    unsafe {
        let wheel_delta = ((wparam.0 >> 16) & 0xFFFF) as i16 as i32;
        let ctrl_down = GetKeyState(VK_CONTROL.0 as i32) < 0;
        if let Some(state) = window_state_mut(hwnd) {
            if ctrl_down {
                // Zoom: each 120 delta = 1.25x factor.
                let factor = 1.25_f64.powi(wheel_delta / 120);
                state.zoom_pps = clamp_zoom(state.zoom_pps * factor);
            } else {
                // Horizontal scroll: each 120 delta = 2 seconds.
                let delta_seconds = -(wheel_delta as f64 / 120.0) * 2.0;
                state.scroll_seconds = clamp_scroll(state.scroll_seconds + delta_seconds);
            }
            return true;
        }
        false
    }
}

/// Handle Ctrl+Z: undo the last mutating action.
fn handle_undo(hwnd: HWND) -> bool {
    if let Some(state) = window_state_mut(hwnd) {
        if let Some(prev) = state.history.undo(&state.project) {
            state.project = prev;
            state.selected_element = None;
            return true;
        }
    }
    false
}

/// Handle Ctrl+Y / Ctrl+Shift+Z: redo.
fn handle_redo(hwnd: HWND) -> bool {
    if let Some(state) = window_state_mut(hwnd) {
        if let Some(next) = state.history.redo(&state.project) {
            state.project = next;
            state.selected_element = None;
            return true;
        }
    }
    false
}

pub fn message_box(text: &str, error: bool) {
    use windows::Win32::UI::WindowsAndMessaging::{MB_ICONERROR, MB_OK, MessageBoxW};
    use windows::core::{PCWSTR, w};
    let wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let flags = if error { MB_OK | MB_ICONERROR } else { MB_OK };
    unsafe {
        let _ = MessageBoxW(None, PCWSTR(wide.as_ptr()), w!("Artidor — Native"), flags);
    }
}
