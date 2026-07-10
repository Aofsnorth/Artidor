//! GDI drawing primitives — low-level Win32 GDI wrappers.
//!
//! All paint/draw functions in the `ui` modules build on these. Keeping
//! them isolated means the rendering layer depends on a small, stable
//! surface — not on the full `windows` crate API surface.

use windows::Win32::Foundation::{COLORREF, RECT};
use windows::Win32::Graphics::Gdi::{
    CreatePen, CreateSolidBrush, DT_CENTER, DT_SINGLELINE, DT_VCENTER, DeleteObject, DrawTextW,
    FillRect, GRADIENT_FILL_RECT_V, GRADIENT_RECT, GetStockObject, GradientFill, HOLLOW_BRUSH,
    NULL_PEN, PS_SOLID, Rectangle, RoundRect, SelectObject, SetBkMode, SetTextColor, TRANSPARENT,
    TRIVERTEX,
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

/// Convert a packed `0xRRGGBB` colour into a `TRIVERTEX` 16-bit channel
/// tuple `(red, green, blue, alpha)`.
fn to_trivertex_channels(color: u32) -> (u16, u16, u16, u16) {
    let r = ((color >> 16) & 0xFF) as u16;
    let g = ((color >> 8) & 0xFF) as u16;
    let b = (color & 0xFF) as u16;
    (r << 8, g << 8, b << 8, 0xFFFF)
}

/// Fill `rect` with a vertical gradient from `top_color` to `bottom_color`.
pub unsafe fn gradient_fill_v(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    rect: &RECT,
    top_color: u32,
    bottom_color: u32,
) {
    unsafe {
        let (tr, tg, tb, _ta) = to_trivertex_channels(top_color);
        let (br, bg, bb, _ba) = to_trivertex_channels(bottom_color);
        let vertices = [
            TRIVERTEX {
                x: rect.left,
                y: rect.top,
                Red: tr,
                Green: tg,
                Blue: tb,
                Alpha: 0xFFFF,
            },
            TRIVERTEX {
                x: rect.right,
                y: rect.bottom,
                Red: br,
                Green: bg,
                Blue: bb,
                Alpha: 0xFFFF,
            },
        ];
        let mesh = GRADIENT_RECT {
            UpperLeft: 0,
            LowerRight: 1,
        };
        let _ = GradientFill(
            hdc,
            &vertices,
            &mesh as *const _ as *const _,
            1,
            GRADIENT_FILL_RECT_V,
        );
    }
}

/// Fill a rounded rectangle with `color` and `corner_radius` (pixels).
pub unsafe fn rounded_fill_rect(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    rect: &RECT,
    color: u32,
    radius: i32,
) {
    unsafe {
        let brush = CreateSolidBrush(COLORREF(rgb(color)));
        let prev_brush = SelectObject(hdc, brush.into());
        let null_pen = GetStockObject(NULL_PEN);
        let prev_pen = SelectObject(hdc, null_pen);
        let _ = RoundRect(
            hdc,
            rect.left,
            rect.top,
            rect.right,
            rect.bottom,
            radius * 2,
            radius * 2,
        );
        let _ = SelectObject(hdc, prev_brush);
        let _ = SelectObject(hdc, prev_pen);
        let _ = DeleteObject(brush.into());
    }
}

/// Draw a 1px rounded border inside `rect` with `color` and `corner_radius`.
pub unsafe fn rounded_border_rect(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    rect: &RECT,
    color: u32,
    radius: i32,
) {
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
        let _ = RoundRect(
            hdc,
            inset.left,
            inset.top,
            inset.right,
            inset.bottom,
            radius * 2,
            radius * 2,
        );
        let _ = SelectObject(hdc, prev_pen);
        let _ = SelectObject(hdc, prev_brush);
        let _ = DeleteObject(pen.into());
    }
}

/// Draw a single 1px horizontal line.
pub unsafe fn draw_hline(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    x1: i32,
    x2: i32,
    y: i32,
    color: u32,
) {
    unsafe {
        let pen = CreatePen(PS_SOLID, 1, COLORREF(rgb(color)));
        let prev = SelectObject(hdc, pen.into());
        let _ = Rectangle(hdc, x1, y, x2, y + 1);
        let _ = SelectObject(hdc, prev);
        let _ = DeleteObject(pen.into());
    }
}
