//! Direct2D editor chrome — full D2D port of `paint_chrome`.
//!
//! Mirrors the GDI panel modules (`header`, `footer`, `tab_bar`, `assets`,
//! `inspector`, `timeline`, `viewport_toolbar`) using the `D2dGfx` helper API.
//! The preview panel only draws a frame; the real preview is rendered inside
//! the D3D12 child window.

use std::time::{SystemTime, UNIX_EPOCH};

use windows::Win32::Foundation::RECT;
use windows::core::Result;

use crate::state::{AssetsTab, MediaKind, Project, TrackType};
use crate::theme::{
    ACCENT_BG, ACCENT_SUBTLE, ASSET_PAD, ASSET_ROW_H, BG, BG_DARK, BLUE, BORDER, BORDER_FAINT,
    BORDER_TOP, CHIP_BG_D2D, CYAN_SOFT_BG_D2D, CYAN_SOFT_BORDER_D2D, EMERALD, OVERLAY_BG_D2D,
    PANEL_BG_D2D, PROP_PAD, PROP_ROW_H, RADIUS_LG, RADIUS_MD, RADIUS_SM, RULER_H, TAB_ACTIVE_BG_D2D,
    TAB_CONTAINER_BG_D2D, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT,
    TEXT_MUTED, TRACK_BG, TRACK_PAD, TRACK_ROW_H, TRACK_SELECTED_BORDER,
};
use crate::ui::d2d_gfx::{D2dGfx, solid};
use crate::ui::header::HeaderButtons;
use crate::ui::layout::Layout;
use crate::ui::viewport_toolbar::ToolbarButtons;
use crate::window::{timeline_duration, time_to_x};

const TAB_BTN_H: i32 = 32;
const STORAGE_CARD_H: i32 = 64;

/// Paint the entire editor chrome using Direct2D.
///
/// This is the D2D equivalent of `paint_chrome`. It draws every panel
/// except the viewport child window content, which is handled by the
/// native compositor.
pub unsafe fn paint_chrome_d2d(
    gfx: &mut D2dGfx,
    layout: &Layout,
    project: &Project,
    selected_track: usize,
    playing: bool,
    selected_element: Option<(usize, usize)>,
    active_tab: AssetsTab,
    tab_rects: &mut Vec<RECT>,
    looping: bool,
    toolbar_btns: &mut ToolbarButtons,
    header_btns: &mut HeaderButtons,
    zoom_pps: f64,
    scroll_seconds: f64,
) -> Result<()> {
    draw_header(gfx, &layout.header, project, zoom_pps, header_btns)?;
    draw_footer(gfx, &layout.footer, project, playing)?;
    draw_tab_bar(gfx, &layout.tabbar, active_tab, tab_rects)?;

    draw_tools_panel(gfx, &layout.tools, project, active_tab)?;
    draw_properties_panel(gfx, &layout.properties, project, selected_element)?;
    draw_timeline_panel(
        gfx,
        &layout.timeline,
        &layout.timeline_toolbar,
        &layout.ruler,
        project,
        selected_track,
        playing,
        selected_element,
        zoom_pps,
        scroll_seconds,
        toolbar_btns,
    )?;
    draw_preview_frame(gfx, &layout.preview, &layout.preview_overlay)?;
    draw_viewport_toolbar(gfx, &layout.viewport_toolbar, project, playing, looping, toolbar_btns)?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

unsafe fn draw_header(
    gfx: &mut D2dGfx,
    rect: &RECT,
    project: &Project,
    zoom_pps: f64,
    btns: &mut HeaderButtons,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    let w = rect.right - rect.left;

    // Gradient background + subtle top radial glow.
    gfx.fill_header_gradient_r(rect)?;
    gfx.fill_radial_glow_top_r(rect)?;

    // Top hairline.
    gfx.draw_hline(
        (rect.left + w / 6) as f32,
        (rect.right - w / 6) as f32,
        rect.top as f32,
        solid(BORDER_TOP),
        1.0,
    )?;

    btns.minimize = RECT::default();
    btns.maximize = RECT::default();
    btns.close = RECT::default();

    // Brand logo circle with "A".
    let logo_size = 28;
    let logo_rect = RECT {
        left: rect.left + 12,
        top: rect.top + (rect.bottom - rect.top - logo_size) / 2,
        right: rect.left + 12 + logo_size,
        bottom: rect.top + (rect.bottom - rect.top - logo_size) / 2 + logo_size,
    };
    gfx.fill_rounded_rect_r(&logo_rect, (logo_size / 2) as f32, solid(BG_DARK))?;
    gfx.stroke_rounded_rect_r(&logo_rect, (logo_size / 2) as f32, solid(BORDER_FAINT), 1.0)?;
    gfx.draw_text_centered("A", &fonts.title, &logo_rect, solid(TEXT_BRIGHT))?;

    // Identity capsule: "Projects / <name>".
    let pod_w = 184;
    let pod_h = 28;
    let pod_rect = RECT {
        left: logo_rect.right + 8,
        top: rect.top + (rect.bottom - rect.top - pod_h) / 2,
        right: logo_rect.right + 8 + pod_w,
        bottom: rect.top + (rect.bottom - rect.top - pod_h) / 2 + pod_h,
    };
    gfx.fill_rounded_rect_r(&pod_rect, 14.0, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&pod_rect, 14.0, solid(BORDER_FAINT), 1.0)?;

    let crumb_left = pod_rect.left + 10;
    let crumb_rect = RECT {
        left: crumb_left,
        top: pod_rect.top,
        right: crumb_left + 44,
        bottom: pod_rect.bottom,
    };
    gfx.draw_text_left("Projects", &fonts.small, &crumb_rect, solid(TEXT_FAINT))?;

    let slash_rect = RECT {
        left: crumb_rect.right,
        top: pod_rect.top,
        right: crumb_rect.right + 14,
        bottom: pod_rect.bottom,
    };
    gfx.draw_text_centered("/", &fonts.small, &slash_rect, solid(TEXT_FAINT))?;

    let name_rect = RECT {
        left: slash_rect.right,
        top: pod_rect.top,
        right: pod_rect.right - 8,
        bottom: pod_rect.bottom,
    };
    gfx.draw_text_left(&project.metadata.name, &fonts.body, &name_rect, solid(TEXT_BRIGHT))?;

    // Center zoom capsule.
    let zoom_label = format!("{:.0} px/s", zoom_pps);
    let zoom_w = 86;
    let zoom_h = 28;
    let zoom_rect = RECT {
        left: rect.left + (w - zoom_w) / 2,
        top: rect.top + (rect.bottom - rect.top - zoom_h) / 2,
        right: rect.left + (w + zoom_w) / 2,
        bottom: rect.top + (rect.bottom - rect.top - zoom_h) / 2 + zoom_h,
    };
    gfx.fill_rounded_rect_r(&zoom_rect, 14.0, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&zoom_rect, 14.0, solid(BORDER_FAINT), 1.0)?;
    gfx.draw_text_centered(&zoom_label, &fonts.body, &zoom_rect, solid(TEXT_DIM))?;

    // Right action hub.
    let mut rx = rect.right - 16;
    let btn_h = 28;
    let gap = 6;

    // Export (primary blue pill).
    let export_w = 64;
    btns.export_btn = RECT {
        left: rx - export_w,
        top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
        right: rx,
        bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.export_btn, 14.0, solid(BLUE))?;
    gfx.draw_text_centered("Export", &fonts.body, &btns.export_btn, solid(0xFFFFFF))?;
    rx -= export_w + gap;

    // Share pill.
    let share_w = 52;
    btns.share_btn = RECT {
        left: rx - share_w,
        top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
        right: rx,
        bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
    };
    pill(
        gfx,
        &btns.share_btn,
        "Share",
        &fonts.body,
        solid(ACCENT_SUBTLE),
        solid(BORDER_FAINT),
        solid(TEXT_DIM),
    )?;
    rx -= share_w + gap;

    // Settings icon button.
    let settings_size = 28;
    btns.settings_btn = RECT {
        left: rx - settings_size,
        top: rect.top + (rect.bottom - rect.top - settings_size) / 2,
        right: rx,
        bottom: rect.top + (rect.bottom - rect.top - settings_size) / 2 + settings_size,
    };
    icon_btn(gfx, &btns.settings_btn, "\u{2699}", &fonts.body, solid(ACCENT_SUBTLE), solid(BORDER_FAINT), solid(TEXT_DIM))?;
    rx -= settings_size + gap;

    // Layout icon button.
    let layout_size = 28;
    btns.layout_btn = RECT {
        left: rx - layout_size,
        top: rect.top + (rect.bottom - rect.top - layout_size) / 2,
        right: rx,
        bottom: rect.top + (rect.bottom - rect.top - layout_size) / 2 + layout_size,
    };
    icon_btn(gfx, &btns.layout_btn, "\u{25A6}", &fonts.body, solid(ACCENT_SUBTLE), solid(BORDER_FAINT), solid(TEXT_DIM))?;
    rx -= layout_size + gap;

    // Cloud status placeholder pill.
    let cloud_w = 64;
    btns.cloud_btn = RECT {
        left: rx - cloud_w,
        top: rect.top + (rect.bottom - rect.top - btn_h) / 2,
        right: rx,
        bottom: rect.top + (rect.bottom - rect.top - btn_h) / 2 + btn_h,
    };
    pill(
        gfx,
        &btns.cloud_btn,
        "Local",
        &fonts.small,
        solid(ACCENT_SUBTLE),
        solid(BORDER_FAINT),
        solid(TEXT_FAINT),
    )?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

unsafe fn draw_footer(gfx: &mut D2dGfx, rect: &RECT, project: &Project, _playing: bool) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    let fh = rect.bottom - rect.top;

    // Gradient background + top border.
    gfx.fill_footer_gradient_r(rect)?;
    gfx.draw_hline(
        rect.left as f32,
        rect.right as f32,
        rect.top as f32,
        solid(BORDER_FAINT),
        1.0,
    )?;

    // Left: "Worked on" timer capsule + FPS monitor placeholder.
    let elapsed = project_elapsed_seconds(project.metadata.created_at_ms);
    let timer_label = format_elapsed(elapsed);
    let timer_w = 132;
    let timer_h = 22;
    let timer_rect = RECT {
        left: rect.left + 16,
        top: rect.top + (fh - timer_h) / 2,
        right: rect.left + 16 + timer_w,
        bottom: rect.top + (fh - timer_h) / 2 + timer_h,
    };
    gfx.fill_rounded_rect_r(&timer_rect, 11.0, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&timer_rect, 11.0, solid(BORDER_FAINT), 1.0)?;
    let label_rect = RECT {
        left: timer_rect.left + 8,
        top: timer_rect.top,
        right: timer_rect.left + 70,
        bottom: timer_rect.bottom,
    };
    gfx.draw_text_left("Worked on", &fonts.tiny, &label_rect, solid(TEXT_FAINT))?;
    let value_rect = RECT {
        left: timer_rect.right - 50,
        top: timer_rect.top + 1,
        right: timer_rect.right - 6,
        bottom: timer_rect.bottom - 1,
    };
    gfx.draw_text_centered(&timer_label, &fonts.tiny, &value_rect, solid(TEXT_BRIGHT))?;

    // FPS monitor placeholder (small green bars).
    let fps_w = 34;
    let fps_h = 14;
    let fps_rect = RECT {
        left: timer_rect.right + 10,
        top: rect.top + (fh - fps_h) / 2,
        right: timer_rect.right + 10 + fps_w,
        bottom: rect.top + (fh - fps_h) / 2 + fps_h,
    };
    gfx.fill_rounded_rect_r(&fps_rect, 4.0, solid(ACCENT_SUBTLE))?;
    let bar_w = 3;
    let bar_gap = 1;
    let mut bx = fps_rect.left + 3;
    for i in 0..5 {
        let bar_h = 4 + (i % 4) + 2;
        let bar = RECT {
            left: bx,
            top: fps_rect.bottom - 2 - bar_h,
            right: bx + bar_w,
            bottom: fps_rect.bottom - 2,
        };
        gfx.fill_rect_r(&bar, solid(EMERALD))?;
        bx += bar_w + bar_gap;
    }

    // Right: metadata.
    let meta_label = format!(
        "{}p  \u{2022}  {} fps  \u{2022}  {}  \u{2022}  Stereo",
        project.settings.canvas.height,
        project.settings.fps_label(),
        project.settings.canvas.aspect_label(),
    );
    let meta_rect = RECT {
        left: rect.right - 260,
        top: rect.top,
        right: rect.right - 16,
        bottom: rect.bottom,
    };
    gfx.draw_text_left(&meta_label, &fonts.small, &meta_rect, solid(TEXT_DIM))?;

    // Center: cyan BETA / status pill.
    let badge_w = 64;
    let badge_h = 20;
    let badge_rect = RECT {
        left: rect.left + (rect.right - rect.left - badge_w) / 2,
        top: rect.top + (fh - badge_h) / 2,
        right: rect.left + (rect.right - rect.left + badge_w) / 2,
        bottom: rect.top + (fh - badge_h) / 2 + badge_h,
    };
    gfx.fill_rounded_rect_r(&badge_rect, 10.0, CYAN_SOFT_BG_D2D)?;
    gfx.stroke_rounded_rect_r(&badge_rect, 10.0, CYAN_SOFT_BORDER_D2D, 1.0)?;
    let dot = RECT {
        left: badge_rect.left + 8,
        top: badge_rect.top + (badge_h - 6) / 2,
        right: badge_rect.left + 14,
        bottom: badge_rect.top + (badge_h - 6) / 2 + 6,
    };
    gfx.fill_rounded_rect_r(&dot, 3.0, solid(EMERALD))?;
    let label_rect = RECT {
        left: dot.right + 6,
        top: badge_rect.top,
        right: badge_rect.right - 4,
        bottom: badge_rect.bottom,
    };
    gfx.draw_text_left("BETA", &fonts.small, &label_rect, solid(TEXT_MUTED))?;

    Ok(())
}

fn project_elapsed_seconds(created_at_ms: i64) -> u64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(created_at_ms);
    let elapsed_ms = (now - created_at_ms).max(0);
    (elapsed_ms / 1000) as u64
}

fn format_elapsed(total_seconds: u64) -> String {
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

unsafe fn draw_tab_bar(
    gfx: &mut D2dGfx,
    rect: &RECT,
    active: AssetsTab,
    tab_rects: &mut Vec<RECT>,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    gfx.fill_rounded_rect_r(rect, RADIUS_LG, PANEL_BG_D2D)?;
    gfx.stroke_rounded_rect_r(rect, RADIUS_LG, solid(BORDER), 1.0)?;

    tab_rects.clear();
    let pad = 6;
    let mut y = rect.top + 8;
    let btn_w = rect.right - rect.left - 2 * pad;

    for &tab in AssetsTab::ALL {
        if y + TAB_BTN_H > rect.bottom - STORAGE_CARD_H - 6 {
            break;
        }
        let btn_rect = RECT {
            left: rect.left + pad,
            top: y,
            right: rect.left + pad + btn_w,
            bottom: y + TAB_BTN_H,
        };
        tab_rects.push(btn_rect);

        let is_active = tab == active;
        let bg = if is_active { solid(ACCENT_BG) } else { PANEL_BG_D2D };
        gfx.fill_rounded_rect_r(&btn_rect, 8.0, bg)?;
        if is_active {
            gfx.stroke_rounded_rect_r(&btn_rect, 8.0, solid(BORDER_FAINT), 1.0)?;
        }

        let glyph_rect = RECT {
            left: btn_rect.left,
            top: btn_rect.top + 3,
            right: btn_rect.right,
            bottom: btn_rect.top + 18,
        };
        let glyph_color = if is_active { solid(TEXT_BRIGHT) } else { solid(TEXT_DIM) };
        gfx.draw_text_centered(tab.glyph(), &fonts.small, &glyph_rect, glyph_color)?;

        let label_rect = RECT {
            left: btn_rect.left,
            top: btn_rect.top + 17,
            right: btn_rect.right,
            bottom: btn_rect.bottom - 1,
        };
        let label_color = if is_active { solid(TEXT_MUTED) } else { solid(TEXT_FAINT) };
        gfx.draw_text_centered(tab.label(), &fonts.tiny, &label_rect, label_color)?;

        y += TAB_BTN_H + 2;
    }

    // Storage card.
    let card_rect = RECT {
        left: rect.left + pad,
        top: rect.bottom - STORAGE_CARD_H,
        right: rect.right - pad,
        bottom: rect.bottom - 6,
    };
    gfx.fill_rounded_rect_r(&card_rect, 10.0, PANEL_BG_D2D)?;
    gfx.stroke_rounded_rect_r(&card_rect, 10.0, solid(BORDER_FAINT), 1.0)?;

    let used_rect = RECT {
        left: card_rect.left + 4,
        top: card_rect.top + 6,
        right: card_rect.right - 4,
        bottom: card_rect.top + 22,
    };
    gfx.draw_text_centered("0 B", &fonts.small, &used_rect, solid(TEXT_BRIGHT))?;

    let info_rect = RECT {
        left: card_rect.left + 4,
        top: card_rect.top + 20,
        right: card_rect.right - 4,
        bottom: card_rect.top + 34,
    };
    gfx.draw_text_centered("Used", &fonts.tiny, &info_rect, solid(TEXT_FAINT))?;

    let bar_y = card_rect.top + 40;
    let bar_h = 4;
    let bar_rect = RECT {
        left: card_rect.left + 8,
        top: bar_y,
        right: card_rect.right - 8,
        bottom: bar_y + bar_h,
    };
    gfx.fill_rect_r(&bar_rect, solid(ACCENT_SUBTLE))?;
    let fill_rect_inner = RECT {
        left: bar_rect.left,
        top: bar_rect.top,
        right: bar_rect.left + (bar_rect.right - bar_rect.left) / 10,
        bottom: bar_rect.bottom,
    };
    gfx.fill_rect_r(&fill_rect_inner, solid(TEXT_MUTED))?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Assets / tools panel
// ---------------------------------------------------------------------------

unsafe fn draw_tools_panel(
    gfx: &mut D2dGfx,
    panel: &RECT,
    project: &Project,
    active_tab: AssetsTab,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    gfx.fill_rounded_rect_r(panel, RADIUS_LG, PANEL_BG_D2D)?;
    gfx.stroke_rounded_rect_r(panel, RADIUS_LG, solid(BORDER_FAINT), 1.0)?;

    match active_tab {
        AssetsTab::Assets => {
            const TABS_H: i32 = 52;
            draw_asset_source_tabs(gfx, panel)?;
            let list_panel = RECT {
                left: panel.left,
                top: panel.top + TABS_H,
                right: panel.right,
                bottom: panel.bottom,
            };
            draw_media_list(gfx, &list_panel, project)
        }
        _ => {
            let hint = RECT {
                left: panel.left + ASSET_PAD,
                top: panel.top + 32,
                right: panel.right - ASSET_PAD,
                bottom: panel.top + 56,
            };
            gfx.draw_text_centered(
                &format!("{} — coming soon", active_tab.label()),
                &fonts.body,
                &hint,
                solid(TEXT_FAINT),
            )
        }
    }
}

unsafe fn draw_asset_source_tabs(gfx: &mut D2dGfx, panel: &RECT) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    let pad = ASSET_PAD;
    let container = RECT {
        left: panel.left + pad,
        top: panel.top + 6,
        right: panel.right - pad,
        bottom: panel.top + 52,
    };
    gfx.fill_rounded_rect_r(&container, 10.0, TAB_CONTAINER_BG_D2D)?;
    gfx.stroke_rounded_rect_r(&container, 10.0, solid(BORDER_FAINT), 1.0)?;

    let gap = 3;
    let tab_w = (container.right - container.left - 4 * gap) / 3;
    let mut x = container.left + gap;
    let tab_y = container.top + gap;
    let tab_h = container.bottom - container.top - 2 * gap;

    for (i, label, desc) in [
        (0, "Library", "Local project media"),
        (1, "Stock", "Browse licensed assets"),
        (2, "Cloud", "Synced team media"),
    ] {
        let tab_rect = RECT {
            left: x,
            top: tab_y,
            right: x + tab_w,
            bottom: tab_y + tab_h,
        };
        let active = i == 0;
        if active {
            gfx.fill_rounded_rect_r(&tab_rect, 8.0, TAB_ACTIVE_BG_D2D)?;
            gfx.stroke_rounded_rect_r(&tab_rect, 8.0, solid(BORDER_FAINT), 1.0)?;
            gfx.draw_text_centered(label, &fonts.small, &tab_rect, solid(TEXT_BRIGHT))?;
        } else {
            gfx.draw_text_centered(label, &fonts.small, &tab_rect, solid(TEXT_DIM))?;
        }

        let desc_rect = RECT {
            left: tab_rect.left,
            top: tab_rect.top + 14,
            right: tab_rect.right,
            bottom: tab_rect.bottom - 2,
        };
        gfx.draw_text_centered(desc, &fonts.tiny, &desc_rect, solid(TEXT_FAINT))?;
        x += tab_w + gap;
    }
    Ok(())
}

unsafe fn draw_media_list(gfx: &mut D2dGfx, panel: &RECT, project: &Project) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    let panel_w = panel.right - panel.left;

    let header = RECT {
        left: panel.left + ASSET_PAD,
        top: panel.top + 6,
        right: panel.right - ASSET_PAD,
        bottom: panel.top + 24,
    };
    gfx.draw_text_left(
        &format!("Assets  ({})", project.assets.len()),
        &fonts.header,
        &header,
        solid(TEXT_DIM),
    )?;

    if project.assets.is_empty() {
        let hint = RECT {
            left: panel.left + ASSET_PAD,
            top: panel.top + 32,
            right: panel.right - ASSET_PAD,
            bottom: panel.top + 56,
        };
        return gfx.draw_text_centered("Import media (Ctrl+I)", &fonts.body, &hint, solid(TEXT_FAINT));
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
        gfx.fill_rounded_rect_r(&row, RADIUS_SM, solid(ACCENT_SUBTLE))?;

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
        gfx.fill_rounded_rect_r(&tag, 4.0, solid(tag_color))?;
        gfx.draw_text_centered(asset.kind.label(), &fonts.tiny, &tag, solid(0x111114))?;

        let name_rect = RECT {
            left: tag.right + 8,
            top: row.top,
            right: row.right - 4,
            bottom: row.bottom,
        };
        gfx.draw_text_left(&asset.name, &fonts.body, &name_rect, solid(TEXT_BRIGHT))?;
        y += ASSET_ROW_H;
    }

    Ok(())
}

// ---------------------------------------------------------------------------
// Properties / inspector panel
// ---------------------------------------------------------------------------

unsafe fn draw_properties_panel(
    gfx: &mut D2dGfx,
    panel: &RECT,
    project: &Project,
    selected_element: Option<(usize, usize)>,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    gfx.fill_rounded_rect_r(panel, RADIUS_LG, PANEL_BG_D2D)?;
    gfx.stroke_rounded_rect_r(panel, RADIUS_LG, solid(BORDER_FAINT), 1.0)?;

    let header = RECT {
        left: panel.left + PROP_PAD,
        top: panel.top + 6,
        right: panel.right - PROP_PAD,
        bottom: panel.top + 24,
    };

    let mut y = panel.top + 28;
    let left = panel.left + PROP_PAD;
    let right = panel.right - PROP_PAD;

    if let Some((ti, ei)) = selected_element {
        if let Some(track) = project.scene.tracks.get(ti) {
            if let Some(element) = track.elements.get(ei) {
                gfx.fill_rounded_rect_r(&header, RADIUS_SM, solid(ACCENT_BG))?;
                gfx.stroke_rounded_rect_r(&header, RADIUS_SM, solid(BORDER_FAINT), 1.0)?;
                gfx.draw_text_left("Clip Properties", &fonts.body_bold, &header, solid(TEXT_BRIGHT))?;

                let basic_fields: [(&str, String); 5] = [
                    ("Name", element.name.clone()),
                    ("ID", element.id.clone()),
                    ("Track", track.name.clone()),
                    ("Start", format!("{:.2}s", element.start_seconds)),
                    ("Duration", format!("{:.2}s", element.duration_seconds)),
                ];
                for (label, value) in &basic_fields {
                    if y + PROP_ROW_H > panel.bottom {
                        break;
                    }
                    property_row(gfx, left, right, y, label, value)?;
                    y += PROP_ROW_H;
                }

                if y + PROP_ROW_H <= panel.bottom {
                    let sect_rect = RECT {
                        left,
                        top: y + 4,
                        right,
                        bottom: y + PROP_ROW_H + 4,
                    };
                    gfx.fill_rounded_rect_r(&sect_rect, 4.0, solid(ACCENT_BG))?;
                    gfx.stroke_rounded_rect_r(&sect_rect, 4.0, solid(BORDER_FAINT), 1.0)?;
                    gfx.draw_text_left("Transform", &fonts.body_bold, &sect_rect, solid(TEXT_BRIGHT))?;
                    y += PROP_ROW_H + 8;
                }

                let transform_fields: [(&str, String); 7] = [
                    ("Pos X", format!("{:.3}", element.transform.center_x)),
                    ("Pos Y", format!("{:.3}", element.transform.center_y)),
                    ("Width", format!("{:.3}", element.transform.width)),
                    ("Height", format!("{:.3}", element.transform.height)),
                    ("Rotation", format!("{:.1}\u{00B0}", element.transform.rotation_degrees)),
                    ("Flip X", if element.transform.flip_x { "Yes" } else { "No" }.to_string()),
                    ("Flip Y", if element.transform.flip_y { "Yes" } else { "No" }.to_string()),
                ];
                for (label, value) in &transform_fields {
                    if y + PROP_ROW_H > panel.bottom {
                        break;
                    }
                    property_row(gfx, left, right, y, label, value)?;
                    y += PROP_ROW_H;
                }

                if y + PROP_ROW_H <= panel.bottom {
                    let sect_rect = RECT {
                        left,
                        top: y + 4,
                        right,
                        bottom: y + PROP_ROW_H + 4,
                    };
                    gfx.fill_rounded_rect_r(&sect_rect, 4.0, solid(ACCENT_BG))?;
                    gfx.stroke_rounded_rect_r(&sect_rect, 4.0, solid(BORDER_FAINT), 1.0)?;
                    gfx.draw_text_left("Compositing", &fonts.body_bold, &sect_rect, solid(TEXT_BRIGHT))?;
                    y += PROP_ROW_H + 8;
                }

                let comp_fields: [(&str, String); 2] = [
                    ("Opacity", format!("{:.0}%", element.opacity * 100.0)),
                    ("Blend", element.blend_mode.label().to_string()),
                ];
                for (label, value) in &comp_fields {
                    if y + PROP_ROW_H > panel.bottom {
                        break;
                    }
                    property_row(gfx, left, right, y, label, value)?;
                    y += PROP_ROW_H;
                }

                if y + PROP_ROW_H <= panel.bottom {
                    let hint_rect = RECT {
                        left,
                        top: y + 8,
                        right,
                        bottom: y + PROP_ROW_H + 8,
                    };
                    gfx.draw_text_left("Del = remove clip", &fonts.small, &hint_rect, solid(TEXT_FAINT))?;
                }
                return Ok(());
            }
        }
    }

    // Project details view (matches web ProjectDetailsView).
    draw_project_details(gfx, panel, project)?;

    Ok(())
}

unsafe fn draw_project_details(gfx: &mut D2dGfx, panel: &RECT, project: &Project) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    let left = panel.left + PROP_PAD;
    let right = panel.right - PROP_PAD;

    // Header: "Details" + "Reset all".
    let header = RECT {
        left,
        top: panel.top + 6,
        right,
        bottom: panel.top + 30,
    };
    gfx.draw_text_left("Details", &fonts.body_bold, &header, solid(TEXT_BRIGHT))?;
    let reset_w = 58;
    let reset_rect = RECT {
        left: header.right - reset_w,
        top: header.top + 2,
        right: header.right,
        bottom: header.bottom - 2,
    };
    gfx.fill_rounded_rect_r(&reset_rect, 6.0, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&reset_rect, 6.0, solid(BORDER_FAINT), 1.0)?;
    gfx.draw_text_centered("Reset all", &fonts.tiny, &reset_rect, solid(TEXT_DIM))?;

    let mut y = header.bottom + 8;

    // ProjectHero placeholder.
    let hero_h = 136;
    if y + hero_h <= panel.bottom {
        let hero = RECT {
            left,
            top: y,
            right,
            bottom: y + hero_h,
        };
        gfx.fill_rounded_rect_r(&hero, RADIUS_MD, solid(ACCENT_SUBTLE))?;
        gfx.stroke_rounded_rect_r(&hero, RADIUS_MD, solid(BORDER_FAINT), 1.0)?;

        // Thumbnail strip (placeholder gradient).
        let thumb = RECT {
            left: hero.left + 8,
            top: hero.top + 8,
            right: hero.right - 8,
            bottom: hero.top + 54,
        };
        gfx.fill_rounded_rect_r(&thumb, 6.0, CHIP_BG_D2D)?;
        gfx.stroke_rounded_rect_r(&thumb, 6.0, solid(BORDER_FAINT), 1.0)?;
        gfx.draw_text_centered("\u{2139}", &fonts.title, &thumb, solid(TEXT_FAINT))?;

        // Project name + version chip.
        let name_rect = RECT {
            left: hero.left + 8,
            top: thumb.bottom + 6,
            right: hero.right - 8,
            bottom: thumb.bottom + 26,
        };
        gfx.draw_text_left(&project.metadata.name, &fonts.body_bold, &name_rect, solid(TEXT_BRIGHT))?;
        let chip_rect = RECT {
            left: name_rect.right - 50,
            top: name_rect.top + 2,
            right: name_rect.right,
            bottom: name_rect.bottom - 2,
        };
        gfx.fill_rounded_rect_r(&chip_rect, 4.0, CHIP_BG_D2D)?;
        gfx.stroke_rounded_rect_r(&chip_rect, 4.0, solid(BORDER_FAINT), 1.0)?;
        gfx.draw_text_centered(&format!("v{}", project.version), &fonts.tiny, &chip_rect, solid(TEXT_DIM))?;

        // "Project" chip.
        let type_rect = RECT {
            left: hero.left + 8,
            top: name_rect.bottom + 4,
            right: hero.left + 56,
            bottom: name_rect.bottom + 18,
        };
        gfx.fill_rounded_rect_r(&type_rect, 8.0, CHIP_BG_D2D)?;
        gfx.draw_text_centered("Project", &fonts.tiny, &type_rect, solid(TEXT_FAINT))?;

        // "View full project info" button.
        let info_rect = RECT {
            left: hero.left + 8,
            top: hero.bottom - 26,
            right: hero.right - 8,
            bottom: hero.bottom - 8,
        };
        gfx.fill_rounded_rect_r(&info_rect, 6.0, solid(ACCENT_SUBTLE))?;
        gfx.stroke_rounded_rect_r(&info_rect, 6.0, solid(BORDER_FAINT), 1.0)?;
        gfx.draw_text_centered("View full project info", &fonts.tiny, &info_rect, solid(TEXT_DIM))?;

        y = hero.bottom + 8;
    }

    // Project section.
    let duration = format_duration_timecode(project.metadata.duration_seconds, project.settings.fps_label());
    let fps_label = format!("{} fps", project.settings.fps_label());
    let resolution = format!("{} \u{00D7} {}", project.settings.canvas.width, project.settings.canvas.height);
    let project_rows: [(&str, &str); 4] = [
        ("Duration", duration.as_str()),
        ("Frame rate", fps_label.as_str()),
        ("Resolution", resolution.as_str()),
        ("Background", "Solid color"),
    ];
    let section_h = project_section_rows(&project_rows);
    if y + section_h <= panel.bottom {
        y = draw_section(gfx, left, right, y, "\u{2699}", "Project", &project_rows)?;
    }

    // Activity section.
    let created = format_date_ms(project.metadata.created_at_ms);
    let modified = format_date_ms(project.metadata.updated_at_ms);
    let activity_rows: [(&str, &str); 3] = [
        ("Created", created.as_str()),
        ("Modified", modified.as_str()),
        ("Project ID", ""),
    ];
    let activity_h = project_section_rows(&activity_rows);
    if y + activity_h <= panel.bottom {
        let activity_y = draw_section(gfx, left, right, y, "\u{25C9}", "Activity", &activity_rows)?;

        // Project ID chip inside the last row of the activity section.
        let chip = RECT {
            left: right - 92,
            top: activity_y - PROP_ROW_H + 2,
            right: right - 4,
            bottom: activity_y - 2,
        };
        let short_id = &project.metadata.id[..project.metadata.id.len().min(8)];
        gfx.fill_rounded_rect_r(&chip, 4.0, CHIP_BG_D2D)?;
        gfx.stroke_rounded_rect_r(&chip, 4.0, solid(BORDER_FAINT), 1.0)?;
        gfx.draw_text_centered(short_id, &fonts.tiny, &chip, solid(TEXT_BRIGHT))?;
    }

    Ok(())
}

fn project_section_rows(rows: &[(&str, &str)]) -> i32 {
    22 + rows.len() as i32 * (PROP_ROW_H + 2)
}

unsafe fn draw_section(
    gfx: &mut D2dGfx,
    left: i32,
    right: i32,
    y: i32,
    icon: &str,
    title: &str,
    rows: &[(&str, &str)],
) -> Result<i32> {
    let fonts = gfx.ctx().fonts().clone();
    let h = project_section_rows(rows);
    let sect = RECT {
        left,
        top: y,
        right,
        bottom: y + h,
    };
    gfx.fill_rounded_rect_r(&sect, RADIUS_MD, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&sect, RADIUS_MD, solid(BORDER_FAINT), 1.0)?;

    let header = RECT {
        left: sect.left + 8,
        top: sect.top + 6,
        right: sect.right - 8,
        bottom: sect.top + 20,
    };
    let icon_rect = RECT {
        left: header.left,
        top: header.top,
        right: header.left + 18,
        bottom: header.bottom,
    };
    gfx.draw_text_centered(icon, &fonts.small, &icon_rect, solid(TEXT_FAINT))?;
    let title_rect = RECT {
        left: icon_rect.right,
        top: header.top,
        right: header.right,
        bottom: header.bottom,
    };
    gfx.draw_text_left(title, &fonts.small, &title_rect, solid(TEXT_FAINT))?;

    let mut row_y = header.bottom + 2;
    for (label, value) in rows {
        let label_rect = RECT {
            left: sect.left + 10,
            top: row_y,
            right: sect.left + 70,
            bottom: row_y + PROP_ROW_H,
        };
        gfx.draw_text_left(label, &fonts.small, &label_rect, solid(TEXT_FAINT))?;
        let value_rect = RECT {
            left: label_rect.right + 6,
            top: row_y,
            right: sect.right - 10,
            bottom: row_y + PROP_ROW_H,
        };
        gfx.draw_text_left(value, &fonts.small, &value_rect, solid(TEXT_DIM))?;
        row_y += PROP_ROW_H + 2;
    }
    Ok(sect.bottom)
}

fn format_duration_timecode(seconds: f64, fps: u32) -> String {
    let total_frames = (seconds * fps as f64).round() as i64;
    let frames = total_frames % fps as i64;
    let total_secs = total_frames / fps as i64;
    let secs = total_secs % 60;
    let mins = (total_secs / 60) % 60;
    let hours = total_secs / 3600;
    if hours > 0 {
        format!("{:02}:{:02}:{:02}:{:02}", hours, mins, secs, frames)
    } else {
        format!("{:02}:{:02}:{:02}", mins, secs, frames)
    }
}

fn format_date_ms(ms: i64) -> String {
    let secs = (ms / 1000).max(0);
    let mins = secs / 60;
    let hours = mins / 60;
    let days = hours / 24;
    let months = days / 30;
    let years = days / 365;
    if years > 0 {
        format!("{}y ago", years)
    } else if months > 0 {
        format!("{}mo ago", months)
    } else if days > 0 {
        format!("{}d ago", days)
    } else if hours > 0 {
        format!("{}h ago", hours)
    } else if mins > 0 {
        format!("{}m ago", mins)
    } else {
        "Just now".to_string()
    }
}

unsafe fn property_row(gfx: &mut D2dGfx, left: i32, right: i32, y: i32, label: &str, value: &str) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    let row = RECT {
        left,
        top: y,
        right,
        bottom: y + PROP_ROW_H,
    };
    gfx.fill_rounded_rect_r(&row, 4.0, solid(ACCENT_SUBTLE))?;
    let label_rect = RECT {
        left: left + 4,
        top: y,
        right: left + 70,
        bottom: y + PROP_ROW_H,
    };
    gfx.draw_text_left(label, &fonts.small, &label_rect, solid(TEXT_FAINT))?;
    let value_rect = RECT {
        left: left + 78,
        top: y,
        right: right - 4,
        bottom: y + PROP_ROW_H,
    };
    gfx.draw_text_left(value, &fonts.small, &value_rect, solid(TEXT_DIM))?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Timeline toolbar + panel
// ---------------------------------------------------------------------------

unsafe fn draw_timeline_toolbar(
    gfx: &mut D2dGfx,
    toolbar: &RECT,
    btns: &mut ToolbarButtons,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    gfx.fill_rect_r(toolbar, PANEL_BG_D2D)?;
    gfx.draw_hline(
        toolbar.left as f32,
        toolbar.right as f32,
        toolbar.bottom as f32 - 1.0,
        solid(BORDER_FAINT),
        1.0,
    )?;

    let h = toolbar.bottom - toolbar.top;
    let btn_h = 24;
    let btn_y = toolbar.top + (h - btn_h) / 2;
    let gap = 6;
    let mut x = toolbar.left + 8;

    // + Add scene button.
    let add_w = 82;
    btns.timeline_add_scene = RECT {
        left: x,
        top: btn_y,
        right: x + add_w,
        bottom: btn_y + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_add_scene, 6.0, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&btns.timeline_add_scene, 6.0, solid(BORDER_FAINT), 1.0)?;
    gfx.draw_text_centered("+ Add scene", &fonts.tiny, &btns.timeline_add_scene, solid(TEXT_BRIGHT))?;
    x += add_w + gap;

    // Vertical divider.
    gfx.draw_vline(
        (toolbar.top + 6) as f32,
        (toolbar.bottom - 6) as f32,
        x as f32 + 2.0,
        solid(BORDER_FAINT),
        1.0,
    )?;
    x += gap + 4;

    // Select/split tool toggle.
    let tool_w = 52;
    btns.timeline_tool_toggle = RECT {
        left: x,
        top: btn_y,
        right: x + tool_w,
        bottom: btn_y + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_tool_toggle, 12.0, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&btns.timeline_tool_toggle, 12.0, solid(BORDER_FAINT), 1.0)?;
    gfx.draw_text_centered("\u{2196} Select", &fonts.tiny, &btns.timeline_tool_toggle, solid(TEXT_DIM))?;

    // Center: scene selector placeholder.
    let selector_w = 120;
    btns.timeline_scene_selector = RECT {
        left: toolbar.left + (toolbar.right - toolbar.left - selector_w) / 2,
        top: btn_y,
        right: toolbar.left + (toolbar.right - toolbar.left + selector_w) / 2,
        bottom: btn_y + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_scene_selector, 12.0, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&btns.timeline_scene_selector, 12.0, solid(BORDER_FAINT), 1.0)?;
    gfx.draw_text_centered("Main", &fonts.tiny, &btns.timeline_scene_selector, solid(TEXT_BRIGHT))?;

    // Right-side controls.
    let mut rx = toolbar.right - 8;

    // Zoom in.
    let zoom_btn_w = 24;
    btns.timeline_zoom_in = RECT {
        left: rx - zoom_btn_w,
        top: btn_y,
        right: rx,
        bottom: btn_y + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_zoom_in, 5.0, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("+", &fonts.body, &btns.timeline_zoom_in, solid(TEXT_DIM))?;
    rx -= zoom_btn_w + 2;

    // Zoom slider placeholder.
    let slider_w = 60;
    btns.timeline_zoom_slider = RECT {
        left: rx - slider_w,
        top: btn_y + 8,
        right: rx,
        bottom: btn_y + btn_h - 8,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_zoom_slider, 4.0, solid(ACCENT_BG))?;
    let slider_fill = RECT {
        left: btns.timeline_zoom_slider.left,
        top: btns.timeline_zoom_slider.top,
        right: btns.timeline_zoom_slider.left + slider_w * 4 / 10,
        bottom: btns.timeline_zoom_slider.bottom,
    };
    gfx.fill_rounded_rect_r(&slider_fill, 4.0, solid(TEXT_DIM))?;
    rx -= slider_w + 6;

    // Zoom out.
    btns.timeline_zoom_out = RECT {
        left: rx - zoom_btn_w,
        top: btn_y,
        right: rx,
        bottom: btn_y + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_zoom_out, 5.0, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{2212}", &fonts.body, &btns.timeline_zoom_out, solid(TEXT_DIM))?;
    rx -= zoom_btn_w + gap;

    // Vertical divider before snapping/ripple.
    gfx.draw_vline(
        (toolbar.top + 6) as f32,
        (toolbar.bottom - 6) as f32,
        (rx - 2) as f32,
        solid(BORDER_FAINT),
        1.0,
    )?;
    rx -= gap + 4;

    // Ripple editing placeholder.
    btns.timeline_ripple = RECT {
        left: rx - btn_h,
        top: btn_y,
        right: rx,
        bottom: btn_y + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_ripple, 5.0, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{2248}", &fonts.small, &btns.timeline_ripple, solid(TEXT_DIM))?;
    rx -= btn_h + 2;

    // Snapping placeholder.
    btns.timeline_snapping = RECT {
        left: rx - btn_h,
        top: btn_y,
        right: rx,
        bottom: btn_y + btn_h,
    };
    gfx.fill_rounded_rect_r(&btns.timeline_snapping, 5.0, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{1F9F2}", &fonts.small, &btns.timeline_snapping, solid(TEXT_DIM))?;

    Ok(())
}

unsafe fn draw_timeline_panel(
    gfx: &mut D2dGfx,
    panel: &RECT,
    toolbar: &RECT,
    ruler: &RECT,
    project: &Project,
    selected_track: usize,
    playing: bool,
    selected_element: Option<(usize, usize)>,
    zoom_pps: f64,
    scroll_seconds: f64,
    btns: &mut ToolbarButtons,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    gfx.fill_rect_r(panel, solid(BG))?;
    gfx.stroke_rect_r(panel, solid(BORDER_FAINT), 1.0)?;

    draw_timeline_toolbar(gfx, toolbar, btns)?;
    draw_ruler(gfx, ruler, zoom_pps, scroll_seconds, project.playhead.as_seconds())?;

    let readout_h = 22;
    let list_bottom = panel.bottom - readout_h;

    let mut y = ruler.bottom + TRACK_PAD;
    for (i, track) in project.scene.tracks.iter().enumerate() {
        y = draw_track_row(
            gfx,
            panel,
            y,
            track,
            i,
            selected_track,
            selected_element,
            zoom_pps,
            scroll_seconds,
            list_bottom,
        )?;
        if y + 28 > list_bottom {
            break;
        }
    }

    draw_playhead(gfx, panel, ruler.bottom, project, playing, list_bottom, zoom_pps, scroll_seconds)?;

    // Readout strip.
    let readout = RECT {
        left: panel.left,
        top: list_bottom,
        right: panel.right,
        bottom: panel.bottom,
    };
    gfx.fill_rect_r(&readout, PANEL_BG_D2D)?;
    let frame = project.playhead.frame_floor(project.settings.fps).unwrap_or(0);
    let readout_label = format!(
        "Playhead {:.3}s (frame {})  {}  \u{2022}  {} tracks  \u{2022}  \u{2190}\u{2192} seek  \u{2191}\u{2193} select  T track  E clip  M mute  S solo  H hide  L lock  Space play  Esc home  Ctrl+Z/Y  Ctrl+R/S/O/I/E/P",
        project.playhead.as_seconds(),
        frame,
        if playing { "[PLAYING]" } else { "[PAUSED]" },
        project.scene.tracks.len(),
    );
    gfx.draw_text_centered(&readout_label, &fonts.tiny, &readout, solid(TEXT_FAINT))?;

    Ok(())
}

unsafe fn draw_ruler(
    gfx: &mut D2dGfx,
    ruler: &RECT,
    zoom_pps: f64,
    scroll_seconds: f64,
    playhead_seconds: f64,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    gfx.fill_rect_r(ruler, PANEL_BG_D2D)?;
    gfx.stroke_rect_r(ruler, solid(BORDER_FAINT), 1.0)?;

    let panel_w = ruler.right - ruler.left;
    let header_right = ruler.left + TRACK_PAD + 140;
    let clip_left = header_right + 4;
    let clip_right = ruler.left + panel_w - TRACK_PAD;
    let clip_w = (clip_right - clip_left).max(1) as f64;

    let target_px = 80.0;
    let min_interval_seconds = target_px / zoom_pps;
    let interval = nice_interval(min_interval_seconds);

    let first_marker = (scroll_seconds / interval).floor() * interval;
    let mut t = first_marker;
    let max_t = scroll_seconds + clip_w / zoom_pps + interval;

    while t <= max_t {
        if t < 0.0 {
            t += interval;
            continue;
        }
        let x = time_to_x(t, zoom_pps, scroll_seconds, clip_left);
        if x < clip_left || x > clip_right {
            t += interval;
            continue;
        }

        gfx.draw_vline(
            (ruler.top + RULER_H - 8) as f32,
            ruler.bottom as f32,
            x as f32,
            solid(BORDER),
            1.0,
        )?;

        let label = format_time_label(t);
        let label_rect = RECT {
            left: x + 3,
            top: ruler.top + 2,
            right: x + 60,
            bottom: ruler.top + RULER_H - 8,
        };
        gfx.draw_text_left(&label, &fonts.tiny, &label_rect, solid(TEXT_FAINT))?;

        t += interval;
    }

    let ph_x = time_to_x(playhead_seconds, zoom_pps, scroll_seconds, clip_left);
    if ph_x >= clip_left && ph_x <= clip_right {
        let handle_rect = RECT {
            left: ph_x - 3,
            top: ruler.top,
            right: ph_x + 4,
            bottom: ruler.bottom,
        };
        gfx.fill_rect_r(&handle_rect, solid(0xE8E8EC))?;
    }

    gfx.draw_vline(
        ruler.top as f32,
        ruler.bottom as f32,
        header_right as f32,
        solid(BORDER),
        1.0,
    )?;

    Ok(())
}

fn nice_interval(min_seconds: f64) -> f64 {
    for &nice in &[
        0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 30.0, 60.0, 120.0, 300.0, 600.0,
    ] {
        if nice >= min_seconds {
            return nice;
        }
    }
    600.0
}

fn format_time_label(seconds: f64) -> String {
    if seconds < 1.0 {
        format!("{:.1}s", seconds)
    } else if seconds < 60.0 {
        if seconds == seconds.trunc() {
            format!("{}s", seconds as i32)
        } else {
            format!("{:.1}s", seconds)
        }
    } else {
        let mins = (seconds / 60.0).floor() as i32;
        if mins * 60 == seconds as i32 {
            format!("{}m", mins)
        } else {
            format!("{:.1}m", seconds / 60.0)
        }
    }
}

unsafe fn draw_track_row(
    gfx: &mut D2dGfx,
    panel: &RECT,
    row_y: i32,
    track: &crate::state::Track,
    track_index: usize,
    selected_track: usize,
    selected_element: Option<(usize, usize)>,
    zoom_pps: f64,
    scroll_seconds: f64,
    list_bottom: i32,
) -> Result<i32> {
    let fonts = gfx.ctx().fonts().clone();
    let panel_w = panel.right - panel.left;
    if row_y + TRACK_ROW_H > list_bottom {
        return Ok(row_y);
    }
    let row = RECT {
        left: panel.left + TRACK_PAD,
        top: row_y,
        right: panel.left + panel_w - TRACK_PAD,
        bottom: row_y + TRACK_ROW_H - 2,
    };
    gfx.fill_rounded_rect_r(&row, 4.0, solid(TRACK_BG))?;
    if track_index == selected_track {
        gfx.stroke_rect_r(&row, solid(TRACK_SELECTED_BORDER), 1.0)?;
    }

    let tag_color = match track.track_type {
        TrackType::Video => 0x3B5BDB,
        TrackType::Text => 0xE64980,
        TrackType::Audio => 0x20C997,
        TrackType::Graphic => 0xFAB005,
    };
    let tag = RECT {
        left: row.left + 4,
        top: row.top + 4,
        right: row.left + 52,
        bottom: row.bottom - 4,
    };
    gfx.fill_rounded_rect_r(&tag, 4.0, solid(tag_color))?;
    gfx.draw_text_centered(track.track_type.label(), &fonts.tiny, &tag, solid(0x111114))?;

    let mut label = track.name.clone();
    if track.muted {
        label.push_str("  [M]");
    }
    if track.soloed {
        label.push_str("  [S]");
    }
    if track.hidden {
        label.push_str("  [H]");
    }
    if track.locked {
        label.push_str("  [L]");
    }
    let header_right = row.left + 140;
    let name_rect = RECT {
        left: tag.right + 8,
        top: row.top,
        right: header_right,
        bottom: row.bottom,
    };
    let name_color = if track_index == selected_track {
        solid(TEXT_BRIGHT)
    } else {
        solid(TEXT_DIM)
    };
    gfx.draw_text_left(&label, &fonts.small, &name_rect, name_color)?;

    let clip_area_left = header_right + 4;
    let clip_area_right = row.right - 4;
    for (ei, element) in track.elements.iter().enumerate() {
        let clip_x = time_to_x(element.start_seconds, zoom_pps, scroll_seconds, clip_area_left);
        let clip_end_x = time_to_x(element.end_seconds(), zoom_pps, scroll_seconds, clip_area_left);
        if clip_end_x < clip_area_left || clip_x > clip_area_right {
            continue;
        }
        let clip_w = (clip_end_x - clip_x).max(2);
        let draw_x = clip_x.max(clip_area_left);
        let draw_right = (clip_x + clip_w).min(clip_area_right);
        if draw_right <= draw_x {
            continue;
        }
        let clip_rect = RECT {
            left: draw_x,
            top: row.top + 3,
            right: draw_right,
            bottom: row.bottom - 3,
        };
        let clip_color = match track.track_type {
            TrackType::Video => 0x2A3F8C,
            TrackType::Text => 0xA8365C,
            TrackType::Audio => 0x178E6B,
            TrackType::Graphic => 0xB8860B,
        };
        gfx.fill_rect_r(&clip_rect, solid(clip_color))?;
        let clip_border = if selected_element == Some((track_index, ei)) {
            0xB3B3B8
        } else {
            tag_color
        };
        gfx.stroke_rect_r(&clip_rect, solid(clip_border), 1.0)?;
        if (draw_right - draw_x) > 30 {
            gfx.draw_text_left(&element.name, &fonts.tiny, &clip_rect, solid(0xE8E8EC))?;
        }
    }

    Ok(row_y + TRACK_ROW_H)
}

unsafe fn draw_playhead(
    gfx: &mut D2dGfx,
    panel: &RECT,
    tracks_top: i32,
    project: &Project,
    _playing: bool,
    list_bottom: i32,
    zoom_pps: f64,
    scroll_seconds: f64,
) -> Result<()> {
    let panel_w = panel.right - panel.left;
    let header_right = panel.left + TRACK_PAD + 140;
    let clip_area_left = header_right + 4;
    let clip_area_right = panel.left + panel_w - TRACK_PAD;

    let px = time_to_x(project.playhead.as_seconds(), zoom_pps, scroll_seconds, clip_area_left);
    if px >= clip_area_left && px <= clip_area_right {
        gfx.draw_vline(
            tracks_top as f32,
            list_bottom as f32,
            px as f32,
            solid(crate::theme::PLAYHEAD_COLOR),
            2.0,
        )?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Preview panel frame + overlay controls
// ---------------------------------------------------------------------------

unsafe fn draw_preview_overlay(gfx: &mut D2dGfx, overlay: &RECT) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    if overlay.right - overlay.left < 40 || overlay.bottom - overlay.top < 20 {
        return Ok(());
    }

    gfx.fill_rounded_rect_r(overlay, 8.0, OVERLAY_BG_D2D)?;
    gfx.stroke_rounded_rect_r(overlay, 8.0, solid(BORDER_FAINT), 1.0)?;

    let aspect = "16:9"; // Placeholder; matches default canvas aspect.
    let gap = 1;
    let seg_h = overlay.bottom - overlay.top - 4;
    let mut x = overlay.left + 2;

    let fit_rect = RECT {
        left: x,
        top: overlay.top + 2,
        right: x + 30,
        bottom: overlay.top + 2 + seg_h,
    };
    gfx.fill_rounded_rect_r(&fit_rect, 5.0, solid(ACCENT_BG))?;
    gfx.draw_text_centered("Fit", &fonts.tiny, &fit_rect, solid(TEXT_BRIGHT))?;
    x = fit_rect.right + gap;

    let aspect_rect = RECT {
        left: x,
        top: overlay.top + 2,
        right: x + 36,
        bottom: overlay.top + 2 + seg_h,
    };
    let aspect_color = if aspect == "16:9" { solid(TEXT_BRIGHT) } else { solid(TEXT_DIM) };
    gfx.draw_text_centered(aspect, &fonts.tiny, &aspect_rect, aspect_color)?;
    x = aspect_rect.right + gap;

    let fs_rect = RECT {
        left: x,
        top: overlay.top + 2,
        right: x + 26,
        bottom: overlay.top + 2 + seg_h,
    };
    gfx.draw_text_centered("\u{26F6}", &fonts.small, &fs_rect, solid(TEXT_BRIGHT))?;
    x = fs_rect.right + gap;

    let more_rect = RECT {
        left: x,
        top: overlay.top + 2,
        right: overlay.right - 2,
        bottom: overlay.top + 2 + seg_h,
    };
    gfx.draw_text_centered("\u{22EF}", &fonts.small, &more_rect, solid(TEXT_BRIGHT))?;

    Ok(())
}

unsafe fn draw_preview_frame(gfx: &mut D2dGfx, preview: &RECT, overlay: &RECT) -> Result<()> {
    gfx.fill_rounded_rect_r(preview, RADIUS_LG, PANEL_BG_D2D)?;
    gfx.stroke_rounded_rect_r(preview, RADIUS_LG, solid(BORDER_FAINT), 1.0)?;
    draw_preview_overlay(gfx, overlay)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Viewport toolbar
// ---------------------------------------------------------------------------

unsafe fn draw_viewport_toolbar(
    gfx: &mut D2dGfx,
    rect: &RECT,
    project: &Project,
    playing: bool,
    looping: bool,
    btns: &mut ToolbarButtons,
) -> Result<()> {
    let fonts = gfx.ctx().fonts().clone();
    let w = rect.right - rect.left;
    let h = rect.bottom - rect.top;
    let fps = project.settings.fps_label();
    let duration = timeline_duration(project);
    let current = project.playhead.as_seconds();

    // Top hairline.
    gfx.draw_hline(
        rect.left as f32,
        rect.right as f32,
        rect.top as f32,
        solid(BORDER_FAINT),
        1.0,
    )?;

    // Mini audio meter.
    let meter_w = 32;
    let meter_h = 14;
    let meter_rect = RECT {
        left: rect.left + 12,
        top: rect.top + (h - meter_h) / 2,
        right: rect.left + 12 + meter_w,
        bottom: rect.top + (h - meter_h) / 2 + meter_h,
    };
    gfx.fill_rect_r(&meter_rect, solid(ACCENT_SUBTLE))?;
    let bar_w = 3;
    let gap = 1;
    let mut bx = meter_rect.left + 2;
    for _ in 0..5 {
        let bar_h = 4 + (bx % 7) as i32;
        let brect = RECT {
            left: bx,
            top: meter_rect.bottom - 2 - bar_h,
            right: bx + bar_w,
            bottom: meter_rect.bottom - 2,
        };
        gfx.fill_rect_r(&brect, solid(EMERALD))?;
        bx += bar_w + gap;
    }

    // Divider.
    let div = RECT {
        left: meter_rect.right + 8,
        top: rect.top + (h - 14) / 2,
        right: meter_rect.right + 9,
        bottom: rect.top + (h - 14) / 2 + 14,
    };
    gfx.fill_rect_r(&div, solid(BORDER_FAINT))?;

    // Timecode.
    let tc = format_timecode(current, fps);
    let total_tc = format_timecode(duration, fps);
    let tc_rect = RECT {
        left: div.right + 8,
        top: rect.top,
        right: div.right + 8 + 90,
        bottom: rect.bottom,
    };
    gfx.draw_text_left(&tc, &fonts.small, &tc_rect, solid(TEXT_BRIGHT))?;

    let slash_rect = RECT {
        left: tc_rect.right,
        top: rect.top,
        right: tc_rect.right + 16,
        bottom: rect.bottom,
    };
    gfx.draw_text_centered("/", &fonts.small, &slash_rect, solid(TEXT_FAINT))?;

    let total_rect = RECT {
        left: slash_rect.right,
        top: rect.top,
        right: slash_rect.right + 90,
        bottom: rect.bottom,
    };
    gfx.draw_text_left(&total_tc, &fonts.small, &total_rect, solid(TEXT_FAINT))?;

    // Transport controls.
    let btn_size = 28;
    let gap = 4;
    let total_btns_w = 5 * btn_size + 4 * gap;
    let center_x = rect.left + (w - total_btns_w) / 2;
    let btn_y = rect.top + (h - btn_size) / 2;

    btns.jump_start = RECT {
        left: center_x,
        top: btn_y,
        right: center_x + btn_size,
        bottom: btn_y + btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.jump_start, RADIUS_SM, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{23EE}", &fonts.small, &btns.jump_start, solid(TEXT_DIM))?;

    let x2 = center_x + btn_size + gap;
    btns.step_back = RECT {
        left: x2,
        top: btn_y,
        right: x2 + btn_size,
        bottom: btn_y + btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.step_back, RADIUS_SM, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{23EA}", &fonts.small, &btns.step_back, solid(TEXT_DIM))?;

    let x3 = x2 + btn_size + gap;
    btns.play_pause = RECT {
        left: x3,
        top: btn_y,
        right: x3 + btn_size,
        bottom: btn_y + btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.play_pause, RADIUS_SM, solid(BLUE))?;
    let play_glyph = if playing { "\u{23F8}" } else { "\u{25B6}" };
    gfx.draw_text_centered(play_glyph, &fonts.small, &btns.play_pause, solid(0xFFFFFF))?;

    let x4 = x3 + btn_size + gap;
    btns.step_fwd = RECT {
        left: x4,
        top: btn_y,
        right: x4 + btn_size,
        bottom: btn_y + btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.step_fwd, RADIUS_SM, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{23E9}", &fonts.small, &btns.step_fwd, solid(TEXT_DIM))?;

    let x5 = x4 + btn_size + gap;
    btns.jump_end = RECT {
        left: x5,
        top: btn_y,
        right: x5 + btn_size,
        bottom: btn_y + btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.jump_end, RADIUS_SM, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{23ED}", &fonts.small, &btns.jump_end, solid(TEXT_DIM))?;

    // Right-side controls.
    let rx = rect.right - 12;
    let r_btn_size = 28;

    btns.fullscreen = RECT {
        left: rx - r_btn_size,
        top: btn_y,
        right: rx,
        bottom: btn_y + r_btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.fullscreen, RADIUS_SM, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("\u{26F6}", &fonts.small, &btns.fullscreen, solid(TEXT_DIM))?;
    let rx2 = rx - r_btn_size - gap;

    let quality_w = 44;
    btns.quality_btn = RECT {
        left: rx2 - quality_w,
        top: btn_y,
        right: rx2,
        bottom: btn_y + r_btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.quality_btn, RADIUS_SM, solid(ACCENT_SUBTLE))?;
    gfx.draw_text_centered("Auto", &fonts.small, &btns.quality_btn, solid(TEXT_FAINT))?;
    let rx3 = rx2 - quality_w - gap;

    let draw_w = 60;
    btns.draw_btn = RECT {
        left: rx3 - draw_w,
        top: btn_y,
        right: rx3,
        bottom: btn_y + r_btn_size,
    };
    gfx.fill_rounded_rect_r(&btns.draw_btn, RADIUS_SM, solid(ACCENT_SUBTLE))?;
    gfx.stroke_rounded_rect_r(&btns.draw_btn, RADIUS_SM, solid(BORDER_FAINT), 1.0)?;
    gfx.draw_text_centered("Draw", &fonts.small, &btns.draw_btn, solid(TEXT_FAINT))?;
    let rx4 = rx3 - draw_w - gap;

    btns.loop_btn = RECT {
        left: rx4 - r_btn_size,
        top: btn_y,
        right: rx4,
        bottom: btn_y + r_btn_size,
    };
    let loop_bg = if looping { solid(ACCENT_BG) } else { solid(ACCENT_SUBTLE) };
    gfx.fill_rounded_rect_r(&btns.loop_btn, RADIUS_SM, loop_bg)?;
    let loop_color = if looping { solid(TEXT_BRIGHT) } else { solid(TEXT_DIM) };
    gfx.draw_text_centered("\u{21BB}", &fonts.small, &btns.loop_btn, loop_color)?;

    Ok(())
}

fn format_timecode(seconds: f64, fps: u32) -> String {
    let total_frames = (seconds * fps as f64).round() as i64;
    let frames = total_frames % fps as i64;
    let total_secs = total_frames / fps as i64;
    let secs = total_secs % 60;
    let mins = (total_secs / 60) % 60;
    let hours = total_secs / 3600;
    format!("{:02}:{:02}:{:02}:{:02}", hours, mins, secs, frames)
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

unsafe fn pill(
    gfx: &mut D2dGfx,
    rect: &RECT,
    text: &str,
    font: &windows::Win32::Graphics::DirectWrite::IDWriteTextFormat,
    bg: windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F,
    border: windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F,
    text_color: windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F,
) -> Result<()> {
    gfx.fill_rounded_rect_r(rect, 14.0, bg)?;
    gfx.stroke_rounded_rect_r(rect, 14.0, border, 1.0)?;
    gfx.draw_text_centered(text, font, rect, text_color)?;
    Ok(())
}

unsafe fn icon_btn(
    gfx: &mut D2dGfx,
    rect: &RECT,
    glyph: &str,
    font: &windows::Win32::Graphics::DirectWrite::IDWriteTextFormat,
    bg: windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F,
    border: windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F,
    text_color: windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F,
) -> Result<()> {
    gfx.fill_rounded_rect_r(rect, 6.0, bg)?;
    gfx.stroke_rounded_rect_r(rect, 6.0, border, 1.0)?;
    gfx.draw_text_centered(glyph, font, rect, text_color)?;
    Ok(())
}
