//! Native Win32 common dialogs — file dialogs (`GetOpenFileNameW` /
//! `GetSaveFileNameW`) and a text-input prompt dialog
//! (`DialogBoxIndirectParamW` with an in-memory template).
//!
//! Increment 6c: replaces the fixed-cwd Ctrl+S path (Increment 6a) with
//! real native file dialogs, and provides the open dialog for Ctrl+O
//! (load project) and Ctrl+I (media import). These are the standard
//! Win32 common dialogs — no new third-party dependency, just the
//! `windows` crate's `Win32_UI_Controls` feature (Microsoft's official
//! binding to the common-dialog API, same dependency decision as the
//! rest of the shell).
//!
//! Increment 4d: adds `prompt_dialog` — a modal text-input dialog built
//! from an in-memory `DLGTEMPLATE` (no resource file needed). Used by
//! the rename-project shortcut (Ctrl+R).
//!
//! Scope: thin typed wrappers that return `Option<PathBuf>` /
//! `Option<String>` (`None` = user cancelled, `Err` = a real Win32
//! failure). No business logic here — callers decide what to do.

use std::ffi::OsString;
use std::os::windows::ffi::OsStringExt;
use std::path::PathBuf;

use windows::Win32::Foundation::{HWND, LPARAM, WPARAM};
use windows::Win32::UI::Controls::Dialogs::{
    COMMON_DLG_ERRORS, CommDlgExtendedError, GetOpenFileNameW, GetSaveFileNameW, OFN_EXPLORER,
    OFN_FILEMUSTEXIST, OFN_HIDEREADONLY, OFN_OVERWRITEPROMPT, OFN_PATHMUSTEXIST, OPENFILENAMEW,
};
use windows::Win32::UI::Controls::EM_SETSEL;
use windows::Win32::UI::WindowsAndMessaging::{
    EndDialog, GWLP_USERDATA, GetDlgItemTextW, GetWindowLongPtrW, SendDlgItemMessageW,
    SetDlgItemTextW, SetWindowLongPtrW,
};
use windows::core::PCWSTR;

/// Errors from the common-dialog wrappers. Kept explicit (no `any`).
#[derive(Debug, thiserror::Error)]
pub enum DialogError {
    #[error("Common dialog failed (Win32 error {0})")]
    Failed(u32),
    #[error("Common dialog buffer too small")]
    BufferTooSmall,
}

/// Filter entry: a display label + semicolon-separated extension list.
/// E.g. `Filter("Artidor project", "*.artpr.json")`.
pub struct Filter {
    pub label: &'static str,
    pub extensions: &'static str,
}

impl Filter {
    /// Build the Win32 filter string for an `OPENFILENAMEW` struct.
    /// Format: `"Label\0*.ext1;*.ext2\0"` per entry, double-NUL
    /// terminated. All filters are concatenated into one wide buffer.
    fn build_wide(filters: &[Filter]) -> Vec<u16> {
        let mut buf = Vec::new();
        for f in filters {
            extend_utf16(&mut buf, f.label);
            buf.push(0);
            extend_utf16(&mut buf, f.extensions);
            buf.push(0);
        }
        buf.push(0); // double-NUL terminator
        buf
    }
}

fn extend_utf16(buf: &mut Vec<u16>, s: &str) {
    buf.extend(s.encode_utf16());
}

/// Show a native "Save As" dialog. Returns `Ok(Some(path))` on confirm,
/// `Ok(None)` if the user cancelled, `Err` on a real dialog failure.
///
/// `default_name` is the suggested filename (without directory). The
/// dialog starts in the current working directory.
pub fn save_dialog(
    owner: HWND,
    title: &str,
    filters: &[Filter],
    default_ext: &str,
    default_name: &str,
) -> Result<Option<PathBuf>, DialogError> {
    unsafe {
        let filter_buf = Filter::build_wide(filters);
        let mut title_buf: Vec<u16> = title.encode_utf16().collect();
        title_buf.push(0);
        let mut ext_buf: Vec<u16> = default_ext.encode_utf16().collect();
        ext_buf.push(0);
        let mut name_buf: Vec<u16> = default_name.encode_utf16().collect();
        name_buf.push(0);
        // The file-path buffer must be pre-allocated. MAX_PATH (260) is
        // the classic limit; 4096 is a safe modern size that handles
        // long paths without overflow.
        let mut path_buf = vec![0u16; 4096];
        let name_len = name_buf.len().saturating_sub(1); // exclude NUL
        if name_len >= path_buf.len() {
            return Err(DialogError::BufferTooSmall);
        }
        path_buf[..name_len].copy_from_slice(&name_buf[..name_len]);

        let mut ofn: OPENFILENAMEW = core::mem::zeroed();
        ofn.lStructSize = core::mem::size_of::<OPENFILENAMEW>() as u32;
        ofn.hwndOwner = owner;
        ofn.lpstrFilter = PCWSTR(filter_buf.as_ptr());
        ofn.lpstrTitle = PCWSTR(title_buf.as_ptr());
        ofn.lpstrDefExt = PCWSTR(ext_buf.as_ptr());
        ofn.lpstrFile = windows::core::PWSTR(path_buf.as_mut_ptr());
        ofn.nMaxFile = path_buf.len() as u32;
        ofn.Flags = OFN_EXPLORER | OFN_HIDEREADONLY | OFN_OVERWRITEPROMPT | OFN_PATHMUSTEXIST;

        if GetSaveFileNameW(&mut ofn).as_bool() {
            Ok(Some(extract_path(&path_buf)))
        } else {
            // FALSE = cancel OR error. CommDlgExtendedError() == 0 means
            // the user cancelled (no error); any non-zero code is a real
            // common-dialog failure.
            let err = CommDlgExtendedError();
            if err == COMMON_DLG_ERRORS(0) {
                Ok(None)
            } else {
                Err(DialogError::Failed(err.0))
            }
        }
    }
}

/// Show a native "Open" dialog. Returns `Ok(Some(path))` on confirm,
/// `Ok(None)` if the user cancelled, `Err` on a real dialog failure.
pub fn open_dialog(
    owner: HWND,
    title: &str,
    filters: &[Filter],
) -> Result<Option<PathBuf>, DialogError> {
    unsafe {
        let filter_buf = Filter::build_wide(filters);
        let mut title_buf: Vec<u16> = title.encode_utf16().collect();
        title_buf.push(0);
        let mut path_buf = vec![0u16; 4096];

        let mut ofn: OPENFILENAMEW = core::mem::zeroed();
        ofn.lStructSize = core::mem::size_of::<OPENFILENAMEW>() as u32;
        ofn.hwndOwner = owner;
        ofn.lpstrFilter = PCWSTR(filter_buf.as_ptr());
        ofn.lpstrTitle = PCWSTR(title_buf.as_ptr());
        ofn.lpstrFile = windows::core::PWSTR(path_buf.as_mut_ptr());
        ofn.nMaxFile = path_buf.len() as u32;
        ofn.Flags = OFN_EXPLORER | OFN_HIDEREADONLY | OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST;

        if GetOpenFileNameW(&mut ofn).as_bool() {
            Ok(Some(extract_path(&path_buf)))
        } else {
            let err = CommDlgExtendedError();
            if err == COMMON_DLG_ERRORS(0) {
                Ok(None)
            } else {
                Err(DialogError::Failed(err.0))
            }
        }
    }
}

/// Extract a `PathBuf` from a NUL-terminated UTF-16 buffer.
fn extract_path(buf: &[u16]) -> PathBuf {
    let len = buf.iter().position(|&c| c == 0).unwrap_or(buf.len());
    OsString::from_wide(&buf[..len]).into()
}

// ---------------------------------------------------------------------------
// Text-input prompt dialog (Increment 4d — rename project)
// ---------------------------------------------------------------------------

/// Raw Win32 style constants used by the in-memory dialog template.
/// Using raw values avoids adding more `windows` crate features for
/// constants that live in obscure sub-modules (e.g. `SS_LEFT` is in
/// `Win32_System_SystemServices`). Values from the Win32 SDK headers.
mod raw_styles {
    pub const WS_POPUP: u32 = 0x8000_0000;
    pub const WS_CHILD: u32 = 0x4000_0000;
    pub const WS_VISIBLE: u32 = 0x1000_0000;
    pub const WS_CAPTION: u32 = 0x00C0_0000;
    pub const WS_SYSMENU: u32 = 0x0008_0000;
    pub const WS_BORDER: u32 = 0x0080_0000;
    pub const WS_TABSTOP: u32 = 0x0001_0000;
    pub const DS_CENTER: u32 = 0x0000_0800;
    pub const DS_MODALFRAME: u32 = 0x0000_0080;
    pub const SS_LEFT: u32 = 0x0000_0000;
    pub const ES_AUTOHSCROLL: u32 = 0x0000_0080;
    pub const BS_DEFPUSHBUTTON: u32 = 0x0000_0001;
    /// Predefined control class ordinals (Win32 SDK).
    pub const CLASS_BUTTON: u16 = 0x0080;
    pub const CLASS_EDIT: u16 = 0x0081;
    pub const CLASS_STATIC: u16 = 0x0082;
}

/// Control IDs in the prompt dialog template.
const IDC_PROMPT_LABEL: i32 = -1;
const IDC_PROMPT_EDIT: i32 = 100;

/// Context passed to the prompt dialog proc via `DialogBoxIndirectParamW`'s
/// `lparam`. Holds the default text (for init) and the result slot (filled
/// on OK). The caller owns this struct; the dialog proc borrows it for the
/// duration of the modal loop.
struct PromptContext {
    default: Vec<u16>, // NUL-terminated UTF-16
    result: Option<String>,
}

/// Build an in-memory `DLGTEMPLATE` for a text-input prompt dialog.
/// Layout: a static label, an edit field, and OK / Cancel buttons.
/// No resource file needed — the template is built as a raw `Vec<u16>`
/// with proper DWORD alignment per the Win32 dialog template spec.
fn build_prompt_template(title: &str, label: &str) -> Vec<u16> {
    use raw_styles::*;
    let mut buf = TemplateBuilder::new();

    // --- DLGTEMPLATE header ---
    let dlg_style = WS_POPUP | WS_CAPTION | WS_SYSMENU | DS_CENTER | DS_MODALFRAME;
    buf.push_dword(dlg_style);
    buf.push_dword(0); // exStyle
    buf.push_dword(4); // cdit = 4 controls
    buf.push_word(0); // x (DS_CENTER centers)
    buf.push_word(0); // y
    buf.push_word(200); // cx (dialog units)
    buf.push_word(72); // cy
    // Variable header data:
    buf.push_word(0); // menu (none)
    buf.push_word(0); // class (default dialog)
    buf.push_string(title);

    // --- Control 1: static label ---
    buf.align_dword();
    buf.push_dword(WS_CHILD | WS_VISIBLE | SS_LEFT);
    buf.push_dword(0); // exStyle
    buf.push_word(10); // x
    buf.push_word(10); // y
    buf.push_word(180); // cx
    buf.push_word(10); // cy
    buf.push_dword(IDC_PROMPT_LABEL as u32);
    buf.push_class_predefined(CLASS_STATIC);
    buf.push_string(label);
    buf.push_word(0); // extra data count

    // --- Control 2: edit field ---
    buf.align_dword();
    buf.push_dword(WS_CHILD | WS_VISIBLE | WS_BORDER | WS_TABSTOP | ES_AUTOHSCROLL);
    buf.push_dword(0); // exStyle
    buf.push_word(10); // x
    buf.push_word(25); // y
    buf.push_word(180); // cx
    buf.push_word(14); // cy
    buf.push_dword(IDC_PROMPT_EDIT as u32);
    buf.push_class_predefined(CLASS_EDIT);
    buf.push_string(""); // empty initial text (set in WM_INITDIALOG)
    buf.push_word(0); // extra data count

    // --- Control 3: OK button (default) ---
    buf.align_dword();
    buf.push_dword(WS_CHILD | WS_VISIBLE | WS_TABSTOP | BS_DEFPUSHBUTTON);
    buf.push_dword(0); // exStyle
    buf.push_word(75); // x
    buf.push_word(50); // y
    buf.push_word(50); // cx
    buf.push_word(14); // cy
    buf.push_dword(1); // id = IDOK
    buf.push_class_predefined(CLASS_BUTTON);
    buf.push_string("OK");
    buf.push_word(0); // extra data count

    // --- Control 4: Cancel button ---
    buf.align_dword();
    buf.push_dword(WS_CHILD | WS_VISIBLE | WS_TABSTOP);
    buf.push_dword(0); // exStyle
    buf.push_word(130); // x
    buf.push_word(50); // y
    buf.push_word(50); // cx
    buf.push_word(14); // cy
    buf.push_dword(2); // id = IDCANCEL
    buf.push_class_predefined(CLASS_BUTTON);
    buf.push_string("Cancel");
    buf.push_word(0); // extra data count

    buf.into_vec()
}

/// Helper for building Win32 dialog templates in memory with proper
/// DWORD alignment. The Win32 dialog manager requires each
/// `DLGITEMTEMPLATE` to start on a DWORD (4-byte) boundary.
struct TemplateBuilder {
    buf: Vec<u16>,
}

impl TemplateBuilder {
    fn new() -> Self {
        Self { buf: Vec::new() }
    }

    /// Pad with a zero WORD if the current position is not DWORD-aligned
    /// (i.e. the u16 index is odd — byte offset not a multiple of 4).
    fn align_dword(&mut self) {
        if self.buf.len() % 2 != 0 {
            self.buf.push(0);
        }
    }

    fn push_word(&mut self, w: u16) {
        self.buf.push(w);
    }

    fn push_dword(&mut self, d: u32) {
        self.buf.push((d & 0xFFFF) as u16);
        self.buf.push((d >> 16) as u16);
    }

    fn push_string(&mut self, s: &str) {
        self.buf.extend(s.encode_utf16());
        self.buf.push(0); // NUL terminator
    }

    fn push_class_predefined(&mut self, class: u16) {
        self.buf.push(0xFFFF); // signals a predefined class
        self.buf.push(class);
    }

    fn into_vec(self) -> Vec<u16> {
        self.buf
    }
}

/// Dialog procedure for the text-input prompt. Reads the default text
/// from the `PromptContext` on init, and stores the user's text back
/// into the context on OK.
unsafe extern "system" fn prompt_proc(
    hdlg: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> isize {
    use windows::Win32::UI::WindowsAndMessaging::{WM_COMMAND, WM_INITDIALOG};

    unsafe {
        match msg {
            WM_INITDIALOG => {
                // lparam points to the PromptContext passed by the caller.
                let ctx = &mut *(lparam.0 as *mut PromptContext);
                // Set the default text in the edit control.
                let _ = SetDlgItemTextW(hdlg, IDC_PROMPT_EDIT, PCWSTR(ctx.default.as_ptr()));
                // Select all text so the user can type to replace.
                let _ =
                    SendDlgItemMessageW(hdlg, IDC_PROMPT_EDIT, EM_SETSEL, WPARAM(0), LPARAM(-1));
                // Store the context pointer for later WM_COMMAND.
                SetWindowLongPtrW(hdlg, GWLP_USERDATA, lparam.0);
                1 // TRUE = we set the default focus
            }
            WM_COMMAND => {
                let cmd = (wparam.0 & 0xFFFF) as u16; // LOWORD
                match cmd {
                    1 => {
                        // IDOK — read the edit text and store it.
                        let ptr = GetWindowLongPtrW(hdlg, GWLP_USERDATA) as *mut PromptContext;
                        if !ptr.is_null() {
                            let ctx = &mut *ptr;
                            let mut buf = vec![0u16; 512];
                            let len = GetDlgItemTextW(hdlg, IDC_PROMPT_EDIT, &mut buf);
                            let text = String::from_utf16_lossy(&buf[..len as usize]);
                            ctx.result = Some(text);
                        }
                        let _ = EndDialog(hdlg, 1);
                        0
                    }
                    2 => {
                        // IDCANCEL — leave result as None.
                        let _ = EndDialog(hdlg, 0);
                        0
                    }
                    _ => 0,
                }
            }
            _ => 0, // FALSE = default processing
        }
    }
}

/// Show a modal text-input prompt dialog. Returns `Ok(Some(text))` if
/// the user entered text and pressed OK, `Ok(None)` if they cancelled,
/// `Err` on a dialog failure.
///
/// Uses `DialogBoxIndirectParamW` with an in-memory `DLGTEMPLATE` — no
/// resource file needed. The dialog is modal (blocks until dismissed).
pub fn prompt_dialog(
    owner: HWND,
    title: &str,
    label: &str,
    default: &str,
) -> Result<Option<String>, DialogError> {
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::UI::WindowsAndMessaging::DialogBoxIndirectParamW;

    unsafe {
        let template = build_prompt_template(title, label);
        let hinst = GetModuleHandleW(None).map_err(|e| DialogError::Failed(e.code().0 as u32))?;
        let mut default_buf: Vec<u16> = default.encode_utf16().collect();
        default_buf.push(0); // NUL-terminate
        let mut ctx = PromptContext {
            default: default_buf,
            result: None,
        };
        let result = DialogBoxIndirectParamW(
            Some(hinst.into()),
            template.as_ptr() as *const _,
            Some(owner),
            Some(prompt_proc),
            LPARAM(&mut ctx as *mut _ as isize),
        );
        if result <= 0 {
            // 0 = cancelled; -1 = error. Both map to None/Err.
            if result == -1 {
                Err(DialogError::Failed(0))
            } else {
                Ok(None)
            }
        } else {
            Ok(ctx.result)
        }
    }
}

/// Parsed project settings from the settings dialog.
#[derive(Clone, Debug, PartialEq)]
pub struct ProjectSettings {
    pub width: u32,
    pub height: u32,
    pub fps: u32,
}

/// Show a project settings dialog (canvas size + fps). The user enters
/// a string like "1920x1080@30". Returns `Ok(Some(settings))` on OK,
/// `Ok(None)` on cancel, `Err` on dialog failure or invalid input.
///
/// Presets shown in the label: 1920x1080@30, 1280x720@60, 1080x1080@30
/// (square), 1080x1920@30 (vertical). The default is the project's
/// current settings.
pub fn settings_dialog(
    owner: HWND,
    current_width: u32,
    current_height: u32,
    current_fps: u32,
) -> Result<Option<ProjectSettings>, DialogError> {
    let default = format!("{current_width}x{current_height}@{current_fps}");
    let label = "Canvas WxH@fps  (e.g. 1920x1080@30, 1280x720@60, 1080x1920@30)";
    match prompt_dialog(owner, "Project Settings", label, &default)? {
        Some(text) => parse_settings(&text)
            .map(|s| Some(s))
            .ok_or(DialogError::Failed(0)),
        None => Ok(None),
    }
}

/// Parse a "WxH@fps" string into ProjectSettings. Returns None on
/// malformed input (no silent bad state — caller shows error).
fn parse_settings(text: &str) -> Option<ProjectSettings> {
    let text = text.trim();
    let at_pos = text.rfind('@')?;
    let (dims, fps_str) = text.split_at(at_pos);
    let fps_str = &fps_str[1..]; // skip '@'
    let fps: u32 = fps_str.parse().ok()?;
    if fps == 0 || fps > 240 {
        return None;
    }
    let x_pos = dims.find('x')?;
    let (w_str, h_str) = dims.split_at(x_pos);
    let h_str = &h_str[1..]; // skip 'x'
    let width: u32 = w_str.parse().ok()?;
    let height: u32 = h_str.parse().ok()?;
    if width == 0 || width > 8192 || height == 0 || height > 8192 {
        return None;
    }
    Some(ProjectSettings { width, height, fps })
}

#[cfg(test)]
mod settings_tests {
    use super::*;

    #[test]
    fn parse_valid_1080p30() {
        let s = parse_settings("1920x1080@30").unwrap();
        assert_eq!(
            s,
            ProjectSettings {
                width: 1920,
                height: 1080,
                fps: 30
            }
        );
    }

    #[test]
    fn parse_valid_720p60() {
        let s = parse_settings("1280x720@60").unwrap();
        assert_eq!(s.fps, 60);
    }

    #[test]
    fn parse_valid_vertical() {
        let s = parse_settings("1080x1920@30").unwrap();
        assert_eq!(s.height, 1920);
    }

    #[test]
    fn parse_with_spaces() {
        let s = parse_settings("  1920x1080@30  ").unwrap();
        assert_eq!(s.width, 1920);
    }

    #[test]
    fn parse_missing_at_returns_none() {
        assert!(parse_settings("1920x1080").is_none());
    }

    #[test]
    fn parse_missing_x_returns_none() {
        assert!(parse_settings("19201080@30").is_none());
    }

    #[test]
    fn parse_zero_fps_returns_none() {
        assert!(parse_settings("1920x1080@0").is_none());
    }

    #[test]
    fn parse_huge_fps_returns_none() {
        assert!(parse_settings("1920x1080@999").is_none());
    }

    #[test]
    fn parse_zero_width_returns_none() {
        assert!(parse_settings("0x1080@30").is_none());
    }

    #[test]
    fn parse_huge_width_returns_none() {
        assert!(parse_settings("99999x1080@30").is_none());
    }
}
