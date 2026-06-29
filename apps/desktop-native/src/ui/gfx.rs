//! GDI drawing primitives — low-level Win32 GDI wrappers.
//!
//! All paint/draw functions in the `ui` modules build on these. Keeping
//! them isolated means the rendering layer depends on a small, stable
//! surface — not on the full `windows` crate API surface.

use windows::Win32::Foundation::{COLORREF, RECT};
use windows::Win32::Graphics::Gdi::{
    CreatePen, CreateSolidBrush, DT_CENTER, DT_SINGLELINE, DT_VCENTER, DeleteObject, DrawTextW,
    FillRect, GetStockObject, HOLLOW_BRUSH, PS_SOLID, Rectangle, SelectObject, SetBkMode,
    SetTextColor, TRANSPARENT,
};

use crate::theme::rgb;

/// Fill `rect` with a solid colour.
pub unsafe fn fill_rect(hdc: windows::Win32::Graphics::Gdi::HDC, rect: &RECT, color: u32) {
    let brush = unsafe { CreateSolidBrush(COLORREF(rgb(color))) };
    let _ = unsafe { FillRect(hdc, rect, brush) };
    unsafe {
        let _ = DeleteObject(brush.into());
    }
}

/// Draw a 1px hairline border inside `rect` with `color` (outline only).
pub unsafe fn border_rect(hdc: windows::Win32::Graphics::Gdi::HDC, rect: &RECT, color: u32) {
    unsafe {
        let pen = CreatePen(PS_SOLID, 1, COLORREF(rgb(color)));
        let prev_pen = SelectObject(hdc, pen.into());
        let hollow = GetStockObject(HOLLOW_BRUSH);
        let prev_brush = SelectObject(hdc, hollow);
        let inset = RECT {
            left: rect.left,
            top: rect.top,
            right: rect.right - 1,
            bottom: rect.bottom - 1,
        };
        let _ = Rectangle(hdc, inset.left, inset.top, inset.right, inset.bottom);
        let _ = SelectObject(hdc, prev_pen);
        let _ = SelectObject(hdc, prev_brush);
        let _ = DeleteObject(pen.into());
    }
}

/// Draw a single line of centred text inside `rect` with `color`.
pub unsafe fn draw_text_centered(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    text: &str,
    rect: &RECT,
    color: u32,
) {
    unsafe {
        SetTextColor(hdc, COLORREF(rgb(color)));
        SetBkMode(hdc, TRANSPARENT);
        let mut buf: Vec<u16> = text.encode_utf16().collect();
        let mut r = *rect;
        let _ = DrawTextW(
            hdc,
            &mut buf,
            &mut r as *mut _,
            DT_CENTER | DT_SINGLELINE | DT_VCENTER,
        );
    }
}

/// Draw a single line of left-aligned text inside `rect` with `color`.
pub unsafe fn draw_text_left(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    text: &str,
    rect: &RECT,
    color: u32,
) {
    unsafe {
        SetTextColor(hdc, COLORREF(rgb(color)));
        SetBkMode(hdc, TRANSPARENT);
        let mut buf: Vec<u16> = text.encode_utf16().collect();
        let mut r = *rect;
        let _ = DrawTextW(hdc, &mut buf, &mut r as *mut _, DT_SINGLELINE | DT_VCENTER);
    }
}
