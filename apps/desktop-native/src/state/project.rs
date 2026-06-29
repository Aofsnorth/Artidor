//! Editor state model for the native desktop shell.
//!
//! Increment 3: a minimal, strongly-typed model that mirrors the web
//! app's project structure (`apps/web/src/lib/project/types.ts`) so the
//! native shell can hold the same data the web editor does. Timeline
//! math is NOT reimplemented here — it reuses the repo's `time` crate
//! (`FrameRate`, `MediaTime`) via path-dep, exactly the anti-duplication
//! rule in AGENTS.md ("No duplicate domain logic").
//!
//! Scope: model + unit tests only. UI wiring arrives in Increment 4
//! (panel content). Persistence (serde + native file I/O) is Increment 6.
//!
//! Cloud-specific web fields (Google Drive folder/file ids, per-project
//! AI provider override) are intentionally omitted — the native shell is
//! local-first. They can be added when a cloud feature lands here.

use serde::{Deserialize, Serialize};
use time::{FrameRate, MediaTime};

/// Timeline track type. Subset of web `TrackType`
/// (`apps/web/src/lib/timeline/types.ts`). The native shell starts with
/// the four most common types; effect/camera tracks arrive when those
/// panels land.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum TrackType {
    Video,
    Text,
    Audio,
    Graphic,
}

impl TrackType {
    /// Short label for the timeline rail (matches web track-type labels).
    pub fn label(self) -> &'static str {
        match self {
            TrackType::Video => "Video",
            TrackType::Text => "Text",
            TrackType::Audio => "Audio",
            TrackType::Graphic => "Graphic",
        }
    }
}

/// Transform — position, size, rotation on the canvas. All values are
/// normalized (0.0–1.0) relative to the canvas, matching the web app's
/// `QuadTransformDescriptor`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Transform {
    /// Center X position (0.0 = left edge, 0.5 = center, 1.0 = right).
    pub center_x: f64,
    /// Center Y position (0.0 = top, 0.5 = center, 1.0 = bottom).
    pub center_y: f64,
    /// Width as fraction of canvas width (1.0 = full width).
    pub width: f64,
    /// Height as fraction of canvas height (1.0 = full height).
    pub height: f64,
    /// Rotation in degrees (0.0 = upright).
    pub rotation_degrees: f64,
    /// Horizontal flip.
    pub flip_x: bool,
    /// Vertical flip.
    pub flip_y: bool,
}

impl Default for Transform {
    fn default() -> Self {
        Self {
            center_x: 0.5,
            center_y: 0.5,
            width: 1.0,
            height: 1.0,
            rotation_degrees: 0.0,
            flip_x: false,
            flip_y: false,
        }
    }
}

/// Blend mode for compositing layers. Matches the compositor crate's
/// `BlendMode` enum. Subset for now — the most common modes.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum BlendMode {
    Normal,
    Multiply,
    Screen,
    Overlay,
    Darken,
    Lighten,
    Add,
    Subtract,
}

impl Default for BlendMode {
    fn default() -> Self {
        Self::Normal
    }
}

impl BlendMode {
    /// All blend modes for the inspector dropdown.
    pub fn all() -> &'static [BlendMode] {
        &[
            BlendMode::Normal,
            BlendMode::Multiply,
            BlendMode::Screen,
            BlendMode::Overlay,
            BlendMode::Darken,
            BlendMode::Lighten,
            BlendMode::Add,
            BlendMode::Subtract,
        ]
    }

    /// Display label.
    pub fn label(&self) -> &'static str {
        match self {
            Self::Normal => "Normal",
            Self::Multiply => "Multiply",
            Self::Screen => "Screen",
            Self::Overlay => "Overlay",
            Self::Darken => "Darken",
            Self::Lighten => "Lighten",
            Self::Add => "Add",
            Self::Subtract => "Subtract",
        }
    }
}

/// A timeline element (clip). Mirrors web `BaseTimelineElement` with
/// transform, opacity, and blend mode for the inspector panel.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)] // no Eq: f64 fields
pub struct Element {
    pub id: String,
    pub name: String,
    /// Start time on the timeline, in seconds.
    pub start_seconds: f64,
    /// Clip duration, in seconds.
    pub duration_seconds: f64,
    /// Transform — position, size, rotation on the canvas.
    #[serde(default)]
    pub transform: Transform,
    /// Opacity 0.0–1.0.
    #[serde(default = "default_opacity")]
    pub opacity: f64,
    /// Blend mode for compositing with layers below.
    #[serde(default)]
    pub blend_mode: BlendMode,
}

fn default_opacity() -> f64 {
    1.0
}

impl Element {
    /// End time on the timeline (start + duration).
    pub fn end_seconds(&self) -> f64 {
        self.start_seconds + self.duration_seconds
    }

    /// Build a new element.
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        start_seconds: f64,
        duration_seconds: f64,
    ) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            start_seconds,
            duration_seconds,
            transform: Transform::default(),
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
        }
    }
}

/// A timeline track. Minimal subset of web `TimelineTrack`
/// (id + name + type + elements + mute/solo/lock/visibility flags).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub track_type: TrackType,
    pub muted: bool,
    pub hidden: bool,
    /// Solo: only this track's output is rendered (mutes all others).
    pub soloed: bool,
    /// Locked: clips can't be dragged, trimmed, or deleted.
    pub locked: bool,
    pub elements: Vec<Element>,
}

impl Track {
    pub fn new(id: impl Into<String>, name: impl Into<String>, track_type: TrackType) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            track_type,
            muted: false,
            hidden: false,
            soloed: false,
            locked: false,
            elements: Vec::new(),
        }
    }

    /// Add an element to this track. Returns the element id.
    pub fn add_element(&mut self, element: Element) -> &str {
        self.elements.push(element);
        self.elements.last().unwrap().id.as_str()
    }

    /// The end time of the last element on this track (0 if empty).
    pub fn end_seconds(&self) -> f64 {
        self.elements
            .iter()
            .map(|e| e.end_seconds())
            .fold(0.0_f64, f64::max)
    }
}

/// A scene. Minimal subset of web `TScene` (id + name + tracks). The
/// native shell currently models a flat track list; the web app's
/// overlay/main/audio split arrives when the timeline UI needs it.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)] // no Eq: tracks hold f64
pub struct Scene {
    pub id: String,
    pub name: String,
    pub tracks: Vec<Track>,
}

impl Scene {
    /// A fresh scene with one main video track (matches the web app's
    /// default new-project scene).
    pub fn new_default(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: "Scene 1".to_string(),
            tracks: vec![Track::new("track-main", "Main", TrackType::Video)],
        }
    }

    /// Add a track. Returns the track id for reference.
    pub fn add_track(&mut self, track: Track) -> &str {
        let id = track.id.as_str();
        self.tracks.push(track);
        // Return a stable reference into the vec's last element.
        self.tracks.last().unwrap().id.as_str()
    }

    /// Toggle a track's muted flag. Returns the new state, or `None` if
    /// the track id is not found (no silent bad state).
    pub fn toggle_mute(&mut self, track_id: &str) -> Option<bool> {
        let track = self.tracks.iter_mut().find(|t| t.id == track_id)?;
        track.muted = !track.muted;
        Some(track.muted)
    }

    /// Toggle a track's solo flag. Returns the new state, or `None`.
    pub fn toggle_solo(&mut self, track_id: &str) -> Option<bool> {
        let track = self.tracks.iter_mut().find(|t| t.id == track_id)?;
        track.soloed = !track.soloed;
        Some(track.soloed)
    }

    /// Toggle a track's hidden (visibility) flag. Returns the new state.
    pub fn toggle_hidden(&mut self, track_id: &str) -> Option<bool> {
        let track = self.tracks.iter_mut().find(|t| t.id == track_id)?;
        track.hidden = !track.hidden;
        Some(track.hidden)
    }

    /// Toggle a track's locked flag. Returns the new state.
    pub fn toggle_lock(&mut self, track_id: &str) -> Option<bool> {
        let track = self.tracks.iter_mut().find(|t| t.id == track_id)?;
        track.locked = !track.locked;
        Some(track.locked)
    }
}

/// Media asset kind, inferred from the file extension at import time.
/// Matches the web app's asset-type categorisation
/// (`apps/web/src/lib/assets/types.ts`): image / video / audio / other.
/// "Other" covers unknown extensions so import never silently miscategorises.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum MediaKind {
    Image,
    Video,
    Audio,
    Other,
}

impl MediaKind {
    /// Infer the asset kind from a file extension (case-insensitive,
    /// without the leading dot). Returns `Other` for unknown extensions
    /// (no silent miscategorisation).
    pub fn from_extension(ext: &str) -> Self {
        match ext.to_ascii_lowercase().as_str() {
            "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "svg" => MediaKind::Image,
            "mp4" | "mov" | "webm" | "avi" | "mkv" | "m4v" | "wmv" => MediaKind::Video,
            "mp3" | "wav" | "aac" | "flac" | "ogg" | "m4a" | "wma" => MediaKind::Audio,
            _ => MediaKind::Other,
        }
    }

    /// Short label for the tools-panel asset list.
    pub fn label(self) -> &'static str {
        match self {
            MediaKind::Image => "Image",
            MediaKind::Video => "Video",
            MediaKind::Audio => "Audio",
            MediaKind::Other => "Other",
        }
    }
}

/// An imported media asset. Minimal subset of the web app's asset model
/// (`apps/web/src/lib/assets/types.ts`): a local file path (no blob URL
/// — the native shell reads from disk directly via `std::fs`). The
/// path is stored as a string so it serialises cleanly in the project
/// file; consumers convert to `PathBuf` when reading.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct MediaAsset {
    pub id: String,
    /// Display name (defaults to the file stem at import).
    pub name: String,
    /// Absolute or relative filesystem path to the media file.
    pub path: String,
    /// Inferred kind (image / video / audio / other).
    pub kind: MediaKind,
}

impl MediaAsset {
    /// Build an asset from a file path. The id is caller-supplied (so
    /// the UI can generate stable ids). The name defaults to the file
    /// stem; the kind is inferred from the extension.
    pub fn from_path(id: impl Into<String>, path: impl AsRef<std::path::Path>) -> Self {
        let path = path.as_ref();
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("asset")
            .to_string();
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        let path_str = path.to_string_lossy().to_string();
        Self {
            id: id.into(),
            name,
            path: path_str,
            kind: MediaKind::from_extension(ext),
        }
    }
}

/// Canvas dimensions in pixels. Mirrors web `TCanvasSize`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CanvasSize {
    pub width: u32,
    pub height: u32,
}

impl CanvasSize {
    /// Default 1920×1080 (matches the web app's default canvas preset).
    pub const HD_1080: Self = Self {
        width: 1920,
        height: 1080,
    };

    /// Aspect ratio as a reduced `width:height` string (e.g. "16:9"),
    /// matching the web footer's `formatCanvasAspect`.
    pub fn aspect_label(self) -> String {
        let divisor = gcd(self.width, self.height);
        if divisor == 0 {
            return format!("{}:{}", self.width, self.height);
        }
        format!("{}:{}", self.width / divisor, self.height / divisor)
    }
}

fn gcd(a: u32, b: u32) -> u32 {
    if b == 0 { a } else { gcd(b, a % b) }
}

/// Project metadata. Mirrors web `TProjectMetadata` (local-first subset).
/// `Eq` is intentionally not derived: `duration_seconds: f64` (NaN is
/// not `Eq`). `PartialEq` is enough for the model's needs.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub id: String,
    pub name: String,
    /// Project duration in seconds (matches web `metadata.duration`).
    pub duration_seconds: f64,
    /// Unix epoch milliseconds for created/updated (web uses `Date`).
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

impl ProjectMetadata {
    /// Build a fresh metadata block for a new project. `now_ms` is
    /// injected so tests are deterministic.
    pub fn new(id: impl Into<String>, name: impl Into<String>, now_ms: i64) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            duration_seconds: 0.0,
            created_at_ms: now_ms,
            updated_at_ms: now_ms,
        }
    }
}

/// Project render settings. Mirrors web `TProjectSettings` (subset).
/// `fps` reuses the repo's `time::FrameRate` (shared timeline math).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectSettings {
    pub fps: FrameRate,
    pub canvas: CanvasSize,
}

impl ProjectSettings {
    /// Default: 30 fps, 1920×1080 (matches the web app's defaults).
    pub const DEFAULT: Self = Self {
        fps: FrameRate::FPS_30,
        canvas: CanvasSize::HD_1080,
    };

    /// Whole-number fps for display (e.g. 30, 60). Matches the web
    /// footer's `Math.round(numerator / denominator)`.
    pub fn fps_label(self) -> u32 {
        self.fps.numerator / self.fps.denominator
    }

    /// Update canvas + fps from a parsed settings dialog result.
    /// Returns the new settings for caller convenience.
    pub fn update(&mut self, width: u32, height: u32, fps: u32) {
        self.canvas = CanvasSize { width, height };
        self.fps = frame_rate_from_u32(fps);
    }
}

/// Map a whole-number fps to the closest FrameRate constant. Falls back
/// to FPS_30 for unknown values (no silent bad state — caller validates).
pub fn frame_rate_from_u32(fps: u32) -> FrameRate {
    match fps {
        24 => FrameRate::FPS_24,
        25 => FrameRate::FPS_25,
        30 => FrameRate::FPS_30,
        48 => FrameRate::FPS_48,
        50 => FrameRate::FPS_50,
        60 => FrameRate::FPS_60,
        120 => FrameRate::FPS_120,
        _ => FrameRate::FPS_30,
    }
}

/// Playhead position. A thin wrapper around `time::MediaTime` so the
/// model reads clearly and the timeline math stays in the `time` crate.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Ord, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Playhead(pub MediaTime);

impl Playhead {
    /// Playhead at the start of the timeline.
    pub const ZERO: Self = Self(MediaTime::ZERO);

    /// Build from seconds. Returns `None` for non-finite/overflowing
    /// input (delegates to `MediaTime::from_seconds_f64`).
    pub fn from_seconds(seconds: f64) -> Option<Self> {
        MediaTime::from_seconds_f64(seconds).map(Self)
    }

    /// Build from a frame index at the project's frame rate.
    pub fn from_frame(frame: i64, rate: FrameRate) -> Option<Self> {
        MediaTime::from_frame(frame, rate).map(Self)
    }

    /// Playhead position in seconds.
    pub fn as_seconds(self) -> f64 {
        self.0.to_seconds_f64()
    }

    /// Frame index at the project's frame rate (rounded).
    pub fn frame_round(self, rate: FrameRate) -> Option<i64> {
        self.0.to_frame_round(rate)
    }

    /// Frame index at the project's frame rate (floored).
    pub fn frame_floor(self, rate: FrameRate) -> Option<i64> {
        self.0.to_frame_floor(rate)
    }
}

/// The editor's project model. Mirrors web `TProject` (local-first
/// subset). Now holds a scene with tracks (Increment 4b).
/// No `Eq` (metadata holds an `f64` duration).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Project {
    pub metadata: ProjectMetadata,
    pub settings: ProjectSettings,
    pub playhead: Playhead,
    pub scene: Scene,
    /// Imported media assets (Increment 6c). Native shell reads these
    /// from disk via `std::fs` — no blob URLs.
    pub assets: Vec<MediaAsset>,
    pub version: u32,
}

impl Project {
    /// Create a new untitled project with default settings + a default
    /// scene (one main video track). `now_ms` is injected for
    /// deterministic tests.
    pub fn new_untitled(id: impl Into<String>, now_ms: i64) -> Self {
        let project_id: String = id.into();
        let scene = Scene::new_default(format!("{}-scene", project_id));
        Self {
            metadata: ProjectMetadata::new(project_id, "Untitled", now_ms),
            settings: ProjectSettings::DEFAULT,
            playhead: Playhead::ZERO,
            scene,
            assets: Vec::new(),
            version: 1,
        }
    }

    /// Rename the project and stamp `updated_at`. Returns `false` if the
    /// new name is empty/whitespace-only (no silent bad state).
    pub fn rename(&mut self, new_name: &str, now_ms: i64) -> bool {
        let trimmed = new_name.trim();
        if trimmed.is_empty() {
            return false;
        }
        self.metadata.name = trimmed.to_string();
        self.metadata.updated_at_ms = now_ms;
        true
    }

    /// Move the playhead to a time in seconds. Returns `false` for
    /// non-finite/overflowing input (clamps intent rather than panicking).
    pub fn seek_seconds(&mut self, seconds: f64) -> bool {
        match Playhead::from_seconds(seconds) {
            Some(p) => {
                self.playhead = p;
                true
            }
            None => false,
        }
    }

    /// Move the playhead to a frame index at the project's frame rate.
    pub fn seek_frame(&mut self, frame: i64) -> bool {
        match Playhead::from_frame(frame, self.settings.fps) {
            Some(p) => {
                self.playhead = p;
                true
            }
            None => false,
        }
    }

    /// Add a track to the current scene. Delegates to `Scene::add_track`.
    pub fn add_track(&mut self, track: Track) {
        self.scene.add_track(track);
    }

    /// Add an imported media asset to the project. Returns the asset id
    /// for reference. Deduplicates by path (no duplicate entries for the
    /// same file — returns the existing asset's id without adding).
    pub fn add_asset(&mut self, asset: MediaAsset) -> &str {
        if let Some(idx) = self.assets.iter().position(|a| a.path == asset.path) {
            return self.assets[idx].id.as_str();
        }
        self.assets.push(asset);
        self.assets.last().unwrap().id.as_str()
    }

    /// Toggle a track's muted flag in the current scene.
    pub fn toggle_track_mute(&mut self, track_id: &str) -> Option<bool> {
        self.scene.toggle_mute(track_id)
    }

    /// Toggle a track's solo flag in the current scene.
    pub fn toggle_track_solo(&mut self, track_id: &str) -> Option<bool> {
        self.scene.toggle_solo(track_id)
    }

    /// Toggle a track's hidden (visibility) flag in the current scene.
    pub fn toggle_track_hidden(&mut self, track_id: &str) -> Option<bool> {
        self.scene.toggle_hidden(track_id)
    }

    /// Toggle a track's locked flag in the current scene.
    pub fn toggle_track_lock(&mut self, track_id: &str) -> Option<bool> {
        self.scene.toggle_lock(track_id)
    }

    /// Update project canvas + fps from the settings dialog.
    pub fn update_settings(&mut self, width: u32, height: u32, fps: u32) {
        self.settings.update(width, height, fps);
    }

    /// Add an element to a track by track id. Returns the element id, or
    /// `None` if the track id is not found (no silent bad state). Also
    /// recomputes the project duration from the new element set.
    pub fn add_element(&mut self, track_id: &str, element: Element) -> Option<&str> {
        let track = self.scene.tracks.iter_mut().find(|t| t.id == track_id)?;
        let id = track.add_element(element).to_string();
        self.recompute_duration();
        // Re-borrow to return a stable reference.
        Some(
            self.scene
                .tracks
                .iter()
                .find(|t| t.id == track_id)?
                .elements
                .last()
                .unwrap()
                .id
                .as_str(),
        )
    }

    /// Remove an element by id from a track by track id. Returns true if
    /// the element was found and removed. Recomputes duration after.
    pub fn remove_element(&mut self, track_id: &str, element_id: &str) -> bool {
        if let Some(track) = self.scene.tracks.iter_mut().find(|t| t.id == track_id) {
            let before = track.elements.len();
            track.elements.retain(|e| e.id != element_id);
            if track.elements.len() != before {
                self.recompute_duration();
                return true;
            }
        }
        false
    }

    /// Move an element to a new start time. Clamps at 0 (no negative
    /// start). Recomputes duration after. Returns true if found + moved.
    pub fn move_element(&mut self, track_id: &str, element_id: &str, new_start: f64) -> bool {
        if let Some(track) = self.scene.tracks.iter_mut().find(|t| t.id == track_id) {
            if let Some(el) = track.elements.iter_mut().find(|e| e.id == element_id) {
                el.start_seconds = new_start.max(0.0);
                self.recompute_duration();
                return true;
            }
        }
        false
    }

    /// Trim an element's duration (resize from the right edge). Minimum
    /// duration is 0.1s. Recomputes duration after. Returns true if
    /// found + trimmed.
    pub fn trim_element(&mut self, track_id: &str, element_id: &str, new_duration: f64) -> bool {
        if let Some(track) = self.scene.tracks.iter_mut().find(|t| t.id == track_id) {
            if let Some(el) = track.elements.iter_mut().find(|e| e.id == element_id) {
                el.duration_seconds = new_duration.max(0.1);
                self.recompute_duration();
                return true;
            }
        }
        false
    }

    /// Recompute `metadata.duration_seconds` from the max element end
    /// time across all tracks. Called after structural changes (add
    /// element, add track with elements, load project).
    pub fn recompute_duration(&mut self) {
        let max_end = self
            .scene
            .tracks
            .iter()
            .map(|t| t.end_seconds())
            .fold(0.0_f64, f64::max);
        self.metadata.duration_seconds = max_end;
    }

    /// Seek by a relative frame delta (e.g. +1 / -1 for arrow keys).
    /// Clamps at frame 0 (no negative frames). Returns the new frame
    /// index, or `None` if the current playhead can't be expressed as a
    /// frame (overflow/unaligned).
    pub fn seek_relative_frame(&mut self, delta: i64) -> Option<i64> {
        let current = self.playhead.frame_floor(self.settings.fps)?;
        let target = (current + delta).max(0);
        if self.seek_frame(target) {
            Some(target)
        } else {
            None
        }
    }
}

// ---------------------------------------------------------------------------
// Tests — Increment 3 is the first increment with pure logic to test.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_canvas_is_1080p_with_16_9_aspect() {
        let c = CanvasSize::HD_1080;
        assert_eq!(c.width, 1920);
        assert_eq!(c.height, 1080);
        assert_eq!(c.aspect_label(), "16:9");
    }

    #[test]
    fn aspect_label_reduces_non_standard_ratios() {
        // 4:3
        let c = CanvasSize {
            width: 1440,
            height: 1080,
        };
        assert_eq!(c.aspect_label(), "4:3");
    }

    #[test]
    fn default_settings_are_30fps_1080p() {
        let s = ProjectSettings::DEFAULT;
        assert_eq!(s.fps, FrameRate::FPS_30);
        assert_eq!(s.canvas, CanvasSize::HD_1080);
        assert_eq!(s.fps_label(), 30);
    }

    #[test]
    fn new_untitled_project_has_sensible_defaults() {
        let p = Project::new_untitled("proj-1", 1_000_000);
        assert_eq!(p.metadata.id, "proj-1");
        assert_eq!(p.metadata.name, "Untitled");
        assert_eq!(p.metadata.duration_seconds, 0.0);
        assert_eq!(p.metadata.created_at_ms, p.metadata.updated_at_ms);
        assert_eq!(p.settings, ProjectSettings::DEFAULT);
        assert_eq!(p.playhead, Playhead::ZERO);
        assert_eq!(p.version, 1);
    }

    #[test]
    fn rename_updates_name_and_timestamp() {
        let mut p = Project::new_untitled("proj-1", 1_000_000);
        let ok = p.rename("My Edit", 2_000_000);
        assert!(ok);
        assert_eq!(p.metadata.name, "My Edit");
        assert_eq!(p.metadata.updated_at_ms, 2_000_000);
        // created_at must NOT move on rename.
        assert_eq!(p.metadata.created_at_ms, 1_000_000);
    }

    #[test]
    fn rename_rejects_empty_and_whitespace_only() {
        let mut p = Project::new_untitled("proj-1", 1_000_000);
        assert!(!p.rename("", 2_000_000));
        assert!(!p.rename("   ", 2_000_000));
        assert_eq!(p.metadata.name, "Untitled");
        assert_eq!(p.metadata.updated_at_ms, 1_000_000);
    }

    #[test]
    fn playhead_round_trips_through_seconds() {
        let p = Playhead::from_seconds(12.5).unwrap();
        assert!((p.as_seconds() - 12.5).abs() < 1e-6);
    }

    #[test]
    fn playhead_from_seconds_rejects_non_finite() {
        assert!(Playhead::from_seconds(f64::NAN).is_none());
        assert!(Playhead::from_seconds(f64::INFINITY).is_none());
        assert!(Playhead::from_seconds(f64::NEG_INFINITY).is_none());
    }

    #[test]
    fn playhead_frame_round_trip_at_30fps() {
        // Frame 10 at 30 fps = 10/30 s ≈ 0.3333s.
        let p = Playhead::from_frame(10, FrameRate::FPS_30).unwrap();
        assert_eq!(p.frame_round(FrameRate::FPS_30), Some(10));
        assert_eq!(p.frame_floor(FrameRate::FPS_30), Some(10));
        assert!((p.as_seconds() - 10.0 / 30.0).abs() < 1e-9);
    }

    #[test]
    fn seek_seconds_moves_playhead() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert!(p.seek_seconds(5.0));
        assert!((p.playhead.as_seconds() - 5.0).abs() < 1e-9);
    }

    #[test]
    fn seek_seconds_rejects_nan() {
        let mut p = Project::new_untitled("proj-1", 0);
        let before = p.playhead;
        assert!(!p.seek_seconds(f64::NAN));
        // Playhead must not move on rejected seek.
        assert_eq!(p.playhead, before);
    }

    #[test]
    fn seek_frame_uses_project_fps() {
        let mut p = Project::new_untitled("proj-1", 0);
        // Default fps is 30; frame 60 -> 2.0s.
        assert!(p.seek_frame(60));
        assert!((p.playhead.as_seconds() - 2.0).abs() < 1e-9);
        assert_eq!(p.playhead.frame_floor(FrameRate::FPS_30), Some(60));
    }

    #[test]
    fn footer_labels_match_web_format() {
        // Mirrors editor-footer.tsx: "{height}p", "{fps} fps", "{aspect}".
        let p = Project::new_untitled("proj-1", 0);
        let height_label = format!("{}p", p.settings.canvas.height);
        let fps_label = format!("{} fps", p.settings.fps_label());
        let aspect_label = p.settings.canvas.aspect_label();
        assert_eq!(height_label, "1080p");
        assert_eq!(fps_label, "30 fps");
        assert_eq!(aspect_label, "16:9");
    }

    // --- Increment 4b: track / scene / seek-relative tests ---

    #[test]
    fn new_untitled_project_has_default_scene_with_main_track() {
        let p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.scene.name, "Scene 1");
        assert_eq!(p.scene.tracks.len(), 1);
        assert_eq!(p.scene.tracks[0].name, "Main");
        assert_eq!(p.scene.tracks[0].track_type, TrackType::Video);
        assert!(!p.scene.tracks[0].muted);
    }

    #[test]
    fn add_track_appends_to_scene() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_track(Track::new("track-audio", "Music", TrackType::Audio));
        assert_eq!(p.scene.tracks.len(), 2);
        assert_eq!(p.scene.tracks[1].name, "Music");
    }

    #[test]
    fn toggle_track_mute_flips_and_reports_state() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.toggle_track_mute("track-main"), Some(true));
        assert!(p.scene.tracks[0].muted);
        assert_eq!(p.toggle_track_mute("track-main"), Some(false));
        assert!(!p.scene.tracks[0].muted);
    }

    #[test]
    fn toggle_track_mute_unknown_id_returns_none() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.toggle_track_mute("nope"), None);
        assert!(!p.scene.tracks[0].muted);
    }

    #[test]
    fn toggle_solo_flips_state() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.toggle_track_solo("track-main"), Some(true));
        assert!(p.scene.tracks[0].soloed);
        assert_eq!(p.toggle_track_solo("track-main"), Some(false));
    }

    #[test]
    fn toggle_lock_flips_state() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.toggle_track_lock("track-main"), Some(true));
        assert!(p.scene.tracks[0].locked);
    }

    #[test]
    fn toggle_hidden_flips_state() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.toggle_track_hidden("track-main"), Some(true));
        assert!(p.scene.tracks[0].hidden);
    }

    #[test]
    fn new_track_has_all_flags_false() {
        let t = Track::new("t1", "Main", TrackType::Video);
        assert!(!t.muted);
        assert!(!t.soloed);
        assert!(!t.hidden);
        assert!(!t.locked);
    }

    #[test]
    fn update_settings_changes_canvas_and_fps() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.update_settings(1280, 720, 60);
        assert_eq!(p.settings.canvas.width, 1280);
        assert_eq!(p.settings.canvas.height, 720);
        assert_eq!(p.settings.fps_label(), 60);
    }

    #[test]
    fn frame_rate_from_u32_maps_common_fps() {
        assert_eq!(frame_rate_from_u32(24), FrameRate::FPS_24);
        assert_eq!(frame_rate_from_u32(30), FrameRate::FPS_30);
        assert_eq!(frame_rate_from_u32(60), FrameRate::FPS_60);
        assert_eq!(frame_rate_from_u32(120), FrameRate::FPS_120);
    }

    #[test]
    fn frame_rate_from_u32_unknown_falls_back_to_30() {
        assert_eq!(frame_rate_from_u32(999), FrameRate::FPS_30);
    }

    #[test]
    fn seek_relative_frame_advances_and_clamps_at_zero() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.seek_relative_frame(10), Some(10));
        assert_eq!(p.playhead.frame_floor(FrameRate::FPS_30), Some(10));
        // Clamp at 0 (no negative frames).
        assert_eq!(p.seek_relative_frame(-100), Some(0));
        assert_eq!(p.playhead.frame_floor(FrameRate::FPS_30), Some(0));
    }

    #[test]
    fn track_type_labels_match_web() {
        assert_eq!(TrackType::Video.label(), "Video");
        assert_eq!(TrackType::Text.label(), "Text");
        assert_eq!(TrackType::Audio.label(), "Audio");
        assert_eq!(TrackType::Graphic.label(), "Graphic");
    }

    // --- Increment 6c: media asset model tests ---

    #[test]
    fn media_kind_from_extension_infers_correctly() {
        assert_eq!(MediaKind::from_extension("png"), MediaKind::Image);
        assert_eq!(MediaKind::from_extension("JPG"), MediaKind::Image);
        assert_eq!(MediaKind::from_extension("mp4"), MediaKind::Video);
        assert_eq!(MediaKind::from_extension("MOV"), MediaKind::Video);
        assert_eq!(MediaKind::from_extension("mp3"), MediaKind::Audio);
        assert_eq!(MediaKind::from_extension("wav"), MediaKind::Audio);
        assert_eq!(MediaKind::from_extension("xyz"), MediaKind::Other);
        assert_eq!(MediaKind::from_extension(""), MediaKind::Other);
    }

    #[test]
    fn media_asset_from_path_extracts_name_and_kind() {
        let asset = MediaAsset::from_path("asset-1", "C:/media/clip.mp4");
        assert_eq!(asset.id, "asset-1");
        assert_eq!(asset.name, "clip");
        assert_eq!(asset.path, "C:/media/clip.mp4");
        assert_eq!(asset.kind, MediaKind::Video);
    }

    #[test]
    fn add_asset_appends_to_project() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert!(p.assets.is_empty());
        let asset = MediaAsset::from_path("asset-1", "/media/photo.png");
        let id = p.add_asset(asset);
        assert_eq!(id, "asset-1");
        assert_eq!(p.assets.len(), 1);
        assert_eq!(p.assets[0].kind, MediaKind::Image);
    }

    #[test]
    fn add_asset_deduplicates_by_path() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_asset(MediaAsset::from_path("asset-1", "/media/clip.mp4"));
        // Same path, different id — should not add a duplicate.
        let id = p.add_asset(MediaAsset::from_path("asset-2", "/media/clip.mp4"));
        assert_eq!(id, "asset-1"); // returns the existing asset's id
        assert_eq!(p.assets.len(), 1); // no duplicate
    }

    #[test]
    fn new_untitled_project_has_empty_assets() {
        let p = Project::new_untitled("proj-1", 0);
        assert!(p.assets.is_empty());
    }

    // --- Increment 4d: element/clip model tests ---

    #[test]
    fn element_end_seconds_is_start_plus_duration() {
        let e = Element::new("el-1", "Clip 1", 2.0, 5.0);
        assert_eq!(e.start_seconds, 2.0);
        assert_eq!(e.duration_seconds, 5.0);
        assert_eq!(e.end_seconds(), 7.0);
    }

    #[test]
    fn track_end_seconds_is_max_element_end() {
        let mut t = Track::new("track-1", "Main", TrackType::Video);
        assert_eq!(t.end_seconds(), 0.0); // empty track
        t.add_element(Element::new("el-1", "A", 0.0, 3.0));
        t.add_element(Element::new("el-2", "B", 5.0, 2.0));
        // Max end = max(3.0, 7.0) = 7.0
        assert_eq!(t.end_seconds(), 7.0);
    }

    #[test]
    fn add_element_to_project_appends_and_updates_duration() {
        let mut p = Project::new_untitled("proj-1", 0);
        assert_eq!(p.metadata.duration_seconds, 0.0);
        let el = Element::new("el-1", "Clip 1", 0.0, 10.0);
        let id = p.add_element("track-main", el);
        assert_eq!(id, Some("el-1"));
        assert_eq!(p.scene.tracks[0].elements.len(), 1);
        // Duration should be updated to the max element end.
        assert_eq!(p.metadata.duration_seconds, 10.0);
    }

    #[test]
    fn add_element_unknown_track_returns_none() {
        let mut p = Project::new_untitled("proj-1", 0);
        let el = Element::new("el-1", "Clip 1", 0.0, 5.0);
        assert_eq!(p.add_element("nope", el), None);
        assert_eq!(p.metadata.duration_seconds, 0.0);
    }

    #[test]
    fn recompute_duration_uses_max_across_all_tracks() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_track(Track::new("track-2", "Music", TrackType::Audio));
        p.add_element("track-main", Element::new("el-1", "A", 0.0, 5.0));
        p.add_element("track-2", Element::new("el-2", "B", 3.0, 10.0));
        // Max end = max(5.0, 13.0) = 13.0
        assert_eq!(p.metadata.duration_seconds, 13.0);
    }

    #[test]
    fn new_track_has_empty_elements() {
        let t = Track::new("track-1", "Main", TrackType::Video);
        assert!(t.elements.is_empty());
    }

    #[test]
    fn remove_element_deletes_and_recomputes_duration() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_element("track-main", Element::new("el-1", "A", 0.0, 10.0));
        assert_eq!(p.metadata.duration_seconds, 10.0);
        assert!(p.remove_element("track-main", "el-1"));
        assert_eq!(p.scene.tracks[0].elements.len(), 0);
        assert_eq!(p.metadata.duration_seconds, 0.0); // recomputed
    }

    #[test]
    fn remove_element_unknown_returns_false() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_element("track-main", Element::new("el-1", "A", 0.0, 5.0));
        assert!(!p.remove_element("track-main", "nope"));
        assert!(!p.remove_element("nope", "el-1"));
        assert_eq!(p.scene.tracks[0].elements.len(), 1);
    }

    #[test]
    fn move_element_updates_start_and_duration() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_element("track-main", Element::new("el-1", "A", 0.0, 5.0));
        assert!(p.move_element("track-main", "el-1", 10.0));
        assert_eq!(p.scene.tracks[0].elements[0].start_seconds, 10.0);
        assert_eq!(p.metadata.duration_seconds, 15.0);
    }

    #[test]
    fn move_element_clamps_at_zero() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_element("track-main", Element::new("el-1", "A", 5.0, 5.0));
        assert!(p.move_element("track-main", "el-1", -3.0));
        assert_eq!(p.scene.tracks[0].elements[0].start_seconds, 0.0);
    }

    #[test]
    fn move_element_unknown_returns_false() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_element("track-main", Element::new("el-1", "A", 0.0, 5.0));
        assert!(!p.move_element("track-main", "nope", 10.0));
        assert!(!p.move_element("nope", "el-1", 10.0));
    }

    #[test]
    fn trim_element_updates_duration() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_element("track-main", Element::new("el-1", "A", 0.0, 10.0));
        assert!(p.trim_element("track-main", "el-1", 3.0));
        assert_eq!(p.scene.tracks[0].elements[0].duration_seconds, 3.0);
        assert_eq!(p.metadata.duration_seconds, 3.0);
    }

    #[test]
    fn trim_element_enforces_minimum() {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_element("track-main", Element::new("el-1", "A", 0.0, 10.0));
        assert!(p.trim_element("track-main", "el-1", 0.01));
        assert_eq!(p.scene.tracks[0].elements[0].duration_seconds, 0.1);
    }
}
