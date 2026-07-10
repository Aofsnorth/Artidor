//! Project hub screen — full list of recent projects with scroll support.
//!
//! Mirrors the web app's `/projects` page (`apps/web/src/app/projects/page.tsx`).
//! The user reaches this screen from the Home top-nav "Projects" link.

use windows::Win32::Foundation::{COLORREF, HWND, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    DT_CALCRECT, DT_LEFT, DT_SINGLELINE, DT_VCENTER, DrawTextW, IntersectClipRect, RestoreDC,
    SaveDC, SelectObject, SetBkMode, SetTextColor, TRANSPARENT,
};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

use crate::state::persistence;
use crate::state::project::CanvasSize;
use crate::theme::{
    LANDING_BG, LANDING_BLACK, LANDING_PILL_BORDER, PANEL_BG, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT,
    rgb,
};
use crate::ui::font::FontCache;
use crate::ui::gfx::{
    draw_hline, draw_text_centered, draw_text_left, gradient_fill_v, rounded_border_rect,
    rounded_fill_rect,
};

const HEADER_H: i32 = 56;
const PILL_H: i32 = 28;
const CARD_W: i32 = 320;
const CARD_H: i32 = 64;
const CARD_GAP: i32 = 8;

/// Project template used for the "Create from template" row.
#[derive(Clone, Copy)]
pub struct ProjectTemplate {
    pub title: &'static str,
    pub description: &'static str,
    pub duration: &'static str,
    pub aspect: &'static str,
    pub canvas: CanvasSize,
    pub top_color: u32,
    pub bottom_color: u32,
    pub monogram: &'static str,
}

/// Default project templates matching the web projects page.
pub const TEMPLATES: [ProjectTemplate; 4] = [
    ProjectTemplate {
        title: "YouTube video",
        description: "16:9 landscape, 5 min default. Captions + intro card.",
        duration: "5:00",
        aspect: "16:9",
        canvas: CanvasSize::HD_1080,
        top_color: 0x2a3f8c,
        bottom_color: 0x1a1a3e,
        monogram: "Y",
    },
    ProjectTemplate {
        title: "Vertical reel",
        description: "9:16 portrait, 60s. Captions + safe-area guides.",
        duration: "0:60",
        aspect: "9:16",
        canvas: CanvasSize {
            width: 1080,
            height: 1920,
        },
        top_color: 0x5c3a6e,
        bottom_color: 0x2a1a35,
        monogram: "R",
    },
    ProjectTemplate {
        title: "TikTok / Short",
        description: "9:16, 30s. Beat-synced cuts, captions on top.",
        duration: "0:30",
        aspect: "9:16",
        canvas: CanvasSize {
            width: 1080,
            height: 1920,
        },
        top_color: 0x3a6e5c,
        bottom_color: 0x1a3a2e,
        monogram: "T",
    },
    ProjectTemplate {
        title: "Blank canvas",
        description: "16:9, no constraints. Bring your own media.",
        duration: "∞",
        aspect: "16:9",
        canvas: CanvasSize::HD_1080,
        top_color: 0x3a3a40,
        bottom_color: 0x1a1a1e,
        monogram: "B",
    },
];

/// A clickable button on the project hub.
#[derive(Clone, Copy, Default)]
pub struct ProjectsButton {
    pub rect: RECT,
    pub hovered: bool,
}

/// View mode for the project grid.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub enum ViewMode {
    #[default]
    Grid,
    List,
}

/// State for the project hub screen.
pub struct ProjectsState {
    pub home_btn: ProjectsButton,
    pub new_project_btn: ProjectsButton,
    pub search_pill: ProjectsButton,
    pub sort_btn: ProjectsButton,
    pub view_grid_btn: ProjectsButton,
    pub view_list_btn: ProjectsButton,
    pub templates: [ProjectsButton; 4],
    pub view_mode: ViewMode,
    pub recent: Vec<persistence::RecentProject>,
    pub hovered_card: Option<usize>,
    pub card_rects: Vec<RECT>,
    /// Vertical scroll offset for the project list (pixels).
    pub scroll_y: i32,
    /// Maximum scroll value (set during paint).
    pub max_scroll_y: i32,
}

impl ProjectsState {
    /// Load the recent-projects list and prepare a blank scroll state.
    pub fn new() -> Self {
        Self {
            home_btn: ProjectsButton::default(),
            new_project_btn: ProjectsButton::default(),
            search_pill: ProjectsButton::default(),
            sort_btn: ProjectsButton::default(),
            view_grid_btn: ProjectsButton::default(),
            view_list_btn: ProjectsButton::default(),
            templates: [ProjectsButton::default(); 4],
            view_mode: ViewMode::default(),
            recent: persistence::load_recent_projects(),
            hovered_card: None,
            card_rects: Vec::new(),
            scroll_y: 0,
            max_scroll_y: 0,
        }
    }

    /// Hit-test a client-space point against the stored project cards. Cards
    /// are drawn offset by `scroll_y`, so the hit-test must account for that.
    pub fn hit_test_card(&self, x: i32, y: i32) -> Option<usize> {
        self.card_rects
            .iter()
            .position(|r| x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
    }

    /// Scroll the list by `delta` pixels, clamping to the valid range.
    pub fn scroll_by(&mut self, delta: i32) {
        self.scroll_y = (self.scroll_y + delta).clamp(0, self.max_scroll_y);
    }
}

impl Default for ProjectsState {
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

/// Format a byte count into a human-readable string.
fn format_bytes(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".to_string();
    }
    let mut size = bytes as f64;
    let mut i = 0;
    let units = ["B", "KB", "MB", "GB", "TB"];
    while size >= 1024.0 && i < units.len() - 1 {
        size /= 1024.0;
        i += 1;
    }
    if i == 0 {
        format!("{} {}", bytes, units[i])
    } else {
        format!("{:.1} {}", size, units[i])
    }
}

/// Draw the projects page header with breadcrumb, search, sort, view toggles,
/// and New project button.
unsafe fn draw_header(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut ProjectsState,
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

        let left = client.left + 40;
        let top = header.top + (HEADER_H - PILL_H) / 2;

        // Breadcrumb: Home / Projects
        let _ = SelectObject(hdc, fonts.body.into());
        let home_w = text_size(hdc, "Home").0 + 12;
        let home = RECT {
            left,
            top,
            right: left + home_w,
            bottom: top + PILL_H,
        };
        state.home_btn.rect = home;
        state.home_btn.hovered = cursor.x >= home.left
            && cursor.x <= home.right
            && cursor.y >= home.top
            && cursor.y <= home.bottom;
        let home_color = if state.home_btn.hovered {
            TEXT_BRIGHT
        } else {
            TEXT_DIM
        };
        draw_text_centered(hdc, "Home", &home, home_color);

        let sep_x = home.right + 8;
        let sep_r = RECT {
            left: sep_x,
            top,
            right: sep_x + 16,
            bottom: top + PILL_H,
        };
        draw_text_centered(hdc, "/", &sep_r, TEXT_FAINT);

        let title_x = sep_r.right + 4;
        let title_w = text_size(hdc, "Projects").0 + 12;
        let title_r = RECT {
            left: title_x,
            top,
            right: title_x + title_w,
            bottom: top + PILL_H,
        };
        draw_text_left(hdc, "Projects", &title_r, TEXT_BRIGHT);

        // Right-side cluster.
        let _ = SelectObject(hdc, fonts.tiny.into());
        let search_text = "Search...";
        let sort_text = "Modified";
        let search_w = text_size(hdc, search_text).0 + 48;
        let sort_w = text_size(hdc, sort_text).0 + 32;
        let _ = SelectObject(hdc, fonts.body.into());
        let new_text = "New project";
        let new_w = text_size(hdc, new_text).0 + 28;
        let view_w = 32 * 2 + 4;

        let gap = 12;
        let right_cluster_w = new_w + gap + search_w + gap + sort_w + gap + view_w;
        let right_end = client.right - 40;
        let mut x = right_end - right_cluster_w;

        let view_y = top + (PILL_H - 32) / 2;
        let view_grid = RECT {
            left: x,
            top: view_y,
            right: x + 32,
            bottom: view_y + 32,
        };
        let view_list = RECT {
            left: view_grid.right + 4,
            top: view_y,
            right: view_grid.right + 4 + 32,
            bottom: view_y + 32,
        };
        state.view_grid_btn.rect = view_grid;
        state.view_grid_btn.hovered = cursor.x >= view_grid.left
            && cursor.x <= view_grid.right
            && cursor.y >= view_grid.top
            && cursor.y <= view_grid.bottom;
        state.view_list_btn.rect = view_list;
        state.view_list_btn.hovered = cursor.x >= view_list.left
            && cursor.x <= view_list.right
            && cursor.y >= view_list.top
            && cursor.y <= view_list.bottom;

        draw_view_button(
            hdc,
            &view_grid,
            "▦",
            state.view_mode == ViewMode::Grid,
            fonts,
        );
        draw_view_button(
            hdc,
            &view_list,
            "☰",
            state.view_mode == ViewMode::List,
            fonts,
        );
        x += view_w + gap;

        let sort = RECT {
            left: x,
            top,
            right: x + sort_w,
            bottom: top + PILL_H,
        };
        state.sort_btn.rect = sort;
        state.sort_btn.hovered = cursor.x >= sort.left
            && cursor.x <= sort.right
            && cursor.y >= sort.top
            && cursor.y <= sort.bottom;
        let sort_bg = if state.sort_btn.hovered {
            0x1c1c20
        } else {
            PANEL_BG
        };
        rounded_fill_rect(hdc, &sort, sort_bg, PILL_H / 2);
        rounded_border_rect(hdc, &sort, LANDING_PILL_BORDER, PILL_H / 2);
        let _ = SelectObject(hdc, fonts.tiny.into());
        let arrow = "↓";
        let text_w = text_size(hdc, sort_text).0;
        let arrow_w = text_size(hdc, arrow).0;
        let content_w = text_w + arrow_w + 4;
        let content_x = sort.left + (sort_w - content_w) / 2;
        let text_r = RECT {
            left: content_x,
            top: sort.top,
            right: content_x + text_w,
            bottom: sort.bottom,
        };
        draw_text_left(hdc, sort_text, &text_r, TEXT_BRIGHT);
        let arrow_r = RECT {
            left: text_r.right + 4,
            top: sort.top,
            right: text_r.right + 4 + arrow_w,
            bottom: sort.bottom,
        };
        draw_text_left(hdc, arrow, &arrow_r, TEXT_DIM);
        x += sort_w + gap;

        let search = RECT {
            left: x,
            top,
            right: x + search_w,
            bottom: top + PILL_H,
        };
        state.search_pill.rect = search;
        state.search_pill.hovered = cursor.x >= search.left
            && cursor.x <= search.right
            && cursor.y >= search.top
            && cursor.y <= search.bottom;
        let search_bg = if state.search_pill.hovered {
            0x1c1c20
        } else {
            PANEL_BG
        };
        rounded_fill_rect(hdc, &search, search_bg, PILL_H / 2);
        rounded_border_rect(hdc, &search, LANDING_PILL_BORDER, PILL_H / 2);
        let search_icon = "⌕";
        let icon_w = text_size(hdc, search_icon).0;
        let text_w = text_size(hdc, search_text).0;
        let search_content_w = icon_w + text_w + 6;
        let search_content_x = search.left + (search_w - search_content_w) / 2;
        let icon_r = RECT {
            left: search_content_x,
            top: search.top,
            right: search_content_x + icon_w,
            bottom: search.bottom,
        };
        draw_text_left(hdc, search_icon, &icon_r, TEXT_FAINT);
        let search_text_r = RECT {
            left: icon_r.right + 6,
            top: search.top,
            right: icon_r.right + 6 + text_w,
            bottom: search.bottom,
        };
        draw_text_left(hdc, search_text, &search_text_r, TEXT_FAINT);
        x += search_w + gap;

        let new = RECT {
            left: x,
            top,
            right: x + new_w,
            bottom: top + PILL_H,
        };
        state.new_project_btn.rect = new;
        state.new_project_btn.hovered = cursor.x >= new.left
            && cursor.x <= new.right
            && cursor.y >= new.top
            && cursor.y <= new.bottom;
        let new_bg = if state.new_project_btn.hovered {
            0xE8E8EC
        } else {
            0xFFFFFF
        };
        rounded_fill_rect(hdc, &new, new_bg, PILL_H / 2);
        draw_text_centered(hdc, new_text, &new, LANDING_BLACK);
    }
}

/// Draw a small grid/list view toggle button.
unsafe fn draw_view_button(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    rect: &RECT,
    icon: &str,
    selected: bool,
    fonts: &FontCache,
) {
    unsafe {
        let bg = if selected { 0xFFFFFF } else { PANEL_BG };
        rounded_fill_rect(hdc, rect, bg, 6);
        if !selected {
            rounded_border_rect(hdc, rect, LANDING_PILL_BORDER, 6);
        }
        let color = if selected { LANDING_BLACK } else { TEXT_DIM };
        let _ = SelectObject(hdc, fonts.body.into());
        draw_text_centered(hdc, icon, rect, color);
    }
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
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | windows::Win32::Graphics::Gdi::DT_END_ELLIPSIS,
        );
    }
}

/// Draw the workspace stats overview panel.
unsafe fn draw_stats(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    fonts: &FontCache,
    rect: &RECT,
    recent: &[persistence::RecentProject],
) {
    unsafe {
        rounded_fill_rect(hdc, rect, PANEL_BG, 12);
        rounded_border_rect(hdc, rect, LANDING_PILL_BORDER, 12);

        let active = recent.len() as u64;
        let trash: u64 = 0;
        let storage: u64 = recent
            .iter()
            .filter_map(|rp| std::fs::metadata(&rp.path).ok())
            .map(|m| m.len())
            .sum();

        let stats = [
            (active.to_string(), "Active projects"),
            (trash.to_string(), "In trash"),
            (format_bytes(storage), "Storage used"),
        ];

        let w = rect.right - rect.left;
        let cell_w = w / stats.len() as i32;
        let _ = SelectObject(hdc, fonts.title.into());
        for (i, (value, label)) in stats.iter().enumerate() {
            let left = rect.left + i as i32 * cell_w + 16;
            let value_r = RECT {
                left,
                top: rect.top + 10,
                right: left + cell_w - 24,
                bottom: rect.top + 34,
            };
            draw_text_left(hdc, value, &value_r, TEXT_BRIGHT);
            let _ = SelectObject(hdc, fonts.tiny.into());
            let label_r = RECT {
                left,
                top: rect.top + 36,
                right: left + cell_w - 24,
                bottom: rect.top + 52,
            };
            draw_text_left(hdc, label, &label_r, TEXT_DIM);
            let _ = SelectObject(hdc, fonts.title.into());
        }
    }
}

/// Draw the "Create from template" row.
unsafe fn draw_templates(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut ProjectsState,
    fonts: &FontCache,
    top: i32,
    max_width: i32,
) -> i32 {
    unsafe {
        let cursor = cursor_to_client(hwnd);

        // Section header.
        let _ = SelectObject(hdc, fonts.tiny.into());
        let title = "Or start from a template";
        let title_w = text_size(hdc, title).0;
        let title_r = RECT {
            left: client.left + 40,
            top: top + 4,
            right: client.left + 40 + title_w,
            bottom: top + 20,
        };
        draw_text_left(hdc, title, &title_r, TEXT_DIM);
        draw_hline(
            hdc,
            title_r.right + 12,
            client.right - 40,
            title_r.top + 7,
            LANDING_PILL_BORDER,
        );

        // Template cards.
        let gap = 8;
        let cols = 4;
        let card_w = (max_width - (cols - 1) * gap) / cols;
        let thumb_h = card_w * 9 / 16;
        let card_h = thumb_h + 52;
        let cards_total = cols * card_w + (cols - 1) * gap;
        let start_x = client.left + (client.right - client.left - cards_total) / 2;
        let y = title_r.bottom + 12;

        for (i, template) in TEMPLATES.iter().enumerate() {
            let x = start_x + i as i32 * (card_w + gap);
            let card = RECT {
                left: x,
                top: y,
                right: x + card_w,
                bottom: y + card_h,
            };
            state.templates[i].rect = card;
            state.templates[i].hovered = cursor.x >= card.left
                && cursor.x <= card.right
                && cursor.y >= card.top
                && cursor.y <= card.bottom;

            let bg = if state.templates[i].hovered {
                0x1c1c20
            } else {
                PANEL_BG
            };
            rounded_fill_rect(hdc, &card, bg, 8);
            rounded_border_rect(hdc, &card, LANDING_PILL_BORDER, 8);

            let thumb = RECT {
                left: card.left + 6,
                top: card.top + 6,
                right: card.right - 6,
                bottom: card.top + 6 + thumb_h,
            };
            rounded_fill_rect(hdc, &thumb, 0x000000, 4);
            gradient_fill_v(hdc, &thumb, template.top_color, template.bottom_color);

            let monogram_r = RECT {
                left: thumb.left,
                top: thumb.top,
                right: thumb.right,
                bottom: thumb.bottom,
            };
            let _ = SelectObject(hdc, fonts.title.into());
            draw_text_centered(hdc, template.monogram, &monogram_r, 0xFFFFFF);

            let badge = format!("{} · {}", template.duration, template.aspect);
            let _ = SelectObject(hdc, fonts.tiny.into());
            let badge_w = text_size(hdc, &badge).0 + 8;
            let badge_r = RECT {
                left: thumb.left + 6,
                top: thumb.bottom - 18,
                right: thumb.left + 6 + badge_w,
                bottom: thumb.bottom - 4,
            };
            rounded_fill_rect(hdc, &badge_r, 0x000000, 3);
            draw_text_centered(hdc, &badge, &badge_r, TEXT_BRIGHT);

            let title_r = RECT {
                left: card.left + 8,
                top: thumb.bottom + 6,
                right: card.right - 8,
                bottom: thumb.bottom + 22,
            };
            let _ = SelectObject(hdc, fonts.small.into());
            draw_text_left(hdc, template.title, &title_r, TEXT_BRIGHT);

            let desc_r = RECT {
                left: card.left + 8,
                top: title_r.bottom,
                right: card.right - 8,
                bottom: card.bottom - 6,
            };
            let _ = SelectObject(hdc, fonts.tiny.into());
            draw_text_left(hdc, template.description, &desc_r, TEXT_FAINT);
        }

        y + card_h
    }
}

/// Draw the scrollable list of recent project cards.
unsafe fn draw_project_list(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut ProjectsState,
    fonts: &FontCache,
    content_top: i32,
    content_bottom: i32,
) {
    unsafe {
        let cursor = cursor_to_client(hwnd);

        let content_left = client.left + 40;
        let content_right = client.right - 40;

        state.card_rects.clear();
        state.hovered_card = None;

        if state.recent.is_empty() {
            let hint = RECT {
                left: content_left,
                top: content_top + 40,
                right: content_right,
                bottom: content_top + 80,
            };
            draw_text_centered(
                hdc,
                "No projects yet. Create a new project or open an existing one.",
                &hint,
                TEXT_FAINT,
            );
            return;
        }

        let saved = SaveDC(hdc);
        let _ = IntersectClipRect(
            hdc,
            content_left,
            content_top,
            content_right,
            content_bottom,
        );

        let card_w = (CARD_W).min(content_right - content_left - 32);
        let cards_x = content_left + (content_right - content_left - card_w) / 2;
        let mut card_y = content_top - state.scroll_y;

        for (i, rp) in state.recent.iter().enumerate() {
            let card = RECT {
                left: cards_x,
                top: card_y,
                right: cards_x + card_w,
                bottom: card_y + CARD_H,
            };
            state.card_rects.push(card);
            let hovered = cursor.x >= card.left
                && cursor.x <= card.right
                && cursor.y >= card.top
                && cursor.y <= card.bottom;
            if hovered {
                state.hovered_card = Some(i);
            }

            let bg = if hovered { 0x1c1c20 } else { PANEL_BG };
            rounded_fill_rect(hdc, &card, bg, 8);
            rounded_border_rect(hdc, &card, LANDING_PILL_BORDER, 8);

            let name_r = RECT {
                left: card.left + 14,
                top: card.top + 10,
                right: card.right - 14,
                bottom: card.top + 28,
            };
            let _ = SelectObject(hdc, fonts.small.into());
            draw_text_left(hdc, &rp.name, &name_r, TEXT_BRIGHT);
            let path_r = RECT {
                left: card.left + 14,
                top: card.top + 32,
                right: card.right - 14,
                bottom: card.bottom - 10,
            };
            draw_text_left_ellipsis(hdc, &rp.path.to_string_lossy(), &path_r, TEXT_FAINT);

            card_y += CARD_H + CARD_GAP;
        }

        let _ = RestoreDC(hdc, saved);
    }
}

/// Draw the project hub screen.
pub unsafe fn draw_projects(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut ProjectsState,
    fonts: &FontCache,
) {
    unsafe {
        gradient_fill_v(hdc, client, 0x0c0d10, 0x14161b);
        draw_header(hdc, hwnd, client, state, fonts);

        let body_top = client.top + HEADER_H;
        let margin = 24;

        // Stats overview.
        let stats_h = 70;
        let stats = RECT {
            left: client.left + 40,
            top: body_top + margin,
            right: client.right - 40,
            bottom: body_top + margin + stats_h,
        };
        draw_stats(hdc, fonts, &stats, &state.recent);

        // Templates.
        let max_width = client.right - client.left - 80;
        let templates_bottom = draw_templates(
            hdc,
            hwnd,
            client,
            state,
            fonts,
            stats.bottom + margin,
            max_width,
        );

        // Scrollable project list.
        let content_top = templates_bottom + margin;
        let content_bottom = client.bottom - margin;

        let content_h = content_bottom - content_top;
        let total_cards_h = state.recent.len() as i32 * (CARD_H + CARD_GAP) - CARD_GAP;
        state.max_scroll_y = (total_cards_h - content_h).max(0);
        state.scroll_y = state.scroll_y.min(state.max_scroll_y);

        draw_project_list(hdc, hwnd, client, state, fonts, content_top, content_bottom);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scroll_by_clamps_to_range() {
        let mut state = ProjectsState::new();
        state.max_scroll_y = 100;
        state.scroll_by(50);
        assert_eq!(state.scroll_y, 50);
        state.scroll_by(100);
        assert_eq!(state.scroll_y, 100);
        state.scroll_by(-200);
        assert_eq!(state.scroll_y, 0);
    }

    #[test]
    fn hit_test_card_uses_stored_rects() {
        let mut state = ProjectsState::new();
        state.card_rects = vec![
            RECT {
                left: 10,
                top: 10,
                right: 110,
                bottom: 70,
            },
            RECT {
                left: 10,
                top: 80,
                right: 110,
                bottom: 140,
            },
        ];
        assert_eq!(state.hit_test_card(50, 100), Some(1));
        assert_eq!(state.hit_test_card(200, 50), None);
    }
}
