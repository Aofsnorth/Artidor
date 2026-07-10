//! Editor state module — re-exports the project model + persistence.
//!
//! Mirrors `apps/desktop-web/src/state/mod.rs`. The project model lives
//! in `project.rs`; native save/load lives in `persistence.rs`.

pub mod history;
pub mod persistence;
pub mod project;

// Re-export all public types so `crate::state::Project` etc. work
// without callers needing to know the internal file layout.
pub use history::History;
pub use project::{BlendMode, Element, MediaAsset, MediaKind, Project, Track, TrackType};

/// Which assets panel tab is active. Mirrors the web app's `AssetsTab`.
/// 17 tabs matching `VISIBLE_TAB_KEYS` in the web app.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AssetsTab {
    Assets,
    Ai,
    Text,
    Elements,
    Transitions,
    Effects,
    Overlays,
    Audio,
    Motion,
    Adjust,
    Templates,
    Presets,
    Tools,
    Plugins,
    Captions,
    Scripting,
    Settings,
}

impl Default for AssetsTab {
    fn default() -> Self {
        Self::Assets
    }
}

impl AssetsTab {
    /// All tabs in display order (matches web `VISIBLE_TAB_KEYS`).
    pub const ALL: &[AssetsTab] = &[
        AssetsTab::Assets,
        AssetsTab::Ai,
        AssetsTab::Text,
        AssetsTab::Elements,
        AssetsTab::Transitions,
        AssetsTab::Effects,
        AssetsTab::Overlays,
        AssetsTab::Audio,
        AssetsTab::Motion,
        AssetsTab::Adjust,
        AssetsTab::Templates,
        AssetsTab::Presets,
        AssetsTab::Tools,
        AssetsTab::Plugins,
        AssetsTab::Captions,
        AssetsTab::Scripting,
        AssetsTab::Settings,
    ];

    /// Short label shown under the tab icon.
    pub fn label(&self) -> &'static str {
        match self {
            Self::Assets => "Assets",
            Self::Ai => "Arth",
            Self::Text => "Text",
            Self::Elements => "Elements",
            Self::Transitions => "Trans",
            Self::Effects => "Effects",
            Self::Overlays => "Overlays",
            Self::Audio => "Audio",
            Self::Motion => "Motion",
            Self::Adjust => "Adjust",
            Self::Templates => "Temps",
            Self::Presets => "Preset",
            Self::Tools => "Tools",
            Self::Plugins => "Plugins",
            Self::Captions => "Caps",
            Self::Scripting => "Script",
            Self::Settings => "Set",
        }
    }

    /// Single-glyph icon (text approximation of web's Hugeicons).
    pub fn glyph(&self) -> &'static str {
        match self {
            Self::Assets => "\u{25A4}",
            Self::Ai => "\u{2726}",
            Self::Text => "T",
            Self::Elements => "\u{25FB}",
            Self::Transitions => "\u{00BB}",
            Self::Effects => "\u{2727}",
            Self::Overlays => "\u{2630}",
            Self::Audio => "\u{266A}",
            Self::Motion => "\u{21AC}",
            Self::Adjust => "\u{2261}",
            Self::Templates => "\u{25A6}",
            Self::Presets => "\u{2605}",
            Self::Tools => "\u{26A1}",
            Self::Plugins => "\u{2325}",
            Self::Captions => "CC",
            Self::Scripting => "</>",
            Self::Settings => "\u{2699}",
        }
    }
}
