//! Artidor desktop Tauri backend.
//!
//! Native Rust process that runs alongside the web frontend.
//! Exposes commands for:
//! - Native WGPU rendering (via the existing `compositor` crate)
//! - Native file I/O (save/load projects, read media files)
//! - Native media import (file paths, not blob URLs)
//! - Native window/menu management
//!
//! The web frontend detects Tauri via `@tauri-apps/api` and switches
//! from the WASM compositor + IndexedDB to these native commands for
//! better performance and native filesystem access.

use compositor::{Compositor, FrameDescriptor};
use gpu::GpuContext;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State, WebviewWindow};
use tauri_plugin_dialog::DialogExt;

// ---------------------------------------------------------------------------
// Compositor state
// ---------------------------------------------------------------------------

/// Holds the native WGPU compositor instance.
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
#[tauri::command]
async fn init_compositor(
    _width: u32,
    _height: u32,
    state: State<'_, tauri::async_runtime::Mutex<CompositorState>>,
) -> Result<(), String> {
    let mut s = state.lock().await;

    if s.context.is_none() {
        let context = GpuContext::new()
            .await
            .map_err(|e| format!("GPU init failed: {e}"))?;
        let compositor = Compositor::new(&context);
        s.context = Some(context);
        s.compositor = Some(compositor);
    }

    Ok(())
}

/// Render a frame and return BGRA pixel data.
#[tauri::command]
async fn render_frame(
    frame: FrameDescriptor,
    state: State<'_, tauri::async_runtime::Mutex<CompositorState>>,
) -> Result<Vec<u8>, String> {
    let mut s = state.lock().await;

    let context = s
        .context
        .take()
        .ok_or_else(|| "Compositor not initialized".to_string())?;
    let mut compositor = s
        .compositor
        .take()
        .ok_or_else(|| "Compositor not initialized".to_string())?;

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

// ---------------------------------------------------------------------------
// Native filesystem — project save/load
// ---------------------------------------------------------------------------

/// Save project JSON to a native file. Returns the path written.
#[tauri::command]
async fn save_project_file(
    app: AppHandle,
    content: String,
    suggested_name: Option<String>,
) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Option<PathBuf>>();

    app.dialog()
        .file()
        .set_title("Save Artidor Project")
        .add_filter("Artidor Project", &["artpr"])
        .set_file_name(suggested_name.as_deref().unwrap_or("untitled.artpr"))
        .save_file(move |file_path| {
            let path = file_path.and_then(|f| f.into_path().ok());
            let _ = tx.send(path);
        });

    let path = rx.recv().map_err(|e| format!("Dialog error: {e}"))?;

    let Some(path) = path else {
        return Ok(None);
    };

    tokio::fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write file: {e}"))?;

    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Load project JSON from a native file. Returns the file content + path.
#[tauri::command]
async fn load_project_file(app: AppHandle) -> Result<Option<(String, String)>, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Option<PathBuf>>();

    app.dialog()
        .file()
        .set_title("Open Artidor Project")
        .add_filter("Artidor Project", &["artpr"])
        .pick_file(move |file_path| {
            let path = file_path.and_then(|f| f.into_path().ok());
            let _ = tx.send(path);
        });

    let path = rx.recv().map_err(|e| format!("Dialog error: {e}"))?;

    let Some(path) = path else {
        return Ok(None);
    };

    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file: {e}"))?;

    Ok(Some((content, path.to_string_lossy().into_owned())))
}

// ---------------------------------------------------------------------------
// Native media import — return file paths instead of blob URLs
// ---------------------------------------------------------------------------

/// Open a native file picker for media files. Returns selected file paths.
#[tauri::command]
async fn pick_media_files(app: AppHandle) -> Result<Vec<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel::<Vec<PathBuf>>();

    app.dialog()
        .file()
        .set_title("Import Media")
        .add_filter(
            "Media Files",
            &[
                "mp4", "mov", "avi", "mkv", "webm", "m4v", "mp3", "wav", "m4a", "aac", "ogg",
                "flac", "png", "jpg", "jpeg", "webp", "gif", "bmp",
            ],
        )
        .pick_files(move |file_path| {
            // Callback receives Option<Vec<FilePath>>
            use tauri_plugin_dialog::FilePath;
            let paths: Vec<PathBuf> = file_path
                .unwrap_or_default()
                .into_iter()
                .filter_map(|f| match f {
                    FilePath::Url(url) => url.to_file_path().ok(),
                    FilePath::Path(p) => Some(p),
                })
                .collect();
            let _ = tx.send(paths);
        });

    let paths = rx.recv().map_err(|e| format!("Dialog error: {e}"))?;

    Ok(paths
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect())
}

/// Read a native file as bytes (for media that needs to be loaded into memory).
#[tauri::command]
async fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    tokio::fs::read(&path)
        .await
        .map_err(|e| format!("Failed to read file {path}: {e}"))
}

/// Read a native file as text (for project files).
#[tauri::command]
async fn read_file_text(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file {path}: {e}"))
}

/// Get file metadata (size, name) without reading the full file.
#[tauri::command]
async fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let metadata = tokio::fs::metadata(&path)
        .await
        .map_err(|e| format!("Failed to stat file {path}: {e}"))?;

    let name = std::path::Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();

    Ok(FileMetadata {
        name,
        size: metadata.len(),
        path,
    })
}

#[derive(serde::Serialize)]
struct FileMetadata {
    name: String,
    size: u64,
    path: String,
}

/// Convert a native file path to a `asset://localhost/` URL that the
/// Tauri webview can load directly. This avoids reading the file into
/// memory and creating a blob URL — the webview streams from disk.
#[tauri::command]
async fn file_to_asset_url(path: String) -> Result<String, String> {
    // Tauri's `convertFileSrc` on the JS side does this, but we also
    // expose it here for convenience. The JS side should prefer
    // `@tauri-apps/api/core.convertFileSrc` directly.
    let normalized = path.replace('\\', "/");
    Ok(format!("asset://localhost/{}", normalized))
}

// ---------------------------------------------------------------------------
// Window management
// ---------------------------------------------------------------------------

/// Toggle fullscreen mode.
#[tauri::command]
async fn toggle_fullscreen(window: WebviewWindow) -> Result<(), String> {
    let is_full = window
        .is_fullscreen()
        .map_err(|e| format!("Failed to check fullscreen: {e}"))?;
    window
        .set_fullscreen(!is_full)
        .map_err(|e| format!("Failed to toggle fullscreen: {e}"))
}

/// Set window title.
#[tauri::command]
async fn set_window_title(window: WebviewWindow, title: String) -> Result<(), String> {
    window
        .set_title(&title)
        .map_err(|e| format!("Failed to set title: {e}"))
}

/// Minimize window.
#[tauri::command]
async fn minimize_window(window: WebviewWindow) -> Result<(), String> {
    window
        .minimize()
        .map_err(|e| format!("Failed to minimize: {e}"))
}

/// Close window (quit app).
#[tauri::command]
async fn close_window(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| format!("Failed to close: {e}"))
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .manage(tauri::async_runtime::Mutex::new(CompositorState::default()))
        .invoke_handler(tauri::generate_handler![
            // Compositor
            init_compositor,
            render_frame,
            is_compositor_ready,
            // Filesystem
            save_project_file,
            load_project_file,
            read_file_bytes,
            read_file_text,
            get_file_metadata,
            file_to_asset_url,
            // Media
            pick_media_files,
            // Window
            toggle_fullscreen,
            set_window_title,
            minimize_window,
            close_window,
        ])
        .setup(|app| {
            // Set window title
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Artidor");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Artidor desktop");
}
