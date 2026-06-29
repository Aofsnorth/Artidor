//! Layout computation — mirrors the web editor's resizable panel structure.
//!
//! Pure function of `(width, height)` → panel rectangles. No Win32 calls,
//! no side effects. This is the single source of truth for where every
//! panel lives on screen.
//!
//! Mirrors `apps/desktop-web/src/ui/editor_layout.rs`.

use windows::Win32::Foundation::RECT;

use crate::theme::{
    FOOTER_H, GAP, HEADER_H, MAIN_CONTENT_PCT, PAD, PREVIEW_PCT, RULER_H, TABBAR_W, TOOLS_PCT,
};
use crate::ui::viewport_toolbar::TOOLBAR_H;

/// All chrome rectangles derived from the parent client size. The
/// `viewport` rect is where the D3D12 child window lives.
#[derive(Clone, Copy, Default)]
pub struct Layout {
    pub header: RECT,
    pub footer: RECT,
    pub tabbar: RECT,
    pub tools: RECT,
    pub preview: RECT,
    pub properties: RECT,
    pub timeline: RECT,
    /// The ruler strip at the top of the timeline (frame markers +
    /// time labels). Click-to-seek target.
    pub ruler: RECT,
    /// The D3D12 viewport child window rect (preview canvas area,
    /// excluding the toolbar).
    pub viewport: RECT,
    /// The viewport toolbar rect (transport controls, bottom of preview).
    pub viewport_toolbar: RECT,
}

impl Layout {
    /// Compute all panel rectangles from the parent window's client size.
    /// Pure function — no side effects, no Win32 calls.
    pub fn compute(w: i32, h: i32) -> Self {
        let mut l = Layout::default();
        l.header = RECT {
            left: 0,
            top: 0,
            right: w,
            bottom: HEADER_H,
        };
        l.footer = RECT {
            left: 0,
            top: h - FOOTER_H,
            right: w,
            bottom: h,
        };

        let mid_top = HEADER_H;
        let mid_bottom = h - FOOTER_H;
        let mid_h = mid_bottom - mid_top;
        let inner_x = PAD;
        let inner_y = mid_top;
        let inner_w = (w - 2 * PAD).max(0);
        let inner_h = (mid_h - PAD).max(0);

        l.tabbar = RECT {
            left: inner_x,
            top: inner_y,
            right: inner_x + TABBAR_W,
            bottom: inner_y + inner_h,
        };
        let pg_x = inner_x + TABBAR_W + GAP;
        let pg_w = (inner_x + inner_w - pg_x).max(0);

        let split_h = (inner_h - GAP).max(0);
        let main_h = (split_h as f32 * MAIN_CONTENT_PCT) as i32;

        let row_w = pg_w;
        let row_gap_total = 2 * GAP;
        let avail_w = (row_w - row_gap_total).max(0);
        let tools_w = (avail_w as f32 * TOOLS_PCT) as i32;
        let preview_w = (avail_w as f32 * PREVIEW_PCT) as i32;

        let row_y = inner_y;
        let row_h = main_h;
        l.tools = RECT {
            left: pg_x,
            top: row_y,
            right: pg_x + tools_w,
            bottom: row_y + row_h,
        };
        l.preview = RECT {
            left: pg_x + tools_w + GAP,
            top: row_y,
            right: pg_x + tools_w + GAP + preview_w,
            bottom: row_y + row_h,
        };
        l.properties = RECT {
            left: pg_x + tools_w + GAP + preview_w + GAP,
            top: row_y,
            right: pg_x + row_w,
            bottom: row_y + row_h,
        };

        l.timeline = RECT {
            left: pg_x,
            top: row_y + row_h + GAP,
            right: pg_x + row_w,
            bottom: inner_y + inner_h,
        };
        // Ruler is the top strip of the timeline panel.
        l.ruler = RECT {
            left: l.timeline.left,
            top: l.timeline.top,
            right: l.timeline.right,
            bottom: l.timeline.top + RULER_H,
        };

        // Viewport canvas = preview minus toolbar strip at bottom.
        l.viewport_toolbar = RECT {
            left: l.preview.left,
            top: l.preview.bottom - TOOLBAR_H,
            right: l.preview.right,
            bottom: l.preview.bottom,
        };
        l.viewport = RECT {
            left: l.preview.left,
            top: l.preview.top,
            right: l.preview.right,
            bottom: l.preview.bottom - TOOLBAR_H,
        };
        l
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layout_header_is_full_width() {
        let l = Layout::compute(1280, 800);
        assert_eq!(l.header.left, 0);
        assert_eq!(l.header.right, 1280);
        assert_eq!(l.header.bottom, HEADER_H);
    }

    #[test]
    fn layout_footer_is_at_bottom() {
        let l = Layout::compute(1280, 800);
        assert_eq!(l.footer.bottom, 800);
        assert_eq!(l.footer.top, 800 - FOOTER_H);
    }

    #[test]
    fn layout_viewport_is_preview_minus_toolbar() {
        let l = Layout::compute(1280, 800);
        // Viewport canvas = preview minus toolbar strip at bottom.
        assert_eq!(l.viewport.left, l.preview.left);
        assert_eq!(l.viewport.right, l.preview.right);
        assert_eq!(l.viewport.top, l.preview.top);
        assert_eq!(l.viewport.bottom, l.preview.bottom - TOOLBAR_H);
        assert_eq!(l.viewport_toolbar.bottom, l.preview.bottom);
        assert_eq!(l.viewport_toolbar.top, l.preview.bottom - TOOLBAR_H);
    }

    #[test]
    fn layout_panels_dont_overlap() {
        let l = Layout::compute(1280, 800);
        assert!(l.tools.right <= l.preview.left);
        assert!(l.preview.right <= l.properties.left);
        assert!(l.properties.bottom <= l.timeline.top);
    }

    #[test]
    fn layout_handles_zero_size() {
        let l = Layout::compute(0, 0);
        assert_eq!(l.header.right, 0);
    }
}
