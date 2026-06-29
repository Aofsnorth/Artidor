//! Undo/redo history — project snapshot stack.
//!
//! Simple + robust: snapshots the full `Project` before each mutating
//! action. This avoids the complexity of inverse-command application
//! (which is error-prone for compound operations like duration recompute).
//! Memory cost is bounded by `MAX_HISTORY` (50 snapshots).
//!
//! Mirrors `apps/desktop-web/src/state/editor_state.rs` undo/redo logic.

use crate::state::Project;

/// Maximum number of snapshots kept in history (undo + redo combined).
const MAX_HISTORY: usize = 50;

/// Undo/redo history. Holds past snapshots (for undo) and future
/// snapshots (for redo). Call `push` before a mutating action to
/// record the pre-action state.
pub struct History {
    undo_stack: Vec<Project>,
    redo_stack: Vec<Project>,
}

impl History {
    /// Create an empty history.
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
        }
    }

    /// Record a snapshot before a mutating action. Call this with the
    /// project's state *before* the mutation is applied.
    pub fn push(&mut self, project: &Project) {
        self.undo_stack.push(project.clone());
        // Any new action clears the redo stack (no redo after new edit).
        self.redo_stack.clear();
        // Trim oldest if over capacity.
        if self.undo_stack.len() > MAX_HISTORY {
            self.undo_stack.remove(0);
        }
    }

    /// Undo: restore the previous snapshot. Returns `Some(previous_project)`
    /// if undone, or `None` if there's nothing to undo. The current
    /// project is pushed onto the redo stack.
    pub fn undo(&mut self, current: &Project) -> Option<Project> {
        if let Some(prev) = self.undo_stack.pop() {
            self.redo_stack.push(current.clone());
            Some(prev)
        } else {
            None
        }
    }

    /// Redo: restore a undone snapshot. Returns `Some(redone_project)`
    /// if redone, or `None` if there's nothing to redo. The current
    /// project is pushed back onto the undo stack.
    pub fn redo(&mut self, current: &Project) -> Option<Project> {
        if let Some(next) = self.redo_stack.pop() {
            self.undo_stack.push(current.clone());
            Some(next)
        } else {
            None
        }
    }

    /// Whether undo is available.
    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    /// Whether redo is available.
    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    /// Clear all history (e.g. after loading a new project).
    pub fn clear(&mut self) {
        self.undo_stack.clear();
        self.redo_stack.clear();
    }
}

impl Default for History {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{Element, Track, TrackType};

    fn sample_project() -> Project {
        let mut p = Project::new_untitled("proj-1", 0);
        p.add_track(Track::new("track-2", "Music", TrackType::Audio));
        p
    }

    #[test]
    fn new_history_cannot_undo_or_redo() {
        let h = History::new();
        assert!(!h.can_undo());
        assert!(!h.can_redo());
    }

    #[test]
    fn push_enables_undo() {
        let mut h = History::new();
        let p = sample_project();
        h.push(&p);
        assert!(h.can_undo());
        assert!(!h.can_redo());
    }

    #[test]
    fn undo_restores_previous_state() {
        let mut h = History::new();
        let p1 = sample_project();
        h.push(&p1);
        // Simulate a mutation: add an element.
        let mut p2 = p1.clone();
        p2.add_element("track-main", Element::new("el-1", "A", 0.0, 5.0));
        // Undo should restore p1 (no element).
        let restored = h.undo(&p2).unwrap();
        assert_eq!(restored.scene.tracks[0].elements.len(), 0);
        // Redo should restore p2 (with element).
        let redone = h.redo(&restored).unwrap();
        assert_eq!(redone.scene.tracks[0].elements.len(), 1);
    }

    #[test]
    fn new_action_clears_redo() {
        let mut h = History::new();
        let p1 = sample_project();
        h.push(&p1);
        let mut p2 = p1.clone();
        p2.add_element("track-main", Element::new("el-1", "A", 0.0, 5.0));
        let _ = h.undo(&p2);
        assert!(h.can_redo());
        // New action pushes a snapshot, clearing redo.
        h.push(&p1);
        assert!(!h.can_redo());
    }

    #[test]
    fn history_trims_at_max_capacity() {
        let mut h = History::new();
        let p = sample_project();
        for _ in 0..(MAX_HISTORY + 10) {
            h.push(&p);
        }
        assert_eq!(h.undo_stack.len(), MAX_HISTORY);
    }

    #[test]
    fn clear_resets_both_stacks() {
        let mut h = History::new();
        h.push(&sample_project());
        h.clear();
        assert!(!h.can_undo());
        assert!(!h.can_redo());
    }
}
