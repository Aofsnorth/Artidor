//! Assets panel — imported media list + effects library.
//!
//! Mirrors `apps/desktop-web/src/components/editor/panels/assets/index.tsx`.

pub mod effects;

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::{AssetsTab, MediaKind, Project};
use crate::theme::{ACCENT_SUBTLE, ASSET_PAD, ASSET_ROW_H, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::{draw_text_centered, draw_text_left, rounded_fill_rect};

/// Draw the tools panel content based on the active tab.
/// Assets tab → media list. Effects tab → effects library.
/// Other tabs → placeholder text.
pub unsafe fn draw_assets_list(hdc: HDC, panel: &RECT, project: &Project, active_tab: AssetsTab) {
    unsafe {
        match active_tab {
            AssetsTab::Assets => draw_media_list(hdc, panel, project),
            AssetsTab::Effects => effects::draw_effects_library(hdc, panel),
            AssetsTab::Ai => {
                // AI panel is drawn separately by draw_copilot_suggestions.
            }
            _ => {
                // Placeholder for other tabs.
                let hint = RECT {
                    left: panel.left + ASSET_PAD,
                    top: panel.top + 32,
                    right: panel.right - ASSET_PAD,
                    bottom: panel.top + 56,
                };
                let label = active_tab.label();
                draw_text_centered(hdc, &format!("{label} — coming soon"), &hint, TEXT_FAINT);
            }
        }
    }
}

/// Draw the imported media assets list. One row per asset: "[kind] name".
/// Empty state shows an "Import media (Ctrl+I)" hint.
unsafe fn draw_media_list(hdc: HDC, panel: &RECT, project: &Project) {
    unsafe {
        let panel_w = panel.right - panel.left;

        let header = RECT {
            left: panel.left + ASSET_PAD,
            top: panel.top + 6,
            right: panel.right - ASSET_PAD,
            bottom: panel.top + 24,
        };
        let header_label = format!("Assets  ({})", project.assets.len());
        draw_text_left(hdc, &header_label, &header, TEXT_DIM);

        if project.assets.is_empty() {
            let hint = RECT {
                left: panel.left + ASSET_PAD,
                top: panel.top + 32,
                right: panel.right - ASSET_PAD,
                bottom: panel.top + 56,
            };
            draw_text_centered(hdc, "Import media (Ctrl+I)", &hint, TEXT_FAINT);
            return;
        }

        let mut y = panel.top + 28;
        for asset in &project.assets {
            if y + ASSET_ROW_H > panel.bottom {
                break;
            }
            let row = RECT {
                left: panel.left + ASSET_PAD,
                top: y,
                right: panel.left + panel_w - ASSET_PAD,
                bottom: y + ASSET_ROW_H - 2,
            };
            rounded_fill_rect(hdc, &row, ACCENT_SUBTLE, 6);

            let tag_color = match asset.kind {
                MediaKind::Image => 0xFAB005,
                MediaKind::Video => 0x3B5BDB,
                MediaKind::Audio => 0x20C997,
                MediaKind::Other => 0x868E96,
            };
            let tag = RECT {
                left: row.left + 4,
                top: row.top + 4,
                right: row.left + 52,
                bottom: row.bottom - 4,
            };
            rounded_fill_rect(hdc, &tag, tag_color, 4);
            draw_text_centered(hdc, asset.kind.label(), &tag, 0x111114);

            let name_rect = RECT {
                left: tag.right + 8,
                top: row.top,
                right: row.right - 4,
                bottom: row.bottom,
            };
            draw_text_left(hdc, &asset.name, &name_rect, TEXT_BRIGHT);
            y += ASSET_ROW_H;
        }
    }
}
