#![cfg(target_arch = "wasm32")]

use std::cell::{Cell, RefCell};

use effects::EffectPipeline;
use gpu::{GpuContext, wgpu};
use js_sys::{Object, Reflect};
use masks::MaskFeatherPipeline;
use serde::Deserialize;
use wasm_bindgen::{JsCast, JsValue, prelude::wasm_bindgen};

pub(crate) struct GpuRuntime {
    pub(crate) context: GpuContext,
    pub(crate) effects: EffectPipeline,
    pub(crate) masks: MaskFeatherPipeline,
}

/// Fallback limit used before `initializeGpu` has read the real device limit.
/// 8192 is WebGPU's default `maxTextureDimension2D`.
const DEFAULT_MAX_TEXTURE_DIMENSION_2D: u32 = 8192;

thread_local! {
    static GPU_RUNTIME: RefCell<Option<GpuRuntime>> = const { RefCell::new(None) };
    /// Device limit captured at initialization so the JS-boundary readers can
    /// reject oversized dimensions before they reach texture creation.
    static MAX_TEXTURE_DIMENSION_2D: Cell<u32> =
        const { Cell::new(DEFAULT_MAX_TEXTURE_DIMENSION_2D) };
}

#[wasm_bindgen(js_name = initializeGpu)]
pub async fn initialize_gpu() -> Result<(), JsValue> {
    console_error_panic_hook::set_once();

    if GPU_RUNTIME.with(|runtime| runtime.borrow().is_some()) {
        return Ok(());
    }

    let context = GpuContext::new()
        .await
        .map_err(|error| JsValue::from_str(&error.to_string()))?;
    MAX_TEXTURE_DIMENSION_2D.with(|max| {
        max.set(context.device().limits().max_texture_dimension_2d);
    });
    let effects = EffectPipeline::new(&context);
    let masks = MaskFeatherPipeline::new(&context);

    GPU_RUNTIME.with(|runtime| {
        runtime.replace(Some(GpuRuntime {
            context,
            effects,
            masks,
        }));
    });

    Ok(())
}

/// Drop the current GPU runtime so the next `initializeGpu` call creates a
/// fresh device. Used to recover from device-lost errors.
#[wasm_bindgen(js_name = destroyGpu)]
pub fn destroy_gpu() {
    GPU_RUNTIME.with(|runtime| {
        runtime.replace(None);
    });
    MAX_TEXTURE_DIMENSION_2D.with(|max| max.set(DEFAULT_MAX_TEXTURE_DIMENSION_2D));
}

/// Run `action` against the GPU runtime.
///
/// Uses the same take/restore pattern as [`take_gpu_runtime`]'s other
/// callers rather than holding a `RefCell` borrow across `action`: wasm
/// panics do not run Rust destructors, so a borrow left held across a
/// panicking wgpu call is stranded forever and every later access panics
/// with `RefCell already borrowed`. Taking the value OUT means a panic
/// leaves the cell empty — a recoverable "not initialized" state that the
/// JS-side recovery already handles — instead of permanently poisoned.
pub(crate) fn with_gpu_runtime<T>(
    action: impl FnOnce(&GpuRuntime) -> Result<T, JsValue>,
) -> Result<T, JsValue> {
    let Some(gpu_runtime) = take_gpu_runtime() else {
        return Err(JsValue::from_str(
            "GPU context not initialized. Call initializeGpu() first.",
        ));
    };
    let result = action(&gpu_runtime);
    restore_gpu_runtime(gpu_runtime);
    result
}

/// Take the GPU runtime OUT of its cell, leaving it empty.
///
/// wasm panics do not run Rust destructors, so any `RefCell` borrow held
/// across a panicking wgpu call is stranded forever — every later access
/// panics with `RefCell already borrowed`. Callers that drive panicky GPU
/// work (`uploadTexture`, `renderFrame`) use this plus
/// [`restore_gpu_runtime`] instead of [`with_gpu_runtime`]: the cells are
/// empty while the risky code runs, so a panic leaves them empty (a
/// recoverable "not initialized" state) rather than stuck-borrowed.
pub(crate) fn take_gpu_runtime() -> Option<GpuRuntime> {
    GPU_RUNTIME.with(|runtime| runtime.replace(None))
}

/// Put a runtime taken by [`take_gpu_runtime`] back into its cell.
pub(crate) fn restore_gpu_runtime(runtime: GpuRuntime) {
    GPU_RUNTIME.with(|cell| cell.replace(Some(runtime)));
}

pub(crate) fn import_external_image(
    context: &GpuContext,
    source: &wgpu::ExternalImageSource,
    width: u32,
    height: u32,
    label: &'static str,
) -> wgpu::Texture {
    context.import_external_image(source, width, height, label)
}

pub(crate) fn render_texture_to_canvas(
    context: &GpuContext,
    texture: &wgpu::Texture,
    width: u32,
    height: u32,
) -> Result<wgpu::web_sys::OffscreenCanvas, JsValue> {
    let canvas = wgpu::web_sys::OffscreenCanvas::new(width, height)?;
    context
        .render_texture_to_offscreen_canvas(texture, &canvas, width, height)
        .map_err(|error| JsValue::from_str(&error.to_string()))?;
    Ok(canvas)
}

pub(crate) fn read_property(object: &Object, name: &str) -> Result<JsValue, JsValue> {
    Reflect::get(object, &JsValue::from_str(name))
        .map_err(|_| JsValue::from_str(&format!("Missing property '{name}'")))
}

pub(crate) fn read_external_image_source(
    object: &Object,
    name: &str,
) -> Result<wgpu::ExternalImageSource, JsValue> {
    parse_external_image_source(read_property(object, name)?)
}

pub(crate) fn parse_external_image_source(
    value: JsValue,
) -> Result<wgpu::ExternalImageSource, JsValue> {
    if let Some(bitmap) = value.dyn_ref::<wgpu::web_sys::ImageBitmap>() {
        return Ok(wgpu::ExternalImageSource::ImageBitmap(bitmap.clone()));
    }
    if let Some(image) = value.dyn_ref::<wgpu::web_sys::HtmlImageElement>() {
        return Ok(wgpu::ExternalImageSource::HTMLImageElement(image.clone()));
    }
    if let Some(video) = value.dyn_ref::<wgpu::web_sys::HtmlVideoElement>() {
        return Ok(wgpu::ExternalImageSource::HTMLVideoElement(video.clone()));
    }
    if let Some(canvas) = value.dyn_ref::<wgpu::web_sys::HtmlCanvasElement>() {
        return Ok(wgpu::ExternalImageSource::HTMLCanvasElement(canvas.clone()));
    }
    if let Some(canvas) = value.dyn_ref::<wgpu::web_sys::OffscreenCanvas>() {
        return Ok(wgpu::ExternalImageSource::OffscreenCanvas(canvas.clone()));
    }
    if let Some(data) = value.dyn_ref::<wgpu::web_sys::ImageData>() {
        return Ok(wgpu::ExternalImageSource::ImageData(data.clone()));
    }

    Err(JsValue::from_str(
        "source must be an ImageBitmap, HTMLImageElement, HTMLVideoElement, HTMLCanvasElement, OffscreenCanvas, or ImageData",
    ))
}

/// Reads a texture dimension from a JS options object.
///
/// Dimensions must be finite whole numbers in `1..=maxTextureDimension2D`.
/// Accepting the raw `as u32` cast would turn `NaN`/negatives into `0` and
/// huge values into `u32::MAX`, which fail later inside texture/canvas
/// creation rather than as a clear error here.
pub(crate) fn read_u32_property(object: &Object, name: &str) -> Result<u32, JsValue> {
    let value = read_property(object, name)?;
    let Some(number) = value.as_f64() else {
        return Err(JsValue::from_str(&format!(
            "Property '{name}' must be a number"
        )));
    };
    let max = MAX_TEXTURE_DIMENSION_2D.with(Cell::get);
    GpuContext::validate_texture_dimension(number, max).ok_or_else(|| {
        JsValue::from_str(&format!(
            "Property '{name}' must be an integer in 1..={max}, got {number}"
        ))
    })
}

pub(crate) fn read_f32_property(object: &Object, name: &str) -> Result<f32, JsValue> {
    let value = read_property(object, name)?;
    let Some(number) = value.as_f64() else {
        return Err(JsValue::from_str(&format!(
            "Property '{name}' must be a number"
        )));
    };
    Ok(number as f32)
}

pub(crate) fn read_serde_property<T>(object: &Object, name: &str) -> Result<T, JsValue>
where
    T: for<'de> Deserialize<'de>,
{
    let value = read_property(object, name)?;
    serde_wasm_bindgen::from_value(value)
        .map_err(|error| JsValue::from_str(&format!("Invalid property '{name}': {error}")))
}
