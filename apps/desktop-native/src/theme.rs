//! Theme constants — 1:1 with the web editor's Tailwind tokens.
//!
//! Values are derived from `apps/web/src/app/globals.css` and the editor
//! chrome components (header, footer, tab bar, panels, timeline). They
//! are kept as `0xRRGGBB` and converted to Win32 `COLORREF` via `rgb()`.

use windows::Win32::Graphics::Direct2D::Common::D2D1_COLOR_F;

// Backgrounds (editor page uses dark-only pinning).
/// Main editor background `#111114`.
pub const BG: u32 = 0x111114;
/// Deep footer bottom `#08080a`.
pub const BG_DARK: u32 = 0x08080a;
/// Pure white helper for translucent D2D text and borders.
pub const WHITE: u32 = 0xFFFFFF;
/// Panel surface `#0c0c10` (solid approximation of web glass `rgba(15,15,18,0.55)`).
pub const PANEL_BG: u32 = 0x0c0c10;
/// Glass panel D2D fill: `rgba(15,15,18,0.55)`.
pub const PANEL_BG_D2D: D2D1_COLOR_F = D2D1_COLOR_F {
    r: 0.05882353,
    g: 0.05882353,
    b: 0.07058824,
    a: 0.55,
};

// Borders (white overlaid on dark backgrounds).
/// `white/10` border ≈ RGB(26,26,30).
pub const BORDER: u32 = 0x1A1A1E;
/// `white/[0.06]` border ≈ RGB(20,20,24).
pub const BORDER_FAINT: u32 = 0x141418;
/// Top hairline `white/10` used on panels/header.
pub const BORDER_TOP: u32 = 0x1C1C20;

// Text.
/// `white/85` ≈ RGB(216,216,219).
pub const TEXT_BRIGHT: u32 = 0xD8D8DB;
/// `white/70` ≈ RGB(178,178,183).
pub const TEXT_MUTED: u32 = 0xB2B2B7;
/// `white/55` ≈ RGB(140,140,145).
pub const TEXT_DIM: u32 = 0x8C8C91;
/// `white/40` ≈ RGB(102,102,107).
pub const TEXT_FAINT: u32 = 0x66666B;

// Accents / controls.
/// Active/hover button background `white/14` ≈ RGB(36,36,40).
pub const ACCENT_BG: u32 = 0x242428;
/// Subtle hover background `white/6` ≈ RGB(19,19,23).
pub const ACCENT_SUBTLE: u32 = 0x131317;
/// Primary blue (export, active transport, brand actions).
pub const BLUE: u32 = 0x2A3F8C;
/// Cyan used for the web footer "BETA" badge.
pub const CYAN: u32 = 0x67E8F9;
/// Emerald indicator dot.
pub const EMERALD: u32 = 0x6EE7B7;

// Landing page specific (from `apps/web/src/app/globals.css` dark palette).
/// Pure black `#0a0a0c` used for "Open editor" button text.
pub const LANDING_BLACK: u32 = 0x0a0a0c;
/// Near-black landing page background.
pub const LANDING_BG: u32 = 0x0a0a0c;
/// Glass pill bg `bg-white/[0.04]`.
pub const LANDING_PILL_BG: u32 = 0x111113;
/// Glass pill border `white/10`.
pub const LANDING_PILL_BORDER: u32 = 0x252527;
/// Hero gradient accent silver `#9aa7ba`.
pub const LANDING_SILVER: u32 = 0x9aa7ba;
/// Muted hero body text `white/65`.
pub const LANDING_TEXT_MUTED: u32 = 0xa6a6ab;
/// Amber star `#fbbf24`.
pub const AMBER: u32 = 0xfbbf24;
/// Traffic-light window dots.
pub const DOT_RED: u32 = 0xff5f57;
pub const DOT_YELLOW: u32 = 0xfebc2e;
pub const DOT_GREEN: u32 = 0x28c840;

// Timeline / playback.
/// Playhead indicator colour (white/70).
pub const PLAYHEAD_COLOR: u32 = 0xB2B2B7;
/// Track header background.
pub const TRACK_BG: u32 = 0x141418;
/// Selected track border.
pub const TRACK_SELECTED_BORDER: u32 = 0x4D4D52;

/// Editor background clear for the compositor, normalised RGBA.
pub const EDITOR_BG_CLEAR: [f32; 4] = [17.0 / 255.0, 17.0 / 255.0, 20.0 / 255.0, 1.0];

// Translucent D2D surfaces used by multiple panels.
/// Preview overlay / glass popover background `bg-black/60`.
pub const OVERLAY_BG_D2D: D2D1_COLOR_F = D2D1_COLOR_F {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    a: 0.6,
};
/// Source-tabs container `bg-black/20`.
pub const TAB_CONTAINER_BG_D2D: D2D1_COLOR_F = D2D1_COLOR_F {
    r: 0.0,
    g: 0.0,
    b: 0.0,
    a: 0.2,
};
/// Active source tab background `bg-white/[0.12]`.
pub const TAB_ACTIVE_BG_D2D: D2D1_COLOR_F = D2D1_COLOR_F {
    r: 1.0,
    g: 1.0,
    b: 1.0,
    a: 0.12,
};
/// Chip / badge background `bg-white/[0.04]`.
pub const CHIP_BG_D2D: D2D1_COLOR_F = D2D1_COLOR_F {
    r: 1.0,
    g: 1.0,
    b: 1.0,
    a: 0.04,
};
/// Footer BETA pill background `bg-cyan-300/[0.055]`.
pub const CYAN_SOFT_BG_D2D: D2D1_COLOR_F = D2D1_COLOR_F {
    r: 103.0 / 255.0,
    g: 232.0 / 255.0,
    b: 249.0 / 255.0,
    a: 0.055,
};
/// Footer BETA pill border `border-cyan-300/[0.16]`.
pub const CYAN_SOFT_BORDER_D2D: D2D1_COLOR_F = D2D1_COLOR_F {
    r: 103.0 / 255.0,
    g: 232.0 / 255.0,
    b: 249.0 / 255.0,
    a: 0.16,
};

// Layout constants — match the web editor Tailwind classes.
/// Header height `h-12`.
pub const HEADER_H: i32 = 48;
/// Footer height `h-9`.
pub const FOOTER_H: i32 = 36;
/// Vertical tab bar width `w-[4.5rem]`.
pub const TABBAR_W: i32 = 72;
/// Outer padding around the panel grid.
pub const PAD: i32 = 8;
/// Gap between panels.
pub const GAP: i32 = 8;
/// Percent of the middle column given to the top row (panels above timeline).
pub const MAIN_CONTENT_PCT: f32 = 0.64;
/// Top-row allocation for the tools/assets panel.
pub const TOOLS_PCT: f32 = 0.28;
/// Top-row allocation for the preview panel.
pub const PREVIEW_PCT: f32 = 0.47;

// D2D corner radii (pixels) — match the web Tailwind rounded tokens.
pub const RADIUS_LG: f32 = 12.0;
pub const RADIUS_MD: f32 = 10.0;
pub const RADIUS_SM: f32 = 6.0;

// Timeline constants.
/// Track row height.
pub const TRACK_ROW_H: i32 = 28;
/// Inner padding inside the timeline panel.
pub const TRACK_PAD: i32 = 8;
/// Ruler strip height.
pub const RULER_H: i32 = 24;
/// Minimum timeline duration in seconds.
pub const TIMELINE_MIN_SECONDS: f64 = 30.0;
/// Timer ID for the playback timer.
pub const PLAYBACK_TIMER_ID: usize = 1;

// Asset panel constants.
pub const ASSET_ROW_H: i32 = 28;
pub const ASSET_PAD: i32 = 8;

// Properties panel constants.
pub const PROP_PAD: i32 = 10;
pub const PROP_ROW_H: i32 = 20;

// Window constants.
pub const WINDOW_WIDTH: i32 = 1280;
pub const WINDOW_HEIGHT: i32 = 800;

/// Convert `0xRRGGBB` → Win32 `COLORREF` (`0x00BBGGRR`).
pub fn rgb(c: u32) -> u32 {
    ((c & 0xFF) << 16) | (c & 0xFF00) | ((c >> 16) & 0xFF)
}

/// Convert a packed `0xRRGGBB` + alpha to a D2D float color.
pub fn to_d2d(hex: u32, alpha: f32) -> D2D1_COLOR_F {
    D2D1_COLOR_F {
        r: ((hex >> 16) & 0xFF) as f32 / 255.0,
        g: ((hex >> 8) & 0xFF) as f32 / 255.0,
        b: (hex & 0xFF) as f32 / 255.0,
        a: alpha,
    }
}
