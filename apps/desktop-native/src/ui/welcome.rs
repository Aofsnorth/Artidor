//! Home / landing screen — the first thing the user sees when no project
//! is open.
//!
//! Mirrors the web app's homepage (`apps/web/src/app/page.tsx`): a centered
//! hero lockup, primary CTAs, and a small preview of recent projects. The
//! file is still named `welcome.rs` for historical reasons; it is exposed
//! as the `home` module via `#[path = "welcome.rs"]` in `ui/mod.rs`.

use windows::Win32::Foundation::{COLORREF, HWND, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    DT_CENTER, DT_SINGLELINE, DT_VCENTER, DrawTextW, SelectObject, SetBkMode, SetTextColor,
    TRANSPARENT,
};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

use crate::state::persistence;
use crate::theme::{BG, BG_DARK, BORDER, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT, rgb};
use crate::ui::font::FontCache;
use crate::ui::gfx::{border_rect, draw_text_centered, draw_text_left, fill_rect};

const HEADER_H: i32 = 48;
const TAB_H: i32 = 26;
const BTN_H: i32 = 44;
const PRIMARY_W: i32 = 180;
const SECONDARY_W: i32 = 180;
const CARD_W: i32 = 220;
const CARD_H: i32 = 64;

/// A clickable button with a rectangle and hover state.
#[derive(Clone, Copy)]
pub struct HomeButton {
    pub rect: RECT,
    pub hovered: bool,
}

/// State for the home screen: buttons, recent-project preview, and hover
/// tracking. Stored on the main `WindowState` so hit-testing works across
/// repaints without recreating GDI resources.
pub struct HomeState {
    pub new_project_btn: HomeButton,
    pub open_project_btn: HomeButton,
    pub view_projects_btn: HomeButton,
    pub home_tab: HomeButton,
    pub projects_tab: HomeButton,
    pub recent: Vec<persistence::RecentProject>,
    pub hovered_recent: Option<usize>,
    pub card_rects: Vec<RECT>,
}

impl HomeState {
    /// Create a new home screen, loading the recent-projects list from disk.
    pub fn new() -> Self {
        Self {
            new_project_btn: HomeButton {
                rect: RECT::default(),
                hovered: false,
            },
            open_project_btn: HomeButton {
                rect: RECT::default(),
                hovered: false,
            },
            view_projects_btn: HomeButton {
                rect: RECT::default(),
                hovered: false,
            },
            home_tab: HomeButton {
                rect: RECT::default(),
                hovered: false,
            },
            projects_tab: HomeButton {
                rect: RECT::default(),
                hovered: false,
            },
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

/// Draw a top navigation bar: brand logo + "Home" / "Projects" tabs. The
/// home tab is always active on this screen; the projects tab navigates to
/// the project hub when clicked.
unsafe fn draw_top_nav(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut HomeState,
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

        // Brand mark.
        let logo_size = 24;
        let logo = RECT {
            left: client.left + 16,
            top: client.top + (HEADER_H - logo_size) / 2,
            right: client.left + 16 + logo_size,
            bottom: client.top + (HEADER_H - logo_size) / 2 + logo_size,
        };
        fill_rect(hdc, &logo, 0x2A3F8C);
        draw_text_centered(hdc, "A", &logo, 0xFFFFFF);

        // Brand name.
        let brand = RECT {
            left: logo.right + 8,
            top: client.top,
            right: logo.right + 120,
            bottom: client.top + HEADER_H,
        };
        let prev = SelectObject(hdc, fonts.header.into());
        draw_text_left(hdc, "Artidor", &brand, TEXT_BRIGHT);
        let _ = SelectObject(hdc, prev);

        // Tabs.
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

        // Active home tab.
        fill_rect(hdc, &home, 0x1A1A1E);
        border_rect(hdc, &home, BORDER);
        draw_text_centered(hdc, "Home", &home, TEXT_BRIGHT);

        // Projects tab (hover highlight).
        let proj_bg = if state.projects_tab.hovered {
            0x1A1A1E
        } else {
            BG_DARK
        };
        fill_rect(hdc, &projects, proj_bg);
        draw_text_centered(hdc, "Projects", &projects, TEXT_DIM);
    }
}

/// Draw the home screen: dark background, top nav, centered hero, and a
/// small preview of recent projects.
pub unsafe fn draw_home(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut HomeState,
    fonts: &FontCache,
) {
    unsafe {
        fill_rect(hdc, client, BG);
        draw_top_nav(hdc, hwnd, client, state, fonts);

        let cursor = cursor_to_client(hwnd);
        let w = client.right - client.left;
        let h = client.bottom - client.top;
        let body_top = client.top + HEADER_H;
        let body_h = h - HEADER_H;

        // Hero is vertically centered in the remaining body area.
        let hero_y = body_top + body_h / 3;
        let title1 = RECT {
            left: client.left,
            top: hero_y - 56,
            right: client.right,
            bottom: hero_y - 24,
        };
        let title2 = RECT {
            left: client.left,
            top: title1.bottom,
            right: client.right,
            bottom: title1.bottom + 36,
        };
        let prev = SelectObject(hdc, fonts.title.into());
        SetTextColor(hdc, COLORREF(rgb(TEXT_BRIGHT)));
        SetBkMode(hdc, TRANSPARENT);
        let mut t1: Vec<u16> = "The video editor".encode_utf16().collect();
        let mut r1 = title1;
        let _ = DrawTextW(hdc, &mut t1, &mut r1, DT_CENTER | DT_SINGLELINE | DT_VCENTER);
        let mut t2: Vec<u16> = "that respects your machine.".encode_utf16().collect();
        let mut r2 = title2;
        let _ = DrawTextW(hdc, &mut t2, &mut r2, DT_CENTER | DT_SINGLELINE | DT_VCENTER);
        let _ = SelectObject(hdc, prev);

        let tagline = RECT {
            left: client.left,
            top: title2.bottom + 12,
            right: client.right,
            bottom: title2.bottom + 36,
        };
        draw_text_centered(
            hdc,
            "Open-source, local-first, zero cloud. No uploads, no paywalls.",
            &tagline,
            TEXT_FAINT,
        );

        // Primary CTAs.
        let gap = 12;
        let total_w = PRIMARY_W + gap + SECONDARY_W;
        let btn_y = tagline.bottom + 28;
        let primary_x = client.left + (w - total_w) / 2;
        let secondary_x = primary_x + PRIMARY_W + gap;
        let primary = RECT {
            left: primary_x,
            top: btn_y,
            right: primary_x + PRIMARY_W,
            bottom: btn_y + BTN_H,
        };
        let secondary = RECT {
            left: secondary_x,
            top: btn_y,
            right: secondary_x + SECONDARY_W,
            bottom: btn_y + BTN_H,
        };
        state.new_project_btn.rect = primary;
        state.open_project_btn.rect = secondary;
        state.new_project_btn.hovered = cursor.x >= primary.left
            && cursor.x <= primary.right
            && cursor.y >= primary.top
            && cursor.y <= primary.bottom;
        state.open_project_btn.hovered = cursor.x >= secondary.left
            && cursor.x <= secondary.right
            && cursor.y >= secondary.top
            && cursor.y <= secondary.bottom;

        let primary_bg = if state.new_project_btn.hovered {
            0x3B5BDB
        } else {
            0x2A3F8C
        };
        fill_rect(hdc, &primary, primary_bg);
        border_rect(
            hdc,
            &primary,
            if state.new_project_btn.hovered {
                0x5C7CFF
            } else {
                0x3B5BDB
            },
        );
        draw_text_centered(hdc, "New Project", &primary, 0xFFFFFF);

        let secondary_bg = if state.open_project_btn.hovered {
            0x1E1E22
        } else {
            0x16161A
        };
        fill_rect(hdc, &secondary, secondary_bg);
        border_rect(
            hdc,
            &secondary,
            if state.open_project_btn.hovered { BORDER } else { BORDER_FAINT },
        );
        draw_text_centered(hdc, "Open Project", &secondary, TEXT_BRIGHT);

        // Recent project preview.
        state.card_rects.clear();
        state.hovered_recent = None;
        let preview_top = secondary.bottom + 48;
        let header = RECT {
            left: client.left,
            top: preview_top,
            right: client.right,
            bottom: preview_top + 24,
        };
        if state.recent.is_empty() {
            draw_text_centered(hdc, "No recent projects — create or open one to start.", &header, TEXT_FAINT);
            return;
        }
        draw_text_centered(hdc, "Recent Projects", &header, TEXT_DIM);

        let mut cards_x = client.left + (w - (CARD_W * 3 + 8 * 2)) / 2;
        let cards_y = header.bottom + 16;
        for (i, rp) in state.recent.iter().take(3).enumerate() {
            let card = RECT {
                left: cards_x,
                top: cards_y,
                right: cards_x + CARD_W,
                bottom: cards_y + CARD_H,
            };
            state.card_rects.push(card);
            let hovered = cursor.x >= card.left
                && cursor.x <= card.right
                && cursor.y >= card.top
                && cursor.y <= card.bottom;
            if hovered {
                state.hovered_recent = Some(i);
            }
            let bg = if hovered { BG_DARK } else { 0x16161A };
            fill_rect(hdc, &card, bg);
            border_rect(
                hdc,
                &card,
                if hovered { BORDER } else { BORDER_FAINT },
            );
            let name_rect = RECT {
                left: card.left + 12,
                top: card.top + 8,
                right: card.right - 12,
                bottom: card.top + 28,
            };
            draw_text_left(hdc, &rp.name, &name_rect, TEXT_BRIGHT);
            let path_rect = RECT {
                left: card.left + 12,
                top: card.top + 30,
                right: card.right - 12,
                bottom: card.bottom - 8,
            };
            let path_text = rp.path.to_string_lossy();
            draw_text_left(hdc, &path_text, &path_rect, TEXT_FAINT);
            cards_x += CARD_W + 8;
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
