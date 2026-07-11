//! Font management — Segoe UI (Windows system font, closest to Inter).
//!
//! Creates + caches GDI fonts at multiple sizes. The web app uses Inter;
//! Segoe UI is the Windows system font that most closely matches it
//! (same humanist sans-serif geometry, native rendering, zero install).
//! Using a system font avoids bundling a .ttf and respects the user's
//! ClearType settings.

use windows::Win32::Graphics::Gdi::{
    CLIP_DEFAULT_PRECIS, CreateFontW, DEFAULT_CHARSET, DEFAULT_QUALITY, DeleteObject, FF_ROMAN,
    FF_SWISS, FONT_FAMILY, HFONT, OUT_DEFAULT_PRECIS,
};
use windows::core::PCWSTR;

/// Default pitch + variable-width family (matches FF_SWISS usage).
const DEFAULT_PITCH: u8 = 0;

/// Font sizes in pixels (matches web rem-based sizes at 96dpi).
pub const FONT_SIZE_HERO: i32 = 64; // web homepage hero text-[5.5rem] scaled down for 1280px window
pub const FONT_SIZE_DISPLAY: i32 = 44; // hero headline
pub const FONT_SIZE_TITLE: i32 = 20; // text-xl
pub const FONT_SIZE_HEADER: i32 = 16; // text-base
pub const FONT_SIZE_BODY: i32 = 14; // text-sm
pub const FONT_SIZE_SMALL: i32 = 12; // text-xs
pub const FONT_SIZE_TINY: i32 = 11; // text-[11px]

/// Font weight constants (matching Inter's weights).
pub const FW_REGULAR: i32 = 400;
pub const FW_MEDIUM: i32 = 500;
pub const FW_SEMIBOLD: i32 = 600;

/// Create a Segoe UI font at the given size + weight. Returns an HFONT
/// that the caller must delete with `DeleteObject` when done. Returns
/// None if the font can't be created (falls back to system default).
pub fn create_font(size: i32, weight: i32) -> Option<HFONT> {
    let face_name: Vec<u16> = "Segoe UI"
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let font = unsafe {
        CreateFontW(
            size,                                // nHeight
            0,                                   // nWidth (auto)
            0,                                   // nEscapement
            0,                                   // nOrientation
            weight,                              // fnWeight
            0,                                   // fdwItalic
            0,                                   // fdwUnderline
            0,                                   // fdwStrikeOut
            DEFAULT_CHARSET,                     // fdwCharSet
            OUT_DEFAULT_PRECIS,                  // fdwOutputPrecision
            CLIP_DEFAULT_PRECIS,                 // fdwClipPrecision
            DEFAULT_QUALITY,                     // fdwQuality
            (FF_SWISS.0 | DEFAULT_PITCH) as u32, // fdwPitchAndFamily
            PCWSTR(face_name.as_ptr()),          // lpszFace
        )
    };
    if font.is_invalid() { None } else { Some(font) }
}

/// Create a font with explicit face name, pitch/family, and optional
/// italic style. Used for the landing hero (Playfair-style serif).
fn create_font_with_face(
    size: i32,
    weight: i32,
    italic: bool,
    face: &str,
    family: FONT_FAMILY,
) -> Option<HFONT> {
    let face_name: Vec<u16> = face.encode_utf16().chain(std::iter::once(0)).collect();
    let font = unsafe {
        CreateFontW(
            size,
            0,
            0,
            0,
            weight,
            if italic { 1 } else { 0 },
            0,
            0,
            DEFAULT_CHARSET,
            OUT_DEFAULT_PRECIS,
            CLIP_DEFAULT_PRECIS,
            DEFAULT_QUALITY,
            (family.0 | DEFAULT_PITCH) as u32,
            PCWSTR(face_name.as_ptr()),
        )
    };
    if font.is_invalid() { None } else { Some(font) }
}

/// Create a serif display font for the hero "respects" word.
pub fn create_display_serif_italic(size: i32) -> Option<HFONT> {
    create_font_with_face(size, FW_SEMIBOLD, true, "Times New Roman", FF_ROMAN)
}

/// Create a larger, medium-weight serif italic for the homepage hero headline.
pub fn create_hero_serif_italic(size: i32) -> Option<HFONT> {
    create_font_with_face(size, FW_MEDIUM, true, "Times New Roman", FF_ROMAN)
}

/// A cached set of fonts at common sizes. Created once per window and
/// reused across paints. All fonts are deleted on drop.
pub struct FontCache {
    pub hero: HFONT,          // 64px medium landing headline
    pub hero_serif: HFONT,    // 64px serif italic for the hero headline
    pub display: HFONT,       // 44px semibold landing headline
    pub display_serif: HFONT, // 44px serif italic for the hero accent word
    pub title: HFONT,         // 20px semibold
    pub header: HFONT,        // 16px medium
    pub body: HFONT,          // 14px regular
    pub small: HFONT,         // 12px regular
    pub tiny: HFONT,          // 11px regular
}

impl FontCache {
    /// Create a font cache with all sizes. Falls back to system default
    /// if the requested face is unavailable.
    pub fn new() -> Self {
        Self {
            hero: create_font(FONT_SIZE_HERO, FW_MEDIUM).unwrap_or_default(),
            hero_serif: create_hero_serif_italic(FONT_SIZE_HERO).unwrap_or_default(),
            display: create_font(FONT_SIZE_DISPLAY, FW_SEMIBOLD).unwrap_or_default(),
            display_serif: create_display_serif_italic(FONT_SIZE_DISPLAY).unwrap_or_default(),
            title: create_font(FONT_SIZE_TITLE, FW_SEMIBOLD).unwrap_or_default(),
            header: create_font(FONT_SIZE_HEADER, FW_MEDIUM).unwrap_or_default(),
            body: create_font(FONT_SIZE_BODY, FW_REGULAR).unwrap_or_default(),
            small: create_font(FONT_SIZE_SMALL, FW_REGULAR).unwrap_or_default(),
            tiny: create_font(FONT_SIZE_TINY, FW_REGULAR).unwrap_or_default(),
        }
    }
}

impl Drop for FontCache {
    fn drop(&mut self) {
        unsafe {
            if !self.hero.is_invalid() {
                let _ = DeleteObject(self.hero.into());
            }
            if !self.hero_serif.is_invalid() {
                let _ = DeleteObject(self.hero_serif.into());
            }
            if !self.display.is_invalid() {
                let _ = DeleteObject(self.display.into());
            }
            if !self.display_serif.is_invalid() {
                let _ = DeleteObject(self.display_serif.into());
            }
            if !self.title.is_invalid() {
                let _ = DeleteObject(self.title.into());
            }
            if !self.header.is_invalid() {
                let _ = DeleteObject(self.header.into());
            }
            if !self.body.is_invalid() {
                let _ = DeleteObject(self.body.into());
            }
            if !self.small.is_invalid() {
                let _ = DeleteObject(self.small.into());
            }
            if !self.tiny.is_invalid() {
                let _ = DeleteObject(self.tiny.into());
            }
        }
    }
}

impl Default for FontCache {
    fn default() -> Self {
        Self::new()
    }
}
