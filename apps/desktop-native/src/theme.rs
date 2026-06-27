//! Theme constants — 1:1 with the web editor's Tailwind tokens
//! (Increment: SOLID refactor, extracted from main.rs).

/// Editor background `#111114`.
pub const BG: u32 = 0x111114;
/// Footer bottom gradient `#08080a`.
pub const BG_DARK: u32 = 0x08080a;
/// `white/10` border ≈ RGB(26,26,30).
pub const BORDER: u32 = 0x1A1A1E;
/// `white/[0.08]` border ≈ RGB(20,20,24).
pub const BORDER_FAINT: u32 = 0x141418;
/// `white/[0.48]` text ≈ RGB(122,122,127).
pub const TEXT_DIM: u32 = 0x7A7A7F;
/// `white/[0.32]` text ≈ RGB(81,81,86).
pub const TEXT_FAINT: u32 = 0x515156;
/// `white/85` storage bar ≈ RGB(216,216,219).
pub const TEXT_BRIGHT: u32 = 0xD8D8DB;
/// Editor background clear for the compositor, normalised RGBA.
pub const EDITOR_BG_CLEAR: [f32; 4] = [17.0 / 255.0, 17.0 / 255.0, 20.0 / 255.0, 1.0];
/// Playhead indicator colour (bright white/70 ≈ RGB(179,179,184)).
pub const PLAYHEAD_COLOR: u32 = 0xB3B3B8;

// Layout constants
pub const HEADER_H: i32 = 48;
pub const FOOTER_H: i32 = 36;
pub const TABBAR_W: i32 = 72;
pub const PAD: i32 = 8;
pub const GAP: i32 = 8;
pub const MAIN_CONTENT_PCT: f32 = 0.64;
pub const TOOLS_PCT: f32 = 0.28;
pub const PREVIEW_PCT: f32 = 0.47;

// Timeline constants
pub const TRACK_ROW_H: i32 = 28;
pub const TRACK_PAD: i32 = 8;
pub const TIMELINE_MIN_SECONDS: f64 = 30.0;
pub const PLAYBACK_TIMER_ID: usize = 1;

// Asset panel constants
pub const ASSET_ROW_H: i32 = 28;
pub const ASSET_PAD: i32 = 8;

// Properties panel constants
pub const PROP_PAD: i32 = 10;
pub const PROP_ROW_H: i32 = 20;

// Window constants
pub const WINDOW_WIDTH: i32 = 1280;
pub const WINDOW_HEIGHT: i32 = 800;

/// Convert `0xRRGGBB` → Win32 `COLORREF` (`0x00BBGGRR`).
pub fn rgb(c: u32) -> u32 {
    ((c & 0xFF) << 16) | (c & 0xFF00) | ((c >> 16) & 0xFF)
}
