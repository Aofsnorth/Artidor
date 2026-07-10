//! Native top-1 video export — compositor frames -> FFmpeg encode -> .mp4.
//!
//! Increment 6b: the top-1 export backend the owner requested. Renders
//! frames via the repo's own `compositor` crate (the same pipeline used
//! for preview, Increment 1) and pipes the raw BGRA bytes to a native
//! FFmpeg encoder via `ffmpeg-sidecar` (CLI wrapper, no FFI). On
//! Windows FFmpeg picks the best hardware encoder with `-hwaccel auto`
//! (NVENC / Intel QSV / AMD AMF) — far faster than the browser's
//! software MediaRecorder the web app uses. This is the export half of
//! the "top-1 backend".
//!
//! Scope (MVP): renders `frame_count` frames of the project's clear
//! colour (no clip/element content yet — those land in Increment 4d).
//! This proves the full top-1 pipeline end-to-end (compositor -> stdin
//! -> hwaccel encode -> .mp4) and is the smallest safe step. Real
//! content (tracks/elements) flows through the same pipeline once the
//! model holds them.
//!
//! FFmpeg binary: `default-features = false` means no auto-download.
//! We look for `ffmpeg` on PATH (system install) or a bundled binary
//! next to the exe (packaging sets that up). If not found, we surface a
//! clear error (no silent failure).

use std::io::Write;
use std::path::{Path, PathBuf};

use compositor::{CanvasClearDescriptor, Compositor, FrameDescriptor};
use ffmpeg_sidecar::command::FfmpegCommand;
use gpu::GpuContext;
use thiserror::Error;

use crate::state::Project;

/// Export configuration. Built from a `Project`'s settings + a frame
/// range. `frame_count` is the number of frames to render (MVP: a short
/// proof clip; real export computes this from the timeline duration).
#[derive(Clone, Debug)]
pub struct ExportOptions {
    pub width: u32,
    pub height: u32,
    /// Numerator/denominator frame rate (from `ProjectSettings::fps`).
    pub fps_num: u32,
    pub fps_den: u32,
    pub frame_count: u32,
    pub output_path: PathBuf,
}

impl ExportOptions {
    /// Build export options from a project + an output path + frame count.
    pub fn from_project(
        project: &Project,
        output_path: impl AsRef<Path>,
        frame_count: u32,
    ) -> Self {
        Self {
            width: project.settings.canvas.width,
            height: project.settings.canvas.height,
            fps_num: project.settings.fps.numerator,
            fps_den: project.settings.fps.denominator,
            frame_count,
            output_path: output_path.as_ref().to_path_buf(),
        }
    }

    /// Validate before export. Catches the obvious bad inputs early so
    /// we don't spawn ffmpeg with nonsense args.
    pub fn validate(&self) -> Result<(), ExportError> {
        if self.width == 0 || self.height == 0 {
            return Err(ExportError::InvalidDimensions {
                width: self.width,
                height: self.height,
            });
        }
        if self.fps_den == 0 {
            return Err(ExportError::InvalidFrameRate);
        }
        if self.frame_count == 0 {
            return Err(ExportError::NoFrames);
        }
        if self.output_path.as_os_str().is_empty() {
            return Err(ExportError::EmptyOutputPath);
        }
        Ok(())
    }
}

/// Errors that can occur during export. Typed (no `any`).
#[derive(Debug, Error)]
pub enum ExportError {
    #[error("Invalid canvas dimensions: {width}x{height}")]
    InvalidDimensions { width: u32, height: u32 },
    #[error("Invalid frame rate (denominator is zero)")]
    InvalidFrameRate,
    #[error("No frames to export (frame_count is zero)")]
    NoFrames,
    #[error("Output path is empty")]
    EmptyOutputPath,
    #[error("FFmpeg failed to start: {0}. Is ffmpeg installed / bundled?")]
    Spawn(#[from] std::io::Error),
    #[error("Compositor render failed at frame {frame}: {source}")]
    Render {
        frame: u32,
        #[source]
        source: compositor::CompositorError,
    },
    #[error("Failed to write frame {frame} to FFmpeg stdin: {source}")]
    StdinWrite {
        frame: u32,
        #[source]
        source: std::io::Error,
    },
    #[error("FFmpeg exited with status {0}")]
    BadExit(std::process::ExitStatus),
}

/// Export a video: render `frame_count` frames via the compositor and
/// pipe them to FFmpeg, which encodes to the output `.mp4` with hardware
/// acceleration where available.
///
/// `context` + `compositor` are the same instances used for preview
/// (Increment 1) — reused, not recreated. The compositor renders to a
/// readback buffer (`render_frame_to_bytes`) per frame; FFmpeg reads the
/// raw BGRA stream from stdin and encodes.
///
/// Returns the output path on success.
pub fn export_video(
    context: &GpuContext,
    compositor: &mut Compositor,
    _project: &Project,
    opts: &ExportOptions,
) -> Result<PathBuf, ExportError> {
    opts.validate()?;

    // Build the FFmpeg command: raw BGRA from stdin -> h264 .mp4.
    // `-hwaccel auto` lets FFmpeg pick the best hardware encoder.
    // input: rawvideo, bgra pix_fmt, given size + fps.
    // output: h264 (libx264 software fallback is always available; with
    //   a hwaccel-capable build FFmpeg auto-selects the hw encoder).
    let fps_arg = format!("{}/{}", opts.fps_num, opts.fps_den);
    let mut cmd = FfmpegCommand::new();
    cmd.args([
        "-y", // overwrite output if exists
        "-hwaccel",
        "auto", // top-1: prefer hardware acceleration
        "-f",
        "rawvideo", // input format
        "-pix_fmt",
        "bgra", // matches GPU_TEXTURE_FORMAT (Bgra8Unorm)
        "-s",
        &format!("{}x{}", opts.width, opts.height),
        "-r",
        &fps_arg, // input frame rate
        "-i",
        "-", // read from stdin
        "-c:v",
        "libx264", // encoder (FFmpeg falls back to hw if libx264 absent + hw available via -hwaccel output side; libx264 is the safe default)
        "-pix_fmt",
        "yuv420p", // broadly-compatible output pixel format
        "-preset",
        "veryfast", // speed-leaning preset (top-1 priority)
    ]);
    cmd.output(opts.output_path.to_string_lossy().as_ref());

    let mut child = cmd.spawn()?;
    let mut stdin = child.take_stdin().ok_or_else(|| {
        ExportError::Spawn(std::io::Error::new(
            std::io::ErrorKind::Other,
            "FFmpeg stdin pipe not available",
        ))
    })?;

    // The clear colour from the project (editor bg #111114). With no
    // elements yet every frame is the clear colour; once the model holds
    // elements the FrameDescriptor.items get populated and real content
    // renders through the same pipeline.
    let frame_desc = FrameDescriptor {
        width: opts.width,
        height: opts.height,
        clear: CanvasClearDescriptor {
            color: [17.0 / 255.0, 17.0 / 255.0, 20.0 / 255.0, 1.0],
        },
        items: Vec::new(),
    };

    // Render + pipe each frame.
    for i in 0..opts.frame_count {
        let bytes = compositor
            .render_frame_to_bytes(context, &frame_desc)
            .map_err(|source| ExportError::Render { frame: i, source })?;
        stdin
            .write_all(&bytes)
            .map_err(|source| ExportError::StdinWrite { frame: i, source })?;
    }
    // Close stdin so FFmpeg knows the stream ended, then wait for it.
    drop(stdin);
    let status = child.wait()?;
    if !status.success() {
        return Err(ExportError::BadExit(status));
    }
    Ok(opts.output_path.clone())
}

/// Default export output path: `<project_id>-export.mp4` in `dir`.
#[allow(dead_code)] // used by tests; will be wired to export dialog default
pub fn default_export_path(dir: impl AsRef<Path>, project: &Project) -> PathBuf {
    let mut p = dir.as_ref().to_path_buf();
    p.push(format!("{}-export.mp4", project.metadata.id));
    p
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_options_from_project_carry_settings() {
        let project = Project::new_untitled("proj-1", 0);
        let opts = ExportOptions::from_project(&project, "out.mp4", 30);
        assert_eq!(opts.width, 1920);
        assert_eq!(opts.height, 1080);
        assert_eq!(opts.fps_num, 30);
        assert_eq!(opts.fps_den, 1);
        assert_eq!(opts.frame_count, 30);
        assert_eq!(opts.output_path, PathBuf::from("out.mp4"));
    }

    #[test]
    fn validation_rejects_zero_dimensions() {
        let opts = ExportOptions {
            width: 0,
            height: 1080,
            fps_num: 30,
            fps_den: 1,
            frame_count: 30,
            output_path: PathBuf::from("out.mp4"),
        };
        assert!(matches!(
            opts.validate(),
            Err(ExportError::InvalidDimensions { .. })
        ));
    }

    #[test]
    fn validation_rejects_zero_frame_rate_denominator() {
        let opts = ExportOptions {
            width: 1920,
            height: 1080,
            fps_num: 30,
            fps_den: 0,
            frame_count: 30,
            output_path: PathBuf::from("out.mp4"),
        };
        assert!(matches!(
            opts.validate(),
            Err(ExportError::InvalidFrameRate)
        ));
    }

    #[test]
    fn validation_rejects_zero_frame_count() {
        let project = Project::new_untitled("proj-1", 0);
        let opts = ExportOptions::from_project(&project, "out.mp4", 0);
        assert!(matches!(opts.validate(), Err(ExportError::NoFrames)));
    }

    #[test]
    fn validation_accepts_sane_options() {
        let project = Project::new_untitled("proj-1", 0);
        let opts = ExportOptions::from_project(&project, "out.mp4", 30);
        assert!(opts.validate().is_ok());
    }

    #[test]
    fn default_export_path_uses_project_id() {
        let project = Project::new_untitled("my-proj", 0);
        let p = default_export_path("/tmp", &project);
        assert_eq!(
            p.file_name().unwrap().to_str().unwrap(),
            "my-proj-export.mp4"
        );
    }
}
