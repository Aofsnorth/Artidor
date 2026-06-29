//! Artidor — native desktop video editor.
//!
//! Built with GPUI (Zed's GPU-accelerated UI framework) for the UI shell
//! and the shared WGPU compositor crate for canvas rendering. All
//! non-UI logic lives in `rust/` — this binary is purely a UI shell that
//! drives the compositor, playback engine, and editor state.

mod actions;
mod app;
mod media;
mod playback;
mod render;
mod shortcuts;
mod state;
mod theme;
mod ui;

fn main() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp(None)
        .init();

    log::info!("Starting Artidor desktop editor");

    app::run();
}
