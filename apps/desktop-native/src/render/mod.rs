//! Native WGPU/D3D12 compositor renderer — top-1 preview path.
//!
//! Zero CPU readback: the compositor renders directly to the DXGI surface
//! created from the viewport child HWND. Reuses the repo's own `gpu` +
//! `compositor` crates (no new GPU dependency).
//!
//! Mirrors `apps/desktop-web/src/render/mod.rs`.

pub mod viewport;

use std::num::NonZeroIsize;

use compositor::{CanvasClearDescriptor, Compositor, FrameDescriptor, RenderFrameOptions};
use gpu::{GpuContext, wgpu};
use pollster::block_on;
use windows::Win32::Foundation::HWND;

use crate::export;
use crate::state::Project;
use crate::theme::EDITOR_BG_CLEAR;

/// The native compositor renderer. Owns the GPU context, compositor
/// pipeline, and the DXGI surface created from the viewport child HWND.
pub struct Renderer {
    context: GpuContext,
    compositor: Compositor,
    surface: wgpu::Surface<'static>,
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
        })
    }

    /// Render a single frame to the surface at the given dimensions.
    pub fn render(&mut self, width: u32, height: u32) -> Result<(), compositor::CompositorError> {
        if width == 0 || height == 0 {
            return Ok(());
        }
        let frame = FrameDescriptor {
            width,
            height,
            clear: CanvasClearDescriptor {
                color: EDITOR_BG_CLEAR,
            },
            items: Vec::new(),
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
}
