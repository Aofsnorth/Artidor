//! Playback engine — drives the playhead forward at the project's frame
//! rate using a high-precision timer.
//!
//! The engine runs on GPUI's background executor and notifies the editor
//! state at regular intervals. Frame-accurate timing is achieved by
//! accumulating elapsed time and converting to frames using the `artidor-time`
//! crate's frame rate math.

pub mod engine;

pub use engine::PlaybackEngine;
