//! Viewport renderer — owns the WGPU `GpuContext` and `Compositor`, renders
//! frames offscreen, and converts the result to a GPUI-displayable image.
//!
//! Architecture:
//! 1. `GpuContext::new()` creates a WGPU instance/adapter/device (DX12 on
//!    Windows, Metal on macOS, Vulkan on Linux).
//! 2. `Compositor::new()` builds the render pipelines (layer, blend, mask).
//! 3. On each frame, `render_frame_to_bytes()` composites the scene to a
//!    BGRA8 texture, copies it to a CPU buffer, and returns the raw bytes.
//! 4. The bytes are wrapped in a GPUI `RenderImage` and displayed via
//!    `img()`.
//!
//! The GPU readback is the only copy — the compositor's internal
//! ping-pong textures stay on the GPU. At 1080p this is ~8MB/frame which
//! DX12 can DMA to system memory in under 1ms on modern hardware.

#![allow(dead_code)]

use compositor::{Compositor, CompositorError, FrameDescriptor};
use gpu::{GpuContext, wgpu};
use gpui::{ImageSource, RenderImage};
use image::{Frame, ImageBuffer, Rgba};
use smallvec::SmallVec;
use std::sync::Arc;

/// The state of the viewport — either uninitialized, ready, or errored.
pub enum ViewportState {
    /// GPU context is being created (async).
    Initializing,
    /// GPU context and compositor are ready.
    Ready(ViewportRenderer),
    /// GPU initialization failed.
    Failed(String),
}

/// The active viewport renderer — holds the WGPU context and compositor.
pub struct ViewportRenderer {
    context: GpuContext,
    compositor: Compositor,
}

/// The result of rendering a frame — raw BGRA bytes + dimensions.
pub struct RenderedFrame {
    pub bytes: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

impl ViewportRenderer {
    /// Creates a new renderer by acquiring a WGPU device.
    ///
    /// This is async on WGPU's side but we block on it with `pollster`
    /// since GPUI's initialization is synchronous.
    pub fn new() -> Result<Self, String> {
        let context = pollster::block_on(GpuContext::new())
            .map_err(|e| format!("Failed to create GPU context: {e}"))?;
        let compositor = Compositor::new(&context);
        Ok(Self {
            context,
            compositor,
        })
    }

    /// Renders a frame descriptor to raw BGRA bytes.
    pub fn render(&mut self, frame: &FrameDescriptor) -> Result<RenderedFrame, CompositorError> {
        let width = frame.width;
        let height = frame.height;
        let bytes = self
            .compositor
            .render_frame_to_bytes(&self.context, frame)?;
        Ok(RenderedFrame {
            bytes,
            width,
            height,
        })
    }

    /// Uploads a raw RGBA8 image as a named texture to the compositor.
    pub fn upload_texture(
        &mut self,
        id: &str,
        rgba_bytes: &[u8],
        width: u32,
        height: u32,
    ) -> Result<(), String> {
        let texture = self
            .context
            .create_render_texture(width, height, "viewport-upload");

        // The compositor uses Bgra8Unorm, so we need to convert RGBA → BGRA.
        let bgra_bytes: Vec<u8> = rgba_bytes
            .chunks_exact(4)
            .flat_map(|pixel| [pixel[2], pixel[1], pixel[0], pixel[3]])
            .collect();

        self.context.queue().write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &bgra_bytes,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(width * 4),
                rows_per_image: Some(height),
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );

        self.compositor.upsert_texture(id.to_string(), texture);
        Ok(())
    }

    /// Removes a texture from the compositor.
    pub fn release_texture(&mut self, id: &str) {
        self.compositor.release_texture(id);
    }
}

/// Converts a `RenderedFrame` (raw BGRA bytes) into a GPUI `ImageSource`.
///
/// GPUI's `RenderImage` expects data in BGRA format (matching its internal
/// GPU texture format), which is exactly what the compositor produces.
///
/// Returns `None` if the byte buffer does not match `width * height * 4`
/// (e.g. WGPU returned a partial buffer or the GPU context was lost).
/// The caller should treat `None` as "no frame this tick" rather than
/// crashing — a transient mismatch during resize or device-lost recovery
/// is recoverable on the next render.
pub fn rendered_frame_to_image_source(rendered: &RenderedFrame) -> Option<ImageSource> {
    let expected_len = (rendered.width as usize)
        .saturating_mul(rendered.height as usize)
        .saturating_mul(4);
    if rendered.bytes.len() != expected_len {
        log::warn!(
            "Rendered frame byte count {} != expected {} ({}x{}x4); skipping frame",
            rendered.bytes.len(),
            expected_len,
            rendered.width,
            rendered.height
        );
        return None;
    }
    let buffer: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(rendered.width, rendered.height, rendered.bytes.clone())?;
    let frame = Frame::new(buffer);
    let render_image = RenderImage::new(SmallVec::from_elem(frame, 1));
    Some(ImageSource::Render(Arc::new(render_image)))
}
