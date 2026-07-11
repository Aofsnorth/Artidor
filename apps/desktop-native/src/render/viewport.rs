//! Viewport child window — the D3D12 compositor presents here.
//!
//! The child HWND is positioned at the preview panel rect. GDI draws
//! chrome on the parent; the GPU viewport is a child HWND — DXGI presents
//! over the child only, so it never covers the chrome.
//!
//! Mirrors `apps/desktop-web/src/render/viewport.rs`.

use windows::Win32::Foundation::{COLORREF, HWND, LPARAM, LRESULT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::{
    BeginPaint, CreateSolidBrush, DeleteObject, EndPaint, FillRect, PAINTSTRUCT,
    ValidateRect,
};
use windows::Win32::UI::WindowsAndMessaging::{
    DefWindowProcW, GWLP_USERDATA, GetClientRect, GetParent, GetWindowLongPtrW, WM_ERASEBKGND,
    WM_PAINT,
};

use crate::render::Renderer;
use crate::window::{client_height, client_width, window_state};

/// Fetch the per-window `Renderer` pointer stored in the child's
/// `GWLP_USERDATA` (separate slot from the parent's `WindowState`).
pub fn renderer_for(hwnd: HWND) -> Option<&'static mut Renderer> {
    unsafe {
        let raw = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut Renderer;
        raw.as_mut()
    }
}

/// Fallback clear to the editor background color when the GPU compositor
/// cannot present. Prevents the child window from showing stale parent pixels
/// (the D2D chrome) when the surface format is unsupported or the renderer
/// is not ready.
unsafe fn clear_fallback(hwnd: HWND) {
    unsafe {
        let mut ps = PAINTSTRUCT::default();
        let hdc = BeginPaint(hwnd, &mut ps);
        if !hdc.is_invalid() {
            let mut client = RECT::default();
            if GetClientRect(hwnd, &mut client).is_ok() {
                let brush = CreateSolidBrush(COLORREF(crate::theme::BG));
                let _ = FillRect(hdc, &client, brush);
                let _ = DeleteObject(brush.into());
            }
            let _ = EndPaint(hwnd, &ps);
        }
    }
}

/// Viewport child window proc: the D3D12 compositor presents here.
pub unsafe extern "system" fn viewport_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    unsafe {
        match msg {
            WM_ERASEBKGND => {
                // Compositor owns this surface; never let GDI erase it.
                LRESULT(1)
            }
            WM_PAINT => {
                let mut rendered = false;
                if let Some(renderer) = renderer_for(hwnd) {
                    let w = client_width(hwnd);
                    let h = client_height(hwnd);
                    let parent = GetParent(hwnd).unwrap_or_default();
                    let project = window_state(parent).map(|s| &s.project);
                    match renderer.render(w, h, project) {
                        Ok(()) => rendered = true,
                        Err(e) => {
                            eprintln!("Viewport render failed ({}x{}): {e}", w, h);
                        }
                    }
                }
                if !rendered {
                    clear_fallback(hwnd);
                } else {
                    let _ = ValidateRect(Some(hwnd), None);
                }
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, msg, wparam, lparam),
        }
    }
}
