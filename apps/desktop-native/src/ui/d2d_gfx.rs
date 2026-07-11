//! D2D drawing primitives for the UI chrome.

use windows::core::Result;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Direct2D::{
    Common::D2D1_COLOR_F, D2D1_DRAW_TEXT_OPTIONS_CLIP, D2D1_ROUNDED_RECT, ID2D1SolidColorBrush,
    ID2D1StrokeStyle,
};
use windows::Win32::Graphics::Direct2D::Common::D2D_RECT_F;
use windows::Win32::Graphics::DirectWrite::{
    DWRITE_MEASURING_MODE_NATURAL, DWRITE_PARAGRAPH_ALIGNMENT, DWRITE_PARAGRAPH_ALIGNMENT_CENTER,
    DWRITE_PARAGRAPH_ALIGNMENT_FAR, DWRITE_PARAGRAPH_ALIGNMENT_NEAR, DWRITE_TEXT_ALIGNMENT,
    DWRITE_TEXT_ALIGNMENT_CENTER, DWRITE_TEXT_ALIGNMENT_LEADING, DWRITE_TEXT_ALIGNMENT_TRAILING,
    IDWriteTextFormat,
};

use crate::d2d::D2dContext;

/// Build a solid D2D color from `0xRRGGBB`.
pub fn solid(hex: u32) -> windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F {
    crate::theme::to_d2d(hex, 1.0)
}

/// Horizontal text alignment.
pub enum TextAlign {
    Left,
    Center,
    Right,
}

/// Vertical text alignment.
pub enum VAlign {
    Top,
    Center,
    Bottom,
}

impl From<TextAlign> for DWRITE_TEXT_ALIGNMENT {
    fn from(a: TextAlign) -> Self {
        match a {
            TextAlign::Left => DWRITE_TEXT_ALIGNMENT_LEADING,
            TextAlign::Center => DWRITE_TEXT_ALIGNMENT_CENTER,
            TextAlign::Right => DWRITE_TEXT_ALIGNMENT_TRAILING,
        }
    }
}

impl From<VAlign> for DWRITE_PARAGRAPH_ALIGNMENT {
    fn from(a: VAlign) -> Self {
        match a {
            VAlign::Top => DWRITE_PARAGRAPH_ALIGNMENT_NEAR,
            VAlign::Center => DWRITE_PARAGRAPH_ALIGNMENT_CENTER,
            VAlign::Bottom => DWRITE_PARAGRAPH_ALIGNMENT_FAR,
        }
    }
}

/// Build a float rect.
pub fn rect_f(left: f32, top: f32, right: f32, bottom: f32) -> D2D_RECT_F {
    D2D_RECT_F {
        left,
        top,
        right,
        bottom,
    }
}

/// Convert a Win32 `RECT` to a D2D float rect.
pub fn rect_f_from_rect(r: &RECT) -> D2D_RECT_F {
    D2D_RECT_F {
        left: r.left as f32,
        top: r.top as f32,
        right: r.right as f32,
        bottom: r.bottom as f32,
    }
}

/// Build a rounded rect from a base rect.
pub fn rounded_rect(rect: &D2D_RECT_F, radius_x: f32, radius_y: f32) -> D2D1_ROUNDED_RECT {
    D2D1_ROUNDED_RECT {
        rect: *rect,
        radiusX: radius_x,
        radiusY: radius_y,
    }
}

/// Solid-brush helper that reuses a single brush and swaps its color.
pub struct D2dGfx<'a> {
    ctx: &'a D2dContext,
    solid: ID2D1SolidColorBrush,
}

impl<'a> D2dGfx<'a> {
    /// Create a helper bound to `ctx`.
    pub unsafe fn new(ctx: &'a D2dContext) -> Result<Self> {
        let solid = ctx
            .rt()
            .CreateSolidColorBrush(&D2D1_COLOR_F::default(), None)?;
        Ok(Self { ctx, solid })
    }

    unsafe fn set_color(&self, color: D2D1_COLOR_F) {
        self.solid.SetColor(&color);
    }

    /// Fill a rectangle with a solid color.
    pub unsafe fn fill_rect(&self, rect: &D2D_RECT_F, color: D2D1_COLOR_F) -> Result<()> {
        self.set_color(color);
        self.ctx.rt().FillRectangle(rect, &self.solid);
        Ok(())
    }

    /// Fill a rounded rectangle with a solid color.
    pub unsafe fn fill_rounded_rect(
        &self,
        rect: &D2D_RECT_F,
        radius: f32,
        color: D2D1_COLOR_F,
    ) -> Result<()> {
        self.set_color(color);
        let rounded = rounded_rect(rect, radius, radius);
        self.ctx.rt().FillRoundedRectangle(&rounded, &self.solid);
        Ok(())
    }

    /// Stroke a rounded rectangle with a solid color.
    pub unsafe fn stroke_rounded_rect(
        &self,
        rect: &D2D_RECT_F,
        radius: f32,
        color: D2D1_COLOR_F,
        width: f32,
    ) -> Result<()> {
        self.set_color(color);
        let rounded = rounded_rect(rect, radius, radius);
        self.ctx
            .rt()
            .DrawRoundedRectangle(&rounded, &self.solid, width, None::<&ID2D1StrokeStyle>);
        Ok(())
    }

    /// Draw a line of text inside `rect` using `format`.
    pub unsafe fn draw_text(
        &self,
        text: &str,
        format: &IDWriteTextFormat,
        rect: &D2D_RECT_F,
        color: D2D1_COLOR_F,
        align: TextAlign,
        valign: VAlign,
    ) -> Result<()> {
        self.set_color(color);
        format.SetTextAlignment(align.into())?;
        format.SetParagraphAlignment(valign.into())?;
        let buf: Vec<u16> = text.encode_utf16().collect();
        self.ctx.rt().DrawText(
            &buf,
            format,
            rect,
            &self.solid,
            D2D1_DRAW_TEXT_OPTIONS_CLIP,
            DWRITE_MEASURING_MODE_NATURAL,
        );
        Ok(())
    }

    /// Draw a horizontal line using a 1px-tall rectangle.
    pub unsafe fn draw_hline(
        &self,
        x1: f32,
        x2: f32,
        y: f32,
        color: D2D1_COLOR_F,
        thickness: f32,
    ) -> Result<()> {
        self.fill_rect(&rect_f(x1, y, x2, y + thickness), color)
    }

    /// Draw a vertical line using a 1px-wide rectangle.
    pub unsafe fn draw_vline(
        &self,
        y1: f32,
        y2: f32,
        x: f32,
        color: D2D1_COLOR_F,
        thickness: f32,
    ) -> Result<()> {
        self.fill_rect(&rect_f(x, y1, x + thickness, y2), color)
    }

    /// Access the underlying D2D context (for font cache, etc.).
    pub fn ctx(&self) -> &D2dContext {
        self.ctx
    }

    /// Stroke the outline of a `D2D_RECT_F`.
    pub unsafe fn stroke_rect(
        &self,
        rect: &D2D_RECT_F,
        color: D2D1_COLOR_F,
        width: f32,
    ) -> Result<()> {
        self.set_color(color);
        self.ctx
            .rt()
            .DrawRectangle(rect, &self.solid, width, None::<&ID2D1StrokeStyle>);
        Ok(())
    }

    /// Stroke the outline of a Win32 `RECT`.
    pub unsafe fn stroke_rect_r(&self, rect: &RECT, color: D2D1_COLOR_F, width: f32) -> Result<()> {
        self.stroke_rect(&rect_f_from_rect(rect), color, width)
    }

    /// Fill a Win32 `RECT` with a solid color.
    pub unsafe fn fill_rect_r(&self, rect: &RECT, color: D2D1_COLOR_F) -> Result<()> {
        self.fill_rect(&rect_f_from_rect(rect), color)
    }

    /// Fill a rounded rectangle from a Win32 `RECT`.
    pub unsafe fn fill_rounded_rect_r(
        &self,
        rect: &RECT,
        radius: f32,
        color: D2D1_COLOR_F,
    ) -> Result<()> {
        self.fill_rounded_rect(&rect_f_from_rect(rect), radius, color)
    }

    /// Stroke a rounded rectangle from a Win32 `RECT`.
    pub unsafe fn stroke_rounded_rect_r(
        &self,
        rect: &RECT,
        radius: f32,
        color: D2D1_COLOR_F,
        width: f32,
    ) -> Result<()> {
        self.stroke_rounded_rect(&rect_f_from_rect(rect), radius, color, width)
    }

    /// Draw left-aligned text inside a Win32 `RECT`.
    pub unsafe fn draw_text_left(
        &self,
        text: &str,
        format: &IDWriteTextFormat,
        rect: &RECT,
        color: D2D1_COLOR_F,
    ) -> Result<()> {
        self.draw_text(text, format, &rect_f_from_rect(rect), color, TextAlign::Left, VAlign::Center)
    }

    /// Draw centered text inside a Win32 `RECT`.
    pub unsafe fn draw_text_centered(
        &self,
        text: &str,
        format: &IDWriteTextFormat,
        rect: &RECT,
        color: D2D1_COLOR_F,
    ) -> Result<()> {
        self.draw_text(text, format, &rect_f_from_rect(rect), color, TextAlign::Center, VAlign::Center)
    }
}
