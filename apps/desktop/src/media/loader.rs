//! Image loader — reads image files from disk and decodes them to RGBA8.
//!
//! Uses the `image` crate (already a dependency via GPUI) for decoding.
//! The decoded RGBA bytes are then uploaded to the WGPU compositor as a
//! named texture.

use crate::state::project::ElementType;
use image::ImageReader;
use std::path::Path;

/// The type of media detected from a file extension.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaType {
    Image,
    Video,
    Audio,
    Unknown,
}

/// Detects the media type from a file extension.
pub fn detect_media_type(path: &Path) -> MediaType {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "png" | "jpg" | "jpeg" | "bmp" | "webp" | "gif" | "tiff" | "tga" => MediaType::Image,
        "mp4" | "mov" | "avi" | "mkv" | "webm" | "m4v" | "wmv" | "flv" => MediaType::Video,
        "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a" | "wma" => MediaType::Audio,
        _ => MediaType::Unknown,
    }
}

/// Maps a `MediaType` to an `ElementType` for timeline placement.
pub fn media_type_to_element_type(media_type: MediaType) -> ElementType {
    match media_type {
        MediaType::Image => ElementType::Image,
        MediaType::Video => ElementType::Video,
        MediaType::Audio => ElementType::Audio,
        MediaType::Unknown => ElementType::Graphic,
    }
}

/// Decoded image data — raw RGBA8 bytes + dimensions.
pub struct DecodedImage {
    pub rgba_bytes: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// Loads an image file from disk and decodes it to RGBA8.
///
/// Returns an error if the file cannot be read or is not a supported image
/// format.
pub fn load_image_to_rgba(path: &Path) -> Result<DecodedImage, String> {
    let reader = ImageReader::open(path)
        .map_err(|e| format!("Failed to open file '{}': {e}", path.display()))?;

    let reader = reader
        .with_guessed_format()
        .map_err(|e| format!("Failed to determine image format: {e}"))?;

    let image = reader
        .decode()
        .map_err(|e| format!("Failed to decode image: {e}"))?;

    let rgba = image.to_rgba8();
    let width = rgba.width();
    let height = rgba.height();

    Ok(DecodedImage {
        rgba_bytes: rgba.into_raw(),
        width,
        height,
    })
}
