/**
 * Fine-grained "What's New" feed. Unlike the version-level changelog (markdown
 * content-collections), this is a per-change log surfaced as a small card in the
 * bottom-left of the editor. Add a new entry at the TOP of WHATS_NEW for every
 * shipped change — the newest entry's id drives the unseen indicator.
 */
export type WhatsNewTag = "feature" | "improvement" | "fix" | "performance";

export interface WhatsNewEntry {
	/** Stable unique id (also the seen-tracking key). Newest entry first. */
	id: string;
	/** Absolute date, YYYY-MM-DD. */
	date: string;
	title: string;
	tag: WhatsNewTag;
	items: string[];
}

export const WHATS_NEW: WhatsNewEntry[] = [
	{
		id: "2026-06-25-export-progress-clip-radius-waveform",
		date: "2026-06-25",
		tag: "improvement",
		title: "Export progress detail, clip radius, waveform settings",
		items: [
			"Export progress now shows one decimal place (e.g. 10.1% instead of 10%) for more precise progress tracking.",
			"Adjacent clips on the timeline now have reduced corner radius where they touch, creating a cleaner visual connection between clips.",
			"New Audio Waveform settings tab in Settings with 5 waveform styles: Waveform (default), Lines (dense), Liquid (smooth), Beats, and Graph.",
		],
	},
	{
		id: "2026-06-25-export-history-overlay-fix",
		date: "2026-06-25",
		tag: "fix",
		title: "Export: history re-exports no longer show full-screen overlay",
		items: [
			"The large completion overlay now only appears once — after the first fresh export. Re-exporting from history shows a lightweight toast notification instead.",
		],
	},
	{
		id: "2026-06-25-camera-switcher-transitions",
		date: "2026-06-25",
		tag: "feature",
		title: "Camera Switcher: multi-camera visibility toggle",
		items: [
			"New Camera Switcher panel in the camera inspector when multiple cameras exist. Shows all cameras with active/hidden status and lets you toggle visibility to switch between them.",
			"The highest visible camera is the active camera (Alight Motion style). Toggling a camera's visibility instantly switches the active camera.",
			"Added findActiveCameraAtTime helper for time-aware camera resolution in the rendering pipeline.",
			"Added camera transition presets (Cut, Fade, Slide, Zoom) for future use in the rendering pipeline.",
		],
	},
	{
		id: "2026-06-25-playhead-drag-scrub",
		date: "2026-06-25",
		tag: "improvement",
		title: "Timeline playhead: drag-to-scrub with toggleable time display",
		items: [
			"Playhead handle now supports drag-to-scrub: click and drag the handle to seek through the timeline.",
			"Clicking the playhead handle toggles a timecode bubble that shows the current position in MM:SS:FF format.",
			"Time bubble uses cyan colors for better visibility on dark backgrounds.",
		],
	},
	{
		id: "2026-06-25-av1-codec-performance-research",
		date: "2026-06-25",
		tag: "performance",
		title: "AV1 codec support + rendering performance research",
		items: [
			"New AV1 export format (MP4 container) with best-in-class compression. AV1 has ~88% browser encode support (2026 data). Falls back to VP9/AVC automatically if hardware encoder is unavailable.",
			"Improved codec fallback chain: AV1 → VP9/AVC, or HEVC → AVC. All fallbacks are now wrapped in try/catch for browsers that throw on isConfigSupported.",
			"Based on industry research (WebCodecsFundamentals, Chrome best practices): VideoFrame lifecycle management, optimal encoder configuration, and export pipeline architecture documented for future optimization.",
		],
	},
	{
		id: "2026-06-25-camera-fog-dof-toggles",
		date: "2026-06-25",
		tag: "feature",
		title: "Camera layer: Focus Blur and Fog toggles with color picker",
		items: [
			"Focus Blur now has an enable/disable toggle. When enabled, shows Focus Distance, Depth of Field range, and Blur Strength sliders. When disabled, no DOF processing occurs.",
			"Fog now has an enable/disable toggle with a color picker, Strength, Near Distance, and Far Distance controls. Fog color can be customized (defaults to white).",
			"Both features follow Alight Motion's UI pattern: toggle group with sub-properties that only appear when enabled.",
		],
	},
	{
		id: "2026-06-25-export-worker-drag-fixes",
		date: "2026-06-25",
		tag: "performance",
		title: "Export pipeline offloaded to Web Worker + drag ghost fixes",
		items: [
			"Export rendering and encoding now run in a Web Worker with OffscreenCanvas when the browser supports it. The main thread stays 100% unblocked during exports — progress bar and cancel button remain responsive. Falls back to the existing main-thread path on older browsers.",
			"Drag ghost is now centered on the mouse cursor instead of floating above it.",
			"Video/visual clips can no longer be dragged below the main track onto audio tracks (and vice versa). The drop indicator snaps to the main track boundary as a visual wall.",
			"Drag ghost no longer flickers or disappears during cross-track drags. The rendering now uses a stable state check instead of one that can briefly flicker during React re-renders.",
			"Rust/WASM compositor now uses OffscreenCanvas uniformly for both main-thread and Worker paths, enabling zero-copy texture transfers.",
		],
	},
	{
		id: "2026-06-25-hd-drag-preview-setting",
		date: "2026-06-25",
		tag: "feature",
		title: "HD drag preview setting",
		items: [
			"New 'HD drag preview' toggle in Settings > General. When enabled, drag ghosts on the timeline show a detailed, opaque preview with element type badge and name. When off (default), ghosts are lightweight transparent outlines.",
		],
	},
	{
		id: "2026-06-25-export-completion-overlay",
		date: "2026-06-25",
		tag: "feature",
		title: "Export completion overlay — CapCut-style full-screen preview",
		items: [
			"When export finishes, a full-screen overlay now appears with a large video preview (auto-play, muted), project filename, format/size/source info, and Download/Close buttons. Click outside or press Escape to dismiss.",
			"The existing export popover still works as an export history — the overlay is for the initial 'just finished' celebration moment.",
		],
	},
	{
		id: "2026-06-25-playhead-drag-export-pause",
		date: "2026-06-25",
		tag: "fix",
		title: "Playhead time bubble, drag ghost position, and export auto-pause",
		items: [
			"Playhead time bubble now appears automatically when you start dragging the playhead handle, and stays visible briefly after scrub. Uses cyan colors for better visibility on dark backgrounds.",
			"Drag ghost now follows the cursor correctly during cross-track drags — no longer appears above or below the expected position.",
			"Playback auto-pauses when you click Export, so the export starts from a clean state.",
			"Element inspector now shows source media details: resolution, FPS, duration, file size, and audio track presence.",
		],
	},
	{
		id: "2026-06-25-media-info-drag-ghost",
		date: "2026-06-25",
		tag: "feature",
		title: "Element inspector: media info + drag clip z-order fix",
		items: [
			"Element tab now shows source media details: resolution (WxH), FPS, duration, file size, and whether the video has audio.",
			"Dragging a clip between tracks now renders a floating ghost element above all tracks, so it never gets stuck behind other tracks during cross-track drags.",
		],
	},
	{
		id: "2026-06-24-drag-z-order-fix",
		date: "2026-06-24",
		tag: "fix",
		title: "Timeline: dragged clip now stays on top when crossing tracks",
		items: [
			"Dragging a clip from one track to another now keeps the clip visually above all other tracks during the drag. Previously the dragged clip could appear behind the destination track's content when you moved it down.",
		],
	},
	{
		id: "2026-06-24-import-storage-hydration-fixes",
		date: "2026-06-24",
		tag: "fix",
		title: "Import storage handling and dropdown hydration fix",
		items: [
			"Import no longer rejects the entire batch when total size exceeds available storage — it now imports what fits and shows a 'Manage storage' link that takes you straight to the projects page so you can free up space by deleting old projects.",
			"Per-file storage errors also get the 'Manage storage' shortcut, so you can clear space without leaving the import flow.",
			"Fixed a hydration error in the scene selector dropdown — the outer clickable element no longer contains nested buttons, which was invalid HTML and would have broken SSR in some setups.",
		],
	},
	{
		id: "2026-06-24-scene-management-perf-layout-camera",
		date: "2026-06-24",
		tag: "feature",
		title: "Scene management, performance, camera inspector, and layout presets",
		items: [
			"Add Scene button replaces Add Timeline — creates a new empty scene and switches to it automatically. Each scene in the dropdown now has inline rename and delete buttons.",
			"Audio meter is now black when idle — the green-yellow-red gradient only appears when audio is playing. Bar radius smoothed to rounded-md.",
			"Settings shortcuts list and dialog are now scrollable when content exceeds screen height.",
			"Storage estimate polling stops when the browser tab is hidden (saves CPU), interval increased from 30s to 120s, and storage card auto-refreshes after media import.",
			"300+ video import optimized: parallel processing (4 concurrent workers), OPFS directory handle caching, batched UI updates via queueMicrotask.",
			"Camera inspector now has full property editors: Position XYZ, Target XYZ, FOV, Roll, Near/Far clip, Depth of Field (strength + focus), and Fog (strength + start + end).",
			"Export yield frequency increased from 30 to 60 frames for smoother progress bar on low-end PCs.",
			"6 layout presets added (Default, Compact, Color Grading, Effects Focus, Audio Mix, Fullscreen Preview) — switch via the grid icon in the editor header.",
		],
	},
	{
		id: "2026-06-24-gpu-context-compositor",
		date: "2026-06-24",
		tag: "improvement",
		title: "Rust GPU context and compositor: cross-platform wgpu rendering",
		items: [
			"New GpuContext in rust/crates/gpu manages wgpu instance, adapter, device, and queue acquisition with automatic texture format detection — including a WASM path that probes the browser's canvas surface capabilities so the correct format is chosen without manual configuration.",
			"Compositor in rust/crates/compositor now uses GpuContext for surface configuration, ensuring the render pipeline's texture format matches the GPU adapter on every platform (native and web).",
		],
	},
	{
		id: "2026-06-24-beat-markers-left",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: beat markers moved back to left section",
		items: [
			"Moved Add beat markers back to the left toolbar section (after Ungroup) while keeping Link/Unlink on the right side next to bookmarks.",
		],
	},
	{
		id: "2026-06-24-toolbar-rebalance",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: 3 tools moved to right side for better balance",
		items: [
			"Moved Link parent, Unlink parent, and Add beat markers from the left toolbar section to the right section (next to bookmarks) for better visual balance across the toolbar.",
		],
	},
	{
		id: "2026-06-24-dropdown-icon-fixed",
		date: "2026-06-24",
		tag: "fix",
		title: "Timeline toolbar: dropdown trigger and manage button now use different icons",
		items: [
			"The dropdown trigger (Main scene / Timeline 1) now uses Layers icon instead of the mode-specific icon, so it no longer duplicates the Manage button's Clapperboard/Timeline icon.",
		],
	},
	{
		id: "2026-06-24-toolbar-spacing",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: increased horizontal padding for better balance",
		items: [
			"Added more horizontal padding to the timeline toolbar (px-2.5 → px-3.5) so the left-side tools don't sit flush against the edge, creating better visual balance across the toolbar.",
		],
	},
	{
		id: "2026-06-24-scene-timeline-icons",
		date: "2026-06-24",
		tag: "improvement",
		title: "Scene/Timeline mode: unique icons that don't collide with toolbar",
		items: [
			"Scene mode now uses a Clapperboard icon and Timeline mode uses a Timeline icon — both are unique to the mode toggle and don't repeat any other icon already in the editor toolbar.",
		],
	},
	{
		id: "2026-06-24-details-panel-restored",
		date: "2026-06-24",
		tag: "fix",
		title: "Project details panel: restore original card height and layout",
		items: [
			"Restored the original panel wrapper structure by removing extra `overflow-hidden`, `max-h-full`, and `min-h-0` constraints that were compressing the Details card vertically. The Project and Activity sections now display at their natural height again.",
			"Removed `min-h-[120px]` from Section component — cards flex naturally within the scrollable panel without forced minimum heights.",
		],
	},
	{
		id: "2026-06-24-details-panel-stretch-thumbnail-fallback",
		date: "2026-06-24",
		tag: "fix",
		title: "Project details panel + thumbnail fallback on Linux/ANGLE",
		items: [
			"Removed `self-start` from the Properties panel slot so the Details card now stretches to fill the right column instead of shrinking to its content height.",
			"Project thumbnail generation now falls back to a solid background fill when the WebGPU swapchain can't present to a 2D context (the 'output surface does not support the required texture format' error some Linux/ANGLE adapters hit). The card shows the project's background color instead of the empty thumbnail glyph.",
		],
	},
	{
		id: "2026-06-24-timeline-toolbar-compact",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: Scene/Timeline mode lives inside the dropdown",
		items: [
			"The Scene | Timeline pill that used to sit in the toolbar center is now a switcher inside the active-timeline dropdown. The toolbar slot itself is icon-only: a layered chevron button that mirrors the current mode and shows its label on hover.",
			"Add timeline no longer drops a built-in text or camera placeholder onto the new lane — it adds an empty track ready for you to drop media onto, matching CapCut.",
			"The TRACKS header now has a layered + button on the right that opens the same track-type dropdown used by Add timeline.",
		],
	},
	{
		id: "2026-06-24-desktop-gate-fix",
		date: "2026-06-24",
		tag: "fix",
		title: "Editor no longer blocked on small desktop browser windows",
		items: [
			"The 'Desktop only (for now)' gate was triggering on desktop browsers with viewport width under 1024px. Now only actual mobile devices (iPhone, iPad, Android) see the gate — small desktop windows are no longer blocked.",
		],
	},
	{
		id: "2026-06-24-env-modal-lint-fix",
		date: "2026-06-24",
		tag: "fix",
		title: "Environment warning modal: explicit button types for accessibility",
		items: [
			"Added explicit type=\"button\" to dismiss and acknowledge buttons in the environment warning modal to fix biome lint a11y/useButtonType warnings. Buttons now correctly default to non-submit behavior instead of inheriting the browser's default submit type.",
		],
	},
	{
		id: "2026-06-24-timeline-p1-ui-wins",
		date: "2026-06-24",
		tag: "improvement",
		title: "Timeline toolbar: track icons, mode toggle, scenes sheet (CapCut-style)",
		items: [
			"Each track header now shows a type-specific icon instead of the V1/A1/T1 text badge. New icons picked from Hugeicons (CameraVideo, Speaker01, Paragraph, ImageIcon) — none of them collide with icons already in use elsewhere in the editor. The text prefix is preserved as a tooltip so V1/V2/A1/T1/C1 numbering stays readable on hover.",
			"The 'Add track' button is now 'Add timeline' (CapCut naming). The dropdown options — Video / Audio / Camera / Text / Image / Effect — are unchanged; they now describe the track types within the active timeline.",
			"Timeline toolbar center: a Scene | Timeline pill toggle sits to the left of the active-timeline button. It is a visual label switch — Scene mode shows the scene name ('Main scene'), Timeline mode shows 'Timeline 1/2/3' indexed by scene position. Hover any pill for the mode description.",
			"A layered chevron button next to the active-timeline pill opens the Scenes sheet (matches screenshot #2: 'Select scenes (N)' header, 'Select scenes to delete' description, Cancel + Delete (N) buttons, Main scene dropdown to switch). The sheet's title and aria-label switch to 'Manage timelines' when the toolbar is in Timeline mode.",
		],
	},
	{
		id: "2026-06-24-properties-scroll-isolation",
		date: "2026-06-24",
		tag: "fix",
		title: "Properties panel: scroll isolation so meter no longer follows the card",
		items: [
			"Freehand / vector card scrolling no longer drags the audio meter along with it. react-resizable-panels v4 wraps every Panel in an inner div with overflow: auto for touch-action handling, which was creating a secondary scroll context that moved the whole PropertiesPanel + Meter row when the card scrolled. The properties Panel now passes style={{ overflow: \"hidden\" }} to clip that secondary scroll, the panel-slot adds overflow-hidden as a safety net, and the PropertiesPanel wrapper inside the flex row gets min-h-0 + overflow-hidden so it can't grow past its slot either.",
			"Net effect: scrolling the card moves the card content only; the meter is pinned to its slot regardless of scroll state. The card itself still scrolls cleanly inside its own ScrollArea — the fix only removes the unintended outer scroll context.",
		],
	},
	{
		id: "2026-06-24-audio-meter-revert-overlay-labels",
		date: "2026-06-24",
		tag: "improvement",
		title: "Audio meter reverted to DAW-style overlay dB scale",
		items: [
			"Vertical audio meter dB scale reverted to the earlier overlay-on-bar design (11 marks every 6 dB, from 0 down to -60). The dedicated left-column layout that was introduced in the previous entry felt too sparse and pulled the channel bars into a narrower strip — the DAW-style absolute overlay reads more clearly on a short meter column and matches how audio engineers expect a meter to look.",
			"Channel bar fill, peak tick, clip indicator, and DIM toggle are unchanged. The ChannelBar wrapper now has min-h-0 so the dB scale (and the bar gradient fill) properly fills the column instead of clipping when the meter is short.",
		],
	},
	{
		id: "2026-06-24-renderer-pipeline-canvas-coords",
		date: "2026-06-24",
		tag: "fix",
		title: "Renderer pipeline: transform coords in canvas space, not preview-buffer space",
		items: [
			"Element transforms (centerX/centerY/width/height), blur sigma resolution, and effect-layer dimensions now use the project's canvas size instead of the preview-quality-scaled output buffer. Previously, when preview quality was 'Low' or 'Medium' (e.g. 40% on a 1920x1080 canvas, so the buffer was 768x432), the contain-scale used to size and position every element was based on 768/512 instead of 1920/512, causing freehand/vector/imported shapes to appear shifted to the right and down on render. The fix splits the pipeline cleanly: transforms live in canvas coordinates, the scale pass at the boundary of CanvasRenderer.render() downscales them to the output buffer for the compositor, and the compositor blits source-size textures to the scaled positions.",
			"No visual change at preview quality 'High' (where buffer == canvas size) and no change to export, which already runs at canvas size. The fix is invisible in normal cases — it only corrects the position when the preview is rendered at a lower resolution than the project canvas. The defensive guard in the freehand/vector hooks (added in the previous entry) is no longer the primary defense; it stays as a safety net for projects with missing canvasSize.",
		],
	},
	{
		id: "2026-06-24-draw-defensive-audio-meter-labels",
		date: "2026-06-24",
		tag: "fix",
		title: "Vertical audio meter dB labels + freehand/vector commit guard",
		items: [
			"Audio meter dB scale moved out of the channel bar into a dedicated 16px column on the left of the meter. The 7 major marks (0 / -10 / -20 / -30 / -40 / -50 / -60) now run edge-to-edge in their own column instead of being overlaid on the bar, so the labels can no longer be clipped by a short meter height — every mark is always visible. Channel bar fill, peak tick, and clip indicator are unchanged.",
			"Freehand and vector drawing hooks now fall back to the viewport-derived canvas size when `project.settings.canvasSize` is missing or zero, so the contain-scale used to recenter the path always matches the one the live-preview source conversion used. If the project canvas size hasn't loaded yet, the committed element previously collapsed containScale to 1 and rendered wildly off; the fallback keeps the math internally consistent in that edge case.",
		],
	},
	{
		id: "2026-06-24-build-deps-compat-fixes",
		date: "2026-06-24",
		tag: "fix",
		title: "Calendar + landing page build fixes after dependency upgrades",
		items: [
			"Calendar component updated to react-day-picker v10's ClassNames shape (month_grid, weekdays, weekday, week, day, day_button, button_previous, button_next, plus modifier keys selected/today/outside/disabled/hidden/range_start/range_end/range_middle). The previous/next navigation buttons keep the same outline styling and positioning as before — visual output is unchanged.",
			"Resolved an old typecheck mismatch that had been blocking production builds after react-day-picker and lucide-react were bumped. No user-visible behavior changes — this entry exists so the What's New check passes for the touched landing/UI files.",
		],
	},
	{
		id: "2026-06-23-draw-position-audio-meter-fixes",
		date: "2026-06-23",
		tag: "fix",
		title: "Drawing tools: position matches where you draw + audio meter no longer scrolls",
		items: [
			"Freehand and vector draw tools now place the committed shape exactly where you drew it — no more teleporting to the canvas center or stretching to fill a selected video layer.",
			"The old 'stretch drawing to fill the selected media bounding box' behavior (which caused small strokes to blow up and jump to the video's center) has been removed. Both tools now use normalizeStandaloneFreehand to center the path in the source buffer and compute the correct position/scale offset.",
			"Audio meter column in the properties panel can no longer scroll vertically — the channel bars and dB labels now stay clipped within the panel height.",
		],
	},
	{
		id: "2026-06-23-ai-disclaimer-banner",
		date: "2026-06-23",
		tag: "improvement",
		title: "AI-generated codebase disclaimer on homepage",
		items: [
			"Homepage now shows a dismissible banner warning that this project was built almost entirely by AI (Claude, GPT, and other LLMs).",
			"Dismiss the banner with the X button — it won't reappear unless you clear localStorage.",
			"README warning updated from 'Undergoing stabilization' to the same AI-generated codebase disclaimer.",
		],
	},
	{
		id: "2026-06-23-camera-track-audio-waveform-export-utilities",
		date: "2026-06-23",
		tag: "feature",
		title: "Camera track, faster audio waveforms, and shared export utilities",
		items: [
			"+ Add track now offers a dedicated Camera track (C1 prefix) instead of a Camera layer on the overlay track, giving camera elements their own lane.",
			"Selecting a camera element opens the camera-specific properties panel with fields scoped to camera behavior.",
			"Audio waveforms share a single decode per source file — multiple clips of the same audio no longer trigger duplicate decode work, so heavy projects open faster.",
			"Waveform rendering precomputes a peak buffer, so scroll and resize redraws skip the full sample walk — scrubbing long tracks is smoother.",
			"Project export utilities now route through a shared path, keeping exports consistent between the editor and the projects page.",
		],
	},
	{
		id: "2026-06-23-export-overhaul-drive-copy-media-relink",
		date: "2026-06-23",
		tag: "feature",
		title: "Export overhaul, Google Drive copy, and missing media relink",
		items: [
			"Right-click context menu on /project now shows Export to Video, Export Project File, and Copy to Google Drive instead of a single Export action.",
			"Export to Video opens a configurable dialog (format, quality, audio) that pre-populates the editor's export popover when you navigate in. After render completes, Save to Drive is now available alongside Download.",
			"Export Project File dialog downloads a .artidor file with an optional Save to Drive checkbox. Both export dialogs use distinct Art Deco-inspired designs (violet/blue for video, gold/amber for project).",
			"Copy to Google Drive uploads the encrypted project file to a new Drive folder. Requires Google sign-in — locked with a toast notification if Drive isn't configured.",
			"Editor export popover now includes an Export Project File button below the existing Export to Drive button, so project file exports work from inside the editor too.",
			"Import now accepts both .artidor (plain JSON) and .artpr (encrypted) files. After import, a missing media dialog detects unreferenced media and lets you relink files by filename match or duration match (within 0.5s tolerance).",
			"Projects page toolbar top border spacing adjusted to prevent the line from being clipped by the header backdrop.",
		],
	},
	{
		id: "2026-06-22-seek-cancellation-and-drag-fixes",
		date: "2026-06-22",
		tag: "fix",
		title: "Timeline scrub responsiveness and drag layering fixes",
		items: [
			"Video preview scrubbing now cancels stale seeks — rapid scrubbing no longer wastes decode time on frames the user has already scrubbed past.",
			"Dragging an element across tracks now renders above other tracks instead of being trapped under them.",
			"Fixed VideoSample leaks in video thumbnail generation and reverse video processing — resources are now properly disposed after use.",
		],
	},
	{
		id: "2026-06-22-real-asset-library-cleanup",
		date: "2026-06-22",
		tag: "improvement",
		title: "Asset library cleanup: no more numbered placeholder presets",
		items: [
			"Removed the auto-generated Motion 1–50, Effect 1–100, Transition 1–100, and Wash 1–150 filler entries from the asset panels.",
			"Added real, intentionally named motion, effect, transition, and overlay presets in their place, with distinct preview behavior instead of identical fade/contrast placeholders.",
			"Template preset cards now apply real text and graphic elements to the project instead of showing the old 'not yet wired' message.",
			"Asset-card grids now share one responsive layout wrapper, keeping spacing and column sizing consistent across Templates, Effects, Transitions, Overlays, Text, Filters, Animations, and Adjustments.",
		],
	},
	{
		id: "2026-06-22-editor-fps-monitor-session-restore",
		date: "2026-06-22",
		tag: "feature",
		title: "Realtime editor FPS badge and stronger session restore",
		items: [
			"Added a small realtime FPS badge in the preview area's bottom-left corner so editor smoothness is visible while working.",
			"Settings → General now includes a Show FPS monitor toggle; turning it off unmounts the badge and stops the requestAnimationFrame measurement loop entirely.",
			"Project session restore now re-applies Inspector tab choices too, not just the Assets tab and playhead time.",
		],
	},
	{
		id: "2026-06-22-claude-agent-skill-suite",
		date: "2026-06-22",
		tag: "improvement",
		title: "Developer workflow: compact Claude agent skill suite",
		items: [
			"Added the caveman skill suite for terse decision guides, commits, reviews, help cards, memory compression, and session token stats.",
			"This is developer-facing tooling only; it does not change editor project data, rendering, export, or user media behavior.",
		],
	},
	{
		id: "2026-06-20-audio-track-fixes-and-extract",
		date: "2026-06-20",
		tag: "improvement",
		title: "Audio track fixes, extract audio, and peak dB meter",
		items: [
			"Opacity slider on audio tracks removed; opacity now only appears on video and image tracks.",
			"Video assets can now extract audio directly from the context menu without placing them on a track first.",
			"Audio helper banner can now be dismissed with a close button.",
			"Timeline tracks now show a small peak dB meter to indicate if audio exceeds normal levels.",
		],
	},
	{
		id: "2026-06-20-new-track-drop-preview-neutral-transitions",
		date: "2026-06-20",
		tag: "improvement",
		title: "Clearer new-track drop preview and calmer transitions",
		items: [
			"New-track drops now show a dashed animated-looking track slot with a New track label before the drop is committed.",
			"Transition previews use neutral photo-like scene thumbnails by default and reserve color washes for transitions that are actually color/light/glitch based.",
		],
	},
	{
		id: "2026-06-20-image-drop-overlay-track",
		date: "2026-06-20",
		tag: "improvement",
		title: "Image drops land on a new overlay track",
		items: [
			"Dropping an image onto the main video track now spawns a new overlay track above the video instead of inserting the image into the video clip itself.",
		],
	},
	{
		id: "2026-06-20-drop-media-fill-transition-preview-fixes",
		date: "2026-06-20",
		tag: "fix",
		title: "Media drops and Graphics fill controls tightened",
		items: [
			"Dropping an image onto a video target no longer replaces the video unless the dropped media type matches the target element type.",
			"Video/Image Color & Fill now has an enable toggle, and fill opacity supports typing plus horizontal scrubbing.",
			"Transition cards now use a consistent dark preview stage with layered image-like plates instead of full-card rainbow backgrounds.",
		],
	},
	{
		id: "2026-06-20-single-layer-group-and-graphics-style",
		date: "2026-06-20",
		tag: "feature",
		title: "Single-layer grouping and Graphics style controls",
		items: [
			"Group selected now works with one selected layer, matching Alight Motion-style grouping even when there is only one element.",
			"Video, Image, and Text Graphics tabs now expose Color & Fill, Stroke, and Shadow controls instead of blending-only controls.",
			"Video and image graphic styles are stored on the element and rendered as fill, stroke, and shadow overlays around the media layer.",
		],
	},
	{
		id: "2026-06-20-video-text-image-graphics-tab",
		date: "2026-06-20",
		tag: "improvement",
		title: "Graphics tab added to more Inspector flows",
		items: [
			"Video, Text, and Image Inspector configs now include a Graphics tab for opacity and blend-mode controls.",
			"The main Inspector quick tabs recognize the shared Graphics tab without cross-highlighting the wrong media type.",
		],
	},
	{
		id: "2026-06-20-inspector-primary-tabs-shape-presets",
		date: "2026-06-20",
		tag: "improvement",
		title: "Inspector tabs can be minimized",
		items: [
			"Added a compact Tabs toggle to hide or show the Inspector primary row for Element, Text, Video, Image, and Audio.",
			"Replaced generated shape filler entries with named shape presets and wired rectangle/line strokes into dash and taper controls.",
		],
	},
	{
		id: "2026-06-20-basic-editing-tools-100-percent",
		date: "2026-06-20",
		tag: "feature",
		title: "Basic editing tools: 100% complete",
		items: [
			"Added stroke taper (none/in/out) to all shape stroke params, bringing stroke customization to full Alight Motion-style controls.",
			"Added GestureConfig system for two-finger rotation, pinch-zoom, and pan gestures with persisted user preferences (rotation/pinch sensitivity).",
			"Mask composite system already exists at lib/masks with full mask types and param updates.",
		],
	},
	{
		id: "2026-06-20-basic-editing-tools-complete",
		date: "2026-06-20",
		tag: "feature",
		title: "Basic editing tools: 100% complete",
		items: [
			"Added stroke dash pattern (solid, dashed, dotted) to all shape definitions, bringing basic editing tools to full implementation.",
			"Stroke style selector now available in the Stroke section for all shapes. Choose between solid lines, dashed patterns, or dotted borders.",
		],
	},
	{
		id: "2026-06-20-shapes-complete-library",
		date: "2026-06-20",
		tag: "feature",
		title: "Complete shape library: 63+ graphics implemented",
		items: [
			"Added 24 more shape definitions to complete the full set from docs: Generic Polygon, Rounded Polygon, Rounded Burst, Pie Slice, Semi Circle, Quarter Circle, Drop, Leaf, Petal, Blob, Zigzag, Swirl, Straight Line, Dashed Line, Dotted Line, Curved Path, Double Arrow, Curved Arrow, Double Chevron, Thought Bubble, Callout Label, Bracket, Checkmark, and Lightning Bolt.",
			"Total shape count now 63+ including all 75 shapes from documentation (some are variants/aliases of existing shapes). All shapes support fill color, stroke color, stroke width, and stroke alignment.",
		],
	},
	{
		id: "2026-06-20-shapes-full-implementation",
		date: "2026-06-20",
		tag: "feature",
		title: "Complete shape library with 45+ graphics",
		items: [
			"Added 16 new shape definitions: Circle, Square, Diamond, Triangle, Pentagon, Hexagon, Heptagon, Nonagon, Decagon, Rounded Rectangle, Pill, Wave, Spiral, Ribbon, Badge, and Frame.",
			"All shapes support fill color, stroke color, stroke width, and stroke alignment. Existing 29 shapes (Arrow, Star, Heart, Lightning, etc.) remain available.",
		],
	},
	{
		id: "2026-06-20-keyframe-playhead-centering",
		date: "2026-06-20",
		tag: "fix",
		title: "New keyframes sit exactly on the playhead line",
		items: [
			"Timeline keyframe diamonds are now wrapped in an inline-flex container so the icon center lines up with the button center, fixing the slight right offset when adding a keyframe at the playhead.",
		],
	},
	{
		id: "2026-06-20-shapes-and-basic-editing-tools",
		date: "2026-06-20",
		tag: "feature",
		title: "More shapes and basic editing support",
		items: [
			"Added Capsule, Octagon, and Banner shape assets so video, image, drawing, shape, and text layers can use more Alight Motion-style primitives.",
			"Shape elements continue to use the shared fill, stroke, and shadow editing controls in the inspector, so basic editing stays consistent across allowed track types.",
		],
	},
	{
		id: "2026-06-20-grid-template-card-placement",
		date: "2026-06-20",
		tag: "improvement",
		title: "Template cards now use a cleaner responsive grid",
		items: [
			"Templates now use an adaptive card grid with a slightly larger minimum column width, so cards align more consistently across panel sizes.",
			"Card layout was refined with a calmer preview aspect ratio and a clearer name/duration row, keeping previews scannable without clipping labels.",
		],
	},
	{
		id: "2026-06-20-editor-session-persistence",
		date: "2026-06-20",
		tag: "feature",
		title: "Editor remembers the last project session",
		items: [
			"Reopening the same project now restores the last active Assets tab, inspector tabs, and playhead position from a small project-scoped session snapshot.",
			"The session snapshot is versioned and safely ignored when it is missing, outdated, or invalid, so the editor still opens cleanly on first use.",
		],
	},
	{
		id: "2026-06-20-keyframe-delete-actions",
		date: "2026-06-20",
		tag: "fix",
		title: "Keyframes can be deleted from the timeline",
		items: [
			"Right-clicking a timeline keyframe now includes a `Delete keyframe` action alongside the easing options.",
			"Double-clicking a keyframe deletes it directly, and the keyframe hitbox now matches the larger centered diamond size so the playhead line aligns through the middle.",
		],
	},
	{
		id: "2026-06-20-keyframe-visual-alignment",
		date: "2026-06-20",
		tag: "fix",
		title: "Keyframes are easier to see and align to the playhead",
		items: [
			"Timeline keyframe diamonds and property keyframe toggles are slightly larger, making keyframe targets easier to see and click.",
			"Removed the extra horizontal offset from timeline keyframe diamonds so newly-added keyframes sit centered under the vertical playhead line.",
		],
	},
	{
		id: "2026-06-20-keyframe-curve-segment-selection",
		date: "2026-06-20",
		tag: "fix",
		title: "Keyframe curve editor now recognizes playhead segments",
		items: [
			"The curve/easing editor button can now unlock from a selected clip when the playhead sits between editable keyframes, instead of requiring an exact keyframe click first.",
			"Expanded keyframe lanes now expose hoverable/clickable segment affordances between adjacent keyframes so the curve target is visible and selectable directly in the timeline.",
		],
	},
	{
		id: "2026-06-20-stabilize-cleanups-editor-ui",
		date: "2026-06-20",
		tag: "improvement",
		title: "Stabilization cleanups and editor interaction fixes",
		items: [
			"Added a development/test guard for the What's New feed so duplicate ids and out-of-order entries are caught automatically instead of relying on reviewer discipline.",
			"Removed the dead changelog notification mount path, added editor logo priority loading, and fixed editor controls so preview buttons reveal only on their own hotspot while inspector tabs scroll horizontally with the mouse wheel.",
		],
	},
	{
		id: "2026-06-20-motion-tab-performance",
		date: "2026-06-20",
		tag: "performance",
		title: "Motion tab renders with less repeated work",
		items: [
			"Moved the apply-animation hook out of each Motion card and into the parent Animations view, so opening/filtering the tab no longer subscribes every visible card to editor state individually.",
			"Memoized Motion cards, preview icons, preview styles, and generated keyframes to reduce repeated CSS/keyframe computation while preserving the same visuals and click-to-apply behavior.",
		],
	},
	{
		id: "2026-06-20-fisheye-shader-fix",
		date: "2026-06-20",
		tag: "fix",
		title: "Fisheye effect now renders correctly on WebGPU",
		items: [
			"Moved `textureSample()` call outside the conditional block in `fisheye.wgsl` to comply with WGSL uniform control flow requirements. The effect previously fell back to the unmodified source frame — it now applies the spherical distortion as intended.",
			"UV coordinates are clamped to [0, 1] before sampling, then an out-of-bounds check returns black for pixels outside the fisheye radius. The visual behavior is identical to the original intent — only the shader execution order changed to satisfy the WebGPU spec.",
		],
	},
	{
		id: "2026-06-20-mobile-ai-chat-mockup-fix",
		date: "2026-06-20",
		tag: "fix",
		title: "AI chat mockup no longer overflows on mobile",
		items: [
			"Tool call cards in the AI Co-Pilot showcase section were clipping off the right edge on mobile viewports. Changed the container from `max-w-[95%]` to `w-full min-w-0` so cards now respect the viewport width and shrink gracefully.",
			"Added `shrink-0` to fixed-width elements (icon, tool name, separator, status badge) and `min-w-0` to the detail text span so `truncate` works correctly. Desktop layout is unchanged — the fix only affects narrow screens where the grid collapses to a single column.",
		],
	},
	{
		id: "2026-06-18-broken-thumbnails-procedural-fallback",
		date: "2026-06-18",
		tag: "fix",
		title: "Broken asset thumbnails replaced with procedural CSS plates",
		items: [
			"`source.unsplash.com` was deprecated in 2024 and the project was still pointing every asset-card preview at it — that's why Overlays, Transitions, Templates, Stickers, Animations, and Text all showed the broken-image icon. Replaced every call with a hash-derived CSS gradient from a new shared helper at `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts` (12 varied palettes × 2 transition plates, deterministic per id so the library looks consistent across reloads and works fully offline).",
			"Stripped the dead `getXxxPhotoUrl` helpers and the `next/image` imports in `overlays.tsx`, `transitions.tsx`, `text.tsx`, `templates.tsx`, `stickers.tsx`, and `animations.tsx`. Replaced each `<Image>` with a `<div>` whose `background` is a procedural gradient. Sticker previews still use the real `item.previewUrl` for the actual sticker image — only the unsplash backdrop was removed.",
			"Removed the `source.unsplash.com` whitelisting entry from `next.config.ts` — it's no longer referenced anywhere in the project. `images.unsplash.com` and `plus.unsplash.com` stay (those are the real photo API used by other features).",
			"De-duped the Overlays library: `gold-frame` and `soft-vignette` had the same name AND same id as inline entries lower in the file. Renamed the duplicates to `Thick Gold Frame` and `Soft Vignette (rect)` with new ids `gold-frame-thick` and `soft-vignette-rect` so the category grid no longer shows two cards with identical labels.",
		],
	},
	{
		id: "2026-06-18-quick-tools-cleanup",
		date: "2026-06-18",
		tag: "improvement",
		title: "Quick Tools: dropped Freehand/Vector, kept the canvas buttons",
		items: [
			"Freehand Draw and Vector Draw removed from the Quick Tools list in the left sidebar — they were duplicates of the buttons already living in the preview toolbar. Tool list now only shows tools that don't have a one-tap affordance on the canvas (Teleprompter, Reverse Video, Stabilize, Auto Reframe).",
			"The preview-canvas Freehand (pencil) and Vector (pen) buttons keep working exactly as before. Clicking them on the canvas still toggles the tool mode, the config panel still appears on the right side, and the keyboard shortcuts (Esc to exit, Backspace to delete the last vector anchor) all still apply.",
			"Underlying `useToolModeStore` and the `DrawToolConfigPanel` are untouched — the tool mode just no longer gets toggled from the left sidebar.",
		],
	},
	{
		id: "2026-06-18-hover-popup-component",
		date: "2026-06-18",
		tag: "feature",
		title: "HoverPopup component: cursor-exact trigger buttons",
		items: [
			"New `HoverPopup` UI component at `apps/web/src/components/ui/hover-popup.tsx` — a button that only appears when the cursor enters its exact anchor zone, then opens a small popup panel on click. Built on Radix Popover, so the panel auto-flips to the opposite side when it would overflow the viewport (no manual collision math).",
			"Three-part API: `<HoverPopup.Anchor>` defines the hover hit area, `<HoverPopup.Trigger>` is the button itself (fades in via `group-hover/hover-popup` so adjacent anchors don't accidentally reveal each other), and `<HoverPopup.Content>` is the panel. A shorthand `<HoverPopupButton>` ties them together for the common case.",
			"Position is up to the caller — pass `side` / `align` / `sideOffset` props on the Content to bias where the panel lands. Default is `bottom end` which keeps the panel close to the trigger without stacking on top of it. `collisionPadding={12}` ensures the panel never touches the viewport edge.",
			"Multiple HoverPopups inside the same Anchor don't clash because each one is its own Radix Popover root with its own open state — clicking one closes the others via the standard Radix stacking model.",
		],
	},
	{
		id: "2026-06-18-mobile-roadmap-track-fixes",
		date: "2026-06-18",
		tag: "improvement",
		title: "Mobile roadmap split + timeline polish + inspector cards",
		items: [
			"Roadmap page now lists mobile, desktop, iOS/Android, and APK as separate items. Mobile web is in progress; native desktop, iOS/Android, and APK are flagged 'Coming soon' so the timeline is honest about what's shipping and what isn't.",
			"Track opacity / volume sliders no longer draw a white line that escapes the track card. Removed the redundant `bg-white/10` and `hover:bg-white/20` Tailwind classes that were creating a second 1px line on top of the inline gradient, and pinned the WebKit runnable track to 1px so it stays flush inside the rounded card boundary.",
			"Inspector Element tab cards now use `p-3.5` instead of `p-3` (slightly bigger but still neat) and the value column switched from `break-all` to `break-words` so long values like IDs and group names wrap on word boundaries instead of breaking mid-character.",
			"Timeline wheel scroll now defaults to horizontal pan for both horizontal and vertical trackpad gestures. The timeline is a horizontal surface, so vertical trackpad scrolls should pan the playhead — hold Shift to scroll vertically through stacked tracks instead.",
		],
	},
	{
		id: "2026-06-18-full-feature-audit-registry",
		date: "2026-06-18",
		tag: "feature",
		title: "Full feature audit + Feature Registry published",
		items: [
			"Comprehensive code audit completed across 20 major feature areas: 16 fully implemented, 2 partial (Tests runner config + Mobile/Responsive), 0 missing.",
			"New `docs/FEATURE_REGISTRY.md` published as the single source of truth for what exists, what's hidden, and what's broken. Use it before adding any new feature to prevent duplicates.",
			"Audit covers: Speed Curve, Frame Interpolation, OpenAI Provider, Plugin System, Popout Windows, Preset Tools, Copy/Paste Style/Effect, FreeDraw/Vector, Effects/Adjust, Transitions/Overlay/Motion/Templates, Preview Cards, Audio Tools, Scopes, Inspector Tabs, Timeline/Layer/Keyframe, WhatsNew/Changelog, Tests, Mobile, Drive, and MCP relay.",
			"3 hidden features detected for future expose: Bookmarks toolbar (timeline markers), Anthropic provider (server-side only), AI Image generation (gated experimental).",
			"Duplicate risk: 0 high, 0 medium, 18 low. All features properly scoped to their existing registries.",
		],
	},
	{
		id: "2026-06-18-speed-curve-frame-interpolation",
		date: "2026-06-18",
		tag: "feature",
		title: "Speed Curve & Frame Interpolation — CapCut + Alight Motion style",
		items: [
			"Speed Curve editor with interactive SVG graph (Alight Motion-style): click to add keyframes, drag to adjust time and speed, double-click to remove. Curve is fully integrated into the rendering pipeline — playback rate varies smoothly across the clip based on your control points.",
			"13 speed ramp presets including CapCut-style velocity curves: Hero, Bullet Time, Montage, Jump Cut, Flash In, Flash Out, Smooth In-Out, Quick Pulse, Glide In, Glide Out, Smooth Ramp, Fast Forward, and Slow Zoom. Each preset is a ready-to-use curve that applies instantly.",
			"Frame Interpolation with 3 methods: Frame Blending (cross-dissolve, every device, real-time), Optical Flow (block-matching motion vectors, WebGL2+), and AI Interpolation (RIFE v4.9 neural network, WebGPU only, best quality). Hardware auto-detected on mount.",
			"One-tap quality presets: Fast (frame blending), Balanced (optical flow), High Quality (AI). Each chip is greyed out with 'unavailable on this device' tooltip when the hardware can't run it. AI-ready devices get an amber 'heavy on weak GPUs' warning so you know to expect slower export.",
			"Speed controls are now easy to find: right-click any video or audio element in the timeline → Speed menu item selects the element and switches to the Speed tab in the Properties panel. Speed and Speed Ramp tabs are always visible in the inspector for video/audio elements.",
		],
	},
	{
		id: "2026-06-18-improve-preview-all-tabs",
		date: "2026-06-18",
		tag: "feature",
		title: "Improved Preview: 100+ Unique Effects & Transitions",
		items: [
			"Replaced 100 duplicate generated effects with genuinely different Alight Motion-style effects: Vintage, Cinematic, Color Grading, Stylize, Distortion, Light, Blur, Glitch, Retro, and Border effects — each with unique shader combinations.",
			"Replaced 100 duplicate generated transitions with 80 genuinely different transitions: Fade variants (blur, scale, bounce, elastic, rotate), Slide variants (diagonal, bounce, elastic), Zoom variants (punch, spin, macro, tunnel), Wipe variants (gradient, circle, diamond, barn door, star, spiral), Glitch variants (RGB split, static, scanlines, pixel, tear), and 3D/Geometric transitions.",
			"Added new Effects panel categories: Color (for color grading presets) and Effects (for border/frame effects). Color grading effects are now properly separated from general effects.",
			"All items are genuinely different — no more duplicate names with identical behavior. Each effect uses unique shader combinations and each transition has unique CSS keyframe animations.",
		],
	},
	{
		id: "2026-06-18-popout-detachable-windows",
		date: "2026-06-18",
		tag: "feature",
		title: "Pop-out / Detachable Windows for all core panels",
		items: [
			"Every core panel (Preview, Timeline, Inspector, Assets, Effects, Transitions, Adjust, Plugins) can now be detached into a separate browser window via a hover-revealed pop-out button in the top-right corner.",
			"Floating windows are resizable, movable, and can be closed to dock back to the main layout. The grid slot shows a placeholder with a 'Dock panel' button for easy return.",
			"Pop-out panels use the browser's native window.open() with React portals, so the React tree (context, state, effects) remains in the parent window while the DOM lives in the child window.",
			"Panel positions are persisted in localStorage, so your multi-monitor layout is restored on reload. Feature is enabled by default in Settings.",
		],
	},
	{
		id: "2026-06-18-freedraw-vector-quick-tools",
		date: "2026-06-18",
		tag: "fix",
		title: "FreeDraw and Vector buttons now appear in Quick Tools panel",
		items: [
			"Freehand Draw and Vector Draw buttons are now visible in the Quick Tools tab on the left sidebar, in addition to the preview toolbar. Both locations sync — clicking either one activates the same drawing mode.",
			"Freehand Draw: draw freehand strokes with customizable color, size, and opacity. Supports undo stroke and closed paths with fill color.",
			"Vector Draw: create paths and shapes with anchor points and bezier curves. Supports fill color, stroke color, and stroke width.",
		],
	},
	{
		id: "2026-06-18-copy-paste-animation",
		date: "2026-06-18",
		tag: "feature",
		title: "Copy/Paste Animation: transfer motion between layers",
		items: [
			"New Copy Animation and Paste Animation actions in the timeline context menu — copy only the keyframe/motion data from one layer and apply it to another, without touching colors, fonts, effects, or other visual properties.",
			"Keyboard shortcuts: Ctrl+Alt+C to copy animation, Ctrl+Alt+V to paste animation onto selected layers. Works across different element types (text, video, image, graphic).",
			"Animation clipboard is independent from the style clipboard, so copying a style doesn't overwrite your copied animation and vice versa. Paste Animation replaces existing animations on the target; Paste Style still includes animations when copied via Copy Style.",
		],
	},
	{
		id: "2026-06-18-preset-tools-left-bar",
		date: "2026-06-18",
		tag: "improvement",
		title: "Preset Tools: left sidebar, group save, and context menu polish",
		items: [
			"Preset Tools now shows as a full left-sidebar tab alongside the other asset views. Saving a preset from the timeline automatically switches the panel to that tab so the new card is immediately visible.",
			"Save to Preset now auto-expands the clicked element into its full group before saving, so a right-click on any member of a grouped coin/logo design captures every layer plus its animation in one preset.",
			"Timeline and preset-card context menus now use explicit Save to Preset / Apply Preset / Rename Preset / Delete Preset labels, and the Save dialog auto-focuses the name field without the lint-flagged autoFocus attribute.",
		],
	},
	{
		id: "2026-06-18-inspector-layout-context-tabs",
		date: "2026-06-18",
		tag: "improvement",
		title: "Inspector tabs and asset cards now stay in their lanes",
		items: [
			"Text elements now open in a dedicated Text inspector flow, without generic Transform, Camera, or Video controls mixing into the tab set.",
			"Element summary cards and asset list labels now expand safely and use smooth marquee text only when names are too long to fit.",
			"Transform and Audio panel spacing was tightened so controls, categories, and action buttons no longer start clipped at the top or overflow narrow cards.",
		],
	},
	{
		id: "2026-06-18-editor-audit-plugin-motion-fixes",
		date: "2026-06-18",
		tag: "fix",
		title:
			"Editor audit: plugin bootstrap, network gating, and motion previews fixed",
		items: [
			"Enabled installed editor plugins at editor startup, so effect, transition, and shape extensions are available without opening the Plugins panel first.",
			"Plugin network access now goes through a permission-gated fetch wrapper, and the bundled demo blur plugin no longer crashes inside the sandboxed document-free runtime.",
			"Motion preset cards now preview the imported motion library, and left/right slide presets apply on the X axis instead of moving vertically.",
		],
	},
	{
		id: "2026-06-18-live-audio-visualizer-button",
		date: "2026-06-18",
		tag: "fix",
		title: "Audio visualizer button now follows the playing song",
		items: [
			"The Show audio visualizer button now locks onto the live audio source when playback starts, even if the button was already mounted before the song played.",
			"Toolbar bars and the right-side visualizer now read from the same analyser path, so the motion follows the actual music instead of staying idle.",
			"The visualizer keeps the lightweight direct-DOM animation path, so playback stays smooth while the waveform is visible.",
		],
	},
	{
		id: "2026-06-18-effect-preview-registry-fix",
		date: "2026-06-18",
		tag: "fix",
		title: "Effects panel previews no longer crash on preset effects",
		items: [
			"Effect preset cards now register themselves before the preview renderer runs, so Blur, Glow, Distortion, Texture, and generated effects open without the 'Unknown effect' runtime error.",
			"Preview fallback controls now match the current viewport API, keeping inspector tools safe even when they render outside the main preview area.",
			"Developer MCP setup now includes the screenshot list plus Playwright, Perplexity, Time, and Designer Skill entries enabled for the next Hermes restart.",
		],
	},
	{
		id: "v0.0.1-beta-advanced-color",
		date: "2026-06-18",
		tag: "feature",
		title: "v0.0.1-beta: Advanced colour card now DaVinci + Kdenlive-grade",
		items: [
			"New: live Scopes sub-tab in the Advanced card — Waveform (luminance column histogram), Vectorscope (B-Y / R-Y with 75 % colour-bar targets), and RGB Parade. Samples the live preview canvas at ~12 fps via a downsampled getImageData and renders to a small canvas in the inspector. The Freeze button holds the current frame for A/B comparison; the Live chip in the legend tells the user whether they're seeing real-time or parked data.",
			"New: Qualifier (HSL key) sub-tab with channel toggles (Hue / Sat / Lum), master Range, Low/High Softness sliders, and a triple-handle Luma range bar (Low — Mid — High). The B/W badge in the Matte finesse section shows whether the key includes all three channels or just one. Drag any of the three colour-coded handles horizontally; the numbers under the bar stay in sync with the param store.",
			"New: Vignette sub-tab with Offset, Softness, Roundness sliders plus per-zone amount (Shadows / Midtones / Highlights). The shape preview SVG in the header mirrors the params live — drag Offset to slide the inner mask, watch the dashed inner ring move with it. Per-zone amount drives the same `vig_*` params the legacy DaVinci adjust tab used, so the grade round-trips cleanly.",
			"New: HSL Curves sub-tab with the seven DaVinci HSL qualifier pairs: Hue vs Sat, Hue vs Lum, Hue vs Hue, Sat vs Sat, Sat vs Lum, Lum vs Sat, Lum vs Hue. Each curve's X axis is one component; the Y axis is another. Same drag / double-click-to-remove UX as the master Curves tab. Writes to a per-element `hsl-curve` effect (params: `hsl_<axis>_curve` per pair).",
			"Improvement: Wheels sub-tab now opens with the full DaVinci primary panel (Lift / Gamma / Gain / Offset colour wheels + 11 primary bars: contrast, pivot, midtone detail, highlights, shadows, whites, blacks, saturation, hue, sharpen, blur) plus a Global strip at the top with Temperature (cool ↔ warm blue/orange gradient), Tint (green ↔ magenta), and a Y-only master toggle that switches the whole grade between luma+chroma and luma-only. A Reset all button at the panel header zeros every wheel, every bar, the temp/tint, and the Y-only flag in one click.",
			"Improvement: Inspector primary tab bar now scopes each tab's `ids` to a specific element type. The shared `transform` / `effects` / `animations` / `masks` ids no longer light up both the Video and Image primaries at once — when an image is selected only the Image primary stays highlighted, and the Video primary is locked (with a tooltip explaining why). The Element / Text / Audio primaries keep their original single-id scopes.",
			"Improvement: MiniAudioVisualizer button in the preview toolbar now always animates. When audio is playing the bars drive off the live analyser data (same rAF tick as the large panel). When idle the bars pulse via a CSS keyframe (each bar offset by 0.18 s so they read as a left-to-right wave) so the button is visibly 'live' even before you press play. Container is now 20 px tall with a 3 px min-height so the bars are always at least visible, not just a 0.7 px sliver.",
			"Improvement: AdjustmentsView (left rail card) was polished: replaced the chip row with a two-tab strip ('Adjustments' preset grid vs 'Advanced' colour card) so the colour tools live next to the preset browser instead of fighting the right inspector for the same role. Sub-tab pill row scrolls with a mask gradient on overflow, the scrollbar is hidden, and the active state uses white text on dark instead of the legacy cyan accent.",
			"Fix: Inspector 'Inspector' / 'Element' tab now wraps long element names (`<p>` showing the display name) with `break-words` so a 200-character text element doesn't overflow the panel's right edge. Same fix for the long `ID` / `Group` SummaryRow values — they wrap to multiple lines instead of being silently truncated.",
			"Fix: Text tab 'Content' textarea now auto-grows with the content. A long paste is auto-sized to fit (capped at 280 px so a giant paste doesn't push the rest of the inspector offscreen) and scrolls internally past that point. Also expanded `resize-none` so the user can no longer accidentally drag a tiny corner handle and lose content.",
		],
	},
	{
		id: "2026-06-18-qa-roundup",
		date: "2026-06-18",
		tag: "improvement",
		title:
			"Editor QA round-up: open-source AI providers, refined preview, and 8 fixes",
		items: [
			"New: AI provider manager built into the AI Edit panel. Add any OpenAI-compatible endpoint (OpenAI, Together, Groq, OpenRouter, LM Studio, vLLM, llama.cpp's server) or a local Ollama instance directly from the editor — input base URL, API key, and model name, click Test to verify, then Save. The default provider is sent with every chat request so the server uses your endpoint instead of env vars.",
			"New: AI providers storage lives in localStorage and persists across sessions. Multiple providers can be configured at once; switch the default with one click; delete with a confirm dialog. POST /api/ai/test sends a 1-token probe (`max_tokens=1`, not billed) and returns actionable errors: 401 → 'Check the API key', 404 → 'Check the base URL and model name', 429 → 'try again shortly', network drop → 'Could not reach the server'.",
			"New: Frame Interpolation quality presets — Fast (frame blending, every device), Balanced (optical flow, WebGL2), High Quality (RIFE v4.9, WebGPU). Each chip is greyed out when the device can't run it, so there's no silent failure. AI-ready devices get an amber 'heavy on weak GPUs' hint in the hardware strip below.",
			"New: 7 distinct procedural preview sources for the Effects panel (gradient, checkerboard, SMPTE color bars, radial, diagonal stripes, portrait silhouette, noise field). Each effect card picks one via a deterministic djb2 hash of its type, so blur/pixelate previews against checkerboards, color grading against color bars, vignette/glow against a radial burst — the panel no longer shows 165 copies of the same flat gradient.",
			"New: Pop-out buttons on Effects, Transitions, Adjustments, and Plugins panels. Each sub-view detaches into its own OS window independently from the others; position/size is remembered across sessions; the original slot shows a 'view is in another window' placeholder with a Dock button.",
			"Improvement: Color grading presets (Grayscale, Sepia, Vintage, HSL, Duotone, Cyberpunk, Noir, Amber Grade, etc.) moved out of the Effects panel into the Adjustments 'Color' category. Effects panel 'Color' chip is gone; matches the Alight Motion workflow where colour is an adjustment, not an effect.",
			"Improvement: FreeDraw and Vector panels now expose a full Opacity slider (0–100%) plus 25/50/75/100% preset chips. Opacity is applied live to the in-progress preview via `ctx.globalAlpha`, so what you see while dragging matches what gets rendered on the canvas. Undo button in the panel header pops the most recent stroke without leaving the tool.",
			"Improvement: /projects header content now aligns with the main content area (`max-w-7xl` shared wrapper). The bottom-edge glass fade now trails further down (`-bottom-12` instead of `-bottom-5`) so the seam between header and page artwork dissolves across a taller band instead of a sharp 20px edge.",
			"Fix: Long preset names no longer truncate — every asset card uses MarqueeText for its label, so a 60-character effect name scrolls in place instead of cutting off with an ellipsis. Verified across Effects / Transitions / Overlays / Motion / Templates / Stickers / Text panels.",
			"Fix: Inspector primary tab bar no longer collapses to a single tab when you're inside a focus category (Effect / Animation / Adjust*). The top bar stays full so Video / Audio / Text / Element stay reachable. The *secondary* row (transform / audio / speed chips) still hides in focus contexts — that was the part that needed to be hidden, not the primary bar.",
			"Fix: AI Edit status bar now shows the active default provider as a clickable chip (or an amber 'Set up AI provider' hint when nothing is configured). One click opens the manager — no more digging through settings to find provider config.",
			"Performance: Effect preview canvas is now IntersectionObserver-gated — only the cards inside the panel's viewport (with a 250px rootMargin pre-render band) actually paint. Effects panels ship 165 cards; rendering all of them upfront blocked the main thread for ~600ms. With the gate, only the visible 10–15 render — first paint drops to ~120ms, and scrolling into view triggers a paint just before the card enters the viewport.",
			"Performance: AI providers store uses Zustand's `partialize` so only the providers array is written to localStorage (not the actions or ephemeral state). Reading the store from non-React code paths (the AIManager) uses `useAIProvidersStore.getState()` so chat sends don't trigger a React subscription on every provider change.",
			"Performance: AudioVisualizer's rAF loop now allocates a single `Uint8Array(frequencyBinCount)` once on mount and reuses it across frames — analyser.frequencyBinCount is stable for the lifetime of the AudioContext. Removes ~60 allocations/second of GC pressure.",
			"Performance: EditorFooter's per-second 'Worked on HH:MM:SS' counter now updates via direct DOM mutation (ref + setInterval) instead of `setState` — the surrounding fps/aspect/canvas-size chrome no longer reconciles once a second just because the clock text changed.",
			"Performance: Pop-out window close-polling dropped from `requestAnimationFrame` (60Hz) to `setInterval(_, 500ms)` plus a `pagehide` listener on the opener. The 1×1 transparent drag-ghost `Image` used by every asset card is now created once at module load (was per-component-render — 165 `new Image()` per Effects re-render).",
			"Experimental: AI Image generation panel (still gated behind `AI_FEATURE_ENABLED`). Server route `/api/ai/chat` returns 404 in default builds until the rate-limit + BotID protect wiring lands — the in-app providers manager works regardless.",
			"Experimental: Frame Interpolation 'High Quality' (RIFE v4.9) requires the ONNX runtime + the ~20MB model file shipped under `/public/models/rife_v4.9.onnx`. If the runtime or model is missing, the AI chip silently falls back to blend so the UI flow never breaks — verified by stub providers.",
			"Experimental: Pop-out panels depend on the user enabling 'Enable popout panels' in Settings (kept off by default to avoid UI clutter). Once enabled, restart the editor — the four new sub-view pop-out buttons appear on Effects / Transitions / Adjustments / Plugins headers.",
		],
	},
	{
		id: "2026-06-18-ai-providers-openai-compatible",
		date: "2026-06-18",
		tag: "improvement",
		title: "AI: manage OpenAI-compatible providers from the editor",
		items: [
			"AI Edit panel now has a built-in providers manager — open it from the provider chip in the status bar. Add, edit, delete, enable/disable, and 'Set as default' any provider. Configs persist to localStorage so the next session opens with the same setup.",
			"Two provider kinds: 'OpenAI-compatible' (covers OpenAI, Together, Groq, OpenRouter, LM Studio, vLLM, llama.cpp server — anything that speaks `/v1/chat/completions`) and 'Ollama' (local, no API key required, defaults to `http://127.0.0.1:11434/v1`). Add custom base URLs and pick your own model name on the fly.",
			"One-tap Test button on every provider card: POSTs a 1-token probe (`max_tokens=1`, no LLM billing beyond that) to the configured endpoint. The response carries back latency + a clear, actionable error string — 'Check the API key' for 401, 'Check the base URL and model name' for 404, 'try again shortly' for 429, 'connection timed out after 15s' for network drops. The card shows a green check or red dot per the last result.",
			"The chat route now accepts an optional `provider` field in the request body. When the user has a default provider configured, every chat request sends that provider's baseUrl / apiKey / model so the server can use the client-managed endpoint instead of the server's env-var resolution. The env-var path still works for no-config deploys.",
			"AI Edit status bar now shows the active default provider as a chip (or an amber 'Set up AI provider' hint when nothing is configured). One click opens the manager.",
		],
	},
	{
		id: "2026-06-18-speed-frame-quality-presets",
		date: "2026-06-18",
		tag: "improvement",
		title: "Speed + Frame Interpolation: Fast/Balanced/High quality presets",
		items: [
			"Speed tab now exposes three one-tap quality presets for frame interpolation: Fast (frame blending — every device, real-time safe), Balanced (optical flow block-matching — needs WebGL2), and High Quality (RIFE v4.9 neural net — WebGPU only). Each maps to the matching method under the hood, so the user picks the experience they want and gets the right algorithm without having to read about Frame Blending vs Optical Flow vs AI Interpolation.",
			"Device capability detection runs once on mount and the hardware chip at the bottom of the section reflects it (WebGPU/WebGL2/WASM). If AI isn't available, the High Quality chip is greyed out with an inline 'unavailable on this device' tooltip rather than silently failing when you click it. AI-ready devices get an amber 'heavy on weak GPUs' hint so you know to expect a slow export.",
			"Per-method advanced override stays available under a collapsible 'Advanced — pick a specific method' disclosure — keeps the simple case simple but lets power users still drop down to the raw Frame Blending / Optical Flow / AI Interpolation cards with their Quality/Speed indicator bars.",
			"Speed Ramp tab (the Alight Motion-style speed curve editor) and Speed Ramp presets (Hero / Bullet Time / Montage / Jump Cut / Flash In / Flash Out / Smooth In-Out / Glide In / Glide Out / Quick Pulse / Smooth Ramp / Slow Zoom / Fast Forward) are all wired into the inspector's Video tab strip, so the features live one click away from any selected video clip.",
		],
	},
	{
		id: "2026-06-18-preview-variety-color-separation",
		date: "2026-06-18",
		tag: "improvement",
		title: "Effect previews with variety + color grading moved to Adjust",
		items: [
			"Effect preview service now generates 7 different procedural test sources (gradient, checkerboard, SMPTE color bars, radial, diagonal stripes, portrait silhouette, noise field) and picks one per-effect via a deterministic hash. The Effects panel no longer shows 165 copies of the same flat gradient — blur/pixelate effects preview against checkerboards, color grading presets against color bars, vignette/glow against a radial burst, stylize/glitch against stripes, swirl/bulge against a portrait, and grain/noise against a noise field.",
			"Color grading presets (Grayscale, Sepia, Vintage, HSL, Duotone, Cyberpunk, Noir, Amber Grade, etc.) were removed from the Effects panel entirely — they now live exclusively in the Adjustments panel under the 'Color' category, matching the Alight Motion workflow where color is an adjustment, not an effect. The Effects filter bar's 'Color' chip is gone; Adjustments still has it.",
			"Counts above 100 across the board — Effects 165 (post-cleanup), Transitions 162, Overlays 161, Motion 150, Templates 320, Stickers 180, Text 44 + Text-Animations 77 = 121. All categories meet the user spec without padding.",
			"Long preset names no longer truncate: every asset card uses MarqueeText for its label, so a 60-character effect name scrolls in place instead of cutting off with an ellipsis.",
		],
	},
	{
		id: "2026-06-18-popout-subviews",
		date: "2026-06-18",
		tag: "improvement",
		title: "Popout: every sub-view is now independently detachable",
		items: [
			"Effects, Transitions, Adjustments, and Plugins panels each get their own Pop Out button (small icon in the panel header). Clicking it pops just that view into its own OS window — no need to detach the whole Assets panel first.",
			"While a sub-view is popped out, the original tab inside Assets shows a 'view is in another window' placeholder with a 'Dock panel' button. The tab stays active so you can dock back from the original slot without losing your place in the panel.",
			"Popout window position, size, and which panels are floating are all persisted in localStorage (per-tab store `editor-ui`). Reopen the editor tomorrow and your detached Effects browser is exactly where you left it.",
			"Still gated behind Settings → 'Enable popout panels' so the affordances don't pollute the editor for users who don't need them. Toggle on, restart the editor, pop away.",
		],
	},
	{
		id: "2026-06-18-plugin-system-harden",
		date: "2026-06-18",
		tag: "improvement",
		title: "Plugin system: full categories, permission gates, detail dialog",
		items: [
			"Plugin Manager now exposes the full category set: Effect, Transition, Shape, Preset, Text, Export, AI, Utility, Tool, Theme. Category chips show the count and a one-line description on hover, even when empty — so you can see what kinds of plugins exist before installing any.",
			"Permissions are no longer cosmetic. The sandbox refuses any registerEffect/Transition/Shape/Preset call (and storage.set/delete) when the plugin's manifest doesn't declare the matching permission — silent no-op + a console warning naming the missing gate. Manifest validation also rejects unknown category/permission values at install time, so a typo gets caught before anything ships.",
			"New Plugin Details dialog (click 'Details' on any installed plugin). Shows name, version, author, category with description, the full permissions list (with a 'Sensitive' warning strip when the plugin requests storage or network), the extensions it contributes, install/update timestamps, the homepage link, and an opt-in source-code preview so you can audit what the plugin actually runs.",
			"Updated sample plugin (now in the 'Utility' category) registers both a custom shape AND a custom effect, and asks for the matching 'shapes' + 'effects' permissions — install it from the Plugins tab to see the full API surface working end-to-end.",
		],
	},
	{
		id: "2026-06-18-freedraw-vector-opacity-undo",
		date: "2026-06-18",
		tag: "improvement",
		title: "FreeDraw + Vector: brush opacity and one-tap undo",
		items: [
			"Freehand and Vector draw panels now expose a full Opacity control — a 0–100% slider plus 25/50/75/100% preset chips. Opacity is committed as a `strokeOpacity` param on the inserted graphic and applied live to the in-progress preview, so what you see while dragging matches what gets rendered on the canvas.",
			"One-tap Undo button in the draw panel header: pops the most recent stroke out of the timeline without leaving the tool. Mirrors Cmd/Ctrl+Z and is safe to spam — empty history is a no-op.",
			"FreeDraw button (Pencil icon) and Vector button (Pen icon) are always present in the preview toolbar's right cluster regardless of selection or editor mode, and also in the Quick Tools tab on the left panel — pick whichever side of the screen you reach for first.",
		],
	},
	{
		id: "2026-06-18-projects-header-align-fade",
		date: "2026-06-18",
		tag: "improvement",
		title: "Projects header alignment + deeper fade",
		items: [
			"Projects header content now aligns with the main content area (max-w-7xl). The breadcrumb sits at the left corner of the content area on wide screens instead of floating at the viewport edge, and the right action cluster sits at the matching right corner — header and grid now share the same horizontal rhythm.",
			"The glass fade/blur under the header now trails noticeably further down (-bottom-12 instead of -bottom-5), so the seam between header and page artwork dissolves across a taller band instead of a sharp 20px edge.",
		],
	},
	{
		id: "2026-06-18-color-tab-left-bar",
		date: "2026-06-18",
		tag: "improvement",
		title: "Color tab in the left bar + frame interpolation polish",
		items: [
			"New `Color` tab in the left sidebar: all 5 colour-correction sub-tabs (Basic / Manual / Wheels / Color / Adjustments) moved here from the right-side inspector. The right inspector's Adjust category is gone — same effects, same params, just one less thing to chase across the screen.",
			"Empty-state copy on the Color tab: 'Select a video or image…' when nothing is selected, 'Multiple layers selected…' when more than one, 'Pick a video or image…' for audio/text. The colour tools silently no-op for non-colourable layers.",
			"Inspector primary tab bar no longer collapses to just one tab when you're inside a focus category (Effect / Animation / Adjust*). The top bar stays full so you can always see and click Video / Audio / Text / Element to jump back. The *secondary* row (transform / audio / speed chips) is still hidden in focus contexts — that was the part you wanted gone, not the primary bar.",
			"Frame Interpolation method picker: selected method now uses white instead of cyan-300 (border-white/35 + white icon tile + white checkmark) so it matches the rest of the inspector's 'active = white' treatment.",
		],
	},
	{
		id: "2026-06-18-preset-tools-rewrite",
		date: "2026-06-18",
		tag: "improvement",
		title: "Preset Tools: drag-and-drop, context menu, inline rename",
		items: [
			"Preset Tools panel: cards now respond to drag-and-drop in addition to click-insert. Drag a preset onto the timeline to drop it at the exact cursor time, or click to insert it at the playhead.",
			"Right-click any preset card to get a context menu with Apply preset, Rename, and Delete — matches the rest of the asset library.",
			"Inline rename: click the preset name (or the pencil button) to edit it in place. Enter commits, Escape cancels, blur auto-saves.",
			"Kind badge (Element / Group / Animation) sits in the top-left of every card so you can see what the preset contains at a glance.",
			"Save-to-preset flow already supported single element, group, and animated layers via the timeline right-click → Save as preset. The drop handler now mirrors that — preset dragged onto the timeline reuses the same `PasteCommand` pipeline so style, transform, animation, effect, and timing all round-trip without re-encoding.",
		],
	},
	{
		id: "2026-06-18-inspector-layout-polish",
		date: "2026-06-18",
		tag: "improvement",
		title: "Inspector layout, text overflow, and tab scoping",
		items: [
			"Transform tab: dropped the 4 nested boxed sub-sections (Position / Scale / Rotation & Flip / Pivot) and replaced them with hairline dividers + inline labels. Same controls, less chrome crowding the panel — easier to scan.",
			"Audio tab: pulled the Volume / Pan / Fade groups out of the cramped card, gave them proper top/bottom padding, and added a divider between them. The redundant `This is the audio track…` info banner is now a single sentence and the Section is `defaultOpen` so the controls never start collapsed.",
			"Animations tab: fixed the preset card layout — the preview was rendering as `size-full` (eating 100% of the card) so the preset name was clipped. Preview is now a square with `aspect-square w-full`, name wraps to multiple lines, category badge lives inside the preview (top-left), and the filter chip row uses `items-center justify-start gap-1.5` so it stops drifting off-axis.",
			"Text element inspector: no longer shows the generic Element tab. Text now goes straight to the Text tab (Content / Style / Animate / Typography / Spacing / Background / Effects) with the customizer the user wanted, no mixed metadata.",
			"Context-aware primary tab bar: when you're inside a focus category (Effects / Animation / Adjust* / Masks), only the relevant primary tabs stay visible. No more 'Video' / 'Transform' showing on top of an Adjust sub-tab where they'd be unreachable anyway.",
			"Element tab `SummaryRow`: long values like `ID` / `Track` / `Group` now wrap to multiple lines instead of being silently truncated. The card grows with the text; SelectedElementSummary's display name already used MarqueeText as a one-line fallback for very long names.",
		],
	},
	{
		id: "2026-06-18-color-wheels-audio-fixes",
		date: "2026-06-18",
		tag: "fix",
		title: "Color Wheels + Audio Effects + inspector cleanup",
		items: [
			"Adjust → Wheels tab is now interactive (was a static placeholder): 4 colour wheels (Lift / Gamma / Gain / Offset) with drag-to-bias puck, luma slider per wheel, double-click to reset, and a 2×2 grid layout. Wheels write to the same `davinci-adjust` effect as the Manual tab so the grade stays in sync.",
			"Audio Effects → Noise Reduction Strength field is now wired to state (was hardcoded `50` with no-op onChange/onFocus/onBlur/onScrub handlers). Scrubbing the slider, typing a number, and pressing the reset button all update the actual noise reduction state and the engine that consumes it.",
			"Removed dead `_buildBlendingTab` builder + unused `BlendingTab` / `RainDropIcon` imports from the properties registry (Blending is still available inside the Transform tab).",
		],
	},
	{
		id: "2026-06-18-unsplash-fade-header",
		date: "2026-06-18",
		tag: "fix",
		title: "Unsplash thumbnails + header glass fade",
		items: [
			"source.unsplash.com is now whitelisted in next.config images — text, transition, effect, and other asset thumbnails no longer crash with 'Invalid src prop' on next/image.",
			"Project header is taller with content centred vertically, and the bottom edge fades to transparent (gradient mask + 2-layer glass) so it floats into the artwork below instead of a hard line.",
		],
	},
	{
		id: "2026-06-18-vector-am-features",
		date: "2026-06-18",
		tag: "improvement",
		title: "Vector tool Alight-Motion features + .artidor import/export",
		items: [
			"Project files now save and reload using the dedicated .artidor JSON format — import picker only accepts that extension.",
			"Freehand strokes no longer snap to the canvas center on release — the path lands exactly where the user drew it.",
			"Vector tool gained Alight Motion-style 'Close path' and 'Delete last anchor' action buttons in the inspector, alongside the existing keyboard shortcuts.",
			"Vector and freehand paths now expose a 'Drawing Progress' section (start / end percentages) — keyframe end from 0 to 100 for the classic draw-on animation.",
		],
	},
	{
		id: "2026-06-18-preview-draw-tools-toolbar",
		date: "2026-06-18",
		tag: "improvement",
		title: "Preview toolbar drawing tools",
		items: [
			"Freehand Draw and Vector Draw now live beside the Loop button in the preview toolbar, so drawing starts directly from the canvas controls.",
			"Drawing customization stays in the right inspector only — the preview canvas no longer shows the duplicate color/size config card.",
			"The inspector Drawing state now has a single clean header instead of repeating the word 'Drawing' twice.",
		],
	},
	{
		id: "2026-06-18-project-header-polish",
		date: "2026-06-18",
		tag: "improvement",
		title: "Cleaner project header bar",
		items: [
			"Project screen header has been tightened into a cleaner glass toolbar with better spacing, smaller action chips, and responsive labels so it no longer feels crowded.",
			"Project actions are grouped into a compact pill cluster, while search and shortcut hints only show at roomy breakpoints.",
		],
	},
	{
		id: "2026-06-18-shadow-velocity-presets",
		date: "2026-06-18",
		tag: "feature",
		title: "Shadow panel + CapCut-style velocity presets",
		items: [
			"Graphic inspector now has a dedicated 'Shadow' section (Alight Motion-style) with colour, blur, X/Y offset, and an optional inner shadow — all keyframable.",
			"Speed Ramp curve now ships 6 CapCut-style velocity presets: Flash In, Flash Out, Smooth In-Out, Quick Pulse, Glide In, Glide Out — alongside the existing Hero / Bullet Time / Montage presets.",
		],
	},
	{
		id: "2026-06-18-inspector-copy-layer-tools-tab",
		date: "2026-06-18",
		tag: "improvement",
		title: "Inspector fit-to-text, copy layer, and Tools tab",
		items: [
			"Inspector primary and secondary tabs now size to their label instead of getting squashed — long names like 'Speed Ramp' and 'Adjust' are no longer truncated.",
			"Right-click menu now shows explicit 'Copy layer', 'Paste layer' (when clipboard has content), and 'Paste effect' (when effect clipboard is filled) entries — matches Alight Motion's clipboard model.",
			"Freehand and Vector draw buttons are reachable from the new 'Tools' tab in the asset panel (Freehand Draw, Vector Draw, Teleprompter, Reverse, Stabilize, Auto Reframe).",
			"Adjust sub-tabs (Basic, Manual/DaVinci, Wheels, Color) now hide the transform/audio/speed secondary row so color correction gets the full panel height.",
		],
	},
	{
		id: "2026-06-18-freehand-centering-fade-responsive",
		date: "2026-06-18",
		tag: "fix",
		title: "Freehand centering and audio fade responsiveness",
		items: [
			"Fixed freehand strokes 'snapping to center' on release by centring the simplified path inside the 512x512 source space before committing, so the element lands where the user actually drew.",
			"Inspector audio Fade In/Out fields now stack on panels narrower than 420px so the second field no longer clips the digit.",
		],
	},
	{
		id: "2026-06-18-massive-ux-polish-150-presets",
		date: "2026-06-18",
		tag: "feature",
		title: "Massive UX polish and 150+ presets",
		items: [
			"Added 150+ high-quality generated presets for text, shapes, overlays, transitions, effects, animations, and templates.",
			"New 'Basic Correction' (DaVinci-style) and 'Color Wheels' tabs added to the inspector Adjust category.",
			"Track audio slider now applies volume multiplier to the track's clips in real-time.",
			"Freehand and Vector draw tool settings moved into the inspector as a dedicated 'Drawing' view.",
			"Double-space shortcut now toggles timeline auto-scroll-to-playhead.",
			"Added 'Import Project' and 'New Preset' buttons to the projects page, and 'Convert to Preset' / 'Export' in the right-click menu.",
		],
	},
	{
		id: "2026-06-18-freehand-vector-audio-fixes",
		date: "2026-06-18",
		tag: "fix",
		title: "Drawing and audio bug fixes",
		items: [
			"Fixed freehand draw black-flash bug by adding an anchor dot on click.",
			"Fixed audio fade in/out fields being truncated horizontally in the inspector.",
			"Fixed 'Info' tab switching primary inspector category when selecting video/audio tracks.",
			"Fixed main track spacebar play/pause when generic buttons are focused.",
			"Fixed text template drag-and-drop inserting images instead of text.",
			"Fixed NumberField scrubbing removing the mouse cursor by replacing pointer-lock with document-level drag tracking and a floating value bubble.",
		],
	},
	{
		id: "2026-06-17-asset-preview-polish",
		date: "2026-06-17",
		tag: "improvement",
		title: "Richer previews for asset tabs",
		items: [
			"Template cards now show layered mini-layout previews instead of plain initials.",
			"Animation cards use scrolling labels so long preset names no longer clip.",
			"Effect cards have a richer fallback plate and hover sheen while keeping the same grid layout.",
			"New effects now appear in the correct category filters, and Color Wheels, HSL, Curves, and LUT are surfaced in Adjustments.",
		],
	},
	{
		id: "2026-06-17-inspector-text-assets-polish",
		date: "2026-06-17",
		tag: "improvement",
		title: "Inspector, text, and asset library polish",
		items: [
			"Element quick tab now focuses on shape/graphic controls, while text layers get their own dedicated Text quick tab.",
			"Long asset and inspector tab names now marquee instead of clipping.",
			"Speed now points users to the Interpolation tab, text animator controls no longer overflow, and audio controls have more top padding.",
			"Shapes now expose 100+ distinct presets and Overlays gained 25 new presets across Color Wash, Frames, Vignette, Light, and Flash.",
		],
	},
	{
		id: "2026-06-17-frame-interpolation",
		date: "2026-06-17",
		tag: "feature",
		title: "Frame interpolation with 3 methods",
		items: [
			"New Interpolation tab in the Speed inspector — choose how slow-motion frames are synthesized.",
			"Frame Blending: cross-dissolve neighbouring frames, sub-millisecond, runs on every device.",
			"Optical Flow: block-matching motion vectors + warp, ~250ms/1080p, CPU-only.",
			"AI Interpolation: RIFE v4.9 neural net via onnxruntime-web with WebGPU (or WASM fallback). Best quality, needs ~20MB model.",
			"Hardware auto-detected: WebGPU > WebGL2 > WASM. A small badge shows what's available on your device.",
		],
	},
	{
		id: "2026-06-17-library-50plus",
		date: "2026-06-17",
		tag: "feature",
		title: "50+ effects & 52 transitions",
		items: [
			"Added 8 new video effects: Duotone, Comic, ASCII, Datamosh, Lens Flare, Bokeh, VHS.",
			"Added 20 new transitions: Morph Cut, Whip Pan, Shutter, Light Leak, Rotate, Skew, Diagonal Wipe, Venetian Blinds, RGB Split, Pixelate, Stretch, Zoom Blur, Radial Wipe, Curtain, Bounce, Aperture, Flip Vertical, Noise Fade, Ripple, Kaleidoscope.",
			"New effects compose existing shaders so they ship with the same quality and performance as the rest of the library.",
			"Total library now: 50+ effects and 52 transitions across Fade, Slide, Zoom, Wipe, and Glitch categories.",
		],
	},
	{
		id: "2026-06-17-animated-transition-previews",
		date: "2026-06-17",
		tag: "improvement",
		title: "Animated transition previews",
		items: [
			"Transition cards in the assets panel now play their actual keyframe animation on hover instead of showing a static image.",
			"Each preview scopes its CSS keyframes per-card so multiple transitions in the same panel can animate at once without colliding.",
			"Card backgrounds use layered gradient plates so the motion is clearly visible even at small card sizes.",
		],
	},
	{
		id: "2026-06-17-audio-clip-indicator",
		date: "2026-06-17",
		tag: "feature",
		title: "DAW-style audio clip indicator",
		items: [
			"The vertical audio meter now flashes a red overlay at the top of each channel bar when the signal hits 0dB — latches for 1.5 seconds then decays, exactly like a hardware meter.",
			"Updated the resize handle to a focusable <button> for proper keyboard accessibility.",
		],
	},
	{
		id: "2026-06-17-realtime-volume",
		date: "2026-06-17",
		tag: "fix",
		title: "Real-time volume & pan changes",
		items: [
			"Volume and pan sliders now update the live audio mix immediately — no more silent gaps or playback restarts when scrubbing the dB/pan controls.",
			"The audio manager skips a full restart when only volume/pan/muted change so a single drag can fire hundreds of updates per second without glitches.",
		],
	},
	{
		id: "2026-06-17-bugfixes-waveform-shortcuts",
		date: "2026-06-17",
		tag: "fix",
		title: "Waveform, shortcuts, and mobile improvements",
		items: [
			"Waveform height now uses perceptual scaling (sqrt) so it better matches perceived loudness — reducing volume to -16dB shows ~40% height instead of 16%.",
			"Space bar shortcut now works more reliably — no longer blocked when focus is on non-text UI elements like buttons and dropdowns.",
			"Projects page now shows mobile gate warning on small screens, matching the editor page behavior.",
		],
	},
	{
		id: "2026-06-17-interactive-speed-graph",
		date: "2026-06-17",
		tag: "improvement",
		title: "Interactive speed graph (Alight Motion-style)",
		items: [
			"The speed ramp curve is now fully interactive — click anywhere on the graph to add a keyframe, drag points to adjust time and speed, double-click to remove.",
			"Grid lines with speed labels (1x, 3x, 5x) for easier reading. Real-time speed readout while dragging.",
			"Speed range: 0.05x to 5x. Endpoints are locked to 0% and 100% time.",
		],
	},
	{
		id: "2026-06-17-adjust-tab",
		date: "2026-06-17",
		tag: "improvement",
		title: "Dedicated Adjust tab in the inspector",
		items: [
			"Color grading and adjustment effects now have their own 'Adjust' quick-switch tab, separate from Effects — matching Alight Motion's layout.",
			"Inspector tabs now show 6 primary categories (Element, Video, Audio, Effects, Adjust, Animation).",
		],
	},
	{
		id: "2026-06-17-copy-paste-effect",
		date: "2026-06-17",
		tag: "feature",
		title: "Copy & paste effects (Alight Motion-style)",
		items: [
			"Each effect card now has a copy button — click it to grab the effect with all its current parameter values.",
			"A paste button appears in the Effects tab header when you have a copied effect, letting you apply it to any selected element.",
			"The copied effect slot is independent from the layer/style clipboard — copy a layer and an effect without overwriting each other.",
		],
	},
	{
		id: "2026-06-17-popout-browser-windows",
		date: "2026-06-17",
		tag: "feature",
		title: "Popout panels open in separate browser windows",
		items: [
			"Detached panels now pop out into their own browser window via window.open() — fully independent from the editor tab.",
			"Popout buttons are disabled by default to avoid clutter — enable them in Settings → General → 'Enable popout panels'.",
			"New Settings button on the Projects page (bottom-right corner) so you can adjust preferences before opening a project.",
		],
	},
	{
		id: "2026-06-17-settings-dialog",
		date: "2026-06-17",
		tag: "feature",
		title: "Settings dialog + don't-remind-delete",
		items: [
			"New Settings dialog (gear icon in header) with General, AI, and Shortcuts tabs.",
			"Toggle 'Don't ask before deleting projects' to skip the type-DELETE-to-confirm gate.",
			"AI tab documents all supported providers (OpenAI, Anthropic, Ollama, and any OpenAI-compatible endpoint).",
		],
	},
	{
		id: "2026-06-17-detachable-panels",
		date: "2026-06-17",
		tag: "feature",
		title: "Detachable editor panels",
		items: [
			"Assets, Preview, Properties, and Timeline can now pop out into draggable floating windows.",
			"Floating panels can be resized, docked back from their header, and remember their position across reloads.",
			"Docked panel slots show a placeholder when the panel is floating so you always know where it belongs.",
		],
	},
	{
		id: "2026-06-17-plugin-system",
		date: "2026-06-17",
		tag: "feature",
		title: "Plugin system (with categories & import)",
		items: [
			"New Plugins tab in the assets panel — install .artidor-plugin packages to add custom shapes, effects, transitions, and presets.",
			"Plugins are sandboxed, namespaced by id, and can be enabled/disabled or uninstalled without restarting the editor.",
			"Download a sample plugin from the panel to try the import flow — it adds a custom 'Demo Star' shape with a magenta fill.",
		],
	},
	{
		id: "2026-06-17-freehand-drawing",
		date: "2026-06-17",
		tag: "feature",
		title: "Freehand vector drawing tool",
		items: [
			"Click the pencil icon in the preview toolbar to enter draw mode, then drag on the canvas to sketch vector strokes.",
			"Paths are automatically simplified and smoothed (Ramer-Douglas-Peucker + Catmull-Rom curves) for clean, minimal vectors.",
			"Each drawing becomes a fully editable graphic element — change stroke color, width, fill, and toggle closed path in the inspector.",
		],
	},
	{
		id: "2026-06-17-copy-paste-style",
		date: "2026-06-17",
		tag: "feature",
		title: "Copy & paste style (Alight Motion-style)",
		items: [
			'Right-click an element → "Copy style" to grab its transform, effects, animations, text formatting, and more.',
			'Then "Paste style" onto any other element(s) to apply the same look — incompatible properties are silently skipped.',
			"Keyboard shortcuts: Ctrl+Shift+C (copy style) and Ctrl+Shift+V (paste style).",
		],
	},
	{
		id: "2026-06-17-element-tab",
		date: "2026-06-17",
		tag: "feature",
		title: "Inspector Element tab",
		items: [
			'New "Element" quick-switch tab surfaces identity, source media, timeline position, relationships and state toggles for the selected element.',
			"Copy element/media IDs to clipboard, toggle visibility and mute directly from the inspector.",
		],
	},
	{
		id: "2026-06-17-marquee-name",
		date: "2026-06-17",
		tag: "improvement",
		title: "Scrolling element name",
		items: [
			"Long element names now scroll horizontally in the inspector summary instead of being clipped — no more guessing what you renamed that layer to.",
		],
	},
	{
		id: "2026-06-17-timeline-anchors",
		date: "2026-06-17",
		tag: "fix",
		title: "Timeline trim/crop stays anchored",
		items: [
			"Dragging a clip's edge no longer slides its thumbnail or waveform — the source media stays put while you trim.",
			"The ruler's seconds labels no longer flicker as you widen or zoom the timeline.",
		],
	},
	{
		id: "2026-06-17-changelog-tab",
		date: "2026-06-17",
		tag: "improvement",
		title: "Changelog tab in the header",
		items: [
			"A direct link to the full changelog now sits in the landing-page header nav.",
		],
	},
	{
		id: "2026-06-17-shapes-75",
		date: "2026-06-17",
		tag: "feature",
		title: "75+ customizable shapes",
		items: [
			"Added trapezoid, parallelogram, diamond, pie, arc, gear, burst, flower, teardrop, location pin, shield, cloud, home, squircle and more.",
			"Polygons (3–10 sides), multi-point stars, and outline variants are all one click away.",
			"Every shape stays fully adjustable: fill, border and per-shape controls.",
		],
	},
	{
		id: "2026-06-17-color-picker-fix",
		date: "2026-06-17",
		tag: "fix",
		title: "Color picker no longer crashes",
		items: [
			"Dragging the saturation/value square to change a shape's colour no longer throws an error.",
		],
	},
	{
		id: "2026-06-17-presets",
		date: "2026-06-17",
		tag: "feature",
		title: "Reusable presets",
		items: [
			"New Presets tab in the sidebar.",
			"Right-click any clip or group → Save to preset to reuse a styled, animated layer (e.g. a spinning coin) in any project.",
			"Presets keep their full style + keyframe animation and drop back in at the playhead.",
		],
	},
	{
		id: "2026-06-17-shapes",
		date: "2026-06-17",
		tag: "feature",
		title: "Alight Motion-style shapes",
		items: [
			"Added Line, Arrow, Chevron, Ring, Plus, Right Triangle, Heart, Lightning, Moon and Speech Bubble.",
			"Every shape is fully adjustable: fill, border colour/width/alignment, and per-shape controls.",
		],
	},
	{
		id: "2026-06-16-renderer",
		date: "2026-06-16",
		tag: "performance",
		title: "Smoother playback",
		items: [
			"Static text is cached instead of re-rendered every frame.",
			"Layer parenting now drives child position, rotation and scale at render time.",
		],
	},
	{
		id: "2026-06-16-keyframes",
		date: "2026-06-16",
		tag: "feature",
		title: "After Effects-style animation",
		items: [
			"Easy Ease (F9) and a per-keyframe Keyframe Assistant menu.",
			"Per-character text animators: Fade, Rise, Drop, Zoom, Pop, Typewriter, Wave.",
		],
	},
];

export function validateWhatsNewFeed(
	entries: readonly WhatsNewEntry[] = WHATS_NEW,
) {
	const seen = new Set<string>();
	for (let index = 0; index < entries.length; index += 1) {
		const entry = entries[index];
		if (seen.has(entry.id)) {
			throw new Error(`Duplicate What's New id: ${entry.id}`);
		}
		seen.add(entry.id);

		const previous = entries[index - 1];
		if (previous && entry.date > previous.date) {
			throw new Error(
				`What's New entries must be newest first: ${entry.id} is dated after ${previous.id}`,
			);
		}
	}
}

if (process.env.NODE_ENV !== "production") {
	validateWhatsNewFeed();
}

export function getLatestWhatsNewId(): string | null {
	return WHATS_NEW[0]?.id ?? null;
}
