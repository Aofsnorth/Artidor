//! Editor state — runtime (non-serialized) state that drives the UI.
//!
//! This includes the current project, the playhead position, the selection,
//! zoom level, and panel visibility. It is owned by the root GPUI entity
//! and observed by all panels.

use crate::state::project::{ElementType, Project};
use std::path::PathBuf;

/// What is currently selected in the editor.
#[derive(Debug, Clone, Default)]
pub struct Selection {
    /// Selected element IDs (multi-select supported).
    pub element_ids: Vec<String>,
    /// Selected track ID (if any).
    pub track_id: Option<String>,
}

impl Selection {
    pub fn is_empty(&self) -> bool {
        self.element_ids.is_empty() && self.track_id.is_none()
    }

    pub fn single(element_id: impl Into<String>) -> Self {
        Self {
            element_ids: vec![element_id.into()],
            track_id: None,
        }
    }

    pub fn clear(&mut self) {
        self.element_ids.clear();
        self.track_id = None;
    }

    pub fn toggle(&mut self, element_id: &str) {
        if let Some(idx) = self.element_ids.iter().position(|id| id == element_id) {
            self.element_ids.remove(idx);
        } else {
            self.element_ids.push(element_id.to_string());
        }
    }
}

/// Panel visibility flags.
#[derive(Debug, Clone)]
pub struct PanelVisibility {
    pub assets: bool,
    pub inspector: bool,
    pub timeline: bool,
    pub ai_copilot: bool,
}

impl Default for PanelVisibility {
    fn default() -> Self {
        Self {
            assets: true,
            inspector: true,
            timeline: true,
            ai_copilot: false,
        }
    }
}

/// The runtime editor state. This is NOT serialized — only the `Project`
/// inside it is persisted. Everything else (playhead, zoom, selection) is
/// session-scoped.
pub struct EditorState {
    /// The current project being edited.
    pub project: Project,
    /// Current playhead position in frames.
    pub playhead_frame: i64,
    /// Whether playback is active.
    pub playing: bool,
    /// Whether looping is enabled.
    pub looping: bool,
    /// Timeline zoom: pixels per frame.
    pub px_per_frame: f32,
    /// Timeline scroll offset in pixels.
    pub timeline_scroll_x: f32,
    /// Current selection.
    pub selection: Selection,
    /// Panel visibility.
    pub panels: PanelVisibility,
    /// Path to the project file (if saved/loaded from disk).
    pub project_path: Option<PathBuf>,
    /// Whether the project has unsaved changes.
    pub dirty: bool,
    /// Loaded media textures: maps texture_id → file path.
    /// The actual WGPU textures live in the render module.
    pub media_registry: Vec<MediaEntry>,
    /// Last export path (for the export dialog).
    pub last_export_path: Option<PathBuf>,
}

/// A registered media asset.
#[derive(Debug, Clone)]
pub struct MediaEntry {
    pub texture_id: String,
    pub path: PathBuf,
    pub width: u32,
    pub height: u32,
    pub element_type: ElementType,
}

impl EditorState {
    pub fn new() -> Self {
        Self {
            project: Project::default(),
            playhead_frame: 0,
            playing: false,
            looping: false,
            px_per_frame: 8.0, // ~8px per frame at 30fps → 240px/sec
            timeline_scroll_x: 0.0,
            selection: Selection::default(),
            panels: PanelVisibility::default(),
            project_path: None,
            dirty: false,
            media_registry: Vec::new(),
            last_export_path: None,
        }
    }

    /// Mark the project as having unsaved changes.
    pub fn mark_dirty(&mut self) {
        self.dirty = true;
        self.project.modified_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(self.project.modified_at);
    }

    /// Advance the playhead by one frame (clamped to project duration).
    pub fn step_forward(&mut self) {
        let total = self.project.total_frames();
        self.playhead_frame = (self.playhead_frame + 1).min(total);
    }

    /// Move the playhead back by one frame (clamped to 0).
    pub fn step_backward(&mut self) {
        self.playhead_frame = (self.playhead_frame - 1).max(0);
    }

    /// Jump to the start of the timeline.
    pub fn jump_to_start(&mut self) {
        self.playhead_frame = 0;
    }

    /// Jump to the end of the timeline.
    pub fn jump_to_end(&mut self) {
        self.playhead_frame = self.project.total_frames();
    }

    /// Toggle play/pause.
    pub fn toggle_playback(&mut self) {
        self.playing = !self.playing;
    }

    /// Seek to a specific frame.
    pub fn seek_to(&mut self, frame: i64) {
        self.playhead_frame = frame.max(0).min(self.project.total_frames());
    }

    /// Advance playback by a frame delta (called from the playback loop).
    /// Returns `true` if playback should continue, `false` if it reached the end.
    pub fn advance_playback(&mut self, delta_frames: i64) -> bool {
        let total = self.project.total_frames();
        let new_frame = self.playhead_frame + delta_frames;
        if new_frame >= total {
            if self.looping {
                self.playhead_frame = 0;
                true
            } else {
                self.playhead_frame = total;
                self.playing = false;
                false
            }
        } else {
            self.playhead_frame = new_frame.max(0);
            true
        }
    }

    /// Set zoom (pixels per frame), clamped to a reasonable range.
    pub fn set_zoom(&mut self, px_per_frame: f32) {
        self.px_per_frame = px_per_frame.clamp(1.0, 80.0);
    }

    /// Zoom in by 1.25×.
    pub fn zoom_in(&mut self) {
        self.set_zoom(self.px_per_frame * 1.25);
    }

    /// Zoom out by 0.8×.
    pub fn zoom_out(&mut self) {
        self.set_zoom(self.px_per_frame * 0.8);
    }

    /// Convert a frame position to a timeline X pixel offset.
    pub fn frame_to_x(&self, frame: i64) -> f32 {
        frame as f32 * self.px_per_frame - self.timeline_scroll_x
    }

    /// Convert a timeline X pixel offset to a frame position.
    pub fn x_to_frame(&self, x: f32) -> i64 {
        ((x + self.timeline_scroll_x) / self.px_per_frame) as i64
    }

    /// Register a loaded media asset.
    pub fn register_media(&mut self, entry: MediaEntry) {
        self.media_registry.push(entry);
        self.mark_dirty();
    }

    /// Find a media entry by texture ID.
    pub fn find_media(&self, texture_id: &str) -> Option<&MediaEntry> {
        self.media_registry.iter().find(|m| m.texture_id == texture_id)
    }

    /// Find a texture ID by file path.
    pub fn find_media_by_path(&self, path: &std::path::Path) -> Option<&str> {
        self.media_registry
            .iter()
            .find(|m| m.path == path)
            .map(|m| m.texture_id.as_str())
    }
}

impl Default for EditorState {
    fn default() -> Self {
        Self::new()
    }
}
