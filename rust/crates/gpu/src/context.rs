use wgpu::util::DeviceExt;

#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
use wasm_bindgen::JsCast;

use crate::{FULLSCREEN_SHADER_SOURCE, GpuError};

#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
#[derive(Debug)]
struct WebDisplay;

#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
impl wgpu::rwh::HasDisplayHandle for WebDisplay {
    fn display_handle(&self) -> Result<wgpu::rwh::DisplayHandle<'_>, wgpu::rwh::HandleError> {
        let raw = wgpu::rwh::WebDisplayHandle::new();
        Ok(unsafe { wgpu::rwh::DisplayHandle::borrow_raw(raw.into()) })
    }
}

/// 2D scratch canvas used by the `OffscreenCanvas` upload fallback.
///
/// Held by [`GpuContext`] so the fallback reuses one canvas instead of
/// allocating a 2D backing store per layer per frame. Caching the canvas is
/// enough to cache the context too: `getContext("2d")` returns the *same*
/// context object for a given canvas, so the repeated lookup is a plain
/// attribute read rather than a new surface.
#[cfg(all(feature = "wasm", target_arch = "wasm32"))]
struct ExternalImageScratch {
    width: u32,
    height: u32,
    canvas: web_sys::OffscreenCanvas,
}

const BLIT_SHADER_SOURCE: &str = include_str!("shaders/blit.wgsl");

const FULLSCREEN_QUAD_POSITIONS: [[f32; 2]; 6] = [
    [-1.0, -1.0],
    [1.0, -1.0],
    [-1.0, 1.0],
    [-1.0, 1.0],
    [1.0, -1.0],
    [1.0, 1.0],
];

pub struct GpuContext {
    instance: wgpu::Instance,
    adapter: wgpu::Adapter,
    device: wgpu::Device,
    queue: wgpu::Queue,
    texture_format: wgpu::TextureFormat,
    fullscreen_quad: wgpu::Buffer,
    linear_sampler: wgpu::Sampler,
    nearest_sampler: wgpu::Sampler,
    texture_sampler_bind_group_layout: wgpu::BindGroupLayout,
    blit_pipeline: wgpu::RenderPipeline,
    #[allow(dead_code)] // Read in #[cfg(wasm)] methods
    supports_external_texture_copies: bool,
    /// Shared 2D scratch surface for the `OffscreenCanvas` upload fallback, so
    /// a fallback upload reuses one canvas instead of allocating a 2D backing
    /// store per layer per frame. Web-only: it holds a `web_sys` handle, so on
    /// native targets `GpuContext` keeps its `Send + Sync` bounds.
    #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
    external_image_scratch: std::sync::Mutex<Option<ExternalImageScratch>>,
}

impl GpuContext {
    pub async fn new() -> Result<Self, GpuError> {
        let (instance, adapter, device, queue) = Self::acquire_device().await?;
        #[allow(unused_mut)]
        let mut texture_format = if adapter.get_info().backend == wgpu::Backend::Gl {
            wgpu::TextureFormat::Rgba8Unorm
        } else {
            wgpu::TextureFormat::Bgra8Unorm
        };

        #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
        {
            if let Some(window) = web_sys::window() {
                if let Some(document) = window.document() {
                    if let Ok(canvas) = document.create_element("canvas") {
                        if let Ok(canvas) = canvas.dyn_into::<web_sys::HtmlCanvasElement>() {
                            if let Ok(surface) =
                                instance.create_surface(wgpu::SurfaceTarget::Canvas(canvas))
                            {
                                let caps = surface.get_capabilities(&adapter);
                                if !caps.formats.is_empty() {
                                    texture_format = caps.formats[0];
                                }
                            }
                        }
                    }
                }
            }
        }
        let fullscreen_quad = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("gpu-fullscreen-quad-buffer"),
            contents: bytemuck::cast_slice(&FULLSCREEN_QUAD_POSITIONS),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let linear_sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("gpu-linear-sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            mipmap_filter: wgpu::MipmapFilterMode::Nearest,
            ..Default::default()
        });
        let nearest_sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("gpu-nearest-sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Nearest,
            min_filter: wgpu::FilterMode::Nearest,
            mipmap_filter: wgpu::MipmapFilterMode::Nearest,
            ..Default::default()
        });
        let texture_sampler_bind_group_layout =
            device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                label: Some("gpu-texture-sampler-bind-group-layout"),
                entries: &[
                    wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Texture {
                            multisampled: false,
                            view_dimension: wgpu::TextureViewDimension::D2,
                            sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        },
                        count: None,
                    },
                    wgpu::BindGroupLayoutEntry {
                        binding: 1,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                        count: None,
                    },
                ],
            });
        let vertex_shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("gpu-fullscreen-shader"),
            source: wgpu::ShaderSource::Wgsl(FULLSCREEN_SHADER_SOURCE.into()),
        });
        let blit_shader_module = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("gpu-blit-shader"),
            source: wgpu::ShaderSource::Wgsl(BLIT_SHADER_SOURCE.into()),
        });
        let blit_pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("gpu-blit-pipeline-layout"),
            bind_group_layouts: &[Some(&texture_sampler_bind_group_layout)],
            immediate_size: 0,
        });
        let blit_pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("gpu-blit-pipeline"),
            layout: Some(&blit_pipeline_layout),
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
                module: &blit_shader_module,
                entry_point: Some("fragment_main"),
                targets: &[Some(wgpu::ColorTargetState {
                    format: texture_format,
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
        });

        let supports_external_texture_copies = adapter
            .get_downlevel_capabilities()
            .flags
            .contains(wgpu::DownlevelFlags::UNRESTRICTED_EXTERNAL_TEXTURE_COPIES);

        Ok(Self {
            instance,
            adapter,
            device,
            queue,
            texture_format,
            fullscreen_quad,
            linear_sampler,
            nearest_sampler,
            texture_sampler_bind_group_layout,
            blit_pipeline,
            supports_external_texture_copies,
            #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
            external_image_scratch: std::sync::Mutex::new(None),
        })
    }

    async fn acquire_device()
    -> Result<(wgpu::Instance, wgpu::Adapter, wgpu::Device, wgpu::Queue), GpuError> {
        let instance = wgpu::util::new_instance_with_webgpu_detection(
            wgpu::InstanceDescriptor::new_without_display_handle(),
        )
        .await;

        match Self::try_request_device(&instance, None).await {
            Ok((adapter, device, queue)) => return Ok((instance, adapter, device, queue)),
            Err(_) => {}
        }

        Self::try_gl_fallback().await
    }

    #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
    async fn try_gl_fallback()
    -> Result<(wgpu::Instance, wgpu::Adapter, wgpu::Device, wgpu::Queue), GpuError> {
        let mut gl_desc = wgpu::InstanceDescriptor::new_without_display_handle();
        gl_desc.backends = wgpu::Backends::GL;
        gl_desc.display = Some(Box::new(WebDisplay));
        let gl_instance = wgpu::Instance::new(gl_desc);

        let document = web_sys::window()
            .and_then(|w| w.document())
            .ok_or(GpuError::AdapterUnavailable)?;
        let canvas: web_sys::HtmlCanvasElement = document
            .create_element("canvas")
            .map_err(|_| GpuError::AdapterUnavailable)?
            .unchecked_into();
        canvas.set_width(1);
        canvas.set_height(1);
        let surface = gl_instance.create_surface(wgpu::SurfaceTarget::Canvas(canvas))?;

        let (adapter, device, queue) =
            Self::try_request_device(&gl_instance, Some(&surface)).await?;
        Ok((gl_instance, adapter, device, queue))
    }

    #[cfg(not(all(feature = "wasm", target_arch = "wasm32")))]
    async fn try_gl_fallback()
    -> Result<(wgpu::Instance, wgpu::Adapter, wgpu::Device, wgpu::Queue), GpuError> {
        Err(GpuError::AdapterUnavailable)
    }

    async fn try_request_device(
        instance: &wgpu::Instance,
        compatible_surface: Option<&wgpu::Surface<'_>>,
    ) -> Result<(wgpu::Adapter, wgpu::Device, wgpu::Queue), GpuError> {
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface,
                force_fallback_adapter: false,
            })
            .await
            .map_err(|_| GpuError::AdapterUnavailable)?;

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("gpu-device"),
                // Nothing is requested, and that is deliberate rather than an
                // oversight. `supports_external_texture_copies` — the flag that
                // decides whether an `OffscreenCanvas` can be uploaded with a
                // zero-copy `copy_external_image_to_texture` or has to fall back
                // to a `getImageData` readback — is a **downlevel capability the
                // adapter reports**
                // (`DownlevelFlags::UNRESTRICTED_EXTERNAL_TEXTURE_COPIES`), not a
                // `wgpu::Features` bit, so it cannot be turned on here. It is
                // additionally never set on WebGL, which is a first-class path
                // for this crate (`try_gl_fallback`, and the WebGL2 downlevel
                // limits requested below). The nearest `Features` bit,
                // `EXTERNAL_TEXTURE`, is for WebGPU's `GPUExternalTexture` and is
                // DX12/Metal only, so requesting it would fail device creation
                // outright on the web. Read the real capability in `new` and
                // branch on it in `import_external_image` instead.
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_webgl2_defaults()
                    .using_resolution(adapter.limits()),
                memory_hints: wgpu::MemoryHints::Performance,
                experimental_features: wgpu::ExperimentalFeatures::disabled(),
                trace: wgpu::Trace::Off,
            })
            .await?;

        Ok((adapter, device, queue))
    }

    pub fn create_render_texture(
        &self,
        width: u32,
        height: u32,
        label: &'static str,
    ) -> wgpu::Texture {
        self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some(label),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: self.texture_format,
            usage: wgpu::TextureUsages::TEXTURE_BINDING
                | wgpu::TextureUsages::COPY_DST
                | wgpu::TextureUsages::COPY_SRC
                | wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        })
    }

    pub fn instance(&self) -> &wgpu::Instance {
        &self.instance
    }

    pub fn adapter(&self) -> &wgpu::Adapter {
        &self.adapter
    }

    pub fn device(&self) -> &wgpu::Device {
        &self.device
    }

    pub fn queue(&self) -> &wgpu::Queue {
        &self.queue
    }

    pub fn texture_format(&self) -> wgpu::TextureFormat {
        self.texture_format
    }

    pub fn fullscreen_quad(&self) -> &wgpu::Buffer {
        &self.fullscreen_quad
    }

    pub fn linear_sampler(&self) -> &wgpu::Sampler {
        &self.linear_sampler
    }

    pub fn nearest_sampler(&self) -> &wgpu::Sampler {
        &self.nearest_sampler
    }

    pub fn texture_sampler_bind_group_layout(&self) -> &wgpu::BindGroupLayout {
        &self.texture_sampler_bind_group_layout
    }

    pub fn blit_pipeline(&self) -> &wgpu::RenderPipeline {
        &self.blit_pipeline
    }

    pub fn render_texture_to_surface(
        &self,
        texture: &wgpu::Texture,
        surface: &wgpu::Surface<'_>,
        width: u32,
        height: u32,
    ) -> Result<(), GpuError> {
        self.configure_surface(surface, width, height)?;
        let surface_texture = self.acquire_surface_texture(surface)?;
        let target_view = surface_texture
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("gpu-surface-blit-encoder"),
            });
        self.encode_texture_blit_to_view(&mut encoder, texture, &target_view, "gpu-surface-blit");
        self.queue.submit([encoder.finish()]);
        surface_texture.present();
        Ok(())
    }

    /// Configures `surface` for the given size.
    ///
    /// Every call reconfigures. An earlier version skipped this when the
    /// surface's heap address and size matched the previous frame, on the
    /// assumption that the surface was cached and therefore stable. It is not:
    /// the compositor builds a fresh `wgpu::Surface` per frame, and WASM reuses
    /// freed addresses, so a brand-new surface routinely matches the old
    /// address and skips `configure()` — presenting nothing at all, i.e. a
    /// black canvas with no error. Correctness over one swapchain reconfigure
    /// per frame; the cost is negligible next to the draw itself.
    pub fn configure_surface(
        &self,
        surface: &wgpu::Surface<'_>,
        width: u32,
        height: u32,
    ) -> Result<(), GpuError> {
        let mut config = surface
            .get_default_config(&self.adapter, width, height)
            .ok_or(GpuError::UnsupportedSurfaceFormat)?;

        let capabilities = surface.get_capabilities(&self.adapter);
        if capabilities.formats.contains(&self.texture_format) {
            config.format = self.texture_format;
        } else {
            return Err(GpuError::UnsupportedSurfaceFormat);
        }

        surface.configure(&self.device, &config);
        Ok(())
    }

    pub fn acquire_surface_texture(
        &self,
        surface: &wgpu::Surface<'_>,
    ) -> Result<wgpu::SurfaceTexture, GpuError> {
        match surface.get_current_texture() {
            wgpu::CurrentSurfaceTexture::Success(surface_texture)
            | wgpu::CurrentSurfaceTexture::Suboptimal(surface_texture) => Ok(surface_texture),
            wgpu::CurrentSurfaceTexture::Timeout
            | wgpu::CurrentSurfaceTexture::Occluded
            | wgpu::CurrentSurfaceTexture::Outdated
            | wgpu::CurrentSurfaceTexture::Lost
            | wgpu::CurrentSurfaceTexture::Validation => Err(GpuError::UnsupportedSurfaceFormat),
        }
    }

    pub fn encode_texture_blit_to_view(
        &self,
        encoder: &mut wgpu::CommandEncoder,
        texture: &wgpu::Texture,
        target_view: &wgpu::TextureView,
        label: &'static str,
    ) {
        let source_view = texture.create_view(&wgpu::TextureViewDescriptor::default());
        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("gpu-blit-bind-group"),
            layout: &self.texture_sampler_bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(&source_view),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::Sampler(&self.linear_sampler),
                },
            ],
        });

        let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some(label),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: target_view,
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
        render_pass.set_pipeline(&self.blit_pipeline);
        render_pass.set_vertex_buffer(0, self.fullscreen_quad.slice(..));
        render_pass.set_bind_group(0, &bind_group, &[]);
        render_pass.draw(0..6, 0..1);
    }

    #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
    pub fn import_external_image(
        &self,
        source: &wgpu::ExternalImageSource,
        width: u32,
        height: u32,
        label: &'static str,
    ) -> wgpu::Texture {
        let texture = self.create_render_texture(width, height, label);

        // copy_external_image_to_texture can use the source directly for every
        // CanvasImageSource type except OffscreenCanvas, which needs the
        // UNRESTRICTED_EXTERNAL_TEXTURE_COPIES downlevel flag. For unsupported
        // OffscreenCanvas, fall back to reading the 2D context and writing the
        // pixels. For every other source, this is a zero-copy GPU upload.
        let can_copy_directly = self.supports_external_texture_copies
            || !matches!(source, wgpu::ExternalImageSource::OffscreenCanvas(_));

        if can_copy_directly {
            self.queue.copy_external_image_to_texture(
                &wgpu::CopyExternalImageSourceInfo {
                    source: source.clone(),
                    origin: wgpu::Origin2d::ZERO,
                    flip_y: false,
                },
                wgpu::CopyExternalImageDestInfo {
                    texture: &texture,
                    mip_level: 0,
                    origin: wgpu::Origin3d::ZERO,
                    aspect: wgpu::TextureAspect::All,
                    color_space: wgpu::PredefinedColorSpace::Srgb,
                    premultiplied_alpha: false,
                },
                wgpu::Extent3d {
                    width,
                    height,
                    depth_or_array_layers: 1,
                },
            );
        } else {
            let rgba_bytes = self.read_external_image_pixels(source, width, height);

            let pixel_bytes = if self.texture_format == wgpu::TextureFormat::Bgra8Unorm {
                let mut bytes = rgba_bytes;
                for pixel in bytes.chunks_exact_mut(4) {
                    pixel.swap(0, 2);
                }
                bytes
            } else {
                rgba_bytes
            };

            self.queue.write_texture(
                wgpu::TexelCopyTextureInfo {
                    texture: &texture,
                    mip_level: 0,
                    origin: wgpu::Origin3d::ZERO,
                    aspect: wgpu::TextureAspect::All,
                },
                &pixel_bytes,
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
        }

        texture
    }

    #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
    fn read_external_image_pixels(
        &self,
        source: &wgpu::ExternalImageSource,
        width: u32,
        height: u32,
    ) -> Vec<u8> {
        if let wgpu::ExternalImageSource::ImageData(image_data) = source {
            return image_data.data().0;
        }

        let scratch = self.external_image_scratch(width, height);
        let ctx: web_sys::OffscreenCanvasRenderingContext2d = scratch
            .as_ref()
            .expect("scratch canvas is created on demand")
            .canvas
            .get_context("2d")
            .ok()
            .flatten()
            .expect("Failed to get 2d context for texture import")
            .unchecked_into();

        // The scratch canvas is reused across layers, so it must start empty.
        // `draw_image` only writes the destination area it actually covers, so
        // without this a source with transparent edges would leave the previous
        // layer's pixels in the region this one does not paint — a smear that
        // reads as a rendering bug.
        ctx.clear_rect(0.0, 0.0, width as f64, height as f64);

        match source {
            wgpu::ExternalImageSource::ImageBitmap(bitmap) => ctx
                .draw_image_with_image_bitmap(bitmap, 0.0, 0.0)
                .expect("Failed to draw ImageBitmap"),
            wgpu::ExternalImageSource::HTMLImageElement(image) => ctx
                .draw_image_with_html_image_element(image, 0.0, 0.0)
                .expect("Failed to draw HTMLImageElement"),
            wgpu::ExternalImageSource::HTMLVideoElement(video) => ctx
                .draw_image_with_html_video_element(video, 0.0, 0.0)
                .expect("Failed to draw HTMLVideoElement"),
            wgpu::ExternalImageSource::HTMLCanvasElement(canvas) => ctx
                .draw_image_with_html_canvas_element(canvas, 0.0, 0.0)
                .expect("Failed to draw HTMLCanvasElement"),
            wgpu::ExternalImageSource::OffscreenCanvas(canvas) => ctx
                .draw_image_with_offscreen_canvas(canvas, 0.0, 0.0)
                .expect("Failed to draw OffscreenCanvas"),
            wgpu::ExternalImageSource::ImageData(_) => unreachable!(),
        };

        // `ImageData::data` already hands back an owned `Vec`, so it is taken by
        // value rather than copied again: at 1080p that second copy was 8 MB of
        // pointless memcpy on every canvas layer of every frame.
        ctx.get_image_data(0.0, 0.0, width as f64, height as f64)
            .expect("Failed to read pixel data from fallback canvas")
            .data()
            .0
    }

    /// Returns the shared scratch canvas, creating or resizing it as needed.
    ///
    /// The fallback runs once per canvas layer per frame, and
    /// `OffscreenCanvas::new` allocates a fresh 2D backing store every time.
    /// One cached canvas removes that per-frame churn; the size is re-checked on
    /// every call so a resized layer or project still reads back at the right
    /// dimensions.
    #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
    fn external_image_scratch(
        &self,
        width: u32,
        height: u32,
    ) -> std::sync::MutexGuard<'_, Option<ExternalImageScratch>> {
        let mut scratch = self
            .external_image_scratch
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());

        let needs_new = scratch
            .as_ref()
            .is_none_or(|s| s.width != width || s.height != height);
        if needs_new {
            *scratch = Some(ExternalImageScratch {
                width,
                height,
                canvas: web_sys::OffscreenCanvas::new(width, height)
                    .expect("Failed to create fallback texture canvas"),
            });
        }

        scratch
    }

    #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
    pub fn render_texture_to_offscreen_canvas(
        &self,
        texture: &wgpu::Texture,
        canvas: &wgpu::web_sys::OffscreenCanvas,
        width: u32,
        height: u32,
    ) -> Result<(), GpuError> {
        if self.supports_external_texture_copies {
            let surface = self
                .instance
                .create_surface(wgpu::SurfaceTarget::OffscreenCanvas(canvas.clone()))?;
            return self.render_texture_to_surface(texture, &surface, width, height);
        }

        self.readback_texture_to_offscreen_canvas(texture, canvas, width, height)
    }

    #[cfg(all(feature = "wasm", target_arch = "wasm32"))]
    fn readback_texture_to_offscreen_canvas(
        &self,
        texture: &wgpu::Texture,
        canvas: &wgpu::web_sys::OffscreenCanvas,
        width: u32,
        height: u32,
    ) -> Result<(), GpuError> {
        let buffer_size = (width * height * 4) as u64;
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("gpu-readback-buffer"),
            size: buffer_size,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("gpu-readback-encoder"),
            });
        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo {
                texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::TexelCopyBufferInfo {
                buffer: &buffer,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(width * 4),
                    rows_per_image: Some(height),
                },
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );
        self.queue.submit([encoder.finish()]);

        let slice = buffer.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        let _ = self.device.poll(wgpu::PollType::wait_indefinitely());

        let data = slice.get_mapped_range();
        let mut rgba_bytes = data.to_vec();
        drop(data);
        buffer.unmap();

        if self.texture_format == wgpu::TextureFormat::Bgra8Unorm {
            for pixel in rgba_bytes.chunks_exact_mut(4) {
                pixel.swap(0, 2);
            }
        }

        let clamped = wasm_bindgen::Clamped(&rgba_bytes[..]);
        let image_data =
            web_sys::ImageData::new_with_u8_clamped_array_and_sh(clamped, width, height)
                .map_err(|_| GpuError::AdapterUnavailable)?;

        let ctx: web_sys::OffscreenCanvasRenderingContext2d = canvas
            .get_context("2d")
            .ok()
            .flatten()
            .ok_or(GpuError::AdapterUnavailable)?
            .unchecked_into();
        ctx.put_image_data(&image_data, 0.0, 0.0)
            .map_err(|_| GpuError::AdapterUnavailable)?;

        Ok(())
    }
}
