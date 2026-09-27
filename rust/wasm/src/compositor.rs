#![cfg(target_arch = "wasm32")]

use std::cell::RefCell;

use compositor::{Compositor, FrameDescriptor, RenderFrameOptions};
use gpu::wgpu;
use js_sys::Object;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

use crate::gpu::{
    import_external_image, read_external_image_source, read_serde_property, read_u32_property,
    with_gpu_runtime,
};

/// Canvas type used by the compositor. Both main-thread and Worker paths
/// use OffscreenCanvas for uniform surface creation.
enum CompositorCanvas {
    Offscreen(web_sys::OffscreenCanvas),
}

struct CompositorRuntime {
    canvas: CompositorCanvas,
    // Created ONCE at init and reused for every frame. Creating a fresh
    // `wgpu::Surface` per `renderFrame` call leaked swapchains: each
    // `create_surface` + `configure` allocates a new backbuffer set on the
    // same OffscreenCanvas, and the abandoned ones only return to the driver
    // after JS GC catches up. A 60fps preview therefore climbed steadily
    // towards GPU OOM, which surfaces as `createBuffer` failing on a tiny
    // 48-byte uniform buffer with a misleading "size is too large" error,
    // which panics inside wgpu and bricks the compositor for good.
    surface: wgpu::Surface<'static>,
    compositor: Compositor,
    // Last (width, height) the surface was configured for. `renderFrame`
    // runs at export/preview rates (60+/s) and reconfiguring an unchanged
    // surface churns backbuffers for no benefit; the size comparison is
    // exact because JS clamps frame dimensions before they reach the GPU.
    configured_size: Option<(u32, u32)>,
}

thread_local! {
    static COMPOSITOR_RUNTIME: RefCell<Option<CompositorRuntime>> = const { RefCell::new(None) };
}

/// Initialize compositor with a new canvas (main-thread fallback).
/// Creates an HTMLCanvasElement and transfers it to an OffscreenCanvas.
#[wasm_bindgen(js_name = initCompositor)]
pub fn init_compositor(width: u32, height: u32) -> Result<(), JsValue> {
    with_gpu_runtime(|gpu_runtime| {
        let document = web_sys::window()
            .and_then(|window| window.document())
            .ok_or_else(|| JsValue::from_str("Document is not available"))?;
        let html_canvas: web_sys::HtmlCanvasElement = document
            .create_element("canvas")?
            .dyn_into()
            .map_err(|_| JsValue::from_str("Failed to create compositor canvas"))?;
        html_canvas.set_width(width);
        html_canvas.set_height(height);

        // Transfer to OffscreenCanvas for uniform surface creation
        let canvas: web_sys::OffscreenCanvas = html_canvas
            .transfer_control_to_offscreen()
            .map_err(|e| JsValue::from_str(&format!("transferControlToOffscreen failed: {e:?}")))?;

        let compositor = Compositor::new(&gpu_runtime.context);
        let surface = gpu_runtime
            .context
            .instance()
            .create_surface(wgpu::SurfaceTarget::OffscreenCanvas(canvas.clone()))
            .map_err(|error| JsValue::from_str(&error.to_string()))?;

        COMPOSITOR_RUNTIME.with(|runtime| {
            runtime.replace(Some(CompositorRuntime {
                canvas: CompositorCanvas::Offscreen(canvas),
                surface,
                compositor,
                configured_size: None,
            }));
        });

        Ok(())
    })
}

/// Initialize compositor with an external OffscreenCanvas (Worker path).
/// The canvas is typically transferred from the main thread via postMessage.
#[wasm_bindgen(js_name = initCompositorWithCanvas)]
pub fn init_compositor_with_canvas(canvas: web_sys::OffscreenCanvas) -> Result<(), JsValue> {
    with_gpu_runtime(|gpu_runtime| {
        let compositor = Compositor::new(&gpu_runtime.context);
        let surface = gpu_runtime
            .context
            .instance()
            .create_surface(wgpu::SurfaceTarget::OffscreenCanvas(canvas.clone()))
            .map_err(|error| JsValue::from_str(&error.to_string()))?;

        COMPOSITOR_RUNTIME.with(|runtime| {
            runtime.replace(Some(CompositorRuntime {
                canvas: CompositorCanvas::Offscreen(canvas),
                surface,
                compositor,
                configured_size: None,
            }));
        });

        Ok(())
    })
}

/// Drop the compositor runtime (canvas handle, surface, textures) without
/// touching the GPU runtime. Paired with `destroyGpu` by the JS layer when
/// the main thread deliberately hands the GPU over to an export worker: the
/// preview's textures and swapchain are released so the export device gets
/// the full GPU budget, and the next `initCompositor` rebuilds everything.
#[wasm_bindgen(js_name = destroyCompositor)]
pub fn destroy_compositor() -> Result<(), JsValue> {
    COMPOSITOR_RUNTIME.with(|cell| {
        cell.replace(None);
    });
    Ok(())
}

#[wasm_bindgen(js_name = resizeCompositor)]
pub fn resize_compositor(width: u32, height: u32) -> Result<(), JsValue> {
    COMPOSITOR_RUNTIME.with(|runtime| {
        let mut borrow = runtime.borrow_mut();
        let Some(runtime) = borrow.as_mut() else {
            return Err(JsValue::from_str(
                "Compositor is not initialized. Call initCompositor() first.",
            ));
        };
        match &runtime.canvas {
            CompositorCanvas::Offscreen(canvas) => {
                canvas.set_width(width);
                canvas.set_height(height);
            }
        }
        // The backing store changed size, so the surface must be reconfigured
        // on the next render even if the frame descriptor repeats this size.
        runtime.configured_size = None;
        Ok(())
    })
}

#[wasm_bindgen(js_name = getCompositorCanvas)]
pub fn get_compositor_canvas() -> Result<web_sys::OffscreenCanvas, JsValue> {
    COMPOSITOR_RUNTIME.with(|runtime| {
        let borrow = runtime.borrow();
        let Some(runtime) = borrow.as_ref() else {
            return Err(JsValue::from_str(
                "Compositor is not initialized. Call initCompositor() first.",
            ));
        };
        match &runtime.canvas {
            CompositorCanvas::Offscreen(canvas) => Ok(canvas.clone()),
        }
    })
}

#[wasm_bindgen(js_name = uploadTexture)]
pub fn upload_texture(options: JsValue) -> Result<(), JsValue> {
    let UploadTextureOptions {
        id,
        source,
        width,
        height,
    } = parse_upload_texture_options(options)?;

    // Take BOTH runtimes out of their cells for the duration of the upload.
    // wasm panics do not run Rust destructors, so a `borrow_mut()` held across
    // a panicking `import_external_image` would strand the `RefCell` flag and
    // turn every later call into `RefCell already borrowed`. With the cells
    // empty, a panic leaves them EMPTY — the next call reports "not
    // initialized" and the JS recovery path can rebuild.
    let Some(gpu_runtime) = crate::gpu::take_gpu_runtime() else {
        return Err(JsValue::from_str(
            "GPU context not initialized. Call initializeGpu() first.",
        ));
    };
    let result = COMPOSITOR_RUNTIME.with(|cell| {
        let Some(mut runtime) = cell.replace(None) else {
            return Err(JsValue::from_str(
                "Compositor is not initialized. Call initCompositor() first.",
            ));
        };

        let texture = import_external_image(
            &gpu_runtime.context,
            &source,
            width,
            height,
            "compositor-upload-texture",
        );
        runtime.compositor.upsert_texture(id, texture);
        cell.replace(Some(runtime));
        Ok(())
    });
    crate::gpu::restore_gpu_runtime(gpu_runtime);
    result
}

#[wasm_bindgen(js_name = releaseTexture)]
pub fn release_texture(id: String) -> Result<(), JsValue> {
    COMPOSITOR_RUNTIME.with(|runtime| {
        let mut borrow = runtime.borrow_mut();
        let Some(runtime) = borrow.as_mut() else {
            return Err(JsValue::from_str(
                "Compositor is not initialized. Call initCompositor() first.",
            ));
        };
        runtime.compositor.release_texture(&id);
        Ok(())
    })
}

#[wasm_bindgen(js_name = renderFrame)]
pub fn render_frame(options: JsValue) -> Result<(), JsValue> {
    let frame: FrameDescriptor = serde_wasm_bindgen::from_value(options)
        .map_err(|error| JsValue::from_str(&format!("Invalid frame descriptor: {error}")))?;

    // Same take/restore pattern as `upload_texture`: a panic anywhere inside
    // `render_frame` (wgpu `createBuffer` failures, device loss, OOM) leaves
    // both cells EMPTY instead of stuck-borrowed, so the JS-side recovery
    // (`markDeviceLost` -> `destroyGpu` -> `initializeGpu` -> re-init) can
    // actually rebuild instead of panicking forever on `RefCell already
    // borrowed`.
    let Some(gpu_runtime) = crate::gpu::take_gpu_runtime() else {
        return Err(JsValue::from_str(
            "GPU context not initialized. Call initializeGpu() first.",
        ));
    };
    let result = COMPOSITOR_RUNTIME.with(|cell| {
        let Some(mut runtime) = cell.replace(None) else {
            return Err(JsValue::from_str(
                "Compositor is not initialized. Call initCompositor() first.",
            ));
        };

        // Reconfigure only when the size actually changed. configure() on
        // an unchanged surface is pure backbuffer churn — a 60 fps export
        // reconfigured 36,000 times over ten minutes for nothing. Errors are
        // folded into `result` (not `?`) so the runtime is always restored to
        // the cell below, even when configuration fails.
        let result = if runtime.configured_size != Some((frame.width, frame.height)) {
            gpu_runtime
                .context
                .configure_surface(&runtime.surface, frame.width, frame.height)
                .map_err(|error| JsValue::from_str(&error.to_string()))
                .and_then(|()| {
                    runtime.configured_size = Some((frame.width, frame.height));
                    runtime
                        .compositor
                        .render_frame(
                            &gpu_runtime.context,
                            RenderFrameOptions {
                                frame: &frame,
                                surface: &runtime.surface,
                            },
                        )
                        .map_err(|error| JsValue::from_str(&error.to_string()))
                })
        } else {
            runtime
                .compositor
                .render_frame(
                    &gpu_runtime.context,
                    RenderFrameOptions {
                        frame: &frame,
                        surface: &runtime.surface,
                    },
                )
                .map_err(|error| JsValue::from_str(&error.to_string()))
        };
        cell.replace(Some(runtime));
        result
    });
    crate::gpu::restore_gpu_runtime(gpu_runtime);
    result
}

#[derive(Debug)]
struct UploadTextureOptions {
    id: String,
    source: wgpu::ExternalImageSource,
    width: u32,
    height: u32,
}

fn parse_upload_texture_options(value: JsValue) -> Result<UploadTextureOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("uploadTexture expects an options object"))?;

    Ok(UploadTextureOptions {
        id: read_serde_property(&object, "id")?,
        source: read_external_image_source(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
    })
}
