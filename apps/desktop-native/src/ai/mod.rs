//! AI copilot stub (Increment 5).
//!
//! Non-network, no API keys. Generates canned suggestions based on the
//! current project state (track count, element count, duration). This is
//! a placeholder for a future networked copilot — the interface is stable
//! so a real backend can slot in without changing call sites.
//!
//! Sensitive-path note: this module never touches `apps/web/src/lib/ai/**`
//! or any auth/secret logic. It is a pure local suggestion generator.

use crate::state::{Project, TrackType};

/// A copilot suggestion: a short title + a longer description.
#[derive(Debug, Clone, PartialEq)]
pub struct Suggestion {
    pub title: String,
    pub description: String,
}

/// Generate context-aware suggestions for the current project. Pure
/// function — no I/O, no network, no secrets. The suggestions are
/// deterministic given the project state.
pub fn suggest(project: &Project) -> Vec<Suggestion> {
    let mut out = Vec::new();
    let track_count = project.scene.tracks.len();
    let element_count: usize = project.scene.tracks.iter().map(|t| t.elements.len()).sum();
    let duration = project.metadata.duration_seconds;

    // Empty project → suggest adding tracks.
    if track_count == 0 {
        out.push(Suggestion {
            title: "Start with a video track".to_string(),
            description: "Add a video track (T key) to begin building your timeline.".to_string(),
        });
        return out;
    }

    // Has tracks but no clips → suggest adding content.
    if element_count == 0 {
        out.push(Suggestion {
            title: "Add your first clip".to_string(),
            description: "Press E to insert a test clip, or Ctrl+I to import media.".to_string(),
        });
    }

    // Check track type coverage.
    let has_video = project
        .scene
        .tracks
        .iter()
        .any(|t| t.track_type == TrackType::Video);
    let has_audio = project
        .scene
        .tracks
        .iter()
        .any(|t| t.track_type == TrackType::Audio);
    let has_text = project
        .scene
        .tracks
        .iter()
        .any(|t| t.track_type == TrackType::Text);

    if !has_video {
        out.push(Suggestion {
            title: "Add a video track".to_string(),
            description: "A video track holds your main visual content.".to_string(),
        });
    }
    if !has_audio && duration > 5.0 {
        out.push(Suggestion {
            title: "Consider an audio track".to_string(),
            description: "Add background music or narration to your project.".to_string(),
        });
    }
    if !has_text && element_count > 2 {
        out.push(Suggestion {
            title: "Add titles or captions".to_string(),
            description: "A text track can hold titles, lower-thirds, or captions.".to_string(),
        });
    }

    // Duration-based suggestions.
    if duration > 60.0 {
        out.push(Suggestion {
            title: "Long-form project".to_string(),
            description: format!(
                "Your project is {:.0}s. Consider breaking it into scenes for easier editing.",
                duration
            ),
        });
    } else if duration > 0.0 && duration < 5.0 {
        out.push(Suggestion {
            title: "Very short project".to_string(),
            description: "Add more clips or extend durations to reach a usable length.".to_string(),
        });
    }

    // If we have suggestions, return them; otherwise give a generic tip.
    if out.is_empty() {
        out.push(Suggestion {
            title: "Looking good".to_string(),
            description: "Your project has a balanced track setup. Press Space to preview."
                .to_string(),
        });
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{Element, Project, Track, TrackType};

    #[test]
    fn empty_project_suggests_adding_track() {
        let mut p = Project::new_untitled("p1", 0);
        p.scene.tracks.clear();
        let s = suggest(&p);
        assert!(!s.is_empty());
        assert!(s[0].title.contains("video track"));
    }

    #[test]
    fn tracks_no_clips_suggests_adding_clip() {
        let mut p = Project::new_untitled("p1", 0);
        p.scene.tracks.clear();
        p.scene
            .tracks
            .push(Track::new("t1", "V1", TrackType::Video));
        let s = suggest(&p);
        assert!(s.iter().any(|x| x.title.contains("first clip")));
    }

    #[test]
    fn missing_audio_suggests_audio_track() {
        let mut p = Project::new_untitled("p1", 0);
        p.scene.tracks.clear();
        p.scene
            .tracks
            .push(Track::new("t1", "V1", TrackType::Video));
        p.add_element("t1", Element::new("e1", "Clip 1", 0.0, 10.0));
        let s = suggest(&p);
        assert!(s.iter().any(|x| x.title.contains("audio track")));
    }

    #[test]
    fn balanced_project_gives_positive_tip() {
        let mut p = Project::new_untitled("p1", 0);
        p.scene.tracks.clear();
        p.scene
            .tracks
            .push(Track::new("t1", "V1", TrackType::Video));
        p.scene
            .tracks
            .push(Track::new("t2", "A1", TrackType::Audio));
        p.scene.tracks.push(Track::new("t3", "T1", TrackType::Text));
        p.add_element("t1", Element::new("e1", "Clip 1", 0.0, 15.0));
        p.add_element("t2", Element::new("e2", "Music", 0.0, 15.0));
        let s = suggest(&p);
        assert!(s.iter().any(|x| x.title.contains("good")));
    }

    #[test]
    fn long_project_suggests_scenes() {
        let mut p = Project::new_untitled("p1", 0);
        p.scene.tracks.clear();
        p.scene
            .tracks
            .push(Track::new("t1", "V1", TrackType::Video));
        p.scene
            .tracks
            .push(Track::new("t2", "A1", TrackType::Audio));
        p.add_element("t1", Element::new("e1", "Long", 0.0, 90.0));
        let s = suggest(&p);
        assert!(s.iter().any(|x| x.title.contains("Long-form")));
    }

    #[test]
    fn suggestions_are_deterministic() {
        let mut p = Project::new_untitled("p1", 0);
        p.scene.tracks.clear();
        p.scene
            .tracks
            .push(Track::new("t1", "V1", TrackType::Video));
        let a = suggest(&p);
        let b = suggest(&p);
        assert_eq!(a, b);
    }
}
