//! Effects library — lists all available WGSL shader effects from the
//! `effects` crate, organized by category.
//!
//! Each effect is displayed as a card with its name and category. In the
//! future, clicking an effect will add it to the selected element's
//! effect pass groups.

use gpui::{Entity, IntoElement, ParentElement, Styled, div, prelude::*, px};

use crate::app::ArtidorApp;
use crate::theme;

/// An effect definition — shader ID, display name, and category.
#[derive(Debug, Clone)]
pub struct EffectDef {
    pub shader: &'static str,
    pub name: &'static str,
    pub category: EffectCategory,
}

/// Effect category for grouping in the library.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EffectCategory {
    Basic,
    Blur,
    Distortion,
    Stylize,
    Color,
    Edge,
    Opacity,
}

impl EffectCategory {
    fn label(&self) -> &str {
        match self {
            Self::Basic => "Basic",
            Self::Blur => "Blur",
            Self::Distortion => "Distortion",
            Self::Stylize => "Stylize",
            Self::Color => "Color",
            Self::Edge => "Edge",
            Self::Opacity => "Opacity / Visibility",
        }
    }
}

/// All available effects, matching the shaders in `rust/crates/effects/`.
const EFFECTS: &[EffectDef] = &[
    // Basic
    EffectDef {
        shader: "brightness",
        name: "Brightness",
        category: EffectCategory::Basic,
    },
    EffectDef {
        shader: "contrast",
        name: "Contrast",
        category: EffectCategory::Basic,
    },
    EffectDef {
        shader: "saturation",
        name: "Saturation",
        category: EffectCategory::Basic,
    },
    EffectDef {
        shader: "vibrance",
        name: "Vibrance",
        category: EffectCategory::Basic,
    },
    EffectDef {
        shader: "hue-rotate",
        name: "Hue Rotate",
        category: EffectCategory::Basic,
    },
    EffectDef {
        shader: "temperature",
        name: "Temperature",
        category: EffectCategory::Basic,
    },
    // Opacity / Visibility
    EffectDef {
        shader: "fade",
        name: "Fade",
        category: EffectCategory::Opacity,
    },
    EffectDef {
        shader: "blink",
        name: "Blink",
        category: EffectCategory::Opacity,
    },
    EffectDef {
        shader: "block-dissolve",
        name: "Block Dissolve",
        category: EffectCategory::Opacity,
    },
    EffectDef {
        shader: "feather",
        name: "Feather",
        category: EffectCategory::Opacity,
    },
    EffectDef {
        shader: "dissolve",
        name: "Dissolve",
        category: EffectCategory::Opacity,
    },
    EffectDef {
        shader: "opacity-pressure",
        name: "Opacity Pressure",
        category: EffectCategory::Opacity,
    },
    // Color
    EffectDef {
        shader: "sepia",
        name: "Sepia",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "grayscale",
        name: "Grayscale",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "invert",
        name: "Invert",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "posterize",
        name: "Posterize",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "color-wheels",
        name: "Color Wheels",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "highlights",
        name: "Highlights",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "shadows",
        name: "Shadows",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "whites",
        name: "Whites",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "blacks",
        name: "Blacks",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "dehaze",
        name: "Dehaze",
        category: EffectCategory::Color,
    },
    EffectDef {
        shader: "clarity",
        name: "Clarity",
        category: EffectCategory::Color,
    },
    // Blur
    EffectDef {
        shader: "gaussian-blur",
        name: "Gaussian Blur",
        category: EffectCategory::Blur,
    },
    EffectDef {
        shader: "motion-blur",
        name: "Motion Blur",
        category: EffectCategory::Blur,
    },
    EffectDef {
        shader: "velocity-blur",
        name: "Velocity Blur",
        category: EffectCategory::Blur,
    },
    // Distortion
    EffectDef {
        shader: "chromatic-aberration",
        name: "Chromatic Aberration",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "fisheye",
        name: "Fisheye",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "bulge",
        name: "Bulge",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "swirl",
        name: "Swirl",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "twist",
        name: "Twist",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "wave",
        name: "Wave",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "ripple",
        name: "Ripple",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "pixelate",
        name: "Pixelate",
        category: EffectCategory::Distortion,
    },
    EffectDef {
        shader: "mirror",
        name: "Mirror",
        category: EffectCategory::Distortion,
    },
    // Stylize
    EffectDef {
        shader: "glow",
        name: "Glow",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "outer-glow",
        name: "Outer Glow",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "vignette",
        name: "Vignette",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "grain",
        name: "Grain",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "scanlines",
        name: "Scanlines",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "halftone",
        name: "Halftone",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "thermal",
        name: "Thermal",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "emboss",
        name: "Emboss",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "stroke",
        name: "Stroke",
        category: EffectCategory::Stylize,
    },
    EffectDef {
        shader: "drop-shadow",
        name: "Drop Shadow",
        category: EffectCategory::Stylize,
    },
    // Edge
    EffectDef {
        shader: "sharpen",
        name: "Sharpen",
        category: EffectCategory::Edge,
    },
    EffectDef {
        shader: "edge-detect",
        name: "Edge Detect",
        category: EffectCategory::Edge,
    },
    EffectDef {
        shader: "chroma-key",
        name: "Chroma Key",
        category: EffectCategory::Edge,
    },
];

/// Builds the effects library panel.
pub fn build_effects_library(_app: &ArtidorApp, _entity: Entity<ArtidorApp>) -> impl IntoElement {
    let mut container = div().w_full().flex().flex_col().gap(theme::px_12());

    // Group effects by category.
    let categories = [
        EffectCategory::Basic,
        EffectCategory::Opacity,
        EffectCategory::Color,
        EffectCategory::Blur,
        EffectCategory::Distortion,
        EffectCategory::Stylize,
        EffectCategory::Edge,
    ];

    for category in categories {
        let effects: Vec<&EffectDef> = EFFECTS.iter().filter(|e| e.category == category).collect();
        if effects.is_empty() {
            continue;
        }

        let mut section = div().w_full().flex().flex_col().gap(theme::px_6()).child(
            div()
                .text_color(theme::TEXT_SECONDARY)
                .text_size(px(10.0))
                .font_weight(gpui::FontWeight::BOLD)
                .child(category.label().to_string()),
        );

        // Effect grid (2 columns).
        let mut grid = div()
            .w_full()
            .flex()
            .flex_row()
            .flex_wrap()
            .gap(theme::px_4());

        for effect in effects {
            grid = grid.child(effect_card(effect));
        }

        section = section.child(grid);
        container = container.child(section);
    }

    container
}

/// A single effect card.
fn effect_card(effect: &EffectDef) -> impl IntoElement {
    div()
        .w(px(126.0))
        .h(px(60.0))
        .rounded(px(4.0))
        .bg(theme::BG_PANEL_RAISED)
        .border_1()
        .border_color(theme::BORDER)
        .flex()
        .flex_col()
        .items_center()
        .justify_center()
        .p(theme::px_4())
        .hover(|s| s.border_color(theme::BORDER_FOCUS).bg(theme::BG_HOVER))
        .child(
            div()
                .text_color(theme::TEXT_PRIMARY)
                .text_size(px(11.0))
                .child(effect.name.to_string()),
        )
        .child(
            div()
                .text_color(theme::TEXT_MUTED)
                .text_size(px(9.0))
                .child(effect.shader.to_string()),
        )
}
