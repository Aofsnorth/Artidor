//! Native WGPU/D3D12 compositor renderer — top-1 preview path.
//!
//! Zero CPU readback: the compositor renders directly to the DXGI surface
//! created from the viewport child HWND. Reuses the repo's own `gpu` +
//! `compositor` crates (no new GPU dependency).
//!
//! Mirrors `apps/desktop-web/src/render/mod.rs`.

pub mod viewport;

use std::collections::HashMap;
use std::num::NonZeroIsize;

use compositor::{
    BlendMode as CompositorBlendMode, CanvasClearDescriptor, Compositor, FrameDescriptor,
    FrameItemDescriptor, LayerDescriptor, QuadTransformDescriptor, RenderFrameOptions,
};
use gpu::{GpuContext, wgpu};
use pollster::block_on;
use windows::Win32::Foundation::HWND;

use crate::export;
use crate::state::{BlendMode as StateBlendMode, Project, TrackType};
use crate::theme::EDITOR_BG_CLEAR;

/// The native compositor renderer. Owns the GPU context, compositor
/// pipeline, and the DXGI surface created from the viewport child HWND.
pub struct Renderer {
    context: GpuContext,
    compositor: Compositor,
    surface: wgpu::Surface<'static>,
    /// One-pixel colour textures keyed by `0xRRGGBB`. Re-used so repeated
    /// previews of the same track/element do not re-allocate GPU memory.
    color_cache: HashMap<u32, String>,
}

impl Renderer {
    /// Create a renderer bound to the given child HWND (the viewport).
    pub fn new(hwnd: HWND) -> Result<Self, Box<dyn std::error::Error>> {
        let context = block_on(GpuContext::new())?;
        let compositor = Compositor::new(&context);
        let hwnd_value = NonZeroIsize::new(hwnd.0 as isize).ok_or("HWND is null")?;
        let target = wgpu::SurfaceTargetUnsafe::RawHandle {
            raw_display_handle: Some(wgpu::rwh::RawDisplayHandle::Windows(
                wgpu::rwh::WindowsDisplayHandle::new(),
            )),
            raw_window_handle: wgpu::rwh::RawWindowHandle::Win32(
                wgpu::rwh::Win32WindowHandle::new(hwnd_value),
            ),
        };
        let surface = unsafe { context.instance().create_surface_unsafe(target) }?;
        Ok(Self {
            context,
            compositor,
            surface,
            color_cache: HashMap::new(),
        })
    }

    /// Render a single frame to the surface at the given dimensions.
    ///
    /// If `project` is provided, the visible timeline elements are rendered as
    /// solid-colour placeholder layers (one per active clip). This is the
    /// first step toward full media preview; it already makes the playhead,
    /// transforms, opacity, and blend mode visible.
    pub fn render(
        &mut self,
        width: u32,
        height: u32,
        project: Option<&Project>,
    ) -> Result<(), compositor::CompositorError> {
        if width == 0 || height == 0 {
            return Ok(());
        }

        let mut items = Vec::new();
        if let Some(project) = project {
            let time = project.playhead.as_seconds();
            for track in &project.scene.tracks {
                let color = track_color(&track.track_type);
                for element in &track.elements {
                    if element.start_seconds <= time && time < element.end_seconds() {
                        let texture_id = self.color_texture(color);
                        let cx = (element.transform.center_x * width as f64) as f32;
                        let cy = (element.transform.center_y * height as f64) as f32;
                        let w = (element.transform.width * width as f64).max(1.0) as f32;
                        let h = (element.transform.height * height as f64).max(1.0) as f32;
                        items.push(FrameItemDescriptor::Layer(LayerDescriptor {
                            texture_id,
                            transform: QuadTransformDescriptor {
                                center_x: cx,
                                center_y: cy,
                                width: w,
                                height: h,
                                rotation_degrees: element.transform.rotation_degrees as f32,
                                flip_x: element.transform.flip_x,
                                flip_y: element.transform.flip_y,
                            },
                            opacity: element.opacity as f32,
                            blend_mode: to_compositor_blend(element.blend_mode),
                            effect_pass_groups: Vec::new(),
                            mask: None,
                        }));
                    }
                }
            }
        }

        let frame = FrameDescriptor {
            width,
            height,
            clear: CanvasClearDescriptor {
                color: EDITOR_BG_CLEAR,
            },
            items,
        };
        self.compositor.render_frame(
            &self.context,
            RenderFrameOptions {
                frame: &frame,
                surface: &self.surface,
            },
        )
    }

    /// Export a video via the top-1 native FFmpeg pipeline. Renders
    /// `opts.frame_count` frames through the compositor and pipes them
    /// to FFmpeg, which encodes to `.mp4` with hardware acceleration.
    pub fn export_video(
        &mut self,
        project: &Project,
        opts: &export::ExportOptions,
    ) -> Result<std::path::PathBuf, export::ExportError> {
        export::export_video(&self.context, &mut self.compositor, project, opts)
    }

    /// Lazily create a 1x1 GPU texture for the given `0xRRGGBB` colour and
    /// register it with the compositor. Returns the texture id used in
    /// `LayerDescriptor`.
    fn color_texture(&mut self, color: u32) -> String {
        if let Some(id) = self.color_cache.get(&color) {
            return id.clone();
        }

        let id = format!("color-{color:06x}");
        let texture = self.context.create_render_texture(1, 1, "color");
        let b = (color & 0xFF) as u8;
        let g = ((color >> 8) & 0xFF) as u8;
        let r = ((color >> 16) & 0xFF) as u8;
        let a = 0xFFu8;
        let bytes = [b, g, r, a];

        self.context.queue().write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &bytes,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4),
                rows_per_image: Some(1),
            },
            wgpu::Extent3d {
                width: 1,
                height: 1,
                depth_or_array_layers: 1,
            },
        );
        self.compositor.upsert_texture(id.clone(), texture);
        self.color_cache.insert(color, id.clone());
        id
    }
}

/// Track-type colour used for clip placeholder layers.
fn track_color(track_type: &TrackType) -> u32 {
    match track_type {
        TrackType::Video => 0x3B5BDB,
        TrackType::Text => 0xE64980,
        TrackType::Audio => 0x20C997,
        TrackType::Graphic => 0xFAB005,
    }
}

/// Convert the editor's `BlendMode` to the compositor's `BlendMode`.
fn to_compositor_blend(mode: StateBlendMode) -> CompositorBlendMode {
    match mode {
        StateBlendMode::Normal => CompositorBlendMode::Normal,
        StateBlendMode::Multiply => CompositorBlendMode::Multiply,
        StateBlendMode::Screen => CompositorBlendMode::Screen,
        StateBlendMode::Overlay => CompositorBlendMode::Overlay,
        StateBlendMode::Darken => CompositorBlendMode::Darken,
        StateBlendMode::Lighten => CompositorBlendMode::Lighten,
        StateBlendMode::Add => CompositorBlendMode::PlusLighter,
        StateBlendMode::Subtract => CompositorBlendMode::Difference,
    }
}
