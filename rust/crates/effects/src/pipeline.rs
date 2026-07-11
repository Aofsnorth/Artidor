use std::collections::HashMap;

use bytemuck::{Pod, Zeroable};
use gpu::{FULLSCREEN_SHADER_SOURCE, GpuContext};
use thiserror::Error;
use wgpu::util::DeviceExt;

use crate::{EffectPass, UniformValue};

const GAUSSIAN_BLUR_SHADER_ID: &str = "gaussian-blur";
const GAUSSIAN_BLUR_SHADER_SOURCE: &str = include_str!("shaders/gaussian_blur.wgsl");
const BRIGHTNESS_SHADER_ID: &str = "brightness";
const BRIGHTNESS_SHADER_SOURCE: &str = include_str!("shaders/brightness.wgsl");
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

struct ShaderEntry {
    id: &'static str,
    label: &'static str,
    source: &'static str,
}

const SHADER_REGISTRY: &[ShaderEntry] = &[
    ShaderEntry { id: GAUSSIAN_BLUR_SHADER_ID, label: "effects-gaussian-blur-shader", source: GAUSSIAN_BLUR_SHADER_SOURCE },
    ShaderEntry { id: BRIGHTNESS_SHADER_ID, label: "effects-brightness-shader", source: BRIGHTNESS_SHADER_SOURCE },
    ShaderEntry { id: CONTRAST_SHADER_ID, label: "effects-contrast-shader", source: CONTRAST_SHADER_SOURCE },
    ShaderEntry { id: SATURATION_SHADER_ID, label: "effects-saturation-shader", source: SATURATION_SHADER_SOURCE },
    ShaderEntry { id: HUE_ROTATE_SHADER_ID, label: "effects-hue-rotate-shader", source: HUE_ROTATE_SHADER_SOURCE },
    ShaderEntry { id: TEMPERATURE_SHADER_ID, label: "effects-temperature-shader", source: TEMPERATURE_SHADER_SOURCE },
    ShaderEntry { id: SEPIA_SHADER_ID, label: "effects-sepia-shader", source: SEPIA_SHADER_SOURCE },
    ShaderEntry { id: GRAYSCALE_SHADER_ID, label: "effects-grayscale-shader", source: GRAYSCALE_SHADER_SOURCE },
    ShaderEntry { id: INVERT_SHADER_ID, label: "effects-invert-shader", source: INVERT_SHADER_SOURCE },
    ShaderEntry { id: HIGHLIGHTS_SHADER_ID, label: "effects-highlights-shader", source: HIGHLIGHTS_SHADER_SOURCE },
    ShaderEntry { id: SHADOWS_SHADER_ID, label: "effects-shadows-shader", source: SHADOWS_SHADER_SOURCE },
    ShaderEntry { id: SHARPEN_SHADER_ID, label: "effects-sharpen-shader", source: SHARPEN_SHADER_SOURCE },
    ShaderEntry { id: CHROMATIC_ABERRATION_SHADER_ID, label: "effects-chromatic-aberration-shader", source: CHROMATIC_ABERRATION_SHADER_SOURCE },
    ShaderEntry { id: CHROMA_KEY_SHADER_ID, label: "effects-chroma-key-shader", source: CHROMA_KEY_SHADER_SOURCE },
    ShaderEntry { id: REMOVE_BACKGROUND_SHADER_ID, label: "effects-remove-background-shader", source: REMOVE_BACKGROUND_SHADER_SOURCE },
    ShaderEntry { id: POSTERIZE_SHADER_ID, label: "effects-posterize-shader", source: POSTERIZE_SHADER_SOURCE },
    ShaderEntry { id: EDGE_DETECT_SHADER_ID, label: "effects-edge-detect-shader", source: EDGE_DETECT_SHADER_SOURCE },
    ShaderEntry { id: HALFTONE_SHADER_ID, label: "effects-halftone-shader", source: HALFTONE_SHADER_SOURCE },
    ShaderEntry { id: MIRROR_SHADER_ID, label: "effects-mirror-shader", source: MIRROR_SHADER_SOURCE },
    ShaderEntry { id: SWIRL_SHADER_ID, label: "effects-swirl-shader", source: SWIRL_SHADER_SOURCE },
    ShaderEntry { id: BULGE_SHADER_ID, label: "effects-bulge-shader", source: BULGE_SHADER_SOURCE },
    ShaderEntry { id: TWIST_SHADER_ID, label: "effects-twist-shader", source: TWIST_SHADER_SOURCE },
    ShaderEntry { id: THERMAL_SHADER_ID, label: "effects-thermal-shader", source: THERMAL_SHADER_SOURCE },
    ShaderEntry { id: MOTION_BLUR_SHADER_ID, label: "effects-motion-blur-shader", source: MOTION_BLUR_SHADER_SOURCE },
    ShaderEntry { id: WAVE_SHADER_ID, label: "effects-wave-shader", source: WAVE_SHADER_SOURCE },
    ShaderEntry { id: RIPPLE_SHADER_ID, label: "effects-ripple-shader", source: RIPPLE_SHADER_SOURCE },
    ShaderEntry { id: PIXELATE_SHADER_ID, label: "effects-pixelate-shader", source: PIXELATE_SHADER_SOURCE },
    ShaderEntry { id: FISHEYE_SHADER_ID, label: "effects-fisheye-shader", source: FISHEYE_SHADER_SOURCE },
    ShaderEntry { id: SCANLINES_SHADER_ID, label: "effects-scanlines-shader", source: SCANLINES_SHADER_SOURCE },
    ShaderEntry { id: EMBOSS_SHADER_ID, label: "effects-emboss-shader", source: EMBOSS_SHADER_SOURCE },
    ShaderEntry { id: GLOW_SHADER_ID, label: "effects-glow-shader", source: GLOW_SHADER_SOURCE },
    ShaderEntry { id: VIBRANCE_SHADER_ID, label: "effects-vibrance-shader", source: VIBRANCE_SHADER_SOURCE },
    ShaderEntry { id: VIGNETTE_SHADER_ID, label: "effects-vignette-shader", source: VIGNETTE_SHADER_SOURCE },
    ShaderEntry { id: GRAIN_SHADER_ID, label: "effects-grain-shader", source: GRAIN_SHADER_SOURCE },
    ShaderEntry { id: DEHAZE_SHADER_ID, label: "effects-dehaze-shader", source: DEHAZE_SHADER_SOURCE },
    ShaderEntry { id: CLARITY_SHADER_ID, label: "effects-clarity-shader", source: CLARITY_SHADER_SOURCE },
    ShaderEntry { id: FADE_SHADER_ID, label: "effects-fade-shader", source: FADE_SHADER_SOURCE },
    ShaderEntry { id: WHITES_SHADER_ID, label: "effects-whites-shader", source: WHITES_SHADER_SOURCE },
    ShaderEntry { id: BLACKS_SHADER_ID, label: "effects-blacks-shader", source: BLACKS_SHADER_SOURCE },
    ShaderEntry { id: COLOR_WHEELS_SHADER_ID, label: "effects-color-wheels-shader", source: COLOR_WHEELS_SHADER_SOURCE },
    ShaderEntry { id: VELOCITY_BLUR_SHADER_ID, label: "effects-velocity-blur-shader", source: VELOCITY_BLUR_SHADER_SOURCE },
    ShaderEntry { id: STROKE_SHADER_ID, label: "effects-stroke-shader", source: STROKE_SHADER_SOURCE },
    ShaderEntry { id: DROP_SHADOW_SHADER_ID, label: "effects-drop-shadow-shader", source: DROP_SHADOW_SHADER_SOURCE },
    ShaderEntry { id: OUTER_GLOW_SHADER_ID, label: "effects-outer-glow-shader", source: OUTER_GLOW_SHADER_SOURCE },
    ShaderEntry { id: KALEIDOSCOPE_SHADER_ID, label: "effects-kaleidoscope-shader", source: KALEIDOSCOPE_SHADER_SOURCE },
    ShaderEntry { id: TILE_SHADER_ID, label: "effects-tile-shader", source: TILE_SHADER_SOURCE },
    ShaderEntry { id: CHECKER_SHADER_ID, label: "effects-checker-shader", source: CHECKER_SHADER_SOURCE },
    ShaderEntry { id: GRID_SHADER_ID, label: "effects-grid-shader", source: GRID_SHADER_SOURCE },
    ShaderEntry { id: ZOOM_BLUR_SHADER_ID, label: "effects-zoom-blur-shader", source: ZOOM_BLUR_SHADER_SOURCE },
    ShaderEntry { id: DIRECTIONAL_BLUR_SHADER_ID, label: "effects-directional-blur-shader", source: DIRECTIONAL_BLUR_SHADER_SOURCE },
    ShaderEntry { id: BOX_BLUR_SHADER_ID, label: "effects-box-blur-shader", source: BOX_BLUR_SHADER_SOURCE },
    ShaderEntry { id: LENS_BLUR_SHADER_ID, label: "effects-lens-blur-shader", source: LENS_BLUR_SHADER_SOURCE },
    ShaderEntry { id: UNSHARP_MASK_SHADER_ID, label: "effects-unsharp-mask-shader", source: UNSHARP_MASK_SHADER_SOURCE },
    ShaderEntry { id: INNER_GLOW_SHADER_ID, label: "effects-inner-glow-shader", source: INNER_GLOW_SHADER_SOURCE },
    ShaderEntry { id: EDGE_GLOW_SHADER_ID, label: "effects-edge-glow-shader", source: EDGE_GLOW_SHADER_SOURCE },
    ShaderEntry { id: CONTOUR_LINES_SHADER_ID, label: "effects-contour-lines-shader", source: CONTOUR_LINES_SHADER_SOURCE },
    ShaderEntry { id: MATTE_EDGE_SHADER_ID, label: "effects-matte-edge-shader", source: MATTE_EDGE_SHADER_SOURCE },
    ShaderEntry { id: COLOR_BALANCE_SHADER_ID, label: "effects-color-balance-shader", source: COLOR_BALANCE_SHADER_SOURCE },
    ShaderEntry { id: REPLACE_COLOR_SHADER_ID, label: "effects-replace-color-shader", source: REPLACE_COLOR_SHADER_SOURCE },
    ShaderEntry { id: TINT_SHADER_ID, label: "effects-tint-shader", source: TINT_SHADER_SOURCE },
    ShaderEntry { id: GRADIENT_OVERLAY_SHADER_ID, label: "effects-gradient-overlay-shader", source: GRADIENT_OVERLAY_SHADER_SOURCE },
    ShaderEntry { id: FOUR_COLOR_GRADIENT_SHADER_ID, label: "effects-four-color-gradient-shader", source: FOUR_COLOR_GRADIENT_SHADER_SOURCE },
    ShaderEntry { id: ROTATE_SHADER_ID, label: "effects-rotate-shader", source: ROTATE_SHADER_SOURCE },
    ShaderEntry { id: SCALE_SHADER_ID, label: "effects-scale-shader", source: SCALE_SHADER_SOURCE },
    ShaderEntry { id: FLIP_HORIZONTAL_SHADER_ID, label: "effects-flip-horizontal-shader", source: FLIP_HORIZONTAL_SHADER_SOURCE },
    ShaderEntry { id: FLIP_VERTICAL_SHADER_ID, label: "effects-flip-vertical-shader", source: FLIP_VERTICAL_SHADER_SOURCE },
    ShaderEntry { id: SKEW_SHADER_ID, label: "effects-skew-shader", source: SKEW_SHADER_SOURCE },
    ShaderEntry { id: TEXT_GLOW_SHADER_ID, label: "effects-text-glow-shader", source: TEXT_GLOW_SHADER_SOURCE },
    ShaderEntry { id: TEXT_STROKE_SHADER_ID, label: "effects-text-stroke-shader", source: TEXT_STROKE_SHADER_SOURCE },
    ShaderEntry { id: TEXT_SHADOW_SHADER_ID, label: "effects-text-shadow-shader", source: TEXT_SHADOW_SHADER_SOURCE },
    ShaderEntry { id: TEXT_3D_SHADER_ID, label: "effects-text-3d-shader", source: TEXT_3D_SHADER_SOURCE },
];
pub struct ApplyEffectsOptions<'a> {
    pub source: &'a wgpu::Texture,
    pub width: u32,
    pub height: u32,
    pub passes: &'a [EffectPass],
}

pub struct EffectPipeline {
    uniform_bind_group_layout: wgpu::BindGroupLayout,
    pipelines: HashMap<String, wgpu::RenderPipeline>,
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

        let build_pipeline = |label: &str, module: &wgpu::ShaderModule| {
            context
                .device()
                .create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some(label),
                    layout: Some(&pipeline_layout),
                    vertex: wgpu::VertexState {
                        module: &vertex_shader_module,
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
        };

        let mut pipelines = HashMap::new();
        for entry in SHADER_REGISTRY {
            let module = context.device().create_shader_module(wgpu::ShaderModuleDescriptor {
                label: Some(entry.label),
                source: wgpu::ShaderSource::Wgsl(entry.source.into()),
            });
            let pipeline_label = format!("effects-{}-pipeline", entry.id);
            pipelines.insert(
                entry.id.to_string(),
                build_pipeline(&pipeline_label, &module),
            );
        }

        Self {
            uniform_bind_group_layout,
            pipelines,
        }
    }

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
        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("effects-command-encoder"),
                });
        let output = self.apply_with_encoder(
            context,
            &mut encoder,
            ApplyEffectsOptions {
                source,
                width,
                height,
                passes,
            },
        )?;
        context.queue().submit([encoder.finish()]);
        Ok(output)
    }

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
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut current_texture: Option<wgpu::Texture> = None;

        for pass in passes {
            let input_texture = current_texture.as_ref().unwrap_or(source);
            let output_texture =
                context.create_render_texture(width, height, "effects-pass-output");
            let input_view = input_texture.create_view(&wgpu::TextureViewDescriptor::default());
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
            let uniform_buffer =
                context
                    .device()
                    .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                        label: Some("effects-uniform-buffer"),
                        contents: bytemuck::bytes_of(&pack_effect_uniforms(pass, width, height)?),
                        usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                    });
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
            let pipeline = self.pipelines.get(&pass.shader).ok_or_else(|| {
                EffectsError::UnknownEffectShader {
                    shader: pass.shader.clone(),
                }
            })?;

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
                render_pass.set_pipeline(pipeline);
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
        | BLACKS_SHADER_ID => {
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
        | TILE_SHADER_ID
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
}
