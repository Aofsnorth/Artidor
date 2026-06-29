//! Native project persistence — save/load Artidor projects as JSON files.
//!
//! Increment 6a (foundation for the top-1 export backend): the editor
//! state must be persistable before frames can be exported, and a native
//! shell needs native file I/O (no browser IndexedDB). This module
//! serializes the `state::Project` model to JSON via `serde_json` and
//! writes/reads it with `std::fs` — no browser sandbox, direct disk.
//!
//! Format: a single `.artpr.json` file containing the full `Project`.
//! Mirrors the web app's project JSON shape (subset — local-first, no
//! cloud fields). The `.artpr` extension matches the Tauri crate's
//! `save_project_file` dialog filter.
//!
//! Scope: model + I/O + round-trip tests. A native save dialog
//! (`GetSaveFileNameW`) and Ctrl+S wiring land in the same increment.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::state::Project;

/// File extension for Artidor project files (JSON content, `.artpr.json`).
/// The Tauri crate uses `.artpr`; we add `.json` to make the format
/// inspectable/editable by hand, matching the web app's persisted shape.
pub const PROJECT_EXT: &str = "artpr.json";

/// A recent project entry for the welcome screen's recent-projects list.
/// Stores the project name + file path so the user can reopen it without
/// navigating the file dialog. Mirrors the web app's recent-projects list.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RecentProject {
    pub name: String,
    pub path: PathBuf,
    /// Last-opened timestamp (Unix epoch ms) for sorting.
    pub last_opened_ms: i64,
}

/// Maximum number of recent projects kept.
const MAX_RECENT: usize = 10;

/// Get the recent-projects file path (in the user's local app data dir).
/// Falls back to the current directory if the env var is unavailable.
fn recent_file_path() -> PathBuf {
    let base = std::env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    base.join("Artidor").join("recent.json")
}

/// Get the auto-save file path (in the user's local app data dir).
/// The auto-save is a backup of the current project state, written
/// every 30s if the project has been modified. Loaded on startup to
/// offer crash recovery.
fn autosave_file_path() -> PathBuf {
    let base = std::env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    base.join("Artidor").join("autosave.json")
}

/// Auto-save the current project to the auto-save file. Best-effort —
/// fails silently (the welcome screen still works without it). Creates
/// the dir if needed.
pub fn autosave_project(project: &Project) {
    let file = ProjectFile::new(project.clone());
    let path = autosave_file_path();
    let _ = std::fs::create_dir_all(path.parent().unwrap_or(Path::new(".")));
    if let Ok(json) = serde_json::to_string_pretty(&file) {
        let _ = std::fs::write(&path, json);
    }
}

/// Load the auto-saved project, if any. Returns None if the file
/// doesn't exist or can't be parsed (no silent bad state — just starts
/// fresh).
pub fn load_autosave() -> Option<Project> {
    let path = autosave_file_path();
    match std::fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str::<ProjectFile>(&contents)
            .ok()
            .map(|f| f.project),
        Err(_) => None,
    }
}

/// Clear the auto-save file (called when a project is saved normally
/// or the user starts a new project).
pub fn clear_autosave() {
    let _ = std::fs::remove_file(autosave_file_path());
}

/// Load the recent-projects list from disk. Returns an empty vec if the
/// file doesn't exist or can't be parsed (no silent bad state — just
/// starts fresh).
pub fn load_recent_projects() -> Vec<RecentProject> {
    let path = recent_file_path();
    match std::fs::read_to_string(&path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

/// Add a project to the recent-projects list (or move it to the top if
/// it already exists). Saves the list to disk. Fails silently — the
/// welcome screen still works without persistence.
pub fn add_recent_project(name: &str, path: &Path) {
    let mut recent = load_recent_projects();
    // Remove existing entry with the same path (dedup).
    recent.retain(|r| r.path != path);
    // Add new entry at the top.
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    recent.insert(
        0,
        RecentProject {
            name: name.to_string(),
            path: path.to_path_buf(),
            last_opened_ms: now_ms,
        },
    );
    // Trim to max.
    recent.truncate(MAX_RECENT);
    // Save (best-effort — create dir if needed).
    let file_path = recent_file_path();
    let _ = std::fs::create_dir_all(file_path.parent().unwrap_or(Path::new(".")));
    if let Ok(json) = serde_json::to_string_pretty(&recent) {
        let _ = std::fs::write(&file_path, json);
    }
}

/// On-disk wrapper: the serialized project plus a schema version for
/// future migrations (the web app uses `TProject.version` for the same
/// purpose). Keeping a separate file-version field lets the persistence
/// layer migrate independently of the project's own `version`.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ProjectFile {
    /// Persistence-layer format version (bump on breaking file changes).
    pub file_version: u32,
    /// The editor project model.
    pub project: Project,
}

impl ProjectFile {
    /// Current persistence-layer format version.
    pub const CURRENT_FILE_VERSION: u32 = 1;

    /// Wrap a project for saving.
    pub fn new(project: Project) -> Self {
        Self {
            file_version: Self::CURRENT_FILE_VERSION,
            project,
        }
    }
}

/// Errors that can occur during save/load. Kept explicit (no `any`-style
/// escape) per RULES.md "Errors handled explicitly".
#[derive(Debug, thiserror::Error)]
pub enum PersistError {
    #[error("Failed to write project file: {0}")]
    Write(#[from] std::io::Error),
    #[error("Failed to serialize project: {0}")]
    Serialize(#[from] serde_json::Error),
    #[error("Unsupported file version: found {found}, expected {expected}")]
    UnsupportedVersion { found: u32, expected: u32 },
}

/// Save a project to `path` as JSON. Creates parent directories if
/// needed. Atomic-ish: writes to `<path>.tmp` then renames — avoids
/// corrupting an existing file if serialization/disk fails mid-write.
pub fn save_project(path: impl AsRef<Path>, project: &Project) -> Result<(), PersistError> {
    let path = path.as_ref();
    let file = ProjectFile::new(project.clone());
    let json = serde_json::to_string_pretty(&file)?;

    // Write to a temp sibling, then rename for atomicity.
    let mut tmp = path.to_path_buf();
    let new_name = format!(
        ".{}.tmp",
        path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("project")
    );
    tmp.set_file_name(new_name);
    std::fs::write(&tmp, json)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

/// Load a project from `path`. Validates the file version and rejects
/// future versions explicitly (no silent downgrade).
pub fn load_project(path: impl AsRef<Path>) -> Result<Project, PersistError> {
    let path = path.as_ref();
    let contents = std::fs::read_to_string(path)?;
    let file: ProjectFile = serde_json::from_str(&contents)?;
    if file.file_version > ProjectFile::CURRENT_FILE_VERSION {
        return Err(PersistError::UnsupportedVersion {
            found: file.file_version,
            expected: ProjectFile::CURRENT_FILE_VERSION,
        });
    }
    Ok(file.project)
}

/// Build the default save path for a project: `<id>.artpr.json` in `dir`.
/// Used by Ctrl+S when no native dialog is wired yet (smallest step).
pub fn default_save_path(dir: impl AsRef<Path>, project: &Project) -> PathBuf {
    let mut p = dir.as_ref().to_path_buf();
    p.push(format!("{}.{}", project.metadata.id, PROJECT_EXT));
    p
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::{Project, Track, TrackType};
    use std::fs;

    #[test]
    fn save_and_load_round_trips_a_project() {
        let dir = std::env::temp_dir().join("artidor-native-persist-test");
        let _ = fs::create_dir_all(&dir);
        let path = dir.join("roundtrip.artpr.json");

        let mut project = Project::new_untitled("proj-rt", 1_000_000);
        project.rename("Round Trip", 2_000_000);
        project.add_track(Track::new("track-2", "Music", TrackType::Audio));

        save_project(&path, &project).expect("save");
        let loaded = load_project(&path).expect("load");

        assert_eq!(loaded, project);
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn save_is_atomic_no_tmp_left_behind() {
        let dir = std::env::temp_dir().join("artidor-native-persist-atomic");
        let _ = fs::create_dir_all(&dir);
        let path = dir.join("atomic.artpr.json");
        let project = Project::new_untitled("proj-atom", 0);

        save_project(&path, &project).expect("save");
        // Target file exists, no temp sibling remains.
        assert!(path.exists());
        let tmp = dir.join(".atomic.artpr.json.tmp");
        assert!(!tmp.exists(), "temp file should have been renamed");
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn load_rejects_future_file_versions() {
        let dir = std::env::temp_dir().join("artidor-native-persist-version");
        let _ = fs::create_dir_all(&dir);
        let path = dir.join("future.artpr.json");
        // Hand-craft a file with a higher file_version.
        let project = Project::new_untitled("proj-fut", 0);
        let mut file = ProjectFile::new(project);
        file.file_version = 999;
        let json = serde_json::to_string(&file).unwrap();
        std::fs::write(&path, json).unwrap();

        let err = load_project(&path).unwrap_err();
        match err {
            PersistError::UnsupportedVersion { found, expected } => {
                assert_eq!(found, 999);
                assert_eq!(expected, ProjectFile::CURRENT_FILE_VERSION);
            }
            other => panic!("expected UnsupportedVersion, got {other:?}"),
        }
        let _ = fs::remove_file(&path);
    }

    #[test]
    fn default_save_path_uses_project_id_and_extension() {
        let project = Project::new_untitled("my-proj", 0);
        let p = default_save_path("/tmp", &project);
        assert_eq!(
            p.file_name().unwrap().to_str().unwrap(),
            "my-proj.artpr.json"
        );
    }

    #[test]
    fn project_file_wraps_with_current_version() {
        let project = Project::new_untitled("proj-wrap", 0);
        let file = ProjectFile::new(project.clone());
        assert_eq!(file.file_version, ProjectFile::CURRENT_FILE_VERSION);
        assert_eq!(file.project, project);
    }
}
