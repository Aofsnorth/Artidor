//! Playback engine — frame-accurate playhead advancement.
//!
//! Uses `std::time::Instant` for high-resolution timing and converts
//! elapsed wall-clock time to frames based on the project's frame rate.
//! The engine is polled from the GPUI render loop (via a timer) rather
//! than running its own thread, which avoids race conditions with the
//! UI state.

#![allow(dead_code)]

use std::time::Instant;

/// The playback engine tracks elapsed time and converts it to frame deltas.
pub struct PlaybackEngine {
    /// When the current playback segment started.
    start_time: Option<Instant>,
    /// The playhead frame at the moment playback started.
    start_frame: i64,
    /// Accumulated fractional frames (to avoid drift at non-integer fps).
    frame_accumulator: f64,
}

impl PlaybackEngine {
    pub fn new() -> Self {
        Self {
            start_time: None,
            start_frame: 0,
            frame_accumulator: 0.0,
        }
    }

    /// Start playback from the current frame.
    pub fn start(&mut self, current_frame: i64) {
        self.start_time = Some(Instant::now());
        self.start_frame = current_frame;
        self.frame_accumulator = 0.0;
    }

    /// Stop playback.
    pub fn stop(&mut self) {
        self.start_time = None;
    }

    /// Whether playback is active.
    pub fn is_playing(&self) -> bool {
        self.start_time.is_some()
    }

    /// Poll the engine — returns the frame delta since the last poll.
    ///
    /// Call this from the render loop at ~60Hz. Returns 0 if playback is
    /// not active or not enough time has elapsed for a full frame.
    pub fn poll(&mut self, fps: f64) -> i64 {
        let Some(start) = self.start_time else {
            return 0;
        };

        let elapsed_secs = start.elapsed().as_secs_f64();
        let elapsed_frames = elapsed_secs * fps;
        let total_frames = elapsed_frames + self.frame_accumulator;

        let whole_frames = total_frames.floor() as i64;
        self.frame_accumulator = total_frames - whole_frames as f64;

        // Reset the start time so the next poll measures from now.
        let delta = whole_frames - self.start_frame;
        self.start_frame = whole_frames;
        self.start_time = Some(Instant::now());

        delta
    }
}

impl Default for PlaybackEngine {
    fn default() -> Self {
        Self::new()
    }
}
