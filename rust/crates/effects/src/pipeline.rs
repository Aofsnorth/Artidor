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
const CHROMATIC_ABERRATION_SHADER_SOURCE: &str =
    include_str!("shaders/chromatic-aberration.wgsl");

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
        let gaussian_blur_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-gaussian-blur-shader"),
                    source: wgpu::ShaderSource::Wgsl(GAUSSIAN_BLUR_SHADER_SOURCE.into()),
                });
        let brightness_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-brightness-shader"),
                    source: wgpu::ShaderSource::Wgsl(BRIGHTNESS_SHADER_SOURCE.into()),
                });
        let contrast_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-contrast-shader"),
                    source: wgpu::ShaderSource::Wgsl(CONTRAST_SHADER_SOURCE.into()),
                });
        let saturation_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-saturation-shader"),
                    source: wgpu::ShaderSource::Wgsl(SATURATION_SHADER_SOURCE.into()),
                });
        let hue_rotate_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-hue-rotate-shader"),
                    source: wgpu::ShaderSource::Wgsl(HUE_ROTATE_SHADER_SOURCE.into()),
                });
        let temperature_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-temperature-shader"),
                    source: wgpu::ShaderSource::Wgsl(TEMPERATURE_SHADER_SOURCE.into()),
                });
        let sepia_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-sepia-shader"),
                    source: wgpu::ShaderSource::Wgsl(SEPIA_SHADER_SOURCE.into()),
                });
        let grayscale_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-grayscale-shader"),
                    source: wgpu::ShaderSource::Wgsl(GRAYSCALE_SHADER_SOURCE.into()),
                });
        let invert_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-invert-shader"),
                    source: wgpu::ShaderSource::Wgsl(INVERT_SHADER_SOURCE.into()),
                });
        let highlights_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-highlights-shader"),
                    source: wgpu::ShaderSource::Wgsl(HIGHLIGHTS_SHADER_SOURCE.into()),
                });
        let shadows_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-shadows-shader"),
                    source: wgpu::ShaderSource::Wgsl(SHADOWS_SHADER_SOURCE.into()),
                });
        let shadows_shader_module = shadows_shader_module;
        let sharpen_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-sharpen-shader"),
                    source: wgpu::ShaderSource::Wgsl(SHARPEN_SHADER_SOURCE.into()),
                });
        let chromatic_aberration_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-chromatic-aberration-shader"),
                    source: wgpu::ShaderSource::Wgsl(CHROMATIC_ABERRATION_SHADER_SOURCE.into()),
                });
        let motion_blur_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-motion-blur-shader"),
                    source: wgpu::ShaderSource::Wgsl(MOTION_BLUR_SHADER_SOURCE.into()),
                });
        let wave_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-wave-shader"),
                    source: wgpu::ShaderSource::Wgsl(WAVE_SHADER_SOURCE.into()),
                });
        let ripple_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-ripple-shader"),
                    source: wgpu::ShaderSource::Wgsl(RIPPLE_SHADER_SOURCE.into()),
                });
        let pixelate_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-pixelate-shader"),
                    source: wgpu::ShaderSource::Wgsl(PIXELATE_SHADER_SOURCE.into()),
                });
        let fisheye_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-fisheye-shader"),
                    source: wgpu::ShaderSource::Wgsl(FISHEYE_SHADER_SOURCE.into()),
                });
        let scanlines_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-scanlines-shader"),
                    source: wgpu::ShaderSource::Wgsl(SCANLINES_SHADER_SOURCE.into()),
                });
        let emboss_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-emboss-shader"),
                    source: wgpu::ShaderSource::Wgsl(EMBOSS_SHADER_SOURCE.into()),
                });
        let glow_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-glow-shader"),
                    source: wgpu::ShaderSource::Wgsl(GLOW_SHADER_SOURCE.into()),
                });
        let vibrance_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-vibrance-shader"),
                    source: wgpu::ShaderSource::Wgsl(VIBRANCE_SHADER_SOURCE.into()),
                });
        let vignette_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-vignette-shader"),
                    source: wgpu::ShaderSource::Wgsl(VIGNETTE_SHADER_SOURCE.into()),
                });
        let grain_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-grain-shader"),
                    source: wgpu::ShaderSource::Wgsl(GRAIN_SHADER_SOURCE.into()),
                });
        let dehaze_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-dehaze-shader"),
                    source: wgpu::ShaderSource::Wgsl(DEHAZE_SHADER_SOURCE.into()),
                });
        let clarity_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-clarity-shader"),
                    source: wgpu::ShaderSource::Wgsl(CLARITY_SHADER_SOURCE.into()),
                });
        let fade_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-fade-shader"),
                    source: wgpu::ShaderSource::Wgsl(FADE_SHADER_SOURCE.into()),
                });
        let whites_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-whites-shader"),
                    source: wgpu::ShaderSource::Wgsl(WHITES_SHADER_SOURCE.into()),
                });
        let blacks_shader_module =
            context
                .device()
                .create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some("effects-blacks-shader"),
                    source: wgpu::ShaderSource::Wgsl(BLACKS_SHADER_SOURCE.into()),
                });
		let color_wheels_shader_module =
			context
				.device()
				.create_shader_module(wgpu::ShaderModuleDescriptor {
					label: Some("effects-color-wheels-shader"),
					source: wgpu::ShaderSource::Wgsl(COLOR_WHEELS_SHADER_SOURCE.into()),
				});
		let velocity_blur_shader_module =
			context
				.device()
				.create_shader_module(wgpu::ShaderModuleDescriptor {
					label: Some("effects-velocity-blur-shader"),
					source: wgpu::ShaderSource::Wgsl(VELOCITY_BLUR_SHADER_SOURCE.into()),
				});
		let stroke_shader_module =
			context
				.device()
				.create_shader_module(wgpu::ShaderModuleDescriptor {
					label: Some("effects-stroke-shader"),
					source: wgpu::ShaderSource::Wgsl(STROKE_SHADER_SOURCE.into()),
				});
		let drop_shadow_shader_module =
			context
				.device()
				.create_shader_module(wgpu::ShaderModuleDescriptor {
					label: Some("effects-drop-shadow-shader"),
					source: wgpu::ShaderSource::Wgsl(DROP_SHADOW_SHADER_SOURCE.into()),
				});
		let outer_glow_shader_module =
			context
				.device()
				.create_shader_module(wgpu::ShaderModuleDescriptor {
					label: Some("effects-outer-glow-shader"),
					source: wgpu::ShaderSource::Wgsl(OUTER_GLOW_SHADER_SOURCE.into()),
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
            context.device().create_render_pipeline(&wgpu::RenderPipelineDescriptor {
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

        let gaussian_blur_pipeline = build_pipeline("effects-gaussian-blur-pipeline", &gaussian_blur_shader_module);

        let mut pipelines = HashMap::new();
        pipelines.insert(GAUSSIAN_BLUR_SHADER_ID.to_string(), gaussian_blur_pipeline);
        pipelines.insert(BRIGHTNESS_SHADER_ID.to_string(), build_pipeline("effects-brightness-pipeline", &brightness_shader_module));
        pipelines.insert(CONTRAST_SHADER_ID.to_string(), build_pipeline("effects-contrast-pipeline", &contrast_shader_module));
        pipelines.insert(SATURATION_SHADER_ID.to_string(), build_pipeline("effects-saturation-pipeline", &saturation_shader_module));
        pipelines.insert(HUE_ROTATE_SHADER_ID.to_string(), build_pipeline("effects-hue-rotate-pipeline", &hue_rotate_shader_module));
        pipelines.insert(TEMPERATURE_SHADER_ID.to_string(), build_pipeline("effects-temperature-pipeline", &temperature_shader_module));
        pipelines.insert(SEPIA_SHADER_ID.to_string(), build_pipeline("effects-sepia-pipeline", &sepia_shader_module));
        pipelines.insert(GRAYSCALE_SHADER_ID.to_string(), build_pipeline("effects-grayscale-pipeline", &grayscale_shader_module));
        pipelines.insert(INVERT_SHADER_ID.to_string(), build_pipeline("effects-invert-pipeline", &invert_shader_module));
        pipelines.insert(HIGHLIGHTS_SHADER_ID.to_string(), build_pipeline("effects-highlights-pipeline", &highlights_shader_module));
        pipelines.insert(SHADOWS_SHADER_ID.to_string(), build_pipeline("effects-shadows-pipeline", &shadows_shader_module));
        pipelines.insert(SHARPEN_SHADER_ID.to_string(), build_pipeline("effects-sharpen-pipeline", &sharpen_shader_module));
        pipelines.insert(CHROMATIC_ABERRATION_SHADER_ID.to_string(), build_pipeline("effects-chromatic-aberration-pipeline", &chromatic_aberration_shader_module));
        pipelines.insert(MOTION_BLUR_SHADER_ID.to_string(), build_pipeline("effects-motion-blur-pipeline", &motion_blur_shader_module));
        pipelines.insert(WAVE_SHADER_ID.to_string(), build_pipeline("effects-wave-pipeline", &wave_shader_module));
        pipelines.insert(RIPPLE_SHADER_ID.to_string(), build_pipeline("effects-ripple-pipeline", &ripple_shader_module));
        pipelines.insert(PIXELATE_SHADER_ID.to_string(), build_pipeline("effects-pixelate-pipeline", &pixelate_shader_module));
        pipelines.insert(FISHEYE_SHADER_ID.to_string(), build_pipeline("effects-fisheye-pipeline", &fisheye_shader_module));
        pipelines.insert(SCANLINES_SHADER_ID.to_string(), build_pipeline("effects-scanlines-pipeline", &scanlines_shader_module));
        pipelines.insert(EMBOSS_SHADER_ID.to_string(), build_pipeline("effects-emboss-pipeline", &emboss_shader_module));
        pipelines.insert(GLOW_SHADER_ID.to_string(), build_pipeline("effects-glow-pipeline", &glow_shader_module));
        pipelines.insert(VIBRANCE_SHADER_ID.to_string(), build_pipeline("effects-vibrance-pipeline", &vibrance_shader_module));
        pipelines.insert(VIGNETTE_SHADER_ID.to_string(), build_pipeline("effects-vignette-pipeline", &vignette_shader_module));
        pipelines.insert(GRAIN_SHADER_ID.to_string(), build_pipeline("effects-grain-pipeline", &grain_shader_module));
        pipelines.insert(DEHAZE_SHADER_ID.to_string(), build_pipeline("effects-dehaze-pipeline", &dehaze_shader_module));
        pipelines.insert(CLARITY_SHADER_ID.to_string(), build_pipeline("effects-clarity-pipeline", &clarity_shader_module));
        pipelines.insert(FADE_SHADER_ID.to_string(), build_pipeline("effects-fade-pipeline", &fade_shader_module));
        pipelines.insert(WHITES_SHADER_ID.to_string(), build_pipeline("effects-whites-pipeline", &whites_shader_module));
        pipelines.insert(BLACKS_SHADER_ID.to_string(), build_pipeline("effects-blacks-pipeline", &blacks_shader_module));
		pipelines.insert(COLOR_WHEELS_SHADER_ID.to_string(), build_pipeline("effects-color-wheels-pipeline", &color_wheels_shader_module));
		pipelines.insert(VELOCITY_BLUR_SHADER_ID.to_string(), build_pipeline("effects-velocity-blur-pipeline", &velocity_blur_shader_module));
		pipelines.insert(STROKE_SHADER_ID.to_string(), build_pipeline("effects-stroke-pipeline", &stroke_shader_module));
		pipelines.insert(DROP_SHADOW_SHADER_ID.to_string(), build_pipeline("effects-drop-shadow-pipeline", &drop_shadow_shader_module));
		pipelines.insert(OUTER_GLOW_SHADER_ID.to_string(), build_pipeline("effects-outer-glow-pipeline", &outer_glow_shader_module));

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
        BRIGHTNESS_SHADER_ID | CONTRAST_SHADER_ID | SATURATION_SHADER_ID | HUE_ROTATE_SHADER_ID | TEMPERATURE_SHADER_ID | SEPIA_SHADER_ID | GRAYSCALE_SHADER_ID | INVERT_SHADER_ID | HIGHLIGHTS_SHADER_ID | SHADOWS_SHADER_ID | SHARPEN_SHADER_ID | VIBRANCE_SHADER_ID | VIGNETTE_SHADER_ID | GRAIN_SHADER_ID | DEHAZE_SHADER_ID | CLARITY_SHADER_ID | FADE_SHADER_ID | WHITES_SHADER_ID | BLACKS_SHADER_ID => {
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
        CHROMATIC_ABERRATION_SHADER_ID | RIPPLE_SHADER_ID | GLOW_SHADER_ID | EMBOSS_SHADER_ID => {
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
        MOTION_BLUR_SHADER_ID => {
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
		COLOR_WHEELS_SHADER_ID => {
            let lift = read_vec3_uniform(pass, "u_lift")?;
            let gamma = read_vec3_uniform(pass, "u_gamma")?;
            let gain = read_vec3_uniform(pass, "u_gain")?;

            scalars[0] = lift[0];
            scalars[1] = lift[1];
            scalars[2] = lift[2];
            scalars[3] = gamma[0];
            // store gamma and gain using extra uniforms — for simplicity, only first 4 scalars
            let _ = gamma;
            let _ = gain;

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
