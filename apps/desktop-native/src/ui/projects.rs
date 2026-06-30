//! Project hub screen — full list of recent projects with scroll support.
//!
//! Mirrors the web app's `/projects` page (`apps/web/src/app/projects/page.tsx`).
//! The user reaches this screen from the Home top-nav "Projects" tab.

use windows::Win32::Foundation::{COLORREF, HWND, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    DT_SINGLELINE, DT_VCENTER, DrawTextW, IntersectClipRect, RestoreDC, SaveDC, SelectObject,
    SetBkMode, SetTextColor, TRANSPARENT,
};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

use crate::state::persistence;
use crate::theme::{BG, BG_DARK, BORDER, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT, rgb};
use crate::ui::font::FontCache;
use crate::ui::gfx::{border_rect, draw_text_centered, draw_text_left, fill_rect};

const HEADER_H: i32 = 48;
const TAB_H: i32 = 26;
const BTN_H: i32 = 36;
const CARD_W: i32 = 320;
const CARD_H: i32 = 56;
const CARD_GAP: i32 = 8;

/// A clickable button on the project hub.
#[derive(Clone, Copy)]
pub struct ProjectsButton {
    pub rect: RECT,
    pub hovered: bool,
}

/// State for the project hub screen.
pub struct ProjectsState {
    pub new_project_btn: ProjectsButton,
    pub open_project_btn: ProjectsButton,
    pub home_tab: ProjectsButton,
    pub projects_tab: ProjectsButton,
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
            new_project_btn: ProjectsButton {
                rect: RECT::default(),
                hovered: false,
            },
            open_project_btn: ProjectsButton {
                rect: RECT::default(),
                hovered: false,
            },
            home_tab: ProjectsButton {
                rect: RECT::default(),
                hovered: false,
            },
            projects_tab: ProjectsButton {
                rect: RECT::default(),
                hovered: false,
            },
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

/// Draw a top navigation bar. On this screen the "Projects" tab is active.
unsafe fn draw_top_nav(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut ProjectsState,
    fonts: &FontCache,
) {
    unsafe {
        let header = RECT {
            left: client.left,
            top: client.top,
            right: client.right,
            bottom: client.top + HEADER_H,
        };
        fill_rect(hdc, &header, BG_DARK);
        let bottom_line = RECT {
            left: client.left,
            top: header.bottom - 1,
            right: client.right,
            bottom: header.bottom,
        };
        fill_rect(hdc, &bottom_line, BORDER_FAINT);

        let cursor = cursor_to_client(hwnd);

        let logo_size = 24;
        let logo = RECT {
            left: client.left + 16,
            top: client.top + (HEADER_H - logo_size) / 2,
            right: client.left + 16 + logo_size,
            bottom: client.top + (HEADER_H - logo_size) / 2 + logo_size,
        };
        fill_rect(hdc, &logo, 0x2A3F8C);
        draw_text_centered(hdc, "A", &logo, 0xFFFFFF);

        let brand = RECT {
            left: logo.right + 8,
            top: client.top,
            right: logo.right + 120,
            bottom: client.top + HEADER_H,
        };
        let prev = SelectObject(hdc, fonts.header.into());
        draw_text_left(hdc, "Artidor", &brand, TEXT_BRIGHT);
        let _ = SelectObject(hdc, prev);

        let home = RECT {
            left: brand.right + 24,
            top: client.top + (HEADER_H - TAB_H) / 2,
            right: brand.right + 24 + 60,
            bottom: client.top + (HEADER_H - TAB_H) / 2 + TAB_H,
        };
        let projects = RECT {
            left: home.right + 8,
            top: home.top,
            right: home.right + 8 + 72,
            bottom: home.bottom,
        };
        state.home_tab.rect = home;
        state.projects_tab.rect = projects;
        state.home_tab.hovered = cursor.x >= home.left
            && cursor.x <= home.right
            && cursor.y >= home.top
            && cursor.y <= home.bottom;
        state.projects_tab.hovered = cursor.x >= projects.left
            && cursor.x <= projects.right
            && cursor.y >= projects.top
            && cursor.y <= projects.bottom;

        let home_bg = if state.home_tab.hovered { 0x1A1A1E } else { BG_DARK };
        fill_rect(hdc, &home, home_bg);
        draw_text_centered(hdc, "Home", &home, TEXT_DIM);

        fill_rect(hdc, &projects, 0x1A1A1E);
        border_rect(hdc, &projects, BORDER);
        draw_text_centered(hdc, "Projects", &projects, TEXT_BRIGHT);
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
        fill_rect(hdc, client, BG);
        draw_top_nav(hdc, hwnd, client, state, fonts);

        let cursor = cursor_to_client(hwnd);
        let body_top = client.top + HEADER_H;

        // Title + action buttons.
        let title_h = 56;
        let title = RECT {
            left: client.left + 32,
            top: body_top + 16,
            right: client.left + 300,
            bottom: body_top + 16 + title_h,
        };
        let prev = SelectObject(hdc, fonts.title.into());
        SetTextColor(hdc, COLORREF(rgb(TEXT_BRIGHT)));
        SetBkMode(hdc, TRANSPARENT);
        let mut title_buf: Vec<u16> = "Projects".encode_utf16().collect();
        let mut title_r = title;
        let _ = DrawTextW(
            hdc,
            &mut title_buf,
            &mut title_r,
            DT_SINGLELINE | DT_VCENTER,
        );
        let _ = SelectObject(hdc, prev);

        let btn_y = title.top + (title_h - BTN_H) / 2;
        let new_x = client.right - 32 - 140;
        let open_x = new_x - 8 - 140;
        let new_btn = RECT {
            left: new_x,
            top: btn_y,
            right: new_x + 140,
            bottom: btn_y + BTN_H,
        };
        let open_btn = RECT {
            left: open_x,
            top: btn_y,
            right: open_x + 140,
            bottom: btn_y + BTN_H,
        };
        state.new_project_btn.rect = new_btn;
        state.open_project_btn.rect = open_btn;
        state.new_project_btn.hovered = cursor.x >= new_btn.left
            && cursor.x <= new_btn.right
            && cursor.y >= new_btn.top
            && cursor.y <= new_btn.bottom;
        state.open_project_btn.hovered = cursor.x >= open_btn.left
            && cursor.x <= open_btn.right
            && cursor.y >= open_btn.top
            && cursor.y <= open_btn.bottom;

        let new_bg = if state.new_project_btn.hovered {
            0x3B5BDB
        } else {
            0x2A3F8C
        };
        fill_rect(hdc, &new_btn, new_bg);
        draw_text_centered(hdc, "New Project", &new_btn, 0xFFFFFF);
        let open_bg = if state.open_project_btn.hovered {
            0x1E1E22
        } else {
            0x16161A
        };
        fill_rect(hdc, &open_btn, open_bg);
        border_rect(
            hdc,
            &open_btn,
            if state.open_project_btn.hovered { BORDER } else { BORDER_FAINT },
        );
        draw_text_centered(hdc, "Open Project", &open_btn, TEXT_BRIGHT);

        // Scrollable list area.
        let content_top = title.bottom + 8;
        let content_bottom = client.bottom - 24;
        let content_left = client.left + 32;
        let content_right = client.right - 32;
        let content_h = content_bottom - content_top;
        let total_cards_h = state.recent.len() as i32 * (CARD_H + CARD_GAP) - CARD_GAP;
        state.max_scroll_y = (total_cards_h - content_h).max(0);
        state.scroll_y = state.scroll_y.min(state.max_scroll_y);

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

        // Clip to the content area so scrolled cards don't paint over
        // the footer margin.
        let saved = SaveDC(hdc);
        let _ = IntersectClipRect(
            hdc,
            content_left,
            content_top,
            content_right,
            content_bottom,
        );

        let cards_x = content_left + (content_right - content_left - CARD_W) / 2;
        let mut card_y = content_top - state.scroll_y;
        for (i, rp) in state.recent.iter().enumerate() {
            let card = RECT {
                left: cards_x,
                top: card_y,
                right: cards_x + CARD_W,
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
            let bg = if hovered { BG_DARK } else { 0x16161A };
            fill_rect(hdc, &card, bg);
            border_rect(
                hdc,
                &card,
                if hovered { BORDER } else { BORDER_FAINT },
            );
            let name_rect = RECT {
                left: card.left + 14,
                top: card.top + 8,
                right: card.right - 14,
                bottom: card.top + 28,
            };
            draw_text_left(hdc, &rp.name, &name_rect, TEXT_BRIGHT);
            let path_rect = RECT {
                left: card.left + 14,
                top: card.top + 30,
                right: card.right - 14,
                bottom: card.bottom - 8,
            };
            draw_text_left(hdc, &rp.path.to_string_lossy(), &path_rect, TEXT_FAINT);
            card_y += CARD_H + CARD_GAP;
        }

        let _ = RestoreDC(hdc, saved);
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
