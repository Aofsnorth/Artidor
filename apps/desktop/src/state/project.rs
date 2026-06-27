//! Project model — the serializable representation of an Artidor project.
//!
//! This mirrors the web app's project structure: a canvas size, a frame
//! rate, a list of tracks, and each track contains elements positioned on
//! the timeline. All logic (timebase conversion, frame math) is delegated
//! to the `time` crate.

use compositor::{BlendMode, EffectPassDescriptor, LayerMaskDescriptor, QuadTransformDescriptor};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// The type of a timeline element. Determines rendering behavior and which
/// track it belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ElementType {
    Video,
    Image,
    Text,
    Audio,
    Effect,
    Graphic,
}

/// A single element on the timeline — a clip, image, text block, effect,
/// or graphic shape.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Element {
    pub id: String,
    pub name: String,
    pub element_type: ElementType,
    /// Start position in frames (relative to track start).
    pub start_frame: i64,
    /// Duration in frames.
    pub duration_frames: i64,
    /// Source media file path (None for text/graphic/effect-only).
    pub source_path: Option<String>,
    /// Transform — position, size, rotation on the canvas.
    pub transform: QuadTransformDescriptor,
    /// Opacity 0.0–1.0.
    pub opacity: f32,
    /// Blend mode for compositing with layers below.
    pub blend_mode: BlendMode,
    /// Effect passes applied to this element (grouped).
    #[serde(default)]
    pub effect_pass_groups: Vec<Vec<EffectPassDescriptor>>,
    /// Optional mask.
    pub mask: Option<LayerMaskDescriptor>,
    /// Text content (only for `ElementType::Text`).
    #[serde(default)]
    pub text_content: Option<String>,
    /// Solid color for graphic elements (RGBA 0–255).
    #[serde(default)]
    pub color: Option<[u8; 4]>,
}

impl Element {
    /// Creates a new element with a generated ID and sensible defaults.
    pub fn new(name: impl Into<String>, element_type: ElementType) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            element_type,
            start_frame: 0,
            duration_frames: 150, // 5s at 30fps
            source_path: None,
            transform: QuadTransformDescriptor {
                center_x: 0.5,
                center_y: 0.5,
                width: 1.0,
                height: 1.0,
                rotation_degrees: 0.0,
                flip_x: false,
                flip_y: false,
            },
            opacity: 1.0,
            blend_mode: BlendMode::Normal,
            effect_pass_groups: Vec::new(),
            mask: None,
            text_content: None,
            color: None,
        }
    }

    /// End frame (exclusive).
    pub fn end_frame(&self) -> i64 {
        self.start_frame + self.duration_frames
    }

    /// Whether the element overlaps a given frame.
    pub fn contains_frame(&self, frame: i64) -> bool {
        frame >= self.start_frame && frame < self.end_frame()
    }
}

/// A timeline track — a horizontal lane that holds elements.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: String,
    pub name: String,
    pub element_type: ElementType,
    pub elements: Vec<Element>,
    /// Whether the track is muted (hidden from rendering).
    #[serde(default)]
    pub muted: bool,
    /// Whether the track is locked (cannot be edited).
    #[serde(default)]
    pub locked: bool,
}

impl Track {
    pub fn new(name: impl Into<String>, element_type: ElementType) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            element_type,
            elements: Vec::new(),
            muted: false,
            locked: false,
        }
    }
}

/// A project — the top-level serializable unit.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    /// Frame rate as a rational (numerator / denominator), e.g. 30000/1001 for 29.97fps.
    pub fps_num: u32,
    pub fps_den: u32,
    pub tracks: Vec<Track>,
    /// Background clear color (RGBA 0.0–1.0).
    pub background_color: [f32; 4],
    #[serde(default)]
    pub created_at: u64,
    #[serde(default)]
    pub modified_at: u64,
}

impl Default for Project {
    fn default() -> Self {
        Self::new("Untitled Project")
    }
}

impl Project {
    pub fn new(name: impl Into<String>) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);

        Self {
            id: Uuid::new_v4().to_string(),
            name: name.into(),
            width: 1920,
            height: 1080,
            fps_num: 30,
            fps_den: 1,
            tracks: vec![
                Track::new("Video 1", ElementType::Video),
                Track::new("Audio 1", ElementType::Audio),
            ],
            background_color: [0.0, 0.0, 0.0, 1.0],
            created_at: now,
            modified_at: now,
        }
    }

    /// Total duration in frames (max end frame across all tracks).
    pub fn total_frames(&self) -> i64 {
        self.tracks
            .iter()
            .flat_map(|t| t.elements.iter().map(|e| e.end_frame()))
            .max()
            .unwrap_or(0)
    }

    /// FPS as a floating-point value.
    pub fn fps(&self) -> f64 {
        self.fps_num as f64 / self.fps_den as f64
    }

    /// Find an element by ID across all tracks.
    pub fn find_element(&self, id: &str) -> Option<(&Track, &Element)> {
        self.tracks
            .iter()
            .find_map(|track| track.elements.iter().map(|e| (track, e)).find(|(_, e)| e.id == id))
    }

    /// Find the (track index, element index) for an element by ID.
    pub fn find_element_indices(&self, id: &str) -> Option<(usize, usize)> {
        for (ti, track) in self.tracks.iter().enumerate() {
            if let Some((ei, _)) = track.elements.iter().enumerate().find(|(_, e)| e.id == id) {
                return Some((ti, ei));
            }
        }
        None
    }

    /// Find a mutable element by ID across all tracks.
    pub fn find_element_mut(&mut self, id: &str) -> Option<&mut Element> {
        let (ti, ei) = self.find_element_indices(id)?;
        Some(&mut self.tracks[ti].elements[ei])
    }

    /// All elements visible at a given frame (not muted, frame in range).
    pub fn elements_at_frame(&self, frame: i64) -> Vec<&Element> {
        self.tracks
            .iter()
            .filter(|t| !t.muted)
            .flat_map(|t| t.elements.iter().filter(|e| e.contains_frame(frame)))
            .collect()
    }
}
