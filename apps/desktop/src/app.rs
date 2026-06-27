//! Artidor application — root GPUI entity that owns the editor state,
//! viewport renderer, and playback engine. Implements `Render` to build
//! the full editor layout tree on every frame.

use compositor::CompositorError;
use gpui::{
    App, Application, Bounds, Context, Entity, Menu, MenuItem, SharedString, TitlebarOptions,
    Window, WindowBounds, WindowOptions, prelude::*, px, size,
};

use crate::actions::*;
use crate::media::{detect_media_type, load_image_to_rgba, media_type_to_element_type};
use crate::playback::PlaybackEngine;
use crate::render::scene::build_frame;
use crate::render::viewport::{ViewportRenderer, ViewportState, rendered_frame_to_image_source};
use crate::shortcuts;
use crate::state::editor_state::EditorState;
use crate::state::persistence;
use crate::state::project::{Element, Track};

use std::path::PathBuf;
use std::sync::Arc;

/// The root application entity.
pub struct ArtidorApp {
    /// Editor state (project, selection, playhead, etc.)
    pub state: EditorState,
    /// WGPU viewport renderer (compositor).
    pub viewport: ViewportState,
    /// Playback timing engine.
    pub playback: PlaybackEngine,
    /// Cached rendered image from the last viewport render.
    /// Avoids re-rendering when nothing has changed.
    cached_image: Option<Arc<gpui::RenderImage>>,
    /// The playhead frame when the image was last rendered.
    last_rendered_frame: i64,
    /// Whether the project content changed since last render.
    pub content_dirty: bool,
    /// Status message shown in the footer.
    pub status_message: SharedString,
}

impl ArtidorApp {
    /// Creates a new application entity with default state.
    pub fn new(_cx: &mut Context<Self>) -> Self {
        Self {
            state: EditorState::new(),
            viewport: ViewportState::Initializing,
            playback: PlaybackEngine::new(),
            cached_image: None,
            last_rendered_frame: -1,
            content_dirty: true,
            status_message: "Ready".into(),
        }
    }

    /// Initializes the WGPU viewport renderer (async, runs in background).
    pub fn init_viewport(&mut self, cx: &mut Context<Self>) {
        let task = cx
            .background_executor()
            .spawn(async move { ViewportRenderer::new() });
        cx.spawn(async move |this, cx| match task.await {
            Ok(renderer) => {
                let _ = this.update(cx, |app, cx| {
                    app.viewport = ViewportState::Ready(renderer);
                    app.content_dirty = true;
                    cx.notify();
                });
            }
            Err(err) => {
                let _ = this.update(cx, |app, cx| {
                    app.viewport = ViewportState::Failed(err);
                    cx.notify();
                });
            }
        })
        .detach();
    }

    /// Renders the current frame via the WGPU compositor and caches the
    /// result as a GPUI image. Only re-renders if the playhead or content
    /// has changed.
    pub fn render_viewport_frame(&mut self) {
        let ViewportState::Ready(renderer) = &mut self.viewport else {
            return;
        };

        let playhead = self.state.playhead_frame;
        if !self.content_dirty && playhead == self.last_rendered_frame {
            return;
        }

        let frame_descriptor = build_frame(&self.state);

        match renderer.render(&frame_descriptor) {
            Ok(rendered) => {
                if let Some(gpui::ImageSource::Render(img)) =
                    rendered_frame_to_image_source(&rendered)
                {
                    self.cached_image = Some(img);
                }
                self.last_rendered_frame = playhead;
                self.content_dirty = false;
            }
            Err(CompositorError::MissingTexture { .. }) => {
                // Media not loaded yet — show a blank frame.
                self.cached_image = None;
                self.last_rendered_frame = playhead;
            }
            Err(e) => {
                log::error!("Viewport render error: {e}");
                self.status_message = format!("Render error: {e}").into();
            }
        }
    }

    /// Starts the playback timer that advances the playhead.
    pub fn start_playback_timer(&mut self, cx: &mut Context<Self>) {
        let task = cx.spawn(async move |this, cx| {
            loop {
                cx.background_executor()
                    .timer(std::time::Duration::from_millis(16))
                    .await;
                let should_continue = this
                    .update(cx, |app, cx| {
                        if !app.state.playing {
                            return false;
                        }
                        let fps = app.state.project.fps();
                        let delta = app.playback.poll(fps);
                        if delta != 0 {
                            let cont = app.state.advance_playback(delta);
                            app.content_dirty = true;
                            cx.notify();
                            cont
                        } else {
                            true
                        }
                    })
                    .unwrap_or(false);
                if !should_continue {
                    break;
                }
            }
        });
        task.detach();
    }

    // ── Action handlers ────────────────────────────────────────────────────

    /// Handle the PlayPause action.
    pub fn handle_play_pause(&mut self, cx: &mut Context<Self>) {
        self.state.toggle_playback();
        if self.state.playing {
            self.playback.start(self.state.playhead_frame);
            self.start_playback_timer(cx);
            self.status_message = "Playing".into();
        } else {
            self.playback.stop();
            self.status_message = "Paused".into();
        }
        cx.notify();
    }

    /// Handle the Stop action.
    pub fn handle_stop(&mut self, cx: &mut Context<Self>) {
        self.state.playing = false;
        self.playback.stop();
        self.state.jump_to_start();
        self.content_dirty = true;
        self.status_message = "Stopped".into();
        cx.notify();
    }

    /// Handle step forward.
    pub fn handle_step_forward(&mut self, cx: &mut Context<Self>) {
        self.state.step_forward();
        self.content_dirty = true;
        cx.notify();
    }

    /// Handle step backward.
    pub fn handle_step_backward(&mut self, cx: &mut Context<Self>) {
        self.state.step_backward();
        self.content_dirty = true;
        cx.notify();
    }

    /// Handle jump to start.
    pub fn handle_jump_to_start(&mut self, cx: &mut Context<Self>) {
        self.state.jump_to_start();
        self.content_dirty = true;
        cx.notify();
    }

    /// Handle jump to end.
    pub fn handle_jump_to_end(&mut self, cx: &mut Context<Self>) {
        self.state.jump_to_end();
        self.content_dirty = true;
        cx.notify();
    }

    /// Handle toggle loop.
    pub fn handle_toggle_loop(&mut self, cx: &mut Context<Self>) {
        self.state.looping = !self.state.looping;
        self.status_message = if self.state.looping {
            "Loop: ON".into()
        } else {
            "Loop: OFF".into()
        };
        cx.notify();
    }

    /// Handle split at playhead.
    pub fn handle_split(&mut self, cx: &mut Context<Self>) {
        let playhead = self.state.playhead_frame;
        let mut split_count = 0;

        for track in &mut self.state.project.tracks {
            if track.locked {
                continue;
            }
            let mut new_elements: Vec<Element> = Vec::new();
            for element in &mut track.elements {
                if element.contains_frame(playhead) && playhead > element.start_frame {
                    let mut second_half = element.clone();
                    second_half.id = uuid::Uuid::new_v4().to_string();
                    second_half.name = format!("{} (2)", element.name);
                    let split_offset = playhead - element.start_frame;
                    second_half.start_frame = playhead;
                    second_half.duration_frames = element.duration_frames - split_offset;
                    element.duration_frames = split_offset;
                    new_elements.push(second_half);
                    split_count += 1;
                }
            }
            track.elements.extend(new_elements);
        }

        if split_count > 0 {
            self.state.mark_dirty();
            self.content_dirty = true;
            self.status_message = format!("Split {split_count} element(s)").into();
        }
        cx.notify();
    }

    /// Handle delete selected.
    pub fn handle_delete(&mut self, cx: &mut Context<Self>) {
        let selected_ids: Vec<String> = self.state.selection.element_ids.clone();
        if selected_ids.is_empty() {
            return;
        }

        for track in &mut self.state.project.tracks {
            if track.locked {
                continue;
            }
            track.elements.retain(|e| !selected_ids.contains(&e.id));
        }

        self.state.selection.clear();
        self.state.mark_dirty();
        self.content_dirty = true;
        self.status_message = "Deleted".into();
        cx.notify();
    }

    /// Handle duplicate selected.
    pub fn handle_duplicate(&mut self, cx: &mut Context<Self>) {
        let selected_ids: Vec<String> = self.state.selection.element_ids.clone();
        if selected_ids.is_empty() {
            return;
        }

        let mut new_selection = Vec::new();
        for track in &mut self.state.project.tracks {
            if track.locked {
                continue;
            }
            let mut duplicates: Vec<Element> = Vec::new();
            for element in &track.elements {
                if selected_ids.contains(&element.id) {
                    let mut dup = element.clone();
                    dup.id = uuid::Uuid::new_v4().to_string();
                    dup.name = format!("{} copy", element.name);
                    dup.start_frame = element.end_frame();
                    new_selection.push(dup.id.clone());
                    duplicates.push(dup);
                }
            }
            track.elements.extend(duplicates);
        }

        self.state.selection.element_ids = new_selection;
        self.state.mark_dirty();
        self.content_dirty = true;
        self.status_message = "Duplicated".into();
        cx.notify();
    }

    /// Handle select all.
    pub fn handle_select_all(&mut self, cx: &mut Context<Self>) {
        self.state.selection.element_ids = self
            .state
            .project
            .tracks
            .iter()
            .flat_map(|t| t.elements.iter().map(|e| e.id.clone()))
            .collect();
        cx.notify();
    }

    /// Handle deselect all.
    pub fn handle_deselect_all(&mut self, cx: &mut Context<Self>) {
        self.state.selection.clear();
        cx.notify();
    }

    /// Handle zoom in.
    pub fn handle_zoom_in(&mut self, cx: &mut Context<Self>) {
        self.state.zoom_in();
        cx.notify();
    }

    /// Handle zoom out.
    pub fn handle_zoom_out(&mut self, cx: &mut Context<Self>) {
        self.state.zoom_out();
        cx.notify();
    }

    /// Handle zoom to fit.
    pub fn handle_zoom_to_fit(&mut self, cx: &mut Context<Self>) {
        let total = self.state.project.total_frames();
        if total > 0 {
            // Fit all content in ~800px (arbitrary viewport width).
            self.state.set_zoom(800.0 / total as f32);
        }
        cx.notify();
    }

    /// Handle toggle assets panel.
    pub fn handle_toggle_assets(&mut self, cx: &mut Context<Self>) {
        self.state.panels.assets = !self.state.panels.assets;
        cx.notify();
    }

    /// Handle toggle inspector panel.
    pub fn handle_toggle_inspector(&mut self, cx: &mut Context<Self>) {
        self.state.panels.inspector = !self.state.panels.inspector;
        cx.notify();
    }

    /// Handle toggle timeline.
    pub fn handle_toggle_timeline(&mut self, cx: &mut Context<Self>) {
        self.state.panels.timeline = !self.state.panels.timeline;
        cx.notify();
    }

    /// Handle toggle AI copilot.
    pub fn handle_toggle_ai(&mut self, cx: &mut Context<Self>) {
        self.state.panels.ai_copilot = !self.state.panels.ai_copilot;
        cx.notify();
    }

    /// Handle import media — opens a native file dialog.
    pub fn handle_import_media(&mut self, cx: &mut Context<Self>) {
        // Use a simple path prompt (native file dialogs require platform APIs
        // that are complex to wire up in GPUI 0.2.2). For now, we use the
        // clipboard or a hardcoded test path. A proper file picker can be
        // added via the `rfd` crate in a future enhancement.
        self.status_message = "Import: enter file path in terminal, or paste image path".into();
        cx.notify();
    }

    /// Imports a media file from a path, loads it, uploads to the compositor,
    /// and creates a timeline element.
    pub fn import_media_from_path(&mut self, path: &PathBuf, cx: &mut Context<Self>) {
        let media_type = detect_media_type(path);

        match media_type {
            crate::media::MediaType::Image => {
                match load_image_to_rgba(path) {
                    Ok(decoded) => {
                        let texture_id = uuid::Uuid::new_v4().to_string();
                        let element_type = media_type_to_element_type(media_type);

                        // Upload to compositor if viewport is ready.
                        if let ViewportState::Ready(renderer) = &mut self.viewport {
                            if let Err(e) = renderer.upload_texture(
                                &texture_id,
                                &decoded.rgba_bytes,
                                decoded.width,
                                decoded.height,
                            ) {
                                self.status_message = format!("Upload error: {e}").into();
                                cx.notify();
                                return;
                            }
                        }

                        // Register in state.
                        let entry = crate::state::editor_state::MediaEntry {
                            texture_id: texture_id.clone(),
                            path: path.clone(),
                            width: decoded.width,
                            height: decoded.height,
                            element_type,
                        };
                        self.state.register_media(entry);

                        // Create a timeline element.
                        let mut element = Element::new(
                            path.file_stem().and_then(|s| s.to_str()).unwrap_or("Image"),
                            element_type,
                        );
                        element.source_path = Some(path.to_string_lossy().to_string());
                        element.transform.width = 1.0;
                        element.transform.height = 1.0;

                        // Add to the first track of matching type.
                        let track_idx = self
                            .state
                            .project
                            .tracks
                            .iter()
                            .position(|t| t.element_type == element_type && !t.locked);

                        if let Some(idx) = track_idx {
                            self.state.project.tracks[idx].elements.push(element);
                        } else {
                            // Create a new track.
                            let mut track = Track::new(format!("{element_type:?}"), element_type);
                            track.elements.push(element);
                            self.state.project.tracks.push(track);
                        }

                        self.state.mark_dirty();
                        self.content_dirty = true;
                        self.status_message = format!(
                            "Imported: {}",
                            path.file_name().and_then(|s| s.to_str()).unwrap_or("?")
                        )
                        .into();
                        cx.notify();
                    }
                    Err(e) => {
                        self.status_message = e.into();
                        cx.notify();
                    }
                }
            }
            crate::media::MediaType::Video => {
                self.status_message = "Video import requires FFmpeg (coming soon)".into();
                cx.notify();
            }
            crate::media::MediaType::Audio => {
                self.status_message = "Audio import coming soon".into();
                cx.notify();
            }
            crate::media::MediaType::Unknown => {
                self.status_message = "Unknown media type".into();
                cx.notify();
            }
        }
    }

    /// Handle save project.
    pub fn handle_save_project(&mut self, cx: &mut Context<Self>) {
        let path = self.state.project_path.clone().unwrap_or_else(|| {
            let dir = persistence::default_projects_dir();
            dir.join(format!("{}.json", self.state.project.name))
        });

        match persistence::save_project(&self.state.project, &path) {
            Ok(()) => {
                self.state.project_path = Some(path.clone());
                self.state.dirty = false;
                self.status_message = format!("Saved: {}", path.display()).into();
            }
            Err(e) => {
                self.status_message = format!("Save error: {e}").into();
            }
        }
        cx.notify();
    }

    /// Handle open project.
    pub fn handle_open_project(&mut self, cx: &mut Context<Self>) {
        self.status_message = "Open project: enter path in terminal".into();
        cx.notify();
    }

    /// Handle new project.
    pub fn handle_new_project(&mut self, cx: &mut Context<Self>) {
        self.state = EditorState::new();
        self.content_dirty = true;
        self.cached_image = None;
        self.status_message = "New project created".into();
        cx.notify();
    }

    /// Handle export video.
    pub fn handle_export(&mut self, cx: &mut Context<Self>) {
        self.status_message = "Export: FFmpeg integration coming soon".into();
        cx.notify();
    }

    /// Handle toggle fullscreen.
    pub fn handle_toggle_fullscreen(&mut self, _cx: &mut Context<Self>) {
        // GPUI fullscreen API varies by platform — placeholder for now.
    }

    /// Register all action handlers as global listeners on the App.
    /// These handle keyboard shortcut dispatch.
    fn register_global_actions(cx: &mut App, entity: Entity<ArtidorApp>) {
        cx.on_action(move |_: &Quit, cx| {
            cx.quit();
        });
        let e = entity.clone();
        cx.on_action(move |_: &PlayPause, cx| {
            e.update(cx, |app, cx| app.handle_play_pause(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &Stop, cx| {
            e.update(cx, |app, cx| app.handle_stop(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &StepForward, cx| {
            e.update(cx, |app, cx| app.handle_step_forward(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &StepBackward, cx| {
            e.update(cx, |app, cx| app.handle_step_backward(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &JumpToStart, cx| {
            e.update(cx, |app, cx| app.handle_jump_to_start(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &JumpToEnd, cx| {
            e.update(cx, |app, cx| app.handle_jump_to_end(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ToggleLoop, cx| {
            e.update(cx, |app, cx| app.handle_toggle_loop(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &SplitAtPlayhead, cx| {
            e.update(cx, |app, cx| app.handle_split(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &DeleteSelected, cx| {
            e.update(cx, |app, cx| app.handle_delete(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &DuplicateSelected, cx| {
            e.update(cx, |app, cx| app.handle_duplicate(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &SelectAll, cx| {
            e.update(cx, |app, cx| app.handle_select_all(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &DeselectAll, cx| {
            e.update(cx, |app, cx| app.handle_deselect_all(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ZoomIn, cx| {
            e.update(cx, |app, cx| app.handle_zoom_in(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ZoomOut, cx| {
            e.update(cx, |app, cx| app.handle_zoom_out(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ZoomToFit, cx| {
            e.update(cx, |app, cx| app.handle_zoom_to_fit(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ToggleAssetsPanel, cx| {
            e.update(cx, |app, cx| app.handle_toggle_assets(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ToggleInspectorPanel, cx| {
            e.update(cx, |app, cx| app.handle_toggle_inspector(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ToggleTimeline, cx| {
            e.update(cx, |app, cx| app.handle_toggle_timeline(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ToggleAICopilot, cx| {
            e.update(cx, |app, cx| app.handle_toggle_ai(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &ImportMedia, cx| {
            e.update(cx, |app, cx| app.handle_import_media(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &SaveProject, cx| {
            e.update(cx, |app, cx| app.handle_save_project(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &OpenProject, cx| {
            e.update(cx, |app, cx| app.handle_open_project(cx));
        });
        let e = entity.clone();
        cx.on_action(move |_: &NewProject, cx| {
            e.update(cx, |app, cx| app.handle_new_project(cx));
        });
        let e = entity;
        cx.on_action(move |_: &ExportVideo, cx| {
            e.update(cx, |app, cx| app.handle_export(cx));
        });
    }
}

impl Render for ArtidorApp {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        // Render the viewport frame if needed.
        self.render_viewport_frame();

        // Build the full editor layout.
        crate::ui::editor_layout::build_layout(self, cx.entity(), self.cached_image.clone())
    }
}

/// Bootstraps and runs the Artidor desktop application.
pub fn run() {
    Application::new().run(|cx: &mut App| {
        // Register keyboard shortcuts.
        shortcuts::register(cx);

        // Set up the app menu (File, Edit, View, Playback, Help).
        let menu = Menu {
            name: "Artidor".into(),
            items: vec![
                MenuItem::action("New Project", NewProject),
                MenuItem::action("Open Project…", OpenProject),
                MenuItem::action("Save", SaveProject),
                MenuItem::separator(),
                MenuItem::action("Import Media…", ImportMedia),
                MenuItem::action("Export Video…", ExportVideo),
                MenuItem::separator(),
                MenuItem::action("Quit", Quit),
            ],
        };

        let edit_menu = Menu {
            name: "Edit".into(),
            items: vec![
                MenuItem::action("Split at Playhead", SplitAtPlayhead),
                MenuItem::action("Delete Selected", DeleteSelected),
                MenuItem::action("Duplicate", DuplicateSelected),
                MenuItem::separator(),
                MenuItem::action("Select All", SelectAll),
                MenuItem::action("Deselect All", DeselectAll),
            ],
        };

        let view_menu = Menu {
            name: "View".into(),
            items: vec![
                MenuItem::action("Zoom In", ZoomIn),
                MenuItem::action("Zoom Out", ZoomOut),
                MenuItem::action("Zoom to Fit", ZoomToFit),
                MenuItem::separator(),
                MenuItem::action("Toggle Assets Panel", ToggleAssetsPanel),
                MenuItem::action("Toggle Inspector", ToggleInspectorPanel),
                MenuItem::action("Toggle Timeline", ToggleTimeline),
                MenuItem::action("Toggle AI Copilot", ToggleAICopilot),
            ],
        };

        let playback_menu = Menu {
            name: "Playback".into(),
            items: vec![
                MenuItem::action("Play/Pause", PlayPause),
                MenuItem::action("Stop", Stop),
                MenuItem::action("Step Forward", StepForward),
                MenuItem::action("Step Backward", StepBackward),
                MenuItem::action("Jump to Start", JumpToStart),
                MenuItem::action("Jump to End", JumpToEnd),
                MenuItem::action("Toggle Loop", ToggleLoop),
            ],
        };

        cx.set_menus(vec![menu, edit_menu, view_menu, playback_menu]);

        // Open the main window.
        let bounds = Bounds::centered(None, size(px(1440.), px(900.)), cx);
        let window = cx
            .open_window(
                WindowOptions {
                    window_bounds: Some(WindowBounds::Windowed(bounds)),
                    titlebar: Some(TitlebarOptions {
                        title: Some("Artidor".into()),
                        ..Default::default()
                    }),
                    ..Default::default()
                },
                |_window, cx| {
                    cx.new(|cx| {
                        let mut app = ArtidorApp::new(cx);
                        app.init_viewport(cx);
                        app
                    })
                },
            );

        // Register global action listeners for keyboard shortcuts.
        // If the window or entity is unavailable (e.g. GPU init failure on
        // headless systems), skip action registration and exit gracefully
        // rather than panicking.
        if let Ok(window) = window {
            match window.entity(cx) {
                Ok(entity) => ArtidorApp::register_global_actions(cx, entity),
                Err(e) => log::error!("Failed to get window entity: {e}"),
            }
        } else {
            log::error!("Failed to open main window — exiting");
            cx.quit();
            return;
        }

        cx.activate(true);
    });
}
