//! DirectWrite font cache for the D2D chrome.

use std::iter::once;

use windows::core::{w, BOOL, Error, PCWSTR, Result};
use windows::Win32::Foundation::E_FAIL;
use windows::Win32::Graphics::DirectWrite::{
    DWriteCreateFactory, DWRITE_FACTORY_TYPE_SHARED, DWRITE_FONT_STRETCH_NORMAL,
    DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_WEIGHT, DWRITE_FONT_WEIGHT_BOLD,
    DWRITE_FONT_WEIGHT_LIGHT, DWRITE_FONT_WEIGHT_NORMAL, DWRITE_PARAGRAPH_ALIGNMENT_NEAR,
    DWRITE_TEXT_ALIGNMENT_LEADING, DWRITE_WORD_WRAPPING_NO_WRAP, IDWriteFactory,
    IDWriteFontCollection, IDWriteTextFormat,
};
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

/// Cached DirectWrite text formats for the chrome.
pub struct D2dFontCache {
    pub body: IDWriteTextFormat,
    pub body_bold: IDWriteTextFormat,
    pub header: IDWriteTextFormat,
    pub title: IDWriteTextFormat,
    pub display: IDWriteTextFormat,
    pub display_serif: IDWriteTextFormat,
    pub small: IDWriteTextFormat,
    pub tiny: IDWriteTextFormat,
}

impl D2dFontCache {
    /// Create the DirectWrite factory and all text formats used by the UI.
    pub unsafe fn new() -> Result<Self> {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let dwrite: IDWriteFactory = DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED)?;
        let inter = Self::pick_family(&dwrite, "Inter", "Segoe UI")?;
        let serif = Self::pick_family(&dwrite, "Playfair Display", "Times New Roman")?;

        Ok(Self {
            body: Self::create_format(&dwrite, &inter, DWRITE_FONT_WEIGHT_NORMAL, 14.0)?,
            body_bold: Self::create_format(&dwrite, &inter, DWRITE_FONT_WEIGHT_BOLD, 14.0)?,
            header: Self::create_format(&dwrite, &inter, DWRITE_FONT_WEIGHT_NORMAL, 13.0)?,
            title: Self::create_format(&dwrite, &inter, DWRITE_FONT_WEIGHT_BOLD, 18.0)?,
            display: Self::create_format(&dwrite, &inter, DWRITE_FONT_WEIGHT_LIGHT, 24.0)?,
            display_serif: Self::create_format(&dwrite, &serif, DWRITE_FONT_WEIGHT_NORMAL, 24.0)?,
            small: Self::create_format(&dwrite, &inter, DWRITE_FONT_WEIGHT_NORMAL, 12.0)?,
            tiny: Self::create_format(&dwrite, &inter, DWRITE_FONT_WEIGHT_NORMAL, 10.0)?,
        })
    }

    unsafe fn create_format(
        dwrite: &IDWriteFactory,
        family: &[u16],
        weight: DWRITE_FONT_WEIGHT,
        size: f32,
    ) -> Result<IDWriteTextFormat> {
        let format = dwrite.CreateTextFormat(
            PCWSTR(family.as_ptr()),
            None::<&IDWriteFontCollection>,
            weight,
            DWRITE_FONT_STYLE_NORMAL,
            DWRITE_FONT_STRETCH_NORMAL,
            size,
            w!("en-us"),
        )?;
        format.SetWordWrapping(DWRITE_WORD_WRAPPING_NO_WRAP)?;
        format.SetTextAlignment(DWRITE_TEXT_ALIGNMENT_LEADING)?;
        format.SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_NEAR)?;
        Ok(format)
    }

    unsafe fn pick_family(
        dwrite: &IDWriteFactory,
        preferred: &str,
        fallback: &str,
    ) -> Result<Vec<u16>> {
        let preferred_u16: Vec<u16> = preferred.encode_utf16().chain(once(0)).collect();
        let fallback_u16: Vec<u16> = fallback.encode_utf16().chain(once(0)).collect();

        let mut collection: Option<IDWriteFontCollection> = None;
        dwrite.GetSystemFontCollection(&mut collection, false)?;
        let collection = collection.ok_or_else(|| Error::from_hresult(E_FAIL))?;

        let mut index = 0u32;
        let mut exists = BOOL(0);
        collection.FindFamilyName(PCWSTR(preferred_u16.as_ptr()), &mut index, &mut exists)?;
        if exists.as_bool() {
            return Ok(preferred_u16);
        }

        exists = BOOL(0);
        collection.FindFamilyName(PCWSTR(fallback_u16.as_ptr()), &mut index, &mut exists)?;
        if exists.as_bool() {
            return Ok(fallback_u16);
        }

        Ok(fallback_u16)
    }
}
