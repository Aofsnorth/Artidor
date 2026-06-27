//! Artidor desktop Tauri backend.
//!
//! This is the native Rust process that runs alongside the web frontend.
//! It exposes commands for:
//! - Native WGPU rendering (via the existing `compositor` crate)
//! - Native file I/O (save/load projects)
//! - Native media import (image decode, texture upload)
//!
//! The web frontend detects Tauri via `@tauri-apps/api` and switches
//! from the WASM compositor to these native commands for better
//! performance.

use compositor::{Compositor, FrameDescriptor};
use gpu::GpuContext;
use tauri::State;

/// Holds the native WGPU compositor instance.
///
/// Created on first `init_compositor` call and reused for all subsequent
/// render calls. Mutex-protected because Tauri commands run on async
/// threads but the compositor is not Send-safe to share as &mut across
/// await points without a lock.
struct CompositorState {
    context: Option<GpuContext>,
    compositor: Option<Compositor>,
}

impl Default for CompositorState {
    fn default() -> Self {
        Self {
            context: None,
            compositor: None,
        }
    }
}

/// Initialize the native WGPU compositor.
///
/// Called once when the web frontend detects it is running in Tauri.
/// Creates a native GPU context (DX12 on Windows, Metal on macOS,
/// Vulkan on Linux) and a compositor instance.
///
/// Uses `spawn_blocking` because `GpuContext::new()` is async but WGPU
/// futures are not `Send` (they contain thread-local handles), so they
/// cannot cross Tauri's async command boundary directly.
#[tauri::command]
async fn init_compositor(
    _width: u32,
    _height: u32,
    state: State<'_, tauri::async_runtime::Mutex<CompositorState>>,
) -> Result<(), String> {
    let mut s = state.lock().await;

    if s.context.is_none() {
        // GpuContext::new() is async but not Send. We can't use
        // spawn_blocking for an async future. Instead, we use
        // tauri::async_runtime::block_on to run it on the current thread.
        let context = tauri::async_runtime::block_on(GpuContext::new())
            .map_err(|e| format!("GPU init failed: {e}"))?;
        let compositor = Compositor::new(&context);
        s.context = Some(context);
        s.compositor = Some(compositor);
    }

    Ok(())
}

/// Render a frame and return the BGRA pixel data.
///
/// The web frontend sends a `FrameDescriptor` (same JSON format as the
/// WASM compositor, camelCase) and receives raw BGRA bytes that it draws
/// to a canvas via `ImageData` + `putImageData`.
#[tauri::command]
async fn render_frame(
    frame: FrameDescriptor,
    state: State<'_, tauri::async_runtime::Mutex<CompositorState>>,
) -> Result<Vec<u8>, String> {
    let mut s = state.lock().await;

    // Take both context and compositor out of the state to avoid borrow
    // conflicts (render_frame_to_bytes needs &GpuContext and &mut Compositor,
    // which can't co-borrow through Option methods on the same struct).
    // Put them back after rendering.
    let context = s
        .context
        .take()
        .ok_or_else(|| "Compositor not initialized — call init_compositor first".to_string())?;
    let mut compositor = s
        .compositor
        .take()
        .ok_or_else(|| "Compositor not initialized — call init_compositor first".to_string())?;

    let result = compositor.render_frame_to_bytes(&context, &frame);

    s.context = Some(context);
    s.compositor = Some(compositor);

    result.map_err(|e| format!("Render failed: {e}"))
}

/// Check if the native compositor is ready.
#[tauri::command]
async fn is_compositor_ready(
    state: State<'_, tauri::async_runtime::Mutex<CompositorState>>,
) -> Result<bool, String> {
    let s = state.lock().await;
    Ok(s.compositor.is_some())
}

/// App configuration and entry point.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(tauri::async_runtime::Mutex::new(CompositorState::default()))
        .invoke_handler(tauri::generate_handler![
            init_compositor,
            render_frame,
            is_compositor_ready,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Artidor desktop");
}
