//! Home / landing screen — the first thing the user sees when no project
//! is open.
//!
//! Mirrors the web app's homepage (`apps/web/src/app/page.tsx`) and the
//! new marketing hero (`apps/web/src/components/landing/hero.tsx`). The
//! file is still named `welcome.rs` for historical reasons; it is exposed
//! as the `home` module via `#[path = "welcome.rs"]` in `ui/mod.rs`.

use windows::Win32::Foundation::{COLORREF, HWND, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    DT_CALCRECT, DT_CENTER, DT_END_ELLIPSIS, DT_LEFT, DT_SINGLELINE, DT_VCENTER, DT_WORDBREAK,
    DrawTextW, SelectObject, SetBkMode, SetTextColor, TRANSPARENT,
};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

use crate::state::persistence;
use crate::theme::{
    AMBER, BG_DARK, DOT_GREEN, DOT_RED, DOT_YELLOW, EMERALD, LANDING_BG, LANDING_BLACK,
    LANDING_PILL_BG, LANDING_PILL_BORDER, LANDING_SILVER, LANDING_TEXT_MUTED, PANEL_BG,
    TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT, rgb,
};
use crate::ui::font::FontCache;
use crate::ui::gfx::{
    draw_hline, draw_text_centered, draw_text_left, fill_rect, gradient_fill_v,
    rounded_border_rect, rounded_fill_rect,
};

const HEADER_H: i32 = 56;
const LOGO_SIZE: i32 = 28;
const PILL_H: i32 = 28;
const CTA_H: i32 = 44;
const EYEBROW_H: i32 = 28;
const CARD_W: i32 = 220;
const CARD_H: i32 = 64;
const TAGLINE_MAX_W: i32 = 720;

const NAV_LABELS: [&str; 7] = [
    "Features",
    "Arth",
    "Docs",
    "Roadmap",
    "Changelog",
    "Contributors",
    "Blog",
];
const PROJECTS_LABEL: &str = "Projects";
const GITHUB_PILL_TEXT: &str = "40k+";
const GITHUB_STAR: &str = "★";

const STATS: [(&str, &str); 4] = [
    ("40k+", "GitHub stars"),
    ("0", "Dollars required"),
    ("3", "Platforms (web / desktop / API)"),
    ("MIT", "License"),
];

/// A clickable button with a rectangle and hover state.
#[derive(Clone, Copy, Default)]
pub struct HomeButton {
    pub rect: RECT,
    pub hovered: bool,
}

/// State for the home screen: buttons, recent-project preview, and hover
/// tracking. Stored on the main `WindowState` so hit-testing works across
/// repaints without recreating GDI resources.
pub struct HomeState {
    pub open_editor_btn: HomeButton,
    pub header_open_editor_btn: HomeButton,
    pub github_btn: HomeButton,
    pub github_pill: HomeButton,
    pub projects_link: HomeButton,
    pub nav_links: [HomeButton; 7],
    pub recent: Vec<persistence::RecentProject>,
    pub hovered_recent: Option<usize>,
    pub card_rects: Vec<RECT>,
}

impl HomeState {
    /// Create a new home screen, loading the recent-projects list from disk.
    pub fn new() -> Self {
        Self {
            open_editor_btn: HomeButton::default(),
            header_open_editor_btn: HomeButton::default(),
            github_btn: HomeButton::default(),
            github_pill: HomeButton::default(),
            projects_link: HomeButton::default(),
            nav_links: [HomeButton::default(); 7],
            recent: persistence::load_recent_projects(),
            hovered_recent: None,
            card_rects: Vec::new(),
        }
    }

    /// Hit-test a client-space point against the stored recent-project cards.
    pub fn hit_test_card(&self, x: i32, y: i32) -> Option<usize> {
        self.card_rects
            .iter()
            .position(|r| x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
    }

    /// Update hover state for all hit-testable regions and return true if the
    /// visual state changed. This lets `WM_MOUSEMOVE` only invalidate the window
    /// when the cursor actually enters or leaves a hover target.
    pub fn update_hover(&mut self, x: i32, y: i32) -> bool {
        let hit =
            |rect: &RECT| x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        let mut dirty = false;

        let mut buttons = [
            &mut self.open_editor_btn,
            &mut self.header_open_editor_btn,
            &mut self.github_btn,
            &mut self.github_pill,
            &mut self.projects_link,
        ];
        for btn in &mut buttons {
            let hovered = hit(&btn.rect);
            dirty |= btn.hovered != hovered;
            btn.hovered = hovered;
        }
        for btn in self.nav_links.iter_mut() {
            let hovered = hit(&btn.rect);
            dirty |= btn.hovered != hovered;
            btn.hovered = hovered;
        }

        let hovered_recent = self.hit_test_card(x, y);
        dirty |= self.hovered_recent != hovered_recent;
        self.hovered_recent = hovered_recent;

        dirty
    }
}

impl Default for HomeState {
    fn default() -> Self {
        Self::new()
    }
}

/// Convert the screen-space cursor into client-space coordinates.
unsafe fn cursor_to_client(hwnd: HWND) -> POINT {
    let mut cursor = POINT::default();
    unsafe {
        let _ = GetCursorPos(&mut cursor);
        let _ = windows::Win32::Graphics::Gdi::ScreenToClient(hwnd, &mut cursor);
    }
    cursor
}

/// Measure the size of a single-line text string using the currently selected
/// font. Returns `(width, height)`.
unsafe fn text_size(hdc: windows::Win32::Graphics::Gdi::HDC, text: &str) -> (i32, i32) {
    let mut r = RECT {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let mut buf: Vec<u16> = text.encode_utf16().collect();
    let _ = unsafe { DrawTextW(hdc, &mut buf, &mut r, DT_SINGLELINE | DT_CALCRECT) };
    (r.right - r.left, r.bottom - r.top)
}

/// Draw a single-line, left-aligned, ellipsised text string.
unsafe fn draw_text_left_ellipsis(
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
            &mut r,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS,
        );
    }
}

/// Draw the top marketing header: logo, brand, nav links, GitHub pill, and
/// Open editor CTA.
unsafe fn draw_header(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut HomeState,
    fonts: &FontCache,
) {
    unsafe {
        let cursor = cursor_to_client(hwnd);

        let header = RECT {
            left: client.left,
            top: client.top,
            right: client.right,
            bottom: client.top + HEADER_H,
        };
        gradient_fill_v(hdc, &header, LANDING_BG, 0x0c0c10);
        draw_hline(
            hdc,
            client.left,
            client.right,
            header.bottom - 1,
            LANDING_PILL_BORDER,
        );

        // Brand logo.
        let logo = RECT {
            left: client.left + 24,
            top: client.top + (HEADER_H - LOGO_SIZE) / 2,
            right: client.left + 24 + LOGO_SIZE,
            bottom: client.top + (HEADER_H - LOGO_SIZE) / 2 + LOGO_SIZE,
        };
        rounded_fill_rect(hdc, &logo, 0x2A3F8C, 4);
        draw_text_centered(hdc, "A", &logo, 0xFFFFFF);

        // Brand name.
        let brand = RECT {
            left: logo.right + 10,
            top: client.top,
            right: logo.right + 100,
            bottom: client.top + HEADER_H,
        };
        let prev = SelectObject(hdc, fonts.header.into());
        draw_text_left(hdc, "Artidor", &brand, TEXT_BRIGHT);
        let _ = SelectObject(hdc, prev);

        // Right-side cluster: GitHub stars pill and Open editor button.
        let prev = SelectObject(hdc, fonts.tiny.into());
        let star_w = text_size(hdc, GITHUB_STAR).0;
        let pill_text_w = text_size(hdc, GITHUB_PILL_TEXT).0;
        let github_w = star_w + pill_text_w + 22;
        let open_w = text_size(hdc, "Open editor").0 + 28;
        let _ = SelectObject(hdc, fonts.body.into());

        let right_end = client.right - 24;
        let header_open = RECT {
            left: right_end - open_w,
            top: client.top + (HEADER_H - PILL_H) / 2,
            right: right_end,
            bottom: client.top + (HEADER_H - PILL_H) / 2 + PILL_H,
        };
        let github = RECT {
            left: header_open.left - 12 - github_w,
            top: client.top + (HEADER_H - PILL_H) / 2,
            right: header_open.left - 12,
            bottom: client.top + (HEADER_H - PILL_H) / 2 + PILL_H,
        };
        state.header_open_editor_btn.rect = header_open;
        state.header_open_editor_btn.hovered = cursor.x >= header_open.left
            && cursor.x <= header_open.right
            && cursor.y >= header_open.top
            && cursor.y <= header_open.bottom;
        state.github_pill.rect = github;
        state.github_pill.hovered = cursor.x >= github.left
            && cursor.x <= github.right
            && cursor.y >= github.top
            && cursor.y <= github.bottom;

        // Header CTA.
        let header_open_bg = if state.header_open_editor_btn.hovered {
            0xE8E8EC
        } else {
            0xFFFFFF
        };
        rounded_fill_rect(hdc, &header_open, header_open_bg, PILL_H / 2);
        draw_text_centered(hdc, "Open editor", &header_open, LANDING_BLACK);

        // GitHub stars pill.
        let github_bg = if state.github_pill.hovered {
            0x1c1c20
        } else {
            LANDING_PILL_BG
        };
        rounded_fill_rect(hdc, &github, github_bg, PILL_H / 2);
        rounded_border_rect(hdc, &github, LANDING_PILL_BORDER, PILL_H / 2);
        let star_x = github.left + 10;
        let star_r = RECT {
            left: star_x,
            top: github.top + (PILL_H - 14) / 2,
            right: star_x + star_w,
            bottom: github.top + (PILL_H - 14) / 2 + 14,
        };
        draw_text_left(hdc, GITHUB_STAR, &star_r, AMBER);
        let pill_text_r = RECT {
            left: star_x + star_w + 3,
            top: github.top,
            right: github.right - 8,
            bottom: github.bottom,
        };
        draw_text_left(hdc, GITHUB_PILL_TEXT, &pill_text_r, TEXT_BRIGHT);

        // Nav links.
        let _ = SelectObject(hdc, fonts.body.into());
        let mut nav_x = brand.right + 32;
        let nav_y = client.top + (HEADER_H - PILL_H) / 2;
        let nav_right_limit = github.left - 24;
        for (i, label) in NAV_LABELS.iter().enumerate() {
            let w = text_size(hdc, label).0 + 16;
            let btn = RECT {
                left: nav_x,
                top: nav_y,
                right: nav_x + w,
                bottom: nav_y + PILL_H,
            };
            if btn.right > nav_right_limit {
                break;
            }
            state.nav_links[i].rect = btn;
            state.nav_links[i].hovered = cursor.x >= btn.left
                && cursor.x <= btn.right
                && cursor.y >= btn.top
                && cursor.y <= btn.bottom;
            if state.nav_links[i].hovered {
                rounded_fill_rect(hdc, &btn, LANDING_PILL_BG, 4);
                draw_text_centered(hdc, label, &btn, TEXT_BRIGHT);
            } else {
                draw_text_centered(hdc, label, &btn, TEXT_DIM);
            }
            nav_x += w + 4;
        }

        // Projects nav link.
        let projects_w = text_size(hdc, PROJECTS_LABEL).0 + 16;
        let projects = RECT {
            left: nav_x,
            top: nav_y,
            right: nav_x + projects_w,
            bottom: nav_y + PILL_H,
        };
        if projects.right <= nav_right_limit {
            state.projects_link.rect = projects;
            state.projects_link.hovered = cursor.x >= projects.left
                && cursor.x <= projects.right
                && cursor.y >= projects.top
                && cursor.y <= projects.bottom;
            if state.projects_link.hovered {
                rounded_fill_rect(hdc, &projects, LANDING_PILL_BG, 4);
                draw_text_centered(hdc, PROJECTS_LABEL, &projects, TEXT_BRIGHT);
            } else {
                draw_text_centered(hdc, PROJECTS_LABEL, &projects, TEXT_DIM);
            }
        }

        let _ = SelectObject(hdc, prev);
    }
}

/// Draw the hero lockup: eyebrow, headline, tagline, CTAs. Returns the y
/// coordinate just below the CTA buttons.
unsafe fn draw_hero(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut HomeState,
    fonts: &FontCache,
    hero_top: i32,
) -> i32 {
    unsafe {
        let cursor = cursor_to_client(hwnd);
        let w = client.right - client.left;
        let cx = client.left + w / 2;

        // Eyebrow pill.
        let eyebrow_text = "Now with Arth — your AI co-pilot · Try the editor";
        let prev = SelectObject(hdc, fonts.tiny.into());
        let text_w = text_size(hdc, eyebrow_text).0;
        let eyebrow_w = text_w + 32 + 14; // text + padding + dot
        let eyebrow = RECT {
            left: cx - eyebrow_w / 2,
            top: hero_top,
            right: cx + eyebrow_w / 2,
            bottom: hero_top + EYEBROW_H,
        };
        rounded_fill_rect(hdc, &eyebrow, LANDING_PILL_BG, EYEBROW_H / 2);
        rounded_border_rect(hdc, &eyebrow, LANDING_PILL_BORDER, EYEBROW_H / 2);

        let dot = RECT {
            left: eyebrow.left + 10,
            top: eyebrow.top + (EYEBROW_H - 8) / 2,
            right: eyebrow.left + 10 + 8,
            bottom: eyebrow.top + (EYEBROW_H - 8) / 2 + 8,
        };
        rounded_fill_rect(hdc, &dot, EMERALD, 4);

        let eyebrow_text_r = RECT {
            left: dot.right + 8,
            top: eyebrow.top,
            right: eyebrow.right - 12,
            bottom: eyebrow.bottom,
        };
        draw_text_left(hdc, eyebrow_text, &eyebrow_text_r, LANDING_TEXT_MUTED);

        // Headline — line 1.
        let line1_h = 54;
        let line1 = RECT {
            left: client.left,
            top: eyebrow.bottom + 16,
            right: client.right,
            bottom: eyebrow.bottom + 16 + line1_h,
        };
        let _ = SelectObject(hdc, fonts.display.into());
        SetTextColor(hdc, COLORREF(rgb(0xFFFFFF)));
        SetBkMode(hdc, TRANSPARENT);
        let mut t1: Vec<u16> = "The video editor".encode_utf16().collect();
        let mut r1 = line1;
        let _ = DrawTextW(
            hdc,
            &mut t1,
            &mut r1,
            DT_CENTER | DT_SINGLELINE | DT_VCENTER,
        );

        // Headline — line 2 with "respects" in serif silver.
        let line2_h = 54;
        let line2_top = line1.bottom + 4;
        let line2 = RECT {
            left: client.left,
            top: line2_top,
            right: client.right,
            bottom: line2_top + line2_h,
        };

        let that = "that ";
        let respects = "respects";
        let machine = " your machine.";

        let (that_w, _) = text_size(hdc, that);
        let _ = SelectObject(hdc, fonts.display_serif.into());
        let (respects_w, _) = text_size(hdc, respects);
        let _ = SelectObject(hdc, fonts.display.into());
        let (machine_w, _) = text_size(hdc, machine);

        let total_w = that_w + respects_w + machine_w;
        let line2_x = cx - total_w / 2;
        let line2_y = line2_top + (line2_h - 44) / 2;

        let mut r = RECT {
            left: line2_x,
            top: line2_y,
            right: line2_x + that_w + 4,
            bottom: line2_y + 44,
        };
        let mut buf: Vec<u16> = that.encode_utf16().collect();
        let _ = DrawTextW(hdc, &mut buf, &mut r, DT_LEFT | DT_VCENTER | DT_SINGLELINE);

        let _ = SelectObject(hdc, fonts.display_serif.into());
        SetTextColor(hdc, COLORREF(rgb(LANDING_SILVER)));
        let mut r = RECT {
            left: line2_x + that_w,
            top: line2_y,
            right: line2_x + that_w + respects_w + 4,
            bottom: line2_y + 44,
        };
        let mut buf: Vec<u16> = respects.encode_utf16().collect();
        let _ = DrawTextW(hdc, &mut buf, &mut r, DT_LEFT | DT_VCENTER | DT_SINGLELINE);

        let _ = SelectObject(hdc, fonts.display.into());
        SetTextColor(hdc, COLORREF(rgb(0xFFFFFF)));
        let mut r = RECT {
            left: line2_x + that_w + respects_w,
            top: line2_y,
            right: line2_x + total_w + 4,
            bottom: line2_y + 44,
        };
        let mut buf: Vec<u16> = machine.encode_utf16().collect();
        let _ = DrawTextW(hdc, &mut buf, &mut r, DT_LEFT | DT_VCENTER | DT_SINGLELINE);

        let _ = SelectObject(hdc, prev);

        // Tagline (centered, word-wrapped).
        let tagline_text = "Artidor is a free, open-source video editor that runs entirely in your \
                           browser or on your desktop. No uploads, no paywalls, no \"Pro\" tier. \
                           Now with Arth, an AI co-pilot that learns how you edit.";
        let _ = SelectObject(hdc, fonts.body.into());
        SetTextColor(hdc, COLORREF(rgb(LANDING_TEXT_MUTED)));
        let mut tagline_r = RECT {
            left: cx - TAGLINE_MAX_W / 2,
            top: line2.bottom + 20,
            right: cx + TAGLINE_MAX_W / 2,
            bottom: line2.bottom + 200,
        };
        let mut tagline_buf: Vec<u16> = tagline_text.encode_utf16().collect();
        let _ = DrawTextW(
            hdc,
            &mut tagline_buf,
            &mut tagline_r,
            DT_CENTER | DT_WORDBREAK | DT_CALCRECT,
        );
        let _ = DrawTextW(
            hdc,
            &mut tagline_buf,
            &mut tagline_r,
            DT_CENTER | DT_WORDBREAK,
        );
        let tagline_bottom = tagline_r.bottom;

        // CTAs.
        let _ = SelectObject(hdc, fonts.body.into());
        let primary_text = "Open the editor";
        let secondary_text = "Star on GitHub";
        let primary_w = text_size(hdc, primary_text).0 + 44;
        let secondary_w = text_size(hdc, secondary_text).0 + 44 + text_size(hdc, GITHUB_STAR).0;
        let gap = 12;
        let total_w = primary_w + gap + secondary_w;
        let cta_y = tagline_bottom + 28;
        let primary = RECT {
            left: cx - total_w / 2,
            top: cta_y,
            right: cx - total_w / 2 + primary_w,
            bottom: cta_y + CTA_H,
        };
        let secondary = RECT {
            left: primary.right + gap,
            top: cta_y,
            right: primary.right + gap + secondary_w,
            bottom: cta_y + CTA_H,
        };
        state.open_editor_btn.rect = primary;
        state.open_editor_btn.hovered = cursor.x >= primary.left
            && cursor.x <= primary.right
            && cursor.y >= primary.top
            && cursor.y <= primary.bottom;
        state.github_btn.rect = secondary;
        state.github_btn.hovered = cursor.x >= secondary.left
            && cursor.x <= secondary.right
            && cursor.y >= secondary.top
            && cursor.y <= secondary.bottom;

        let primary_bg = if state.open_editor_btn.hovered {
            0xE8E8EC
        } else {
            0xFFFFFF
        };
        rounded_fill_rect(hdc, &primary, primary_bg, CTA_H / 2);
        draw_text_centered(hdc, primary_text, &primary, LANDING_BLACK);

        let secondary_bg = if state.github_btn.hovered {
            0x1c1c20
        } else {
            LANDING_PILL_BG
        };
        rounded_fill_rect(hdc, &secondary, secondary_bg, CTA_H / 2);
        rounded_border_rect(hdc, &secondary, LANDING_PILL_BORDER, CTA_H / 2);

        let star_w = text_size(hdc, GITHUB_STAR).0;
        let content_w = star_w + text_size(hdc, secondary_text).0 + 6;
        let content_x = secondary.left + (secondary_w - content_w) / 2;
        let star_r = RECT {
            left: content_x,
            top: secondary.top,
            right: content_x + star_w,
            bottom: secondary.bottom,
        };
        draw_text_left(hdc, GITHUB_STAR, &star_r, AMBER);
        let secondary_text_r = RECT {
            left: content_x + star_w + 6,
            top: secondary.top,
            right: secondary.right - 8,
            bottom: secondary.bottom,
        };
        draw_text_left(hdc, secondary_text, &secondary_text_r, TEXT_BRIGHT);

        secondary.bottom
    }
}

/// Draw the glassmorphic editor preview frame.
unsafe fn draw_preview(hdc: windows::Win32::Graphics::Gdi::HDC, fonts: &FontCache, rect: &RECT) {
    unsafe {
        let _w = rect.right - rect.left;
        let h = rect.bottom - rect.top;

        // Outer frame.
        rounded_fill_rect(hdc, rect, PANEL_BG, 12);
        rounded_border_rect(hdc, rect, LANDING_PILL_BORDER, 12);

        // Top chrome.
        let saved = windows::Win32::Graphics::Gdi::SaveDC(hdc);
        let _ = windows::Win32::Graphics::Gdi::IntersectClipRect(
            hdc,
            rect.left + 1,
            rect.top + 1,
            rect.right - 1,
            rect.bottom - 1,
        );
        let chrome_h = 36;
        let chrome = RECT {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.top + chrome_h,
        };
        fill_rect(hdc, &chrome, BG_DARK);
        draw_hline(
            hdc,
            rect.left,
            rect.right,
            rect.top + chrome_h,
            LANDING_PILL_BORDER,
        );

        // Traffic lights.
        let dot_size = 10;
        let dot_y = rect.top + (chrome_h - dot_size) / 2;
        let mut dot_x = rect.left + 16;
        for color in [DOT_RED, DOT_YELLOW, DOT_GREEN] {
            let dot = RECT {
                left: dot_x,
                top: dot_y,
                right: dot_x + dot_size,
                bottom: dot_y + dot_size,
            };
            rounded_fill_rect(hdc, &dot, color, dot_size / 2);
            dot_x += dot_size + 8;
        }

        let _ = SelectObject(hdc, fonts.tiny.into());
        let preview_label = "artidor — live preview";
        let label_w = text_size(hdc, preview_label).0;
        let label_r = RECT {
            left: rect.left + 56,
            top: rect.top,
            right: rect.left + 56 + label_w + 4,
            bottom: rect.top + chrome_h,
        };
        draw_text_left(hdc, preview_label, &label_r, TEXT_DIM);

        let ai_label = "AI editing";
        let ai_w = text_size(hdc, ai_label).0 + text_size(hdc, GITHUB_STAR).0 + 4;
        let ai_r = RECT {
            left: rect.right - ai_w - 16,
            top: rect.top,
            right: rect.right - 16,
            bottom: rect.top + chrome_h,
        };
        let star_r = RECT {
            left: ai_r.left,
            top: ai_r.top,
            right: ai_r.left + text_size(hdc, GITHUB_STAR).0,
            bottom: ai_r.bottom,
        };
        draw_text_left(hdc, GITHUB_STAR, &star_r, AMBER);
        let ai_text_r = RECT {
            left: star_r.right + 4,
            top: ai_r.top,
            right: ai_r.right,
            bottom: ai_r.bottom,
        };
        draw_text_left(hdc, ai_label, &ai_text_r, TEXT_FAINT);

        let _ = windows::Win32::Graphics::Gdi::RestoreDC(hdc, saved);

        // Placeholder screenshot area.
        let placeholder = RECT {
            left: rect.left + 1,
            top: rect.top + chrome_h + 1,
            right: rect.right - 1,
            bottom: rect.bottom - 1,
        };
        gradient_fill_v(hdc, &placeholder, 0x0c0c10, 0x111114);

        let _ = SelectObject(hdc, fonts.body.into());
        let center_label = "Editor preview";
        let center_r = RECT {
            left: rect.left,
            top: rect.top + chrome_h + (h - chrome_h) / 2 - 10,
            right: rect.right,
            bottom: rect.top + chrome_h + (h - chrome_h) / 2 + 20,
        };
        draw_text_centered(hdc, center_label, &center_r, TEXT_FAINT);

        // Bottom reflection.
        let reflection_h = 48;
        let reflection = RECT {
            left: rect.left + 1,
            top: rect.bottom - reflection_h - 1,
            right: rect.right - 1,
            bottom: rect.bottom - 1,
        };
        gradient_fill_v(hdc, &reflection, 0x000000, 0x0a0a0c);
    }
}

/// Draw the 4-column stats strip.
unsafe fn draw_stats(hdc: windows::Win32::Graphics::Gdi::HDC, fonts: &FontCache, rect: &RECT) {
    unsafe {
        let w = rect.right - rect.left;
        let cell_w = w / 4;
        let _ = SelectObject(hdc, fonts.title.into());
        for (i, (value, label)) in STATS.iter().enumerate() {
            let left = rect.left + i as i32 * cell_w + 16;
            let value_r = RECT {
                left,
                top: rect.top + 8,
                right: left + cell_w - 24,
                bottom: rect.top + 32,
            };
            draw_text_left(hdc, value, &value_r, TEXT_BRIGHT);
            let _ = SelectObject(hdc, fonts.tiny.into());
            let label_r = RECT {
                left,
                top: rect.top + 34,
                right: left + cell_w - 24,
                bottom: rect.top + 50,
            };
            draw_text_left(hdc, label, &label_r, TEXT_DIM);
            let _ = SelectObject(hdc, fonts.title.into());
        }
    }
}

/// Draw the recent-projects card row at the bottom of the home screen.
unsafe fn draw_recent(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut HomeState,
    fonts: &FontCache,
    top: i32,
    max_width: i32,
) {
    unsafe {
        let cursor = cursor_to_client(hwnd);

        let title_r = RECT {
            left: client.left,
            top,
            right: client.right,
            bottom: top + 24,
        };
        let _ = SelectObject(hdc, fonts.body.into());
        draw_text_centered(hdc, "Recent Projects", &title_r, TEXT_DIM);

        state.card_rects.clear();
        state.hovered_recent = None;

        let gap = 8;
        let max_cols = ((max_width + gap) / (CARD_W + gap)).clamp(1, 3);
        let cols = (state.recent.len() as i32).min(max_cols);
        let cards_total_w = cols * CARD_W + (cols - 1) * gap;
        let mut x = client.left + (client.right - client.left - cards_total_w) / 2;
        let y = title_r.bottom + 10;

        for (i, rp) in state.recent.iter().take(cols as usize).enumerate() {
            let card = RECT {
                left: x,
                top: y,
                right: x + CARD_W,
                bottom: y + CARD_H,
            };
            state.card_rects.push(card);
            let hovered = cursor.x >= card.left
                && cursor.x <= card.right
                && cursor.y >= card.top
                && cursor.y <= card.bottom;
            if hovered {
                state.hovered_recent = Some(i);
            }

            let bg = if hovered { 0x1c1c20 } else { PANEL_BG };
            rounded_fill_rect(hdc, &card, bg, 8);
            rounded_border_rect(hdc, &card, LANDING_PILL_BORDER, 8);

            let name_r = RECT {
                left: card.left + 12,
                top: card.top + 10,
                right: card.right - 12,
                bottom: card.top + 28,
            };
            draw_text_left(hdc, &rp.name, &name_r, TEXT_BRIGHT);
            let path_r = RECT {
                left: card.left + 12,
                top: card.top + 32,
                right: card.right - 12,
                bottom: card.bottom - 10,
            };
            draw_text_left_ellipsis(hdc, &rp.path.to_string_lossy(), &path_r, TEXT_FAINT);

            x += CARD_W + gap;
        }
    }
}

/// Draw the home screen.
pub unsafe fn draw_home(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut HomeState,
    fonts: &FontCache,
) {
    unsafe {
        gradient_fill_v(hdc, client, LANDING_BG, 0x14161b);
        draw_header(hdc, hwnd, client, state, fonts);

        let body_top = client.top + HEADER_H;
        let hero_y = body_top + 28;
        let cta_bottom = draw_hero(hdc, hwnd, client, state, fonts, hero_y);

        let stats_h = 70;
        let recent_h = if state.recent.is_empty() { 0 } else { 80 };
        let margin = 24;
        let max_preview_h =
            (client.bottom - cta_bottom - margin - stats_h - margin - recent_h - margin).max(120);

        let w = client.right - client.left;
        let ideal_w = (w - 64).min(900);
        let ideal_h = ideal_w * 9 / 16;
        let (preview_w, preview_h) = if ideal_h <= max_preview_h {
            (ideal_w, ideal_h)
        } else {
            let h = max_preview_h;
            (h * 16 / 9, h)
        };

        let preview_x = client.left + (w - preview_w) / 2;
        let preview_y = cta_bottom + margin;
        let preview = RECT {
            left: preview_x,
            top: preview_y,
            right: preview_x + preview_w,
            bottom: preview_y + preview_h,
        };
        draw_preview(hdc, fonts, &preview);

        let stats = RECT {
            left: preview_x,
            top: preview.bottom + margin,
            right: preview_x + preview_w,
            bottom: preview.bottom + margin + stats_h,
        };
        draw_stats(hdc, fonts, &stats);

        if !state.recent.is_empty() {
            draw_recent(
                hdc,
                hwnd,
                client,
                state,
                fonts,
                stats.bottom + margin,
                preview_w,
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hit_test_card_finds_card_inside_rect() {
        let mut state = HomeState::new();
        state.card_rects = vec![
            RECT {
                left: 0,
                top: 0,
                right: 100,
                bottom: 50,
            },
            RECT {
                left: 0,
                top: 60,
                right: 100,
                bottom: 110,
            },
        ];
        assert_eq!(state.hit_test_card(50, 70), Some(1));
        assert_eq!(state.hit_test_card(150, 10), None);
    }
}
