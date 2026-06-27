//! Effects library — lists all available WGSL shader effects from the
//! `effects` crate, organized by category.
//!
//! Each effect is displayed as a card with its name and category.
//! Mirrors `apps/desktop-web/src/ui/assets/effects.rs`.

use windows::Win32::Foundation::RECT;
use windows::Win32::Graphics::Gdi::HDC;

use crate::theme::{BG_DARK, BORDER_FAINT, TEXT_BRIGHT, TEXT_DIM, TEXT_FAINT};
use crate::ui::gfx::{border_rect, draw_text_left, fill_rect};

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
        }
    }

    fn color(&self) -> u32 {
        match self {
            Self::Basic => 0x3B5BDB,
            Self::Blur => 0x7048E8,
            Self::Distortion => 0xE64980,
            Self::Stylize => 0xF76707,
            Self::Color => 0x0CA678,
            Self::Edge => 0x1098AD,
        }
    }
}

/// All available effects, matching the shaders in `rust/crates/effects/`.
pub const EFFECTS: &[EffectDef] = &[
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
    EffectDef {
        shader: "fade",
        name: "Fade",
        category: EffectCategory::Basic,
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
        name: "Chromatic Aberr.",
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

/// Draw the effects library panel — effects grouped by category, each
/// shown as a card with name + category color tag.
pub unsafe fn draw_effects_library(hdc: HDC, panel: &RECT) {
    unsafe {
        let pad = 8;
        let card_h = 28;
        let card_gap = 4;
        let mut y = panel.top + 4;

        // Header.
        let header_rect = RECT {
            left: panel.left + pad,
            top: y,
            right: panel.right - pad,
            bottom: y + 20,
        };
        draw_text_left(hdc, "Effects Library", &header_rect, TEXT_DIM);
        y += 24;

        let categories = [
            EffectCategory::Basic,
            EffectCategory::Color,
            EffectCategory::Blur,
            EffectCategory::Distortion,
            EffectCategory::Stylize,
            EffectCategory::Edge,
        ];

        for category in categories {
            // Category header.
            if y + 16 > panel.bottom {
                break;
            }
            let cat_rect = RECT {
                left: panel.left + pad,
                top: y,
                right: panel.right - pad,
                bottom: y + 14,
            };
            draw_text_left(hdc, category.label(), &cat_rect, TEXT_FAINT);
            y += 16;

            // Effect cards in this category.
            for effect in EFFECTS.iter().filter(|e| e.category == category) {
                if y + card_h > panel.bottom {
                    break;
                }
                let card_rect = RECT {
                    left: panel.left + pad,
                    top: y,
                    right: panel.right - pad,
                    bottom: y + card_h,
                };
                fill_rect(hdc, &card_rect, BG_DARK);
                border_rect(hdc, &card_rect, BORDER_FAINT);

                // Category color tag (left strip).
                let tag_rect = RECT {
                    left: card_rect.left + 2,
                    top: card_rect.top + 2,
                    right: card_rect.left + 6,
                    bottom: card_rect.bottom - 2,
                };
                fill_rect(hdc, &tag_rect, category.color());

                // Effect name.
                let name_rect = RECT {
                    left: card_rect.left + 12,
                    top: card_rect.top,
                    right: card_rect.right - 4,
                    bottom: card_rect.bottom,
                };
                draw_text_left(hdc, effect.name, &name_rect, TEXT_BRIGHT);

                y += card_h + card_gap;
            }
            y += 4;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn effects_count_is_40_plus() {
        assert!(
            EFFECTS.len() >= 40,
            "expected 40+ effects, got {}",
            EFFECTS.len()
        );
    }

    #[test]
    fn all_categories_represented() {
        for &cat in &[
            EffectCategory::Basic,
            EffectCategory::Color,
            EffectCategory::Blur,
            EffectCategory::Distortion,
            EffectCategory::Stylize,
            EffectCategory::Edge,
        ] {
            assert!(
                EFFECTS.iter().any(|e| e.category == cat),
                "category {:?} has no effects",
                cat
            );
        }
    }

    #[test]
    fn no_duplicate_shaders() {
        let mut shaders: Vec<&str> = EFFECTS.iter().map(|e| e.shader).collect();
        shaders.sort();
        let before = shaders.len();
        shaders.dedup();
        assert_eq!(shaders.len(), before, "duplicate shader IDs found");
    }
}
