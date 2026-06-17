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

export function getLatestWhatsNewId(): string | null {
	return WHATS_NEW[0]?.id ?? null;
}
