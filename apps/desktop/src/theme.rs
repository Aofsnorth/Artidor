//! Visual theme — colors, spacing, and typography constants.
//!
//! Mirrors the dark editor aesthetic of the web app. All colors are
//! defined as `gpui::Hsla` struct literals (the `hsla()` constructor is
//! not `const`, so we use literals directly) so they can be used in
//! `const` contexts and GPUI's styling API.
//!
//! Color values are converted from the web app's Tailwind classes:
//! - Solid hex backgrounds (`#111114`, `#09090b`, …)
//! - White-alpha overlays (`bg-white/[0.04]`, `text-white/70`, …)
//! - Tailwind accent palette (`cyan-300`, `emerald-300`, …)

use crate::state::ElementType;
use gpui::{Hsla, Pixels, px};

// ── Backgrounds ───────────────────────────────────────────────────────────

/// App background — `bg-[#111114]`.
pub const BG_APP: Hsla = Hsla {
    h: 0.667,
    s: 0.08,
    l: 0.07,
    a: 1.0,
};
/// Panel / dropdown background — `bg-[#09090b]/90`.
pub const BG_PANEL: Hsla = Hsla {
    h: 0.667,
    s: 0.06,
    l: 0.04,
    a: 0.9,
};
/// Raised surfaces — `bg-white/[0.04]`.
pub const BG_PANEL_RAISED: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.04,
};
/// Hover state — `hover:bg-white/[0.08]`.
pub const BG_HOVER: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.08,
};
/// Timeline track background — `#0c0c10`.
pub const BG_TRACK: Hsla = Hsla {
    h: 0.667,
    s: 0.08,
    l: 0.06,
    a: 1.0,
};
/// Alternate timeline track — `#08080a`.
pub const BG_TRACK_ALT: Hsla = Hsla {
    h: 0.667,
    s: 0.06,
    l: 0.03,
    a: 1.0,
};
/// Input fields — `bg-white/[0.025]`.
pub const BG_INPUT: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.025,
};
/// Selected element background (cyan-tinted overlay).
pub const BG_SELECTED: Hsla = Hsla {
    h: 0.525,
    s: 0.85,
    l: 0.53,
    a: 0.16,
};
/// Preview viewport background.
pub const BG_VIEWPORT: Hsla = Hsla {
    h: 0.667,
    s: 0.06,
    l: 0.03,
    a: 1.0,
};

// ── Capsule (pill-shaped containers) ──────────────────────────────────────

/// Capsule background — `bg-white/[0.025]` with backdrop blur in web.
pub const CAPSULE_BG: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.025,
};
/// Capsule border — `border-white/[0.08]`.
pub const CAPSULE_BORDER: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.08,
};
/// Capsule hover border — `hover:border-white/[0.16]`.
pub const CAPSULE_BORDER_HOVER: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.16,
};

// ── Borders ───────────────────────────────────────────────────────────────

/// Default border — `border-white/[0.08]`.
pub const BORDER: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.08,
};
/// Focused / hovered border — `hover:border-white/[0.16]`.
pub const BORDER_FOCUS: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.16,
};

// ── Text ──────────────────────────────────────────────────────────────────

/// Primary text — `text-white/95`.
pub const TEXT_PRIMARY: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.95,
};
/// Secondary text — `text-white/70`.
pub const TEXT_SECONDARY: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.70,
};
/// Muted text — `text-white/[0.48]`.
pub const TEXT_MUTED: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.48,
};
/// Faint text — `text-white/[0.32]`.
pub const TEXT_FAINT: Hsla = Hsla {
    h: 0.0,
    s: 0.0,
    l: 1.0,
    a: 0.32,
};
/// Accent text (cyan).
pub const TEXT_ACCENT: Hsla = Hsla {
    h: 0.525,
    s: 0.85,
    l: 0.53,
    a: 1.0,
};

// ── Accents ───────────────────────────────────────────────────────────────

/// Cyan accent — Tailwind `cyan-300` (`#22d3ee`).
pub const ACCENT_CYAN: Hsla = Hsla {
    h: 0.525,
    s: 0.85,
    l: 0.53,
    a: 1.0,
};
/// Cyan accent hover — Tailwind `cyan-200` (lighter).
pub const ACCENT_CYAN_HOVER: Hsla = Hsla {
    h: 0.525,
    s: 0.85,
    l: 0.63,
    a: 1.0,
};
/// Emerald accent — Tailwind `emerald-300` (`#6ee7b7`).
pub const ACCENT_EMERALD: Hsla = Hsla {
    h: 0.422,
    s: 0.67,
    l: 0.71,
    a: 1.0,
};
/// Emerald accent hover — Tailwind `emerald-200` (lighter).
pub const ACCENT_EMERALD_HOVER: Hsla = Hsla {
    h: 0.422,
    s: 0.67,
    l: 0.80,
    a: 1.0,
};
/// Primary accent (alias of cyan, used by existing code).
pub const ACCENT: Hsla = ACCENT_CYAN;
/// Accent hover (alias of cyan hover).
pub const ACCENT_HOVER: Hsla = ACCENT_CYAN_HOVER;
/// Danger — Tailwind `red-400` tones.
pub const DANGER: Hsla = Hsla {
    h: 0.0,
    s: 0.85,
    l: 0.60,
    a: 1.0,
};
/// Warning — Tailwind `amber-400` tones.
pub const WARNING: Hsla = Hsla {
    h: 0.083,
    s: 0.85,
    l: 0.58,
    a: 1.0,
};
/// Success — Tailwind `emerald-400` tones.
pub const SUCCESS: Hsla = Hsla {
    h: 0.422,
    s: 0.70,
    l: 0.55,
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

/// Header height — `h-12` (48px).
pub const HEADER_HEIGHT: Pixels = px(48.0);
/// Footer height — `h-9` (36px).
pub const FOOTER_HEIGHT: Pixels = px(36.0);
/// Preview toolbar height — `h-11` (44px).
pub const PREVIEW_TOOLBAR_HEIGHT: Pixels = px(44.0);
/// Timeline toolbar height — `h-10` (40px) in web.
pub const TIMELINE_TOOLBAR_HEIGHT: Pixels = px(40.0);
/// Track height (44px).
pub const TRACK_HEIGHT: Pixels = px(44.0);
/// Ruler height (28px).
pub const RULER_HEIGHT: Pixels = px(28.0);

pub const TOOLBAR_WIDTH: Pixels = px(48.0);
pub const INSPECTOR_WIDTH: Pixels = px(300.0);
pub const ASSETS_WIDTH: Pixels = px(280.0);
pub const TIMELINE_HEIGHT: Pixels = px(220.0);

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
