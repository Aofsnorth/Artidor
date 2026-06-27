//! UI module — all GPUI panels and layout components for the editor.
//!
//! The layout mirrors the web app:
//! - Header (project name, export, settings)
//! - Middle row: Toolbar + Assets Panel + Viewport (WGPU) + Inspector
//! - Timeline (tracks, ruler, playhead)
//! - Footer (playback controls, time, status)

pub mod ai;
pub mod assets;
pub mod editor_layout;
pub mod footer;
pub mod header;
pub mod inspector;
pub mod tab_bar;
pub mod timeline;
pub mod viewport_panel;
