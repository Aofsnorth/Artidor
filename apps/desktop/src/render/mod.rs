//! Render module — WGPU viewport integration.
//!
//! The compositor renders frames offscreen to a WGPU texture, copies the
//! result to a CPU-readable buffer, and the viewport panel converts those
//! raw BGRA bytes into a GPUI `RenderImage` for display.
//!
//! This is the "TOP 1" approach for GPUI + WGPU integration: the
//! compositor owns the GPU pipeline (shaders, textures, effects) while
//! GPUI handles only UI chrome. The two GPU contexts are separate but
//! the data handoff is a single buffer copy per frame — fast enough for
//! real-time 60fps preview at 1080p.

pub mod scene;
pub mod viewport;
