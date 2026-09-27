use std::collections::HashMap;
use std::sync::{Mutex, MutexGuard};

use bytemuck::{Pod, Zeroable};
use gpu::{FULLSCREEN_SHADER_SOURCE, GpuContext};
use thiserror::Error;

use crate::{EffectPass, UniformValue};

use target_pool::TargetPool;

const GAUSSIAN_BLUR_SHADER_ID: &str = "gaussian-blur";
const GAUSSIAN_BLUR_SHADER_SOURCE: &str = include_str!("shaders/gaussian_blur.wgsl");
const BRIGHTNESS_SHADER_ID: &str = "brightness";
const BRIGHTNESS_SHADER_SOURCE: &str = include_str!("shaders/brightness.wgsl");

const EXPOSURE_SHADER_ID: &str = "exposure";
const EXPOSURE_SHADER_SOURCE: &str = include_str!("shaders/exposure.wgsl");

const TINT_SHIFT_SHADER_ID: &str = "tint-shift";
const TINT_SHIFT_SHADER_SOURCE: &str = include_str!("shaders/tint-shift.wgsl");
const CONTRAST_SHADER_ID: &str = "contrast";
const CONTRAST_SHADER_SOURCE: &str = include_str!("shaders/contrast.wgsl");
const SATURATION_SHADER_ID: &str = "saturation";
const SATURATION_SHADER_SOURCE: &str = include_str!("shaders/saturation.wgsl");
const HUE_ROTATE_SHADER_ID: &str = "hue-rotate";
const HUE_ROTATE_SHADER_SOURCE: &str = include_str!("shaders/hue_rotate.wgsl");
const TEMPERATURE_SHADER_ID: &str = "temperature";
const TEMPERATURE_SHADER_SOURCE: &str = include_str!("shaders/temperature.wgsl");
const SEPIA_SHADER_ID: &str = "sepia";
const SEPIA_SHADER_SOURCE: &str = include_str!("shaders/sepia.wgsl");
const GRAYSCALE_SHADER_ID: &str = "grayscale";
const GRAYSCALE_SHADER_SOURCE: &str = include_str!("shaders/grayscale.wgsl");
const INVERT_SHADER_ID: &str = "invert";
const INVERT_SHADER_SOURCE: &str = include_str!("shaders/invert.wgsl");
const HIGHLIGHTS_SHADER_ID: &str = "highlights";
const HIGHLIGHTS_SHADER_SOURCE: &str = include_str!("shaders/highlights.wgsl");
const SHADOWS_SHADER_ID: &str = "shadows";
const SHADOWS_SHADER_SOURCE: &str = include_str!("shaders/shadows.wgsl");
const SHARPEN_SHADER_ID: &str = "sharpen";
const SHARPEN_SHADER_SOURCE: &str = include_str!("shaders/sharpen.wgsl");
const CHROMATIC_ABERRATION_SHADER_ID: &str = "chromatic-aberration";
const CHROMATIC_ABERRATION_SHADER_SOURCE: &str = include_str!("shaders/chromatic-aberration.wgsl");
const CHROMA_KEY_SHADER_ID: &str = "chroma-key";
const CHROMA_KEY_SHADER_SOURCE: &str = include_str!("shaders/chroma-key.wgsl");
const REMOVE_BACKGROUND_SHADER_ID: &str = "remove-background";
const REMOVE_BACKGROUND_SHADER_SOURCE: &str = include_str!("shaders/remove-background.wgsl");
const POSTERIZE_SHADER_ID: &str = "posterize";
const POSTERIZE_SHADER_SOURCE: &str = include_str!("shaders/posterize.wgsl");
const EDGE_DETECT_SHADER_ID: &str = "edge-detect";
const EDGE_DETECT_SHADER_SOURCE: &str = include_str!("shaders/edge-detect.wgsl");
const HALFTONE_SHADER_ID: &str = "halftone";
const HALFTONE_SHADER_SOURCE: &str = include_str!("shaders/halftone.wgsl");
const MIRROR_SHADER_ID: &str = "mirror";
const MIRROR_SHADER_SOURCE: &str = include_str!("shaders/mirror.wgsl");
const SWIRL_SHADER_ID: &str = "swirl";
const SWIRL_SHADER_SOURCE: &str = include_str!("shaders/swirl.wgsl");
const BULGE_SHADER_ID: &str = "bulge";
const BULGE_SHADER_SOURCE: &str = include_str!("shaders/bulge.wgsl");
const TWIST_SHADER_ID: &str = "twist";
const TWIST_SHADER_SOURCE: &str = include_str!("shaders/twist.wgsl");
const THERMAL_SHADER_ID: &str = "thermal";
const THERMAL_SHADER_SOURCE: &str = include_str!("shaders/thermal.wgsl");
const MOTION_BLUR_SHADER_ID: &str = "motion-blur";
const MOTION_BLUR_SHADER_SOURCE: &str = include_str!("shaders/motion-blur.wgsl");
const WAVE_SHADER_ID: &str = "wave";
const WAVE_SHADER_SOURCE: &str = include_str!("shaders/wave.wgsl");
const RIPPLE_SHADER_ID: &str = "ripple";
const RIPPLE_SHADER_SOURCE: &str = include_str!("shaders/ripple.wgsl");
const PIXELATE_SHADER_ID: &str = "pixelate";
const PIXELATE_SHADER_SOURCE: &str = include_str!("shaders/pixelate.wgsl");
const FISHEYE_SHADER_ID: &str = "fisheye";
const FISHEYE_SHADER_SOURCE: &str = include_str!("shaders/fisheye.wgsl");
const SCANLINES_SHADER_ID: &str = "scanlines";
const SCANLINES_SHADER_SOURCE: &str = include_str!("shaders/scanlines.wgsl");
const EMBOSS_SHADER_ID: &str = "emboss";
const EMBOSS_SHADER_SOURCE: &str = include_str!("shaders/emboss.wgsl");
const GLOW_SHADER_ID: &str = "glow";
const GLOW_SHADER_SOURCE: &str = include_str!("shaders/glow.wgsl");
const VIBRANCE_SHADER_ID: &str = "vibrance";
const VIBRANCE_SHADER_SOURCE: &str = include_str!("shaders/vibrance.wgsl");
const VIGNETTE_SHADER_ID: &str = "vignette";
const VIGNETTE_SHADER_SOURCE: &str = include_str!("shaders/vignette.wgsl");
const GRAIN_SHADER_ID: &str = "grain";
const GRAIN_SHADER_SOURCE: &str = include_str!("shaders/grain.wgsl");
const DEHAZE_SHADER_ID: &str = "dehaze";
const DEHAZE_SHADER_SOURCE: &str = include_str!("shaders/dehaze.wgsl");
const CLARITY_SHADER_ID: &str = "clarity";
const CLARITY_SHADER_SOURCE: &str = include_str!("shaders/clarity.wgsl");
const FADE_SHADER_ID: &str = "fade";
const FADE_SHADER_SOURCE: &str = include_str!("shaders/fade.wgsl");
const WHITES_SHADER_ID: &str = "whites";
const WHITES_SHADER_SOURCE: &str = include_str!("shaders/whites.wgsl");
const BLACKS_SHADER_ID: &str = "blacks";
const BLACKS_SHADER_SOURCE: &str = include_str!("shaders/blacks.wgsl");
const COLOR_WHEELS_SHADER_ID: &str = "color-wheels";
const COLOR_WHEELS_SHADER_SOURCE: &str = include_str!("shaders/color-wheels.wgsl");
const VELOCITY_BLUR_SHADER_ID: &str = "velocity-blur";
const VELOCITY_BLUR_SHADER_SOURCE: &str = include_str!("shaders/velocity-blur.wgsl");
const STROKE_SHADER_ID: &str = "stroke";
const STROKE_SHADER_SOURCE: &str = include_str!("shaders/stroke.wgsl");
const DROP_SHADOW_SHADER_ID: &str = "drop-shadow";
const DROP_SHADOW_SHADER_SOURCE: &str = include_str!("shaders/drop-shadow.wgsl");
const OUTER_GLOW_SHADER_ID: &str = "outer-glow";
const OUTER_GLOW_SHADER_SOURCE: &str = include_str!("shaders/outer-glow.wgsl");
const KALEIDOSCOPE_SHADER_ID: &str = "kaleidoscope";
const KALEIDOSCOPE_SHADER_SOURCE: &str = include_str!("shaders/kaleidoscope.wgsl");
const TILE_SHADER_ID: &str = "tile";
const TILE_SHADER_SOURCE: &str = include_str!("shaders/tile.wgsl");
const CHECKER_SHADER_ID: &str = "checker";
const CHECKER_SHADER_SOURCE: &str = include_str!("shaders/checker.wgsl");
const GRID_SHADER_ID: &str = "grid";
const GRID_SHADER_SOURCE: &str = include_str!("shaders/grid.wgsl");
const ZOOM_BLUR_SHADER_ID: &str = "zoom-blur";
const ZOOM_BLUR_SHADER_SOURCE: &str = include_str!("shaders/zoom-blur.wgsl");
const DIRECTIONAL_BLUR_SHADER_ID: &str = "directional-blur";
const DIRECTIONAL_BLUR_SHADER_SOURCE: &str = include_str!("shaders/directional-blur.wgsl");
const BOX_BLUR_SHADER_ID: &str = "box-blur";
const BOX_BLUR_SHADER_SOURCE: &str = include_str!("shaders/box-blur.wgsl");
const LENS_BLUR_SHADER_ID: &str = "lens-blur";
const LENS_BLUR_SHADER_SOURCE: &str = include_str!("shaders/lens-blur.wgsl");
const UNSHARP_MASK_SHADER_ID: &str = "unsharp-mask";
const UNSHARP_MASK_SHADER_SOURCE: &str = include_str!("shaders/unsharp-mask.wgsl");
const INNER_GLOW_SHADER_ID: &str = "inner-glow";
const INNER_GLOW_SHADER_SOURCE: &str = include_str!("shaders/inner-glow.wgsl");
const EDGE_GLOW_SHADER_ID: &str = "edge-glow";
const EDGE_GLOW_SHADER_SOURCE: &str = include_str!("shaders/edge-glow.wgsl");
const CONTOUR_LINES_SHADER_ID: &str = "contour-lines";
const CONTOUR_LINES_SHADER_SOURCE: &str = include_str!("shaders/contour-lines.wgsl");
const MATTE_EDGE_SHADER_ID: &str = "matte-edge";
const MATTE_EDGE_SHADER_SOURCE: &str = include_str!("shaders/matte-edge.wgsl");
const COLOR_BALANCE_SHADER_ID: &str = "color-balance";
const COLOR_BALANCE_SHADER_SOURCE: &str = include_str!("shaders/color-balance.wgsl");
const REPLACE_COLOR_SHADER_ID: &str = "replace-color";
const REPLACE_COLOR_SHADER_SOURCE: &str = include_str!("shaders/replace-color.wgsl");
const TINT_SHADER_ID: &str = "tint";
const TINT_SHADER_SOURCE: &str = include_str!("shaders/tint.wgsl");
const GRADIENT_OVERLAY_SHADER_ID: &str = "gradient-overlay";
const GRADIENT_OVERLAY_SHADER_SOURCE: &str = include_str!("shaders/gradient-overlay.wgsl");
const FOUR_COLOR_GRADIENT_SHADER_ID: &str = "four-color-gradient";
const FOUR_COLOR_GRADIENT_SHADER_SOURCE: &str = include_str!("shaders/four-color-gradient.wgsl");
const ROTATE_SHADER_ID: &str = "rotate";
const ROTATE_SHADER_SOURCE: &str = include_str!("shaders/rotate.wgsl");
const SCALE_SHADER_ID: &str = "scale";
const SCALE_SHADER_SOURCE: &str = include_str!("shaders/scale.wgsl");
const FLIP_HORIZONTAL_SHADER_ID: &str = "flip-horizontal";
const FLIP_HORIZONTAL_SHADER_SOURCE: &str = include_str!("shaders/flip-horizontal.wgsl");
const FLIP_VERTICAL_SHADER_ID: &str = "flip-vertical";
const FLIP_VERTICAL_SHADER_SOURCE: &str = include_str!("shaders/flip-vertical.wgsl");
const SKEW_SHADER_ID: &str = "skew";
const SKEW_SHADER_SOURCE: &str = include_str!("shaders/skew.wgsl");
const TEXT_GLOW_SHADER_ID: &str = "text-glow";
const TEXT_GLOW_SHADER_SOURCE: &str = include_str!("shaders/text-glow.wgsl");
const TEXT_STROKE_SHADER_ID: &str = "text-stroke";
const TEXT_STROKE_SHADER_SOURCE: &str = include_str!("shaders/text-stroke.wgsl");
const TEXT_SHADOW_SHADER_ID: &str = "text-shadow";
const TEXT_SHADOW_SHADER_SOURCE: &str = include_str!("shaders/text-shadow.wgsl");
const TEXT_3D_SHADER_ID: &str = "text-3d";
const TEXT_3D_SHADER_SOURCE: &str = include_str!("shaders/text-3d.wgsl");
const BLINK_SHADER_ID: &str = "blink";
const BLINK_SHADER_SOURCE: &str = include_str!("shaders/blink.wgsl");
const BLOCK_DISSOLVE_SHADER_ID: &str = "block-dissolve";
const BLOCK_DISSOLVE_SHADER_SOURCE: &str = include_str!("shaders/block-dissolve.wgsl");
const FEATHER_SHADER_ID: &str = "feather";
const FEATHER_SHADER_SOURCE: &str = include_str!("shaders/feather.wgsl");
const DISSOLVE_SHADER_ID: &str = "dissolve";
const DISSOLVE_SHADER_SOURCE: &str = include_str!("shaders/dissolve.wgsl");
const OPACITY_PRESSURE_SHADER_ID: &str = "opacity-pressure";
const OPACITY_PRESSURE_SHADER_SOURCE: &str = include_str!("shaders/opacity-pressure.wgsl");
// DonkeyCut-ported parametric effects and looks (Apache 2.0,
// github.com/DonkeyCut/Donkey — site/packages/effects-kit).
const ZOOM_PUSH_SHADER_ID: &str = "zoom-push";
const ZOOM_PUSH_SHADER_SOURCE: &str = include_str!("shaders/zoom-push.wgsl");
const SHAKE_SHADER_ID: &str = "shake";
const SHAKE_SHADER_SOURCE: &str = include_str!("shaders/shake.wgsl");
const LIGHTLEAK_SHADER_ID: &str = "lightleak";
const LIGHTLEAK_SHADER_SOURCE: &str = include_str!("shaders/lightleak.wgsl");
const FLASH_SHADER_ID: &str = "flash";
const FLASH_SHADER_SOURCE: &str = include_str!("shaders/flash.wgsl");
const CHROMA_GLITCH_SHADER_ID: &str = "chroma-glitch";
const CHROMA_GLITCH_SHADER_SOURCE: &str = include_str!("shaders/chroma-glitch.wgsl");
const LOOK_VINTAGE_SHADER_ID: &str = "look-vintage";
const LOOK_VINTAGE_SHADER_SOURCE: &str = include_str!("shaders/look-vintage.wgsl");
const LOOK_HORROR_SHADER_ID: &str = "look-horror";
const LOOK_HORROR_SHADER_SOURCE: &str = include_str!("shaders/look-horror.wgsl");
const LOOK_HALATION_SHADER_ID: &str = "look-halation";
const LOOK_HALATION_SHADER_SOURCE: &str = include_str!("shaders/look-halation.wgsl");
const LOOK_TECH_SHADER_ID: &str = "look-tech";
const LOOK_TECH_SHADER_SOURCE: &str = include_str!("shaders/look-tech.wgsl");
const LOOK_NOIR_SHADER_ID: &str = "look-noir";
const LOOK_NOIR_SHADER_SOURCE: &str = include_str!("shaders/look-noir.wgsl");
const LOOK_PASTEL_SHADER_ID: &str = "look-pastel";
const LOOK_PASTEL_SHADER_SOURCE: &str = include_str!("shaders/look-pastel.wgsl");
const LOOK_BLOCKBUSTER_SHADER_ID: &str = "look-blockbuster";
const LOOK_BLOCKBUSTER_SHADER_SOURCE: &str = include_str!("shaders/look-blockbuster.wgsl");
const LOOK_DREAMY_SHADER_ID: &str = "look-dreamy";
const LOOK_DREAMY_SHADER_SOURCE: &str = include_str!("shaders/look-dreamy.wgsl");

struct ShaderEntry {
    id: &'static str,
    label: &'static str,
    source: &'static str,
}

const SHADER_REGISTRY: &[ShaderEntry] = &[
    ShaderEntry {
        id: GAUSSIAN_BLUR_SHADER_ID,
        label: "effects-gaussian-blur-shader",
        source: GAUSSIAN_BLUR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: BRIGHTNESS_SHADER_ID,
        label: "effects-brightness-shader",
        source: BRIGHTNESS_SHADER_SOURCE,
    },
    ShaderEntry {
        id: EXPOSURE_SHADER_ID,
        label: "effects-exposure-shader",
        source: EXPOSURE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TINT_SHIFT_SHADER_ID,
        label: "effects-tint-shift-shader",
        source: TINT_SHIFT_SHADER_SOURCE,
    },
    ShaderEntry {
        id: CONTRAST_SHADER_ID,
        label: "effects-contrast-shader",
        source: CONTRAST_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SATURATION_SHADER_ID,
        label: "effects-saturation-shader",
        source: SATURATION_SHADER_SOURCE,
    },
    ShaderEntry {
        id: HUE_ROTATE_SHADER_ID,
        label: "effects-hue-rotate-shader",
        source: HUE_ROTATE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TEMPERATURE_SHADER_ID,
        label: "effects-temperature-shader",
        source: TEMPERATURE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SEPIA_SHADER_ID,
        label: "effects-sepia-shader",
        source: SEPIA_SHADER_SOURCE,
    },
    ShaderEntry {
        id: GRAYSCALE_SHADER_ID,
        label: "effects-grayscale-shader",
        source: GRAYSCALE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: INVERT_SHADER_ID,
        label: "effects-invert-shader",
        source: INVERT_SHADER_SOURCE,
    },
    ShaderEntry {
        id: HIGHLIGHTS_SHADER_ID,
        label: "effects-highlights-shader",
        source: HIGHLIGHTS_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SHADOWS_SHADER_ID,
        label: "effects-shadows-shader",
        source: SHADOWS_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SHARPEN_SHADER_ID,
        label: "effects-sharpen-shader",
        source: SHARPEN_SHADER_SOURCE,
    },
    ShaderEntry {
        id: CHROMATIC_ABERRATION_SHADER_ID,
        label: "effects-chromatic-aberration-shader",
        source: CHROMATIC_ABERRATION_SHADER_SOURCE,
    },
    ShaderEntry {
        id: CHROMA_KEY_SHADER_ID,
        label: "effects-chroma-key-shader",
        source: CHROMA_KEY_SHADER_SOURCE,
    },
    ShaderEntry {
        id: REMOVE_BACKGROUND_SHADER_ID,
        label: "effects-remove-background-shader",
        source: REMOVE_BACKGROUND_SHADER_SOURCE,
    },
    ShaderEntry {
        id: POSTERIZE_SHADER_ID,
        label: "effects-posterize-shader",
        source: POSTERIZE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: EDGE_DETECT_SHADER_ID,
        label: "effects-edge-detect-shader",
        source: EDGE_DETECT_SHADER_SOURCE,
    },
    ShaderEntry {
        id: HALFTONE_SHADER_ID,
        label: "effects-halftone-shader",
        source: HALFTONE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: MIRROR_SHADER_ID,
        label: "effects-mirror-shader",
        source: MIRROR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SWIRL_SHADER_ID,
        label: "effects-swirl-shader",
        source: SWIRL_SHADER_SOURCE,
    },
    ShaderEntry {
        id: BULGE_SHADER_ID,
        label: "effects-bulge-shader",
        source: BULGE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TWIST_SHADER_ID,
        label: "effects-twist-shader",
        source: TWIST_SHADER_SOURCE,
    },
    ShaderEntry {
        id: THERMAL_SHADER_ID,
        label: "effects-thermal-shader",
        source: THERMAL_SHADER_SOURCE,
    },
    ShaderEntry {
        id: MOTION_BLUR_SHADER_ID,
        label: "effects-motion-blur-shader",
        source: MOTION_BLUR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: WAVE_SHADER_ID,
        label: "effects-wave-shader",
        source: WAVE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: RIPPLE_SHADER_ID,
        label: "effects-ripple-shader",
        source: RIPPLE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: PIXELATE_SHADER_ID,
        label: "effects-pixelate-shader",
        source: PIXELATE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: FISHEYE_SHADER_ID,
        label: "effects-fisheye-shader",
        source: FISHEYE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SCANLINES_SHADER_ID,
        label: "effects-scanlines-shader",
        source: SCANLINES_SHADER_SOURCE,
    },
    ShaderEntry {
        id: EMBOSS_SHADER_ID,
        label: "effects-emboss-shader",
        source: EMBOSS_SHADER_SOURCE,
    },
    ShaderEntry {
        id: GLOW_SHADER_ID,
        label: "effects-glow-shader",
        source: GLOW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: VIBRANCE_SHADER_ID,
        label: "effects-vibrance-shader",
        source: VIBRANCE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: VIGNETTE_SHADER_ID,
        label: "effects-vignette-shader",
        source: VIGNETTE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: GRAIN_SHADER_ID,
        label: "effects-grain-shader",
        source: GRAIN_SHADER_SOURCE,
    },
    ShaderEntry {
        id: DEHAZE_SHADER_ID,
        label: "effects-dehaze-shader",
        source: DEHAZE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: CLARITY_SHADER_ID,
        label: "effects-clarity-shader",
        source: CLARITY_SHADER_SOURCE,
    },
    ShaderEntry {
        id: FADE_SHADER_ID,
        label: "effects-fade-shader",
        source: FADE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: WHITES_SHADER_ID,
        label: "effects-whites-shader",
        source: WHITES_SHADER_SOURCE,
    },
    ShaderEntry {
        id: BLACKS_SHADER_ID,
        label: "effects-blacks-shader",
        source: BLACKS_SHADER_SOURCE,
    },
    ShaderEntry {
        id: COLOR_WHEELS_SHADER_ID,
        label: "effects-color-wheels-shader",
        source: COLOR_WHEELS_SHADER_SOURCE,
    },
    ShaderEntry {
        id: VELOCITY_BLUR_SHADER_ID,
        label: "effects-velocity-blur-shader",
        source: VELOCITY_BLUR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: STROKE_SHADER_ID,
        label: "effects-stroke-shader",
        source: STROKE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: DROP_SHADOW_SHADER_ID,
        label: "effects-drop-shadow-shader",
        source: DROP_SHADOW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: OUTER_GLOW_SHADER_ID,
        label: "effects-outer-glow-shader",
        source: OUTER_GLOW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: KALEIDOSCOPE_SHADER_ID,
        label: "effects-kaleidoscope-shader",
        source: KALEIDOSCOPE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TILE_SHADER_ID,
        label: "effects-tile-shader",
        source: TILE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: CHECKER_SHADER_ID,
        label: "effects-checker-shader",
        source: CHECKER_SHADER_SOURCE,
    },
    ShaderEntry {
        id: GRID_SHADER_ID,
        label: "effects-grid-shader",
        source: GRID_SHADER_SOURCE,
    },
    ShaderEntry {
        id: ZOOM_BLUR_SHADER_ID,
        label: "effects-zoom-blur-shader",
        source: ZOOM_BLUR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: DIRECTIONAL_BLUR_SHADER_ID,
        label: "effects-directional-blur-shader",
        source: DIRECTIONAL_BLUR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: BOX_BLUR_SHADER_ID,
        label: "effects-box-blur-shader",
        source: BOX_BLUR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LENS_BLUR_SHADER_ID,
        label: "effects-lens-blur-shader",
        source: LENS_BLUR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: UNSHARP_MASK_SHADER_ID,
        label: "effects-unsharp-mask-shader",
        source: UNSHARP_MASK_SHADER_SOURCE,
    },
    ShaderEntry {
        id: INNER_GLOW_SHADER_ID,
        label: "effects-inner-glow-shader",
        source: INNER_GLOW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: EDGE_GLOW_SHADER_ID,
        label: "effects-edge-glow-shader",
        source: EDGE_GLOW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: CONTOUR_LINES_SHADER_ID,
        label: "effects-contour-lines-shader",
        source: CONTOUR_LINES_SHADER_SOURCE,
    },
    ShaderEntry {
        id: MATTE_EDGE_SHADER_ID,
        label: "effects-matte-edge-shader",
        source: MATTE_EDGE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: COLOR_BALANCE_SHADER_ID,
        label: "effects-color-balance-shader",
        source: COLOR_BALANCE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: REPLACE_COLOR_SHADER_ID,
        label: "effects-replace-color-shader",
        source: REPLACE_COLOR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TINT_SHADER_ID,
        label: "effects-tint-shader",
        source: TINT_SHADER_SOURCE,
    },
    ShaderEntry {
        id: GRADIENT_OVERLAY_SHADER_ID,
        label: "effects-gradient-overlay-shader",
        source: GRADIENT_OVERLAY_SHADER_SOURCE,
    },
    ShaderEntry {
        id: FOUR_COLOR_GRADIENT_SHADER_ID,
        label: "effects-four-color-gradient-shader",
        source: FOUR_COLOR_GRADIENT_SHADER_SOURCE,
    },
    ShaderEntry {
        id: ROTATE_SHADER_ID,
        label: "effects-rotate-shader",
        source: ROTATE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SCALE_SHADER_ID,
        label: "effects-scale-shader",
        source: SCALE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: FLIP_HORIZONTAL_SHADER_ID,
        label: "effects-flip-horizontal-shader",
        source: FLIP_HORIZONTAL_SHADER_SOURCE,
    },
    ShaderEntry {
        id: FLIP_VERTICAL_SHADER_ID,
        label: "effects-flip-vertical-shader",
        source: FLIP_VERTICAL_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SKEW_SHADER_ID,
        label: "effects-skew-shader",
        source: SKEW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TEXT_GLOW_SHADER_ID,
        label: "effects-text-glow-shader",
        source: TEXT_GLOW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TEXT_STROKE_SHADER_ID,
        label: "effects-text-stroke-shader",
        source: TEXT_STROKE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TEXT_SHADOW_SHADER_ID,
        label: "effects-text-shadow-shader",
        source: TEXT_SHADOW_SHADER_SOURCE,
    },
    ShaderEntry {
        id: TEXT_3D_SHADER_ID,
        label: "effects-text-3d-shader",
        source: TEXT_3D_SHADER_SOURCE,
    },
    ShaderEntry {
        id: BLINK_SHADER_ID,
        label: "effects-blink-shader",
        source: BLINK_SHADER_SOURCE,
    },
    ShaderEntry {
        id: BLOCK_DISSOLVE_SHADER_ID,
        label: "effects-block-dissolve-shader",
        source: BLOCK_DISSOLVE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: FEATHER_SHADER_ID,
        label: "effects-feather-shader",
        source: FEATHER_SHADER_SOURCE,
    },
    ShaderEntry {
        id: DISSOLVE_SHADER_ID,
        label: "effects-dissolve-shader",
        source: DISSOLVE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: OPACITY_PRESSURE_SHADER_ID,
        label: "effects-opacity-pressure-shader",
        source: OPACITY_PRESSURE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: ZOOM_PUSH_SHADER_ID,
        label: "effects-zoom-push-shader",
        source: ZOOM_PUSH_SHADER_SOURCE,
    },
    ShaderEntry {
        id: SHAKE_SHADER_ID,
        label: "effects-shake-shader",
        source: SHAKE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LIGHTLEAK_SHADER_ID,
        label: "effects-lightleak-shader",
        source: LIGHTLEAK_SHADER_SOURCE,
    },
    ShaderEntry {
        id: FLASH_SHADER_ID,
        label: "effects-flash-shader",
        source: FLASH_SHADER_SOURCE,
    },
    ShaderEntry {
        id: CHROMA_GLITCH_SHADER_ID,
        label: "effects-chroma-glitch-shader",
        source: CHROMA_GLITCH_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_VINTAGE_SHADER_ID,
        label: "effects-look-vintage-shader",
        source: LOOK_VINTAGE_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_HORROR_SHADER_ID,
        label: "effects-look-horror-shader",
        source: LOOK_HORROR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_HALATION_SHADER_ID,
        label: "effects-look-halation-shader",
        source: LOOK_HALATION_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_TECH_SHADER_ID,
        label: "effects-look-tech-shader",
        source: LOOK_TECH_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_NOIR_SHADER_ID,
        label: "effects-look-noir-shader",
        source: LOOK_NOIR_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_PASTEL_SHADER_ID,
        label: "effects-look-pastel-shader",
        source: LOOK_PASTEL_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_BLOCKBUSTER_SHADER_ID,
        label: "effects-look-blockbuster-shader",
        source: LOOK_BLOCKBUSTER_SHADER_SOURCE,
    },
    ShaderEntry {
        id: LOOK_DREAMY_SHADER_ID,
        label: "effects-look-dreamy-shader",
        source: LOOK_DREAMY_SHADER_SOURCE,
    },
];
pub struct ApplyEffectsOptions<'a> {
    pub source: &'a wgpu::Texture,
    pub width: u32,
    pub height: u32,
    pub passes: &'a [EffectPass],
}

pub struct EffectPipeline {
    uniform_bind_group_layout: wgpu::BindGroupLayout,
    pipeline_layout: wgpu::PipelineLayout,
    vertex_shader_module: wgpu::ShaderModule,
    /// Render pipelines built on first use, keyed by shader id.
    ///
    /// Behind a [`Mutex`] rather than a plain field so `apply` and
    /// `apply_with_encoder` can stay `&self`: the `applyEffectPasses` wasm
    /// export reads this pipeline out of a thread-local `RefCell<GpuRuntime>`
    /// behind a shared borrow, and taking `&mut self` would force that whole
    /// runtime behind a `RefCell` for the per-frame render path too. The lock
    /// is held only for a hash lookup and a `RenderPipeline` clone (a refcount
    /// bump), never across GPU work.
    pipelines: Mutex<HashMap<&'static str, wgpu::RenderPipeline>>,
    /// Free list backing the standalone [`EffectPipeline::apply`] entry point.
    ///
    /// The frame path ([`EffectPipeline::apply_with_encoder`]) is handed the
    /// compositor's own pool instead, so this one is only used by callers that
    /// have no pool to borrow — today that is the `applyEffectPasses`
    /// effect-preview export, which runs on every preview update.
    targets: Mutex<TargetPool<wgpu::Texture>>,
    /// Reusable per-pass uniform buffers, written with `Queue::write_buffer`
    /// instead of being reallocated (as a mapped buffer) per pass.
    ///
    /// Behind a [`Mutex`] for the same reason as `pipelines`: `apply` and
    /// `apply_with_encoder` are `&self` because the wasm export reads this
    /// pipeline out of a shared `RefCell` borrow.
    uniforms: Mutex<gpu::UniformBufferPool<wgpu::Buffer>>,
}

#[derive(Debug, Error)]
pub enum EffectsError {
    #[error("At least one effect pass is required")]
    MissingEffectPasses,
    #[error("Unknown effect shader '{shader}'")]
    UnknownEffectShader { shader: String },
    #[error("Missing uniform '{uniform}' for shader '{shader}'")]
    MissingUniform { shader: String, uniform: String },
    #[error("Uniform '{uniform}' for shader '{shader}' must be a number")]
    InvalidNumberUniform { shader: String, uniform: String },
    #[error(
        "Uniform '{uniform}' for shader '{shader}' must be a vector of length {expected_length}"
    )]
    InvalidVectorUniform {
        shader: String,
        uniform: String,
        expected_length: usize,
    },
    #[error("Shader '{shader}' does not support uniform '{uniform}'")]
    UnsupportedUniform { shader: String, uniform: String },
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct EffectUniformBuffer {
    resolution: [f32; 2],
    direction: [f32; 2],
    scalars: [f32; 4],
}

impl EffectPipeline {
    /// Creates the shared bind group layout, pipeline layout and vertex stage.
    ///
    /// The 89 registered effect pipelines are deliberately **not** built here.
    /// `EffectPipeline::new` runs inside `initializeGpu` and again inside
    /// `initCompositor`, both of which complete before the first `render()`,
    /// so building them eagerly meant ~178 shader modules compiled
    /// synchronously on the main thread before any frame appeared. Each is now
    /// built on first use by [`EffectPipeline::pipeline_for`].
    ///
    /// Tradeoff: the frame that first uses a given effect shader pays for that
    /// one shader instead of the whole registry paying up front. That is a
    /// better place for the cost, not merely a different one. wgpu 29 has no
    /// `create_render_pipeline_sync` — `create_render_pipeline` returns
    /// immediately and defers compilation until an encoder that uses the
    /// pipeline is submitted — and the pass loop resolves the pipeline *before*
    /// recording the pass into the current frame's encoder. So a pipeline
    /// needed by the current frame is always created before that frame is
    /// submitted, and a project that uses three effects now compiles three
    /// shaders rather than 89.
    pub fn new(context: &GpuContext) -> Self {
        let uniform_bind_group_layout =
            context
                .device()
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("effects-uniform-bind-group-layout"),
                    entries: &[wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    }],
                });
        let vertex_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-fullscreen-shader"),
                    source: wgpu::ShaderSource::Wgsl(FULLSCREEN_SHADER_SOURCE.into()),
                });
        let pipeline_layout =
            context
                .device()
                .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                    label: Some("effects-pipeline-layout"),
                    bind_group_layouts: &[
                        Some(context.texture_sampler_bind_group_layout()),
                        Some(&uniform_bind_group_layout),
                    ],
                    immediate_size: 0,
                });

        Self {
            uniform_bind_group_layout,
            pipeline_layout,
            vertex_shader_module,
            pipelines: Mutex::new(HashMap::new()),
            targets: Mutex::new(TargetPool::default()),
            uniforms: Mutex::new(gpu::UniformBufferPool::default()),
        }
    }

    /// Compiles one registered shader into a render pipeline.
    ///
    /// Split out of [`EffectPipeline::new`] so it can run lazily from
    /// [`EffectPipeline::pipeline_for`] against the stored pipeline layout and
    /// vertex stage.
    fn build_pipeline(
        &self,
        context: &GpuContext,
        entry: &ShaderEntry,
        module: &wgpu::ShaderModule,
    ) -> wgpu::RenderPipeline {
        let pipeline_label = format!("effects-{}-pipeline", entry.id);
        context
            .device()
            .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some(&pipeline_label),
                layout: Some(&self.pipeline_layout),
                vertex: wgpu::VertexState {
                    module: &self.vertex_shader_module,
                    entry_point: Some("vertex_main"),
                    buffers: &[wgpu::VertexBufferLayout {
                        array_stride: std::mem::size_of::<[f32; 2]>() as u64,
                        step_mode: wgpu::VertexStepMode::Vertex,
                        attributes: &[wgpu::VertexAttribute {
                            format: wgpu::VertexFormat::Float32x2,
                            offset: 0,
                            shader_location: 0,
                        }],
                    }],
                    compilation_options: wgpu::PipelineCompilationOptions::default(),
                },
                fragment: Some(wgpu::FragmentState {
                    module,
                    entry_point: Some("fragment_main"),
                    targets: &[Some(wgpu::ColorTargetState {
                        format: context.texture_format(),
                        blend: None,
                        write_mask: wgpu::ColorWrites::ALL,
                    })],
                    compilation_options: wgpu::PipelineCompilationOptions::default(),
                }),
                primitive: wgpu::PrimitiveState::default(),
                depth_stencil: None,
                multisample: wgpu::MultisampleState::default(),
                multiview_mask: None,
                cache: None,
            })
    }

    /// Returns the pipeline for `shader`, compiling it on first use.
    ///
    /// Called from inside the pass loop, so a pipeline the current frame needs
    /// is always built before that frame's encoder is submitted.
    fn pipeline_for(
        &self,
        context: &GpuContext,
        shader: &str,
    ) -> Result<wgpu::RenderPipeline, EffectsError> {
        let mut pipelines = lock(&self.pipelines);
        if let Some(pipeline) = pipelines.get(shader) {
            return Ok(pipeline.clone());
        }

        // An unregistered id is the same error the eager `pipelines.get` used
        // to report, so callers see no behavioural change.
        let entry = SHADER_REGISTRY
            .iter()
            .find(|entry| entry.id == shader)
            .ok_or_else(|| EffectsError::UnknownEffectShader {
                shader: shader.to_string(),
            })?;
        let module = context
            .device()
            .create_shader_module(wgpu::ShaderModuleDescriptor {
                label: Some(entry.label),
                source: wgpu::ShaderSource::Wgsl(entry.source.into()),
            });
        let pipeline = self.build_pipeline(context, entry, &module);
        pipelines.insert(entry.id, pipeline.clone());
        Ok(pipeline)
    }

    /// Applies `passes` to `source` and submits the work immediately.
    ///
    /// The pass targets come from this pipeline's own free list, because this
    /// entry point has no caller-owned pool to borrow.
    pub fn apply(
        &self,
        context: &GpuContext,
        ApplyEffectsOptions {
            source,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        // This path submits its own encoder below, so for it a call IS the
        // frame boundary: everything the previous call borrowed was submitted
        // long before this line runs.
        self.recycle_frame();
        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("effects-command-encoder"),
                });
        // Holds the pool lock for the whole chain. The pass loop only ever locks
        // `self.pipelines` as well, and this is not re-entrant, so the two locks
        // can never deadlock.
        let mut targets = lock(&self.targets);
        let output = self.apply_with_encoder(
            context,
            &mut encoder,
            ApplyEffectsOptions {
                source,
                width,
                height,
                passes,
            },
            &mut |previous, context, width, height| targets.swap(previous, context, width, height),
        )?;
        context.queue().submit([encoder.finish()]);
        Ok(output)
    }

    /// Returns every uniform buffer the previous frame borrowed to the free
    /// list.
    ///
    /// The frame path records several effect chains into one encoder that the
    /// compositor submits once at the end of the frame, so this pool may only
    /// be recycled at the frame boundary. Recycling between acquires of the
    /// same frame hands a buffer a recorded draw still reads back out, and the
    /// later `Queue::write_buffer` (staged before the encoder is submitted)
    /// would clobber the earlier draw's uniforms — every JFA step and every
    /// pass after the first would render with the last pass's values. The
    /// compositor calls this next to its own frame-boundary recycles;
    /// [`EffectPipeline::apply`] recycles itself because it submits its own
    /// encoder.
    pub fn recycle_frame(&self) {
        lock(&self.uniforms).recycle_frame();
    }

    /// Records one render pass per effect into `encoder` and returns the final
    /// destination texture.
    ///
    /// `next_target` supplies the destination for each pass. It is a parameter
    /// rather than a field because the frame path wants effects to share the
    /// compositor's `TexturePool` — one free list for the whole frame, so a
    /// 16-pass gaussian blur on a layer costs one allocation instead of 16 —
    /// and this crate cannot name that type. `apply` supplies an equivalent
    /// free list of its own.
    ///
    /// `next_target` is called once per pass as
    /// `next_target(previous, context, width, height)`, where `previous` is the
    /// texture that pass will sample, or `None` for the first pass (whose
    /// source belongs to the caller and is never released). Implementations
    /// **must** acquire the destination before releasing `previous`: releasing
    /// first would let a pool holding a single texture hand the same allocation
    /// back as both the sampled texture and the render target of a single pass,
    /// which is undefined and surfaces as silent visual corruption rather than
    /// an error. Acquiring first is still enough, because the pass is recorded
    /// into `encoder` before any later pass that reuses the allocation and
    /// command buffers execute in submission order.
    ///
    /// The returned texture is not released; the caller owns it and is
    /// responsible for recycling it.
    pub fn apply_with_encoder(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        ApplyEffectsOptions {
            source,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
        next_target: &mut dyn FnMut(Option<wgpu::Texture>, &GpuContext, u32, u32) -> wgpu::Texture,
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut current_texture: Option<wgpu::Texture> = None;

        for pass in passes {
            // Uniform packing runs before the pipeline lookup so a pass with
            // bad uniforms still reports the uniform error, matching the order
            // this loop has always used.
            let uniforms_data = pack_effect_uniforms(pass, width, height)?;
            let pipeline = self.pipeline_for(context, &pass.shader)?;

            let previous = current_texture.take();
            // The view is built before `previous` is handed to `next_target`
            // (which may release the texture), so nothing keeps the texture
            // borrowed across the hand-off.
            let input_view = previous
                .as_ref()
                .unwrap_or(source)
                .create_view(&wgpu::TextureViewDescriptor::default());
            let output_texture = next_target(previous, context, width, height);
            let output_view = output_texture.create_view(&wgpu::TextureViewDescriptor::default());
            let texture_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-texture-bind-group"),
                        layout: context.texture_sampler_bind_group_layout(),
                        entries: &[
                            wgpu::BindGroupEntry {
                                binding: 0,
                                resource: wgpu::BindingResource::TextureView(&input_view),
                            },
                            wgpu::BindGroupEntry {
                                binding: 1,
                                resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                            },
                        ],
                    });
            let uniform_buffer = {
                let mut uniforms = lock(&self.uniforms);
                // No recycle here: within a frame every acquire must resolve
                // to a distinct buffer (see `recycle_frame`).
                uniforms.acquire_uniform(
                    context,
                    core::mem::size_of::<EffectUniformBuffer>() as u64,
                    "effects-uniform-buffer",
                    bytemuck::bytes_of(&uniforms_data),
                )
            };
            let uniform_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-uniform-bind-group"),
                        layout: &self.uniform_bind_group_layout,
                        entries: &[wgpu::BindGroupEntry {
                            binding: 0,
                            resource: uniform_buffer.as_entire_binding(),
                        }],
                    });
            {
                let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("effects-render-pass"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view: &output_view,
                        resolve_target: None,
                        depth_slice: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: None,
                    occlusion_query_set: None,
                    timestamp_writes: None,
                    multiview_mask: None,
                });
                render_pass.set_pipeline(&pipeline);
                render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
                render_pass.set_bind_group(0, &texture_bind_group, &[]);
                render_pass.set_bind_group(1, &uniform_bind_group, &[]);
                render_pass.draw(0..6, 0..1);
            }

            current_texture = Some(output_texture);
        }

        current_texture.ok_or(EffectsError::MissingEffectPasses)
    }
}

/// Locks one of [`EffectPipeline`]'s caches, recovering from poisoning instead
/// of panicking a second time.
///
/// The caches only ever hold wgpu handles and hash-map entries, so a poison flag
/// carries no correctness meaning here. Re-panicking while unwinding would turn
/// a recoverable first-paint hiccup into a hard crash in the middle of a frame.
fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

/// Free list of full-frame render targets for the effect pass loop.
///
/// Generic over the pooled type so the retention policy can be unit-tested
/// without a live GPU device — the same approach, and the same accounting, as
/// `compositor::texture_pool`.
///
/// Two deliberate differences from the compositor's pool:
///
/// * There is no `recycle_frame`. Every target this pool hands out is either
///   released explicitly by the pass loop or escapes to the caller as the final
///   output, so nothing needs sweeping at a frame boundary; an `in_use` log
///   would only grow forever.
/// * The cap is 2, not 8. A pass chain is strictly linear, so at most two
///   targets are ever live: the one the current pass samples and the one it
///   just acquired. Each is released as soon as the next is acquired, so the
///   free list settles at two retained targets per size no matter how long the
///   chain is.
mod target_pool {
    use std::collections::HashMap;

    use gpu::GpuContext;

    /// Upper bound on free targets retained per size. Two is exactly enough for
    /// a linear pass chain (see the module docs).
    pub(super) const MAX_RETAINED_PER_SIZE: usize = 2;

    /// A pool of reusable render targets, keyed by pixel dimensions.
    pub(super) struct TargetPool<T> {
        available: HashMap<(u32, u32), Vec<T>>,
    }

    impl<T> Default for TargetPool<T> {
        fn default() -> Self {
            Self {
                available: HashMap::new(),
            }
        }
    }

    impl<T> TargetPool<T> {
        /// Takes a pooled target, calling `create` only when the free list for
        /// this size is empty.
        pub(super) fn acquire(&mut self, width: u32, height: u32, create: impl FnOnce() -> T) -> T {
            self.available
                .get_mut(&(width, height))
                .and_then(Vec::pop)
                .unwrap_or_else(create)
        }

        /// Returns a target to the free list immediately, dropping it once the
        /// per-size cap is reached.
        pub(super) fn release(&mut self, width: u32, height: u32, target: T) {
            let slot = self.available.entry((width, height)).or_default();
            if slot.len() < MAX_RETAINED_PER_SIZE {
                slot.push(target);
            }
            // Otherwise the value is dropped here, freeing its allocation.
        }
    }

    /// Read-only view of the free list, for the retention tests below.
    #[cfg(test)]
    impl<T> TargetPool<T> {
        pub(super) fn retained(&self) -> usize {
            self.available.values().map(Vec::len).sum()
        }

        pub(super) fn retained_at(&self, width: u32, height: u32) -> usize {
            self.available.get(&(width, height)).map_or(0, Vec::len)
        }
    }

    impl TargetPool<wgpu::Texture> {
        /// Acquires the destination for one effect pass and then releases the
        /// texture that pass samples.
        ///
        /// The order is the whole point and must not be swapped: acquiring
        /// first is what stops a pool with a single entry from handing the
        /// same allocation back as both the sampled texture and the render
        /// target of one pass.
        pub(super) fn swap(
            &mut self,
            previous: Option<wgpu::Texture>,
            context: &GpuContext,
            width: u32,
            height: u32,
        ) -> wgpu::Texture {
            let next = self.acquire(width, height, || {
                context.create_render_texture(width, height, "effects-pass-output")
            });
            if let Some(previous) = previous {
                self.release(width, height, previous);
            }
            next
        }
    }
}

fn pack_effect_uniforms(
    pass: &EffectPass,
    width: u32,
    height: u32,
) -> Result<EffectUniformBuffer, EffectsError> {
    let shader = pass.shader.as_str();
    let mut direction = [0.0, 0.0];
    let mut scalars = [0.0; 4];

    match shader {
        GAUSSIAN_BLUR_SHADER_ID => {
            let sigma = read_number_uniform(pass, "u_sigma")?;
            let step = read_number_uniform(pass, "u_step")?;
            direction = read_vec2_uniform(pass, "u_direction")?;
            scalars[0] = sigma;
            scalars[1] = step;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_sigma" || uniform == "u_step" || uniform == "u_direction" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        BRIGHTNESS_SHADER_ID
        | EXPOSURE_SHADER_ID
        | TINT_SHIFT_SHADER_ID
        | CONTRAST_SHADER_ID
        | SATURATION_SHADER_ID
        | HUE_ROTATE_SHADER_ID
        | TEMPERATURE_SHADER_ID
        | SEPIA_SHADER_ID
        | GRAYSCALE_SHADER_ID
        | INVERT_SHADER_ID
        | HIGHLIGHTS_SHADER_ID
        | SHADOWS_SHADER_ID
        | SHARPEN_SHADER_ID
        | VIBRANCE_SHADER_ID
        | VIGNETTE_SHADER_ID
        | GRAIN_SHADER_ID
        | DEHAZE_SHADER_ID
        | CLARITY_SHADER_ID
        | FADE_SHADER_ID
        | WHITES_SHADER_ID
        | BLACKS_SHADER_ID
        | FEATHER_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        CHROMATIC_ABERRATION_SHADER_ID
        | RIPPLE_SHADER_ID
        | GLOW_SHADER_ID
        | EMBOSS_SHADER_ID
        | POSTERIZE_SHADER_ID
        | EDGE_DETECT_SHADER_ID
        | HALFTONE_SHADER_ID
        | MIRROR_SHADER_ID
        | SWIRL_SHADER_ID
        | BULGE_SHADER_ID
        | TWIST_SHADER_ID
        | THERMAL_SHADER_ID
        | KALEIDOSCOPE_SHADER_ID
        | CHECKER_SHADER_ID
        | GRID_SHADER_ID
        | ZOOM_BLUR_SHADER_ID
        | BOX_BLUR_SHADER_ID
        | LENS_BLUR_SHADER_ID
        | CONTOUR_LINES_SHADER_ID
        | MATTE_EDGE_SHADER_ID
        | COLOR_BALANCE_SHADER_ID
        | REPLACE_COLOR_SHADER_ID
        | TINT_SHADER_ID
        | GRADIENT_OVERLAY_SHADER_ID
        | FOUR_COLOR_GRADIENT_SHADER_ID
        | ROTATE_SHADER_ID
        | SCALE_SHADER_ID
        | FLIP_HORIZONTAL_SHADER_ID
        | FLIP_VERTICAL_SHADER_ID
        | TEXT_3D_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        TILE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let shift = read_number_uniform(pass, "u_shift")?;
            let single_line = read_number_uniform(pass, "u_single_line")?;
            let orientation = read_number_uniform(pass, "u_orientation")?;
            scalars[0] = amount;
            scalars[1] = shift;
            scalars[2] = single_line;
            scalars[3] = orientation;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount"
                    || uniform == "u_shift"
                    || uniform == "u_single_line"
                    || uniform == "u_orientation"
                {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        MOTION_BLUR_SHADER_ID | DIRECTIONAL_BLUR_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            direction = read_vec2_uniform(pass, "u_direction")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_direction" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        CHROMA_KEY_SHADER_ID => {
            // Key colour RGB is split across the two free vec slots: R/G in
            // `direction`, B in scalars[0]. The keying knobs fill the rest.
            let key_color = read_vec3_uniform(pass, "u_key_color")?;
            let similarity = read_number_uniform(pass, "u_similarity")?;
            let smoothness = read_number_uniform(pass, "u_smoothness")?;
            let spill = read_number_uniform(pass, "u_spill")?;
            direction = [key_color[0], key_color[1]];
            scalars[0] = key_color[2];
            scalars[1] = similarity;
            scalars[2] = smoothness;
            scalars[3] = spill;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_key_color"
                    || uniform == "u_similarity"
                    || uniform == "u_smoothness"
                    || uniform == "u_spill"
                {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        REMOVE_BACKGROUND_SHADER_ID => {
            // Auto-keyer: the key colour is sampled from border texels
            // inside the shader, so only the three knobs are passed in.
            // scalars.x = tolerance, scalars.y = smoothness, scalars.z = spill.
            let tolerance = read_number_uniform(pass, "u_tolerance")?;
            let smoothness = read_number_uniform(pass, "u_smoothness")?;
            let spill = read_number_uniform(pass, "u_spill")?;
            scalars[0] = tolerance;
            scalars[1] = smoothness;
            scalars[2] = spill;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_tolerance" || uniform == "u_smoothness" || uniform == "u_spill" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        WAVE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        PIXELATE_SHADER_ID | SCANLINES_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        FISHEYE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        VELOCITY_BLUR_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            direction = read_vec2_uniform(pass, "u_direction")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_direction" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        STROKE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let thickness = read_number_uniform(pass, "u_thickness")?;
            scalars[0] = amount;
            scalars[1] = thickness;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_thickness" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        DROP_SHADOW_SHADER_ID => {
            let distance = read_number_uniform(pass, "u_distance")?;
            let blur = read_number_uniform(pass, "u_blur")?;
            direction = read_vec2_uniform(pass, "u_direction")?;
            scalars[0] = distance;
            scalars[1] = blur;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_distance" || uniform == "u_blur" || uniform == "u_direction" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        OUTER_GLOW_SHADER_ID => {
            let radius = read_number_uniform(pass, "u_radius")?;
            let intensity = read_number_uniform(pass, "u_intensity")?;
            scalars[0] = radius;
            scalars[1] = intensity;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_radius" || uniform == "u_intensity" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        UNSHARP_MASK_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let intensity = read_number_uniform(pass, "u_intensity")?;
            scalars[0] = amount;
            scalars[1] = intensity;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_intensity" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        INNER_GLOW_SHADER_ID | EDGE_GLOW_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let intensity = read_number_uniform(pass, "u_intensity")?;
            scalars[0] = amount;
            scalars[1] = intensity;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_intensity" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        TEXT_GLOW_SHADER_ID | TEXT_STROKE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let intensity = read_number_uniform(pass, "u_intensity")?;
            scalars[0] = amount;
            scalars[1] = intensity;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_intensity" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        TEXT_SHADOW_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let intensity = read_number_uniform(pass, "u_intensity")?;
            direction = read_vec2_uniform(pass, "u_direction")?;
            scalars[0] = amount;
            scalars[1] = intensity;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_intensity" || uniform == "u_direction" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        SKEW_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            direction = read_vec2_uniform(pass, "u_direction")?;
            scalars[0] = amount;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_amount" || uniform == "u_direction" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        COLOR_WHEELS_SHADER_ID => {
            let lift = read_vec3_uniform(pass, "u_lift")?;
            let gamma = read_vec3_uniform(pass, "u_gamma")?;
            let gain = read_vec3_uniform(pass, "u_gain")?;

            // EffectUniformBuffer exposes 4 scalars + 1 vec2 `direction`. We
            // pass lift as scalars[0..3] (R, G, B, _) and gamma[0] as the
            // 4th scalar so the colour-wheels WGSL shader can pick up at
            // least the primary lift. Gain is intentionally read here
            // (so the `unknown uniform` check below stays truthful) but
            // cannot be uploaded yet because the current buffer layout
            // has no slot for it; the follow-up is to extend
            // EffectUniformBuffer with an extra vec3 for gain.
            scalars[0] = lift[0];
            scalars[1] = lift[1];
            scalars[2] = lift[2];
            scalars[3] = gamma[0];
            // `gain` and `gamma` are kept in scope so a future patch can
            // ship them as soon as the buffer grows; explicit `_ = gain`
            // documents that the silence is deliberate.
            let _ = gain;
            let _ = gamma;

            for uniform in pass.uniforms.keys() {
                if uniform == "u_lift" || uniform == "u_gamma" || uniform == "u_gain" {
                    continue;
                }
                return Err(EffectsError::UnsupportedUniform {
                    shader: shader.to_string(),
                    uniform: uniform.clone(),
                });
            }
        }
        BLINK_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let time = read_number_uniform(pass, "u_time")?;
            let speed = read_number_uniform(pass, "u_speed")?;
            scalars[0] = amount;
            scalars[1] = time;
            scalars[2] = speed;
            check_allowed_uniforms(pass, shader, &["u_amount", "u_time", "u_speed"])?;
        }
        BLOCK_DISSOLVE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let block_size = read_number_uniform(pass, "u_block_size")?;
            let seed = read_number_uniform(pass, "u_seed")?;
            scalars[0] = amount;
            scalars[1] = block_size;
            scalars[2] = seed;
            check_allowed_uniforms(pass, shader, &["u_amount", "u_block_size", "u_seed"])?;
        }
        DISSOLVE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let seed = read_number_uniform(pass, "u_seed")?;
            scalars[0] = amount;
            scalars[1] = seed;
            check_allowed_uniforms(pass, shader, &["u_amount", "u_seed"])?;
        }
        OPACITY_PRESSURE_SHADER_ID => {
            let amount = read_number_uniform(pass, "u_amount")?;
            let pressure = read_number_uniform(pass, "u_pressure")?;
            direction = read_vec2_uniform(pass, "u_direction")?;
            scalars[0] = amount;
            scalars[1] = pressure;
            check_allowed_uniforms(pass, shader, &["u_amount", "u_pressure", "u_direction"])?;
        }
        ZOOM_PUSH_SHADER_ID => {
            // direction = focus point (0..1), scalars = [amount, ramp, time].
            let amount = read_number_uniform(pass, "u_amount")?;
            let ramp = read_number_uniform(pass, "u_ramp")?;
            let time = read_number_uniform(pass, "u_time")?;
            direction = read_vec2_uniform(pass, "u_focus")?;
            scalars[0] = amount;
            scalars[1] = ramp;
            scalars[2] = time;
            check_allowed_uniforms(pass, shader, &["u_amount", "u_focus", "u_ramp", "u_time"])?;
        }
        SHAKE_SHADER_ID
        | LIGHTLEAK_SHADER_ID
        | FLASH_SHADER_ID
        | CHROMA_GLITCH_SHADER_ID
        | LOOK_VINTAGE_SHADER_ID
        | LOOK_HORROR_SHADER_ID
        | LOOK_HALATION_SHADER_ID
        | LOOK_TECH_SHADER_ID
        | LOOK_NOIR_SHADER_ID
        | LOOK_PASTEL_SHADER_ID
        | LOOK_BLOCKBUSTER_SHADER_ID
        | LOOK_DREAMY_SHADER_ID => {
            // DonkeyCut family: one amount knob plus element-local time in
            // seconds; scalars = [amount, time].
            let amount = read_number_uniform(pass, "u_amount")?;
            let time = read_number_uniform(pass, "u_time")?;
            scalars[0] = amount;
            scalars[1] = time;
            check_allowed_uniforms(pass, shader, &["u_amount", "u_time"])?;
        }
        _ => {
            return Err(EffectsError::UnknownEffectShader {
                shader: shader.to_string(),
            });
        }
    }

    Ok(EffectUniformBuffer {
        resolution: [width as f32, height as f32],
        direction,
        scalars,
    })
}

fn read_number_uniform(pass: &EffectPass, uniform: &str) -> Result<f32, EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    match value {
        UniformValue::Number(value) => Ok(*value),
        UniformValue::Vector(_) => Err(EffectsError::InvalidNumberUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        }),
    }
}

fn read_vec2_uniform(pass: &EffectPass, uniform: &str) -> Result<[f32; 2], EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    let UniformValue::Vector(values) = value else {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 2,
        });
    };
    if values.len() != 2 {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 2,
        });
    }
    Ok([values[0], values[1]])
}

fn check_allowed_uniforms(
    pass: &EffectPass,
    shader: &str,
    allowed: &[&str],
) -> Result<(), EffectsError> {
    for uniform in pass.uniforms.keys() {
        if allowed.contains(&uniform.as_str()) {
            continue;
        }
        return Err(EffectsError::UnsupportedUniform {
            shader: shader.to_string(),
            uniform: uniform.clone(),
        });
    }
    Ok(())
}

fn read_vec3_uniform(pass: &EffectPass, uniform: &str) -> Result<[f32; 3], EffectsError> {
    let Some(value) = pass.uniforms.get(uniform) else {
        return Err(EffectsError::MissingUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
        });
    };
    let UniformValue::Vector(values) = value else {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 3,
        });
    };
    if values.len() != 3 {
        return Err(EffectsError::InvalidVectorUniform {
            shader: pass.shader.clone(),
            uniform: uniform.to_string(),
            expected_length: 3,
        });
    }
    Ok([values[0], values[1], values[2]])
}

/// Tests for the effect pass loop's render-target retention policy.
///
/// Targets used to be created fresh per pass, with no recycling at all. A
/// gaussian blur compiles to up to 16 passes (`buildGaussianBlurPasses` emits
/// two separable passes per iteration, 8 iterations), so a 50-layer timeline
/// allocated ~800 full-frame textures every frame — about 6.6 GB of GPU
/// allocation churn at 1080p BGRA8. Every assertion below is about the pool
/// absorbing that chain without growing with it.
///
/// `wgpu::Texture` cannot be constructed without a live device, so the pool is
/// generic over the pooled type and these tests pool a `usize` handle instead.
/// The accounting under test — what is retained, when, and how much — is
/// identical either way.
#[cfg(test)]
mod target_pool_tests {
    use super::target_pool::{MAX_RETAINED_PER_SIZE, TargetPool};

    type Pool = TargetPool<usize>;

    /// Creates a fresh target, mimicking `GpuContext::create_render_texture`.
    fn create() -> usize {
        next_id()
    }

    fn next_id() -> usize {
        use std::sync::atomic::{AtomicUsize, Ordering};
        static NEXT: AtomicUsize = AtomicUsize::new(1);
        NEXT.fetch_add(1, Ordering::Relaxed)
    }

    /// Replays what one iteration of `apply_with_encoder`'s pass loop does:
    /// acquire the destination, then release the texture that pass samples.
    ///
    /// The order is the invariant under test, so it is written the way the
    /// production code writes it rather than through a helper that could hide
    /// a reordering.
    fn run_pass(pool: &mut Pool, previous: Option<usize>, width: u32, height: u32) -> usize {
        let next = pool.acquire(width, height, create);
        if let Some(previous) = previous {
            pool.release(width, height, previous);
        }
        next
    }

    #[test]
    fn fresh_pool_retains_nothing() {
        let pool = Pool::default();
        assert_eq!(pool.retained(), 0);
    }

    /// One 16-pass chain (8 iterations x 2 separable passes, the worst case
    /// `buildGaussianBlurPasses` produces) ending the way a blurred layer
    /// does: the last target escapes to the caller, which recycles it once it
    /// has been blended or masked.
    fn run_blur_chain(pool: &mut Pool, make: &mut impl FnMut() -> usize) {
        let mut current = pool.acquire(1920, 1080, &mut *make);
        for _ in 1..16 {
            // Acquire the destination, then release the one this pass reads.
            let next = pool.acquire(1920, 1080, &mut *make);
            pool.release(1920, 1080, current);
            current = next;
        }
        pool.release(1920, 1080, current);
    }

    #[test]
    fn repeated_chains_stay_at_the_steady_state_allocation_count() {
        let mut pool = Pool::default();
        let created = std::cell::Cell::new(0usize);
        let mut make = || {
            created.set(created.get() + 1);
            created.get()
        };

        run_blur_chain(&mut pool, &mut make);
        assert_eq!(
            created.get(),
            2,
            "the first chain must allocate two targets, not sixteen"
        );

        for _ in 1..50 {
            run_blur_chain(&mut pool, &mut make);
        }

        assert_eq!(
            created.get(),
            2,
            "50 sixteen-pass chains must allocate the same two targets"
        );
        assert_eq!(pool.retained(), MAX_RETAINED_PER_SIZE);
    }

    #[test]
    fn a_single_spare_is_never_handed_back_as_the_texture_being_released() {
        // The aliasing guard. If the loop released before it acquired, a pool
        // holding exactly one target would hand the same allocation back as
        // both the sampled texture and the render target of one pass. That is
        // undefined and surfaces as silent visual corruption, not an error.
        let mut pool = Pool::default();

        let first = run_pass(&mut pool, None, 1920, 1080);
        let second = run_pass(&mut pool, Some(first), 1920, 1080);
        assert_ne!(first, second, "source and destination must not alias");

        // Repeat it, because the pool now reuses its retained entry rather than
        // allocating, and that is the case the hazard lives in.
        let third = run_pass(&mut pool, Some(second), 1920, 1080);
        assert_ne!(second, third, "source and destination must not alias");
        // `first` coming back is the point, not a bug: the pass that read it was
        // already recorded, and command buffers run in submission order.
        assert_eq!(
            first, third,
            "a target released after its read pass was recorded may be reused"
        );
    }

    #[test]
    fn retention_stays_flat_as_the_pass_count_grows() {
        let retained_after = |passes: usize| {
            let mut pool = Pool::default();
            let mut current = run_pass(&mut pool, None, 1920, 1080);
            for _ in 1..passes {
                current = run_pass(&mut pool, Some(current), 1920, 1080);
            }
            pool.retained()
        };

        // A chain is linear, so the live working set is two targets whatever the
        // length. 2-pass and 200-pass chains must retain identically.
        assert_eq!(
            retained_after(2),
            retained_after(200),
            "retention tracks the constant working set, not the pass count"
        );
    }

    #[test]
    fn free_list_saturates_at_the_cap_instead_of_tracking_the_in_flight_set() {
        let mut pool = Pool::default();

        // A pathological frame: 200 targets acquired before any of them is
        // released. Without a cap this would pin 200 full-frame textures
        // (~1.7 GB at 1080p) for the rest of the session.
        let mut in_flight = Vec::new();
        for _ in 0..200 {
            in_flight.push(pool.acquire(1920, 1080, create));
        }
        for target in in_flight {
            pool.release(1920, 1080, target);
        }

        assert_eq!(
            pool.retained(),
            MAX_RETAINED_PER_SIZE,
            "free list must saturate at the cap"
        );
    }

    #[test]
    fn the_cap_is_applied_per_size_not_globally() {
        let mut pool = Pool::default();

        for (width, height) in [(1920, 1080), (1280, 720)] {
            let mut in_flight = Vec::new();
            for _ in 0..(MAX_RETAINED_PER_SIZE * 3) {
                in_flight.push(pool.acquire(width, height, create));
            }
            for target in in_flight {
                pool.release(width, height, target);
            }
        }

        assert_eq!(pool.retained_at(1920, 1080), MAX_RETAINED_PER_SIZE);
        assert_eq!(pool.retained_at(1280, 720), MAX_RETAINED_PER_SIZE);
    }

    #[test]
    fn targets_of_different_sizes_are_never_handed_across() {
        let mut pool = Pool::default();

        let full_hd = run_pass(&mut pool, None, 1920, 1080);
        pool.release(1920, 1080, full_hd);

        // A different size must not reuse the 1080p allocation.
        let half_hd = run_pass(&mut pool, None, 1280, 720);
        assert_ne!(half_hd, full_hd, "size mismatch must not alias");
        assert_eq!(pool.retained_at(1920, 1080), 1, "1080p stays available");
        assert_eq!(pool.retained_at(1280, 720), 0, "720p had to allocate");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Parse every WGSL fragment shader registered in the pipeline through
    /// naga's front-end. wgpu only compiles shader modules lazily at runtime,
    /// so without this a malformed shader would slip through `cargo check`/
    /// `build` and only blow up in the browser. The front-end performs lexing,
    /// parsing, name resolution and type inference, so this catches the realistic
    /// authoring bugs: syntax errors, undeclared identifiers, wrong argument
    /// counts, and type mismatches.
    ///
    /// We intentionally stop at `parse_str` and do not run the full `Validator`:
    /// each effect shader carries a vestigial `vertex_main` (it returns a bare
    /// `vec4` without `@builtin(position)`), which standalone validation rejects.
    /// That entry point is dead code — the real pipeline always pairs the
    /// effect's `fragment_main` with the shared `fullscreen.wgsl` vertex stage,
    /// so wgpu never validates it.
    #[test]
    fn all_shaders_parse_as_wgsl() {
        use wgpu::naga::front::wgsl;

        for entry in SHADER_REGISTRY {
            wgsl::parse_str(entry.source)
                .unwrap_or_else(|err| panic!("WGSL parse error in shader '{}': {err}", entry.id));
        }
    }

    #[test]
    fn zoom_push_uniforms_pack_into_focus_and_scalars() {
        use crate::UniformValue;

        let mut uniforms = std::collections::HashMap::new();
        uniforms.insert("u_amount".to_string(), UniformValue::Number(0.5));
        uniforms.insert(
            "u_focus".to_string(),
            UniformValue::Vector(vec![0.25, 0.75]),
        );
        uniforms.insert("u_ramp".to_string(), UniformValue::Number(0.5));
        uniforms.insert("u_time".to_string(), UniformValue::Number(1.2));

        let pass = EffectPass {
            shader: "zoom-push".to_string(),
            uniforms,
        };

        let buffer = pack_effect_uniforms(&pass, 1920, 1080).unwrap();

        assert_eq!(buffer.direction, [0.25, 0.75]);
        assert_eq!(buffer.scalars, [0.5, 0.5, 1.2, 0.0]);
    }

    #[test]
    fn donkeycut_amount_time_family_packs_correctly() {
        use crate::UniformValue;

        for shader in [
            "shake",
            "lightleak",
            "flash",
            "chroma-glitch",
            "look-vintage",
            "look-horror",
            "look-halation",
            "look-tech",
            "look-noir",
            "look-pastel",
            "look-blockbuster",
            "look-dreamy",
        ] {
            let mut uniforms = std::collections::HashMap::new();
            uniforms.insert("u_amount".to_string(), UniformValue::Number(0.7));
            uniforms.insert("u_time".to_string(), UniformValue::Number(2.0));

            let pass = EffectPass {
                shader: shader.to_string(),
                uniforms,
            };

            let buffer = pack_effect_uniforms(&pass, 1920, 1080).unwrap();

            assert_eq!(buffer.scalars, [0.7, 2.0, 0.0, 0.0]);
        }
    }

    #[test]
    fn tile_uniforms_pack_into_scalars() {
        use crate::UniformValue;

        let mut uniforms = std::collections::HashMap::new();
        uniforms.insert("u_amount".to_string(), UniformValue::Number(0.4));
        uniforms.insert("u_shift".to_string(), UniformValue::Number(0.5));
        uniforms.insert("u_single_line".to_string(), UniformValue::Number(1.0));
        uniforms.insert("u_orientation".to_string(), UniformValue::Number(1.0));

        let pass = EffectPass {
            shader: "tile".to_string(),
            uniforms,
        };

        let buffer = pack_effect_uniforms(&pass, 1920, 1080).unwrap();

        assert_eq!(buffer.resolution, [1920.0, 1080.0]);
        assert_eq!(buffer.direction, [0.0, 0.0]);
        assert_eq!(buffer.scalars, [0.4, 0.5, 1.0, 1.0]);
    }

    #[test]
    fn tile_defaults_pack_correctly() {
        use crate::UniformValue;

        let mut uniforms = std::collections::HashMap::new();
        uniforms.insert("u_amount".to_string(), UniformValue::Number(0.4));
        uniforms.insert("u_shift".to_string(), UniformValue::Number(0.0));
        uniforms.insert("u_single_line".to_string(), UniformValue::Number(0.0));
        uniforms.insert("u_orientation".to_string(), UniformValue::Number(0.0));

        let pass = EffectPass {
            shader: "tile".to_string(),
            uniforms,
        };

        let buffer = pack_effect_uniforms(&pass, 1920, 1080).unwrap();

        assert_eq!(buffer.scalars, [0.4, 0.0, 0.0, 0.0]);
    }
}
