//! Assets panel — imported media list.
//!
//! Mirrors `apps/desktop-web/src/ui/assets/mod.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::state::{MediaKind, Project};
use crate::theme::{ASSET_PAD, ASSET_ROW_H, BG_DARK, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::{draw_text_centered, draw_text_left, fill_rect};

/// Draw the imported media assets list. One row per asset: "[kind] name".
/// Empty state shows an "Import media (Ctrl+I)" hint.
pub unsafe fn draw_assets_list(hdc: HDC, panel: &RECT, project: &Project) {
    unsafe {
        let panel_w = panel.right - panel.left;

        let header = RECT {
            left: panel.left,
            top: panel.top,
            right: panel.right,
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
            fill_rect(hdc, &row, BG_DARK);

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
            fill_rect(hdc, &tag, tag_color);
            draw_text_centered(hdc, asset.kind.label(), &tag, 0x111114);

            let name_rect = RECT {
                left: tag.right + 8,
                top: row.top,
                right: row.right - 4,
                bottom: row.bottom,
            };
            draw_text_left(hdc, &asset.name, &name_rect, TEXT_DIM);
            y += ASSET_ROW_H;
        }
    }
}
