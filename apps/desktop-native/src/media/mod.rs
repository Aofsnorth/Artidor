//! Media module — media import + asset management.
//!
//! Currently the import logic lives in `window/shortcuts.rs` (Ctrl+I
//! handler). This module is the future home for media decoding,
//! thumbnail generation, and waveform extraction. Mirrors
//! `apps/desktop-web/src/media/mod.rs`.
//!
//! Sensitive-path note: this module never touches user media remotely.
//! All file I/O is local via `std::fs` (local-first, per AGENTS.md).
