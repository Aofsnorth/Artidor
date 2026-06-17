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

export function getLatestWhatsNewId(): string | null {
	return WHATS_NEW[0]?.id ?? null;
}
