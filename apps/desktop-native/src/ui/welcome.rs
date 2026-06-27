//! Welcome screen / homepage — shown when no project is open.
//!
//! Displays the Artidor logo, a "New Project" button, and a list of
//! recent projects (from the persistence layer's recent-projects file).
//! Clicking a recent project loads it; clicking "New Project" creates
//! a fresh untitled project and switches to editor mode.
//!
//! Mirrors the web app's homepage (`apps/web/src/app/page.tsx`).

use windows::Win32::Foundation::{COLORREF, HWND, POINT, RECT};
use windows::Win32::Graphics::Gdi::{
    DT_CENTER, DT_SINGLELINE, DT_VCENTER, DrawTextW, SelectObject, SetBkMode, SetTextColor,
    TRANSPARENT,
};
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

use crate::state::persistence;
use crate::theme::{BG, BG_DARK, BORDER, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT, rgb};
use crate::ui::font::FontCache;
use crate::ui::gfx::{border_rect, fill_rect};

/// Button rect for hit-testing (New Project button).
#[derive(Clone, Copy)]
pub struct WelcomeButton {
    pub rect: RECT,
    pub hovered: bool,
}

/// The welcome screen state — button hover + recent projects list +
/// card rects for click hit-testing.
pub struct WelcomeState {
    pub new_project_btn: WelcomeButton,
    pub recent: Vec<persistence::RecentProject>,
    /// Hovered recent project index (None = none hovered).
    /// Recomputed on each paint from client-space cursor coords.
    pub hovered_recent: Option<usize>,
    /// Card rects from the last paint, used for click hit-testing.
    /// Stored in client coordinates so WM_LBUTTONDOWN's LPARAM
    /// (which is also client coords) can be tested directly.
    pub card_rects: Vec<RECT>,
}

impl WelcomeState {
    /// Create welcome state with a default New Project button rect.
    /// The rect is recomputed on each paint based on the client size.
    pub fn new() -> Self {
        Self {
            new_project_btn: WelcomeButton {
                rect: RECT::default(),
                hovered: false,
            },
            recent: persistence::load_recent_projects(),
            hovered_recent: None,
            card_rects: Vec::new(),
        }
    }

    /// Hit-test a client-space point against the stored card rects.
    /// Returns the index of the card under the point, or None.
    /// Used by WM_LBUTTONDOWN to avoid relying on stale hover state.
    pub fn hit_test_card(&self, x: i32, y: i32) -> Option<usize> {
        self.card_rects
            .iter()
            .position(|r| x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
    }
}

impl Default for WelcomeState {
    fn default() -> Self {
        Self::new()
    }
}

/// Convert screen-space cursor coords to client-space using ScreenToClient.
/// Returns (0, 0) if the conversion fails (shouldn't happen for a valid
/// window). This is critical — GetCursorPos returns screen coords, but
/// all our rects are in client coords. Without this conversion, hover
/// detection is wrong whenever the window isn't at screen origin (0, 0).
unsafe fn cursor_to_client(hwnd: HWND) -> POINT {
    let mut cursor = POINT::default();
    let _ = GetCursorPos(&mut cursor);
    let _ = windows::Win32::Graphics::Gdi::ScreenToClient(hwnd, &mut cursor);
    cursor
}

/// Draw the welcome screen: centered logo + tagline + New Project button
/// + recent projects list below. Uses the FontCache for visual hierarchy
/// (title font for logo, body font for tagline/cards).
pub unsafe fn draw_welcome(
    hdc: windows::Win32::Graphics::Gdi::HDC,
    hwnd: HWND,
    client: &RECT,
    state: &mut WelcomeState,
    fonts: &FontCache,
) {
    unsafe {
        let w = client.right - client.left;
        let h = client.bottom - client.top;
        fill_rect(hdc, client, BG);

        // Cursor position in CLIENT coordinates (not screen).
        // ScreenToClient conversion is critical — without it, hover
        // detection breaks when the window isn't at screen origin.
        let cursor = cursor_to_client(hwnd);

        // --- Logo (centered, top 20%) — uses title font (20px semibold) ---
        let logo_y = h / 5;
        let logo_rect = RECT {
            left: client.left,
            top: client.top + logo_y - 40,
            right: client.right,
            bottom: client.top + logo_y + 40,
        };
        SetTextColor(hdc, COLORREF(rgb(TEXT_BRIGHT)));
        SetBkMode(hdc, TRANSPARENT);

        // Select the title font for the logo, restore after.
        let prev_font = SelectObject(hdc, fonts.title.into());
        let logo_text: Vec<u16> = "Artidor".encode_utf16().collect();
        let mut logo_buf = logo_text.clone();
        let mut lr = logo_rect;
        let _ = DrawTextW(
            hdc,
            &mut logo_buf,
            &mut lr,
            DT_CENTER | DT_SINGLELINE | DT_VCENTER,
        );
        let _ = SelectObject(hdc, prev_font);

        // Tagline below the logo (body font, already selected by caller).
        let tagline_rect = RECT {
            left: client.left,
            top: logo_rect.bottom + 4,
            right: client.right,
            bottom: logo_rect.bottom + 24,
        };
        crate::ui::gfx::draw_text_centered(
            hdc,
            "Native video editor — local-first, zero cloud",
            &tagline_rect,
            TEXT_FAINT,
        );

        // --- New Project button (centered) ---
        let btn_w = 200;
        let btn_h = 44;
        let btn_x = client.left + (w - btn_w) / 2;
        let btn_y = tagline_rect.bottom + 24;
        let btn_rect = RECT {
            left: btn_x,
            top: btn_y,
            right: btn_x + btn_w,
            bottom: btn_y + btn_h,
        };
        state.new_project_btn.rect = btn_rect;

        // Hover detection — client coords, correct for any window position.
        state.new_project_btn.hovered = cursor.x >= btn_rect.left
            && cursor.x <= btn_rect.right
            && cursor.y >= btn_rect.top
            && cursor.y <= btn_rect.bottom;

        let btn_bg = if state.new_project_btn.hovered {
            0x3B5BDB // blue hover
        } else {
            0x2A3F8C // blue default
        };
        fill_rect(hdc, &btn_rect, btn_bg);
        border_rect(
            hdc,
            &btn_rect,
            if state.new_project_btn.hovered {
                0x5C7CFF
            } else {
                0x3B5BDB
            },
        );
        crate::ui::gfx::draw_text_centered(hdc, "New Project", &btn_rect, 0xFFFFFF);

        // --- Recent projects (below button) ---
        state.card_rects.clear();
        if state.recent.is_empty() {
            let hint_rect = RECT {
                left: client.left,
                top: btn_rect.bottom + 32,
                right: client.right,
                bottom: btn_rect.bottom + 52,
            };
            crate::ui::gfx::draw_text_centered(
                hdc,
                "No recent projects yet",
                &hint_rect,
                TEXT_FAINT,
            );
            state.hovered_recent = None;
            return;
        }

        // "Recent Projects" header.
        let header_rect = RECT {
            left: client.left,
            top: btn_rect.bottom + 24,
            right: client.right,
            bottom: btn_rect.bottom + 44,
        };
        crate::ui::gfx::draw_text_centered(hdc, "Recent Projects", &header_rect, TEXT_DIM);

        // Recent project cards.
        let card_w = 320;
        let card_h = 56;
        let card_gap = 8;
        let cards_x = client.left + (w - card_w) / 2;
        let mut card_y = header_rect.bottom + 8;

        state.hovered_recent = None;
        for (i, rp) in state.recent.iter().enumerate() {
            if card_y + card_h > client.bottom - 20 {
                break;
            }
            let card_rect = RECT {
                left: cards_x,
                top: card_y,
                right: cards_x + card_w,
                bottom: card_y + card_h,
            };
            state.card_rects.push(card_rect);

            // Hover detection — client coords.
            let hovered = cursor.x >= card_rect.left
                && cursor.x <= card_rect.right
                && cursor.y >= card_rect.top
                && cursor.y <= card_rect.bottom;
            if hovered {
                state.hovered_recent = Some(i);
            }

            let card_bg = if hovered { BG_DARK } else { 0x16161A };
            fill_rect(hdc, &card_rect, card_bg);
            border_rect(hdc, &card_rect, if hovered { BORDER } else { BORDER_FAINT });

            // Project name (left-aligned).
            let name_rect = RECT {
                left: card_rect.left + 12,
                top: card_rect.top + 6,
                right: card_rect.right - 12,
                bottom: card_rect.top + 24,
            };
            crate::ui::gfx::draw_text_left(hdc, &rp.name, &name_rect, TEXT_BRIGHT);

            // Path (small, dimmed).
            let path_rect = RECT {
                left: card_rect.left + 12,
                top: card_rect.top + 26,
                right: card_rect.right - 12,
                bottom: card_rect.bottom - 6,
            };
            let path_display = rp.path.to_string_lossy();
            crate::ui::gfx::draw_text_left(hdc, &path_display, &path_rect, TEXT_FAINT);

            card_y += card_h + card_gap;
        }
    }
}
