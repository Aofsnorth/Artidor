//! D2D drawing primitives for the UI chrome.

use windows::core::Result;
use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Direct2D::{
    Common::{D2D1_COLOR_F, D2D1_GRADIENT_STOP},
    D2D1_DRAW_TEXT_OPTIONS_CLIP, D2D1_EXTEND_MODE_CLAMP, D2D1_GAMMA_2_2,
    D2D1_LINEAR_GRADIENT_BRUSH_PROPERTIES, D2D1_RADIAL_GRADIENT_BRUSH_PROPERTIES,
    D2D1_ROUNDED_RECT, ID2D1LinearGradientBrush, ID2D1RadialGradientBrush, ID2D1RenderTarget,
    ID2D1SolidColorBrush, ID2D1StrokeStyle,
};
use windows_numerics::Vector2;
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
    ctx: &'a mut D2dContext,
    solid: ID2D1SolidColorBrush,
}

impl<'a> D2dGfx<'a> {
    /// Create a helper bound to `ctx`.
    pub unsafe fn new(ctx: &'a mut D2dContext) -> Result<Self> {
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

    /// Fill a rectangle with the cached header gradient (top = opaque BG,
    /// bottom = transparent). The gradient brush is created lazily and
    /// reused within the frame.
    pub unsafe fn fill_header_gradient(&mut self, rect: &D2D_RECT_F) -> Result<()> {
        let top = crate::theme::to_d2d(crate::theme::BG, 1.0);
        let bottom = crate::theme::to_d2d(crate::theme::BG, 0.0);
        if self.ctx.header_gradient.is_none() {
            let rt = self.ctx.rt().clone();
            self.ctx.header_gradient = Some(create_linear_gradient(&rt, top, bottom)?);
        }
        let brush = self.ctx.header_gradient.as_ref().unwrap();
        brush.SetStartPoint(Vector2 {
            X: rect.left,
            Y: rect.top,
        });
        brush.SetEndPoint(Vector2 {
            X: rect.left,
            Y: rect.bottom,
        });
        self.ctx.rt().FillRectangle(rect, brush);
        Ok(())
    }

    /// Fill a rectangle with the cached footer gradient (top = BG,
    /// bottom = BG_DARK).
    pub unsafe fn fill_footer_gradient(&mut self, rect: &D2D_RECT_F) -> Result<()> {
        let top = crate::theme::to_d2d(crate::theme::BG, 1.0);
        let bottom = crate::theme::to_d2d(crate::theme::BG_DARK, 1.0);
        if self.ctx.footer_gradient.is_none() {
            let rt = self.ctx.rt().clone();
            self.ctx.footer_gradient = Some(create_linear_gradient(&rt, top, bottom)?);
        }
        let brush = self.ctx.footer_gradient.as_ref().unwrap();
        brush.SetStartPoint(Vector2 {
            X: rect.left,
            Y: rect.top,
        });
        brush.SetEndPoint(Vector2 {
            X: rect.left,
            Y: rect.bottom,
        });
        self.ctx.rt().FillRectangle(rect, brush);
        Ok(())
    }

    /// Draw a subtle radial glow centered at the top edge of `rect`.
    /// White at ~3.5% opacity in the centre, fading to transparent.
    pub unsafe fn fill_radial_glow_top(&mut self, rect: &D2D_RECT_F) -> Result<()> {
        if self.ctx.radial_glow.is_none() {
            let rt = self.ctx.rt().clone();
            self.ctx.radial_glow = Some(create_radial_glow(&rt)?);
        }
        let brush = self.ctx.radial_glow.as_ref().unwrap();
        let cx = (rect.left + rect.right) / 2.0;
        let width = rect.right - rect.left;
        let height = rect.bottom - rect.top;
        brush.SetCenter(Vector2 {
            X: cx,
            Y: rect.top,
        });
        brush.SetRadiusX(width * 0.30);
        brush.SetRadiusY(height);
        self.ctx.rt().FillRectangle(rect, brush);
        Ok(())
    }
}

/// Build a linear gradient brush from opaque `top` to `bottom`.
unsafe fn create_linear_gradient(
    rt: &ID2D1RenderTarget,
    top: D2D1_COLOR_F,
    bottom: D2D1_COLOR_F,
) -> Result<ID2D1LinearGradientBrush> {
    let stops = [
        D2D1_GRADIENT_STOP {
            position: 0.0,
            color: top,
        },
        D2D1_GRADIENT_STOP {
            position: 1.0,
            color: bottom,
        },
    ];
    let collection = rt.CreateGradientStopCollection(&stops, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP)?;
    let props = D2D1_LINEAR_GRADIENT_BRUSH_PROPERTIES {
        startPoint: Vector2::default(),
        endPoint: Vector2::default(),
    };
    rt.CreateLinearGradientBrush(&props, None, &collection)
}

/// Build a subtle radial glow brush.
unsafe fn create_radial_glow(rt: &ID2D1RenderTarget) -> Result<ID2D1RadialGradientBrush> {
    let center = crate::theme::to_d2d(crate::theme::WHITE, 0.035);
    let outer = crate::theme::to_d2d(crate::theme::WHITE, 0.0);
    let stops = [
        D2D1_GRADIENT_STOP {
            position: 0.0,
            color: center,
        },
        D2D1_GRADIENT_STOP {
            position: 0.7,
            color: outer,
        },
    ];
    let collection = rt.CreateGradientStopCollection(&stops, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP)?;
    let props = D2D1_RADIAL_GRADIENT_BRUSH_PROPERTIES {
        center: Vector2::default(),
        gradientOriginOffset: Vector2::default(),
        radiusX: 1.0,
        radiusY: 1.0,
    };
    rt.CreateRadialGradientBrush(&props, None, &collection)
}

impl<'a> D2dGfx<'a> {
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

    /// Fill a Win32 `RECT` with the cached header gradient.
    pub unsafe fn fill_header_gradient_r(&mut self, rect: &RECT) -> Result<()> {
        self.fill_header_gradient(&rect_f_from_rect(rect))
    }

    /// Fill a Win32 `RECT` with the cached footer gradient.
    pub unsafe fn fill_footer_gradient_r(&mut self, rect: &RECT) -> Result<()> {
        self.fill_footer_gradient(&rect_f_from_rect(rect))
    }

    /// Draw the top radial glow inside a Win32 `RECT`.
    pub unsafe fn fill_radial_glow_top_r(&mut self, rect: &RECT) -> Result<()> {
        self.fill_radial_glow_top(&rect_f_from_rect(rect))
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
