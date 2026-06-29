//! Media loading — native file I/O for importing images and decoding them
//! to RGBA pixel data that can be uploaded to the WGPU compositor.
//!
//! Video frame extraction (via FFmpeg) is a future enhancement. For now,
//! the desktop app supports image imports (PNG, JPEG, BMP, WebP) which
//! cover the most common use case for static layers and masks.

pub mod loader;

pub use loader::{MediaType, detect_media_type, load_image_to_rgba, media_type_to_element_type};
