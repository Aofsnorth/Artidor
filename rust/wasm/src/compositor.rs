#![cfg(target_arch = "wasm32")]

use std::cell::RefCell;

use compositor::{Compositor, FrameDescriptor, RenderFrameOptions};
use gpu::wgpu;
use js_sys::Object;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

use crate::gpu::{
    import_canvas_texture, read_offscreen_canvas_property, read_serde_property, read_u32_property,
    with_gpu_runtime,
};

/// Canvas type used by the compositor. Both main-thread and Worker paths
/// use OffscreenCanvas for uniform surface creation.
enum CompositorCanvas {
    Offscreen(web_sys::OffscreenCanvas),
}

struct CompositorRuntime {
    canvas: CompositorCanvas,
    compositor: Compositor,
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

        COMPOSITOR_RUNTIME.with(|runtime| {
            runtime.replace(Some(CompositorRuntime {
                canvas: CompositorCanvas::Offscreen(canvas),
                compositor,
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

        COMPOSITOR_RUNTIME.with(|runtime| {
            runtime.replace(Some(CompositorRuntime {
                canvas: CompositorCanvas::Offscreen(canvas),
                compositor,
            }));
        });

        Ok(())
    })
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

    with_gpu_runtime(|gpu_runtime| {
        COMPOSITOR_RUNTIME.with(|runtime| {
            let mut borrow = runtime.borrow_mut();
            let Some(runtime) = borrow.as_mut() else {
                return Err(JsValue::from_str(
                    "Compositor is not initialized. Call initCompositor() first.",
                ));
            };

            let texture = import_canvas_texture(
                &gpu_runtime.context,
                &source,
                width,
                height,
                "compositor-upload-texture",
            );
            runtime.compositor.upsert_texture(id, texture);
            Ok(())
        })
    })
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

    with_gpu_runtime(|gpu_runtime| {
        COMPOSITOR_RUNTIME.with(|runtime| {
            let mut borrow = runtime.borrow_mut();
            let Some(runtime) = borrow.as_mut() else {
                return Err(JsValue::from_str(
                    "Compositor is not initialized. Call initCompositor() first.",
                ));
            };

            // Both main-thread and Worker paths use OffscreenCanvas for surface creation
            let surface = match &runtime.canvas {
                CompositorCanvas::Offscreen(canvas) => gpu_runtime
                    .context
                    .instance()
                    .create_surface(wgpu::SurfaceTarget::OffscreenCanvas(canvas.clone()))
                    .map_err(|error| JsValue::from_str(&error.to_string()))?,
            };

            runtime
                .compositor
                .render_frame(
                    &gpu_runtime.context,
                    RenderFrameOptions {
                        frame: &frame,
                        surface: &surface,
                    },
                )
                .map_err(|error| JsValue::from_str(&error.to_string()))
        })
    })
}

#[derive(Debug)]
struct UploadTextureOptions {
    id: String,
    source: wgpu::web_sys::OffscreenCanvas,
    width: u32,
    height: u32,
}

fn parse_upload_texture_options(value: JsValue) -> Result<UploadTextureOptions, JsValue> {
    let object: Object = value
        .dyn_into()
        .map_err(|_| JsValue::from_str("uploadTexture expects an options object"))?;

    Ok(UploadTextureOptions {
        id: read_serde_property(&object, "id")?,
        source: read_offscreen_canvas_property(&object, "source")?,
        width: read_u32_property(&object, "width")?,
        height: read_u32_property(&object, "height")?,
    })
}
