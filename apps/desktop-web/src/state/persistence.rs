//! Project persistence — save/load Artidor projects to/from JSON files.
//!
//! The project format is JSON, matching the web app's `camelCase` serde
//! conventions so projects are interchangeable between desktop and web.

#![allow(dead_code)]

use crate::state::project::Project;
use std::path::{Path, PathBuf};

/// Save a project to a JSON file.
pub fn save_project(project: &Project, path: &Path) -> Result<(), PersistenceError> {
    let json = serde_json::to_string_pretty(project)
        .map_err(|e| PersistenceError::Serialize(e.to_string()))?;
    std::fs::write(path, json).map_err(|e| PersistenceError::Io(e.to_string()))?;
    Ok(())
}

/// Load a project from a JSON file.
pub fn load_project(path: &Path) -> Result<Project, PersistenceError> {
    let json = std::fs::read_to_string(path).map_err(|e| PersistenceError::Io(e.to_string()))?;
    let project: Project =
        serde_json::from_str(&json).map_err(|e| PersistenceError::Deserialize(e.to_string()))?;
    Ok(project)
}

/// Returns the default projects directory (`~/.artidor/projects`).
pub fn default_projects_dir() -> PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    home.join(".artidor").join("projects")
}

/// Ensures the default projects directory exists.
pub fn ensure_projects_dir() -> Result<PathBuf, PersistenceError> {
    let dir = default_projects_dir();
    std::fs::create_dir_all(&dir).map_err(|e| PersistenceError::Io(e.to_string()))?;
    Ok(dir)
}

/// Errors that can occur during project persistence.
#[derive(Debug)]
pub enum PersistenceError {
    Serialize(String),
    Deserialize(String),
    Io(String),
}

impl std::fmt::Display for PersistenceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Serialize(msg) => write!(f, "Failed to serialize project: {msg}"),
            Self::Deserialize(msg) => write!(f, "Failed to deserialize project: {msg}"),
            Self::Io(msg) => write!(f, "File I/O error: {msg}"),
        }
    }
}

impl std::error::Error for PersistenceError {}
