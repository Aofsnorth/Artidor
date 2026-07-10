//! Artidor native desktop shell — Win32 API + native WGPU/D3D12 compositor.
//!
//! Entry point + window class registration + main window proc + message
//! loop. All rendering, state, input, and logic live in submodules.
//! Mirrors `apps/desktop-web/src/main.rs` (thin entry, logic in modules).

#![windows_subsystem = "windows"]

mod ai;
mod dialogs;
mod export;
mod media;
mod playback;
mod render;
mod state;
mod theme;
mod ui;
mod window;

use windows::Win32::Foundation::{GetLastError, HINSTANCE, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    BLACK_BRUSH, BeginPaint, BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC,
    DeleteObject, EndPaint, GetStockObject, HBITMAP, HBRUSH, HDC, HGDIOBJ, InvalidateRect,
    PAINTSTRUCT, SRCCOPY, SelectObject, UpdateWindow,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetClientRect, GetMessageW,
    KillTimer, LoadCursorW, MB_ICONERROR, MB_OK, MSG, MessageBoxW, PostQuitMessage, RegisterClassW,
    SW_SHOW, SetWindowLongPtrW, ShowWindow, TranslateMessage, WINDOW_EX_STYLE, WM_DESTROY,
    WM_ERASEBKGND, WM_KEYDOWN, WM_LBUTTONDOWN, WM_PAINT, WM_SIZE, WM_TIMER, WNDCLASSW, WS_CHILD,
    WS_CLIPCHILDREN, WS_OVERLAPPEDWINDOW, WS_VISIBLE,
};
use windows::core::{Error, HRESULT, PCWSTR, w};

use crate::render::viewport::viewport_proc;
use crate::state::Project;
use crate::theme::{WINDOW_HEIGHT, WINDOW_WIDTH};

use crate::ui::layout::Layout;
use crate::ui::paint_chrome;
use crate::window::shortcuts::{
    handle_keydown, handle_lbuttondown, handle_lbuttonup, handle_mousemove, handle_mousewheel,
    handle_timer,
};
use crate::window::{WindowState, sync_viewport_child, window_state_mut};

const CLASS_NAME: PCWSTR = w!("ArtidorNativeWndClass");
const CHILD_CLASS_NAME: PCWSTR = w!("ArtidorNativeViewportClass");
const WINDOW_TITLE: PCWSTR = w!("Artidor — Native");

fn last_error() -> Error {
    let code = unsafe { GetLastError() };
    Error::from_hresult(HRESULT::from_win32(code.0))
}

/// Main window proc: GDI chrome + layout + child viewport management.
unsafe extern "system" fn main_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    unsafe {
        match msg {
            WM_ERASEBKGND => LRESULT(1),
            WM_PAINT => {
                let mut ps: PAINTSTRUCT = core::mem::zeroed();
                let screen_hdc = BeginPaint(hwnd, &mut ps);
                let mut client = RECT::default();
                if GetClientRect(hwnd, &mut client).is_ok() {
                    let w = client.right - client.left;
                    let h = client.bottom - client.top;

                    // Double-buffer the whole chrome frame to a memory DC, then
                    // blit the result to the screen in one go. This removes the
                    // GDI flicker that happens when hover repaints the window.
                    let mut mem_hdc = HDC::default();
                    let mut mem_bmp: HBITMAP = HBITMAP::default();
                    let mut old_bmp: HGDIOBJ = HGDIOBJ::default();
                    let mut using_mem = false;
                    if w > 0 && h > 0 {
                        mem_hdc = CreateCompatibleDC(Some(screen_hdc));
                        if !mem_hdc.is_invalid() {
                            mem_bmp = CreateCompatibleBitmap(screen_hdc, w, h);
                            if !mem_bmp.is_invalid() {
                                old_bmp = SelectObject(mem_hdc, mem_bmp.into());
                                using_mem = true;
                            } else {
                                let _ = DeleteDC(mem_hdc);
                                mem_hdc = HDC::default();
                            }
                        }
                    }
                    let draw_hdc = if using_mem { mem_hdc } else { screen_hdc };

                    let layout = Layout::compute(w, h);
                    if let Some(state) = window_state_mut(hwnd) {
                        // Select the body font for all chrome text.
                        let prev_font = SelectObject(draw_hdc, state.fonts.body.into());
                        match state.mode {
                            crate::window::AppMode::Home => {
                                crate::ui::home::draw_home(
                                    draw_hdc,
                                    hwnd,
                                    &client,
                                    &mut state.home,
                                    &state.fonts,
                                );
                            }
                            crate::window::AppMode::Projects => {
                                crate::ui::projects::draw_projects(
                                    draw_hdc,
                                    hwnd,
                                    &client,
                                    &mut state.projects,
                                    &state.fonts,
                                );
                            }
                            crate::window::AppMode::Editor => {
                                paint_chrome(
                                    draw_hdc,
                                    &layout,
                                    &client,
                                    &state.project,
                                    state.selected_track,
                                    state.playing,
                                    state.selected_element,
                                    &state.teleprompter_text,
                                    state.teleprompter_on,
                                    state.zoom_pps,
                                    state.scroll_seconds,
                                    &mut state.header_btns,
                                    state.active_tab,
                                    &mut state.tab_rects,
                                    state.looping,
                                    &mut state.toolbar_btns,
                                );
                            }
                        }
                        let _ = SelectObject(draw_hdc, prev_font);
                    } else {
                        let fallback = Project::new_untitled("loading", 0);
                        let mut dummy_btns = crate::ui::header::HeaderButtons::default();
                        let mut dummy_tabs = Vec::new();
                        let mut dummy_toolbar =
                            crate::ui::viewport_toolbar::ToolbarButtons::default();
                        paint_chrome(
                            draw_hdc,
                            &layout,
                            &client,
                            &fallback,
                            0,
                            false,
                            None,
                            "",
                            false,
                            20.0,
                            0.0,
                            &mut dummy_btns,
                            crate::state::AssetsTab::Assets,
                            &mut dummy_tabs,
                            false,
                            &mut dummy_toolbar,
                        );
                    }

                    if using_mem {
                        let _ = BitBlt(screen_hdc, 0, 0, w, h, Some(mem_hdc), 0, 0, SRCCOPY);
                        let _ = SelectObject(mem_hdc, old_bmp);
                        let _ = DeleteObject(mem_bmp.into());
                        let _ = DeleteDC(mem_hdc);
                    }
                }
                let _ = EndPaint(hwnd, &ps);
                LRESULT(0)
            }
            WM_SIZE => {
                sync_viewport_child(hwnd);
                let _ = InvalidateRect(Some(hwnd), None, false);
                LRESULT(0)
            }
            WM_KEYDOWN => {
                handle_keydown(hwnd, wparam);
                sync_viewport_child(hwnd);
                LRESULT(0)
            }
            WM_LBUTTONDOWN => {
                handle_lbuttondown(hwnd, lparam);
                sync_viewport_child(hwnd);
                let _ = InvalidateRect(Some(hwnd), None, false);
                LRESULT(0)
            }
            windows::Win32::UI::WindowsAndMessaging::WM_MOUSEMOVE => {
                if handle_mousemove(hwnd, lparam) {
                    let _ = InvalidateRect(Some(hwnd), None, false);
                }
                LRESULT(0)
            }
            windows::Win32::UI::WindowsAndMessaging::WM_LBUTTONUP => {
                if handle_lbuttonup(hwnd) {
                    let _ = InvalidateRect(Some(hwnd), None, false);
                }
                LRESULT(0)
            }
            windows::Win32::UI::WindowsAndMessaging::WM_MOUSEWHEEL => {
                if handle_mousewheel(hwnd, wparam) {
                    let _ = InvalidateRect(Some(hwnd), None, false);
                }
                LRESULT(0)
            }
            WM_TIMER => {
                if handle_timer(hwnd, wparam) {
                    let _ = InvalidateRect(Some(hwnd), None, false);
                }
                LRESULT(0)
            }
            WM_DESTROY => {
                let _ = KillTimer(Some(hwnd), crate::theme::PLAYBACK_TIMER_ID);
                let raw = windows::Win32::UI::WindowsAndMessaging::GetWindowLongPtrW(
                    hwnd,
                    windows::Win32::UI::WindowsAndMessaging::GWLP_USERDATA,
                ) as *mut WindowState;
                if !raw.is_null() {
                    SetWindowLongPtrW(
                        hwnd,
                        windows::Win32::UI::WindowsAndMessaging::GWLP_USERDATA,
                        0,
                    );
                    let state = Box::from_raw(raw);
                    if let Some(child) = state.child {
                        let _ = DestroyWindow(child);
                    }
                    drop(state);
                }
                PostQuitMessage(0);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}

fn main() -> Result<(), Error> {
    unsafe {
        let hinstance: HINSTANCE = GetModuleHandleW(None)?.into();

        let main_wc = WNDCLASSW {
            style: windows::Win32::UI::WindowsAndMessaging::CS_HREDRAW
                | windows::Win32::UI::WindowsAndMessaging::CS_VREDRAW,
            lpfnWndProc: Some(main_proc),
            hInstance: hinstance,
            hCursor: LoadCursorW(None, windows::Win32::UI::WindowsAndMessaging::IDC_ARROW)?,
            hbrBackground: HBRUSH(GetStockObject(BLACK_BRUSH).0 as *mut core::ffi::c_void),
            lpszClassName: CLASS_NAME,
            ..core::mem::zeroed()
        };
        if RegisterClassW(&main_wc) == 0 {
            return Err(last_error());
        }
        let child_wc = WNDCLASSW {
            style: windows::Win32::UI::WindowsAndMessaging::CS_HREDRAW
                | windows::Win32::UI::WindowsAndMessaging::CS_VREDRAW,
            lpfnWndProc: Some(viewport_proc),
            hInstance: hinstance,
            hCursor: LoadCursorW(None, windows::Win32::UI::WindowsAndMessaging::IDC_ARROW)?,
            hbrBackground: HBRUSH(GetStockObject(BLACK_BRUSH).0 as *mut core::ffi::c_void),
            lpszClassName: CHILD_CLASS_NAME,
            ..core::mem::zeroed()
        };
        if RegisterClassW(&child_wc) == 0 {
            return Err(last_error());
        }

        let hwnd = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            CLASS_NAME,
            WINDOW_TITLE,
            WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN,
            windows::Win32::UI::WindowsAndMessaging::CW_USEDEFAULT,
            windows::Win32::UI::WindowsAndMessaging::CW_USEDEFAULT,
            WINDOW_WIDTH,
            WINDOW_HEIGHT,
            None,
            None,
            Some(hinstance),
            None,
        )?;

        let mut client = RECT::default();
        let _ = GetClientRect(hwnd, &mut client);
        let layout = Layout::compute(client.right - client.left, client.bottom - client.top);
        let vw = (layout.viewport.right - layout.viewport.left).max(1);
        let vh = (layout.viewport.bottom - layout.viewport.top).max(1);
        let child = CreateWindowExW(
            WINDOW_EX_STYLE::default(),
            CHILD_CLASS_NAME,
            w!(""),
            WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN,
            layout.viewport.left,
            layout.viewport.top,
            vw,
            vh,
            Some(hwnd),
            None,
            Some(hinstance),
            None,
        )?;

        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);
        let project = Project::new_untitled("untitled", now_ms);
        let state = Box::new(WindowState::new(child, project));
        SetWindowLongPtrW(
            hwnd,
            windows::Win32::UI::WindowsAndMessaging::GWLP_USERDATA,
            Box::into_raw(state) as isize,
        );

        // Position/hide the child viewport before showing the main window so the
        // first paint already has the correct layout and, in Editor mode, a
        // bound renderer.
        sync_viewport_child(hwnd);

        match crate::render::Renderer::new(child) {
            Ok(renderer) => {
                let boxed = Box::new(renderer);
                SetWindowLongPtrW(
                    child,
                    windows::Win32::UI::WindowsAndMessaging::GWLP_USERDATA,
                    Box::into_raw(boxed) as isize,
                );
            }
            Err(e) => {
                let msg = format!("Artidor native compositor init failed:\n\n{e}");
                let wide: Vec<u16> = msg.encode_utf16().chain(std::iter::once(0)).collect();
                let _ = MessageBoxW(
                    None,
                    PCWSTR(wide.as_ptr()),
                    w!("Artidor — Native"),
                    MB_OK | MB_ICONERROR,
                );
            }
        }

        let _ = ShowWindow(hwnd, SW_SHOW);
        if UpdateWindow(hwnd).0 == 0 {
            return Err(last_error());
        }

        let mut msg: MSG = core::mem::zeroed();
        loop {
            let r = GetMessageW(&mut msg, None, 0, 0);
            if r.0 == 0 {
                break;
            }
            if r.0 == -1 {
                return Err(last_error());
            }
            let _ = TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        Ok(())
    }
}
