//! Visual theme — colors, spacing, and typography constants.
//!
//! Mirrors the dark editor aesthetic of the web app. All colors are
//! defined as `gpui::Hsla` values so they can be used directly in
//! GPUI's styling API.

use crate::state::ElementType;
use gpui::{Hsla, Pixels, px};

// ── Backgrounds ───────────────────────────────────────────────────────────

pub const BG_APP: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.06,
    a: 1.0,
};
pub const BG_PANEL: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.09,
    a: 1.0,
};
pub const BG_PANEL_RAISED: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.12,
    a: 1.0,
};
pub const BG_TRACK: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.10,
    a: 1.0,
};
pub const BG_TRACK_ALT: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.08,
    a: 1.0,
};
pub const BG_INPUT: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.05,
    a: 1.0,
};
pub const BG_HOVER: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.16,
    a: 1.0,
};
pub const BG_SELECTED: Hsla = Hsla {
    h: 0.611,
    s: 0.18,
    l: 0.22,
    a: 1.0,
};
pub const BG_VIEWPORT: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.04,
    a: 1.0,
};

// ── Borders ───────────────────────────────────────────────────────────────

pub const BORDER: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.20,
    a: 1.0,
};
pub const BORDER_FOCUS: Hsla = Hsla {
    h: 0.611,
    s: 0.80,
    l: 0.60,
    a: 1.0,
};

// ── Text ──────────────────────────────────────────────────────────────────

pub const TEXT_PRIMARY: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.95,
    a: 1.0,
};
pub const TEXT_SECONDARY: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.60,
    a: 1.0,
};
pub const TEXT_MUTED: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 0.40,
    a: 1.0,
};
pub const TEXT_ACCENT: Hsla = Hsla {
    h: 0.556,
    s: 0.90,
    l: 0.65,
    a: 1.0,
};

// ── Accents ───────────────────────────────────────────────────────────────

pub const ACCENT: Hsla = Hsla {
    h: 0.556,
    s: 0.90,
    l: 0.60,
    a: 1.0,
};
pub const ACCENT_HOVER: Hsla = Hsla {
    h: 0.556,
    s: 0.90,
    l: 0.68,
    a: 1.0,
};
pub const DANGER: Hsla = Hsla {
    h: 0.0,
    s: 0.80,
    l: 0.55,
    a: 1.0,
};
pub const WARNING: Hsla = Hsla {
    h: 0.111,
    s: 0.85,
    l: 0.55,
    a: 1.0,
};
pub const SUCCESS: Hsla = Hsla {
    h: 0.389,
    s: 0.70,
    l: 0.50,
    a: 1.0,
};

// ── Track colors (per element type) ────────────────────────────────────────

pub const TRACK_VIDEO: Hsla = Hsla {
    h: 0.583,
    s: 0.55,
    l: 0.40,
    a: 1.0,
};
pub const TRACK_IMAGE: Hsla = Hsla {
    h: 0.444,
    s: 0.50,
    l: 0.38,
    a: 1.0,
};
pub const TRACK_TEXT: Hsla = Hsla {
    h: 0.125,
    s: 0.60,
    l: 0.42,
    a: 1.0,
};
pub const TRACK_AUDIO: Hsla = Hsla {
    h: 0.778,
    s: 0.45,
    l: 0.42,
    a: 1.0,
};
pub const TRACK_EFFECT: Hsla = Hsla {
    h: 0.917,
    s: 0.50,
    l: 0.40,
    a: 1.0,
};
pub const TRACK_GRAPHIC: Hsla = Hsla {
    h: 0.083,
    s: 0.55,
    l: 0.42,
    a: 1.0,
};

// ── Playhead ──────────────────────────────────────────────────────────────

pub const PLAYHEAD: Hsla = Hsla {
    h: 0.0,
    s: 0.85,
    l: 0.60,
    a: 1.0,
};
pub const PLAYHEAD_HANDLE: Hsla = Hsla {
    h: 0.0,
    s: 0.85,
    l: 0.55,
    a: 1.0,
};

// ── Spacing ───────────────────────────────────────────────────────────────

pub const fn px_2() -> Pixels {
    px(2.0)
}
pub const fn px_4() -> Pixels {
    px(4.0)
}
pub const fn px_6() -> Pixels {
    px(6.0)
}
pub const fn px_8() -> Pixels {
    px(8.0)
}
pub const fn px_12() -> Pixels {
    px(12.0)
}
pub const fn px_16() -> Pixels {
    px(16.0)
}
pub const fn px_20() -> Pixels {
    px(20.0)
}
pub const fn px_24() -> Pixels {
    px(24.0)
}
pub const fn px_32() -> Pixels {
    px(32.0)
}

// ── Layout constants ──────────────────────────────────────────────────────

pub const HEADER_HEIGHT: Pixels = px(48.0);
pub const FOOTER_HEIGHT: Pixels = px(36.0);
pub const TOOLBAR_WIDTH: Pixels = px(48.0);
pub const INSPECTOR_WIDTH: Pixels = px(300.0);
pub const ASSETS_WIDTH: Pixels = px(280.0);
pub const TIMELINE_HEIGHT: Pixels = px(220.0);
pub const TRACK_HEIGHT: Pixels = px(44.0);
pub const RULER_HEIGHT: Pixels = px(28.0);
pub const TIMELINE_TOOLBAR_HEIGHT: Pixels = px(32.0);

/// Returns the track color for a given element type.
pub fn track_color(element_type: &ElementType) -> Hsla {
    match element_type {
        ElementType::Video => TRACK_VIDEO,
        ElementType::Image => TRACK_IMAGE,
        ElementType::Text => TRACK_TEXT,
        ElementType::Audio => TRACK_AUDIO,
        ElementType::Effect => TRACK_EFFECT,
        ElementType::Graphic => TRACK_GRAPHIC,
    }
}
