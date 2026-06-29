//! Playback module — play/pause + frame-accurate playhead advance.
//!
//! Currently the playback logic lives in `window/shortcuts.rs` (Spacebar
//! handler + WM_TIMER handler). This module is the future home for
//! audio playback, scrubbing, and loop regions. Mirrors
//! `apps/desktop-web/src/playback/mod.rs`.
