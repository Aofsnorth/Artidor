/**
 * Tool registry — converts the actions available in the Artidor editor
 * into LLM-callable function definitions.
 *
 * Tools are grouped by what part of the editor they touch. The naming
 * follows `snake_case` so the LLM doesn't have to deal with camelCase
 * ambiguity, and we map back to the EditorCore method calls inside
 * `executor.ts`. Every tool's parameters are a strict JSON Schema
 * (`additionalProperties: false` is implied by the registry builder
 * below) so the model can't smuggle in unexpected keys.
 */

import type { ToolDefinition } from "../provider";

/**
 * Each entry describes:
 *  - the LLM-facing definition (name, description, JSON schema)
 *  - the `executorKey` we use in `executor.ts` to dispatch the call
 *  - a `category` for the system prompt grouping
 */
export interface RegisteredTool {
	def: ToolDefinition;
	executorKey: string;
	category: ToolCategory;
}

export type ToolCategory =
	| "project"
	| "scene"
	| "track"
	| "element"
	| "effect"
	| "mask"
	| "keyframe"
	| "transition"
	| "playback"
	| "asset"
	| "web"
	| "style"
	| "export"
	| "history"
	| "selection"
	| "clipboard"
	| "plan"
	| "generate"
	| "audio"
	| "skill"
	| "info";

/** Reusable schema for an array of {trackId, elementId} element refs. */
function elementRefArraySchema(minItems: number): unknown {
	return {
		type: "array",
		items: {
			type: "object",
			properties: {
				trackId: { type: "string" },
				elementId: { type: "string" },
			},
			required: ["trackId", "elementId"],
			additionalProperties: false,
		},
		minItems,
	};
}

/* -------------------------------------------------------------------------- */
/*                              Helper builders                              */
/* -------------------------------------------------------------------------- */

function objectSchema(
	properties: Record<string, unknown>,
	required: string[] = [],
): ToolDefinition["function"]["parameters"] {
	return {
		type: "object",
		properties,
		required,
		additionalProperties: false,
	};
}

/* The string / number helpers return `unknown` deliberately so callers
   can chain `` without TypeScript complaining about missing
   properties on a narrower type. The runtime objects are still
   valid JSON Schema fragments. */

function enumSchema<T extends string>(values: readonly T[]): unknown {
	return { type: "string", enum: values as readonly string[] };
}

function numberSchema(min?: number, max?: number): unknown {
	const s: { type: "number"; minimum?: number; maximum?: number } = {
		type: "number",
	};
	if (min !== undefined) s.minimum = min;
	if (max !== undefined) s.maximum = max;
	return s;
}

function tool(
	category: ToolCategory,
	executorKey: string,
	name: string,
	description: string,
	parameters: ToolDefinition["function"]["parameters"],
): RegisteredTool {
	return {
		category,
		executorKey,
		def: {
			type: "function",
			function: { name, description, parameters },
		},
	};
}

/* -------------------------------------------------------------------------- */
/*                                Definitions                                */
/* -------------------------------------------------------------------------- */

export const ALL_TOOLS: RegisteredTool[] = [
	/* -------------------------------- Project -------------------------------- */
	tool(
		"project",
		"set_project_fps",
		"set_project_fps",
		"Change the project's frame rate. Use one of the canonical rates (24, 25, 30, 60).",
		objectSchema({ fps: numberSchema(1, 240) }, ["fps"]),
	),
	tool(
		"project",
		"set_project_canvas",
		"set_project_canvas",
		"Resize the project canvas. width/height in pixels (max 7680).",
		objectSchema(
			{
				width: numberSchema(16, 7680),
				height: numberSchema(16, 4320),
				mode: enumSchema(["preset", "custom"]),
			},
			["width", "height"],
		),
	),
	tool(
		"project",
		"set_project_background",
		"set_project_background",
		"Set the project background. Either a solid color or a blurred copy of the main track.",
		objectSchema(
			{
				type: enumSchema(["color", "blur"]),
				color: { type: "string" },
				blurIntensity: numberSchema(0, 64),
			},
			["type"],
		),
	),
	tool(
		"project",
		"save_project",
		"save_project",
		"Force a save of the current project to storage.",
		objectSchema({}),
	),

	/* --------------------------------- Scene --------------------------------- */
	tool(
		"scene",
		"create_scene",
		"create_scene",
		"Create a new scene (timeline page). The new scene is set as active.",
		objectSchema(
			{
				name: { type: "string", minLength: 1, maxLength: 80 },
				isMain: { type: "boolean" },
			},
			["name"],
		),
	),
	tool(
		"scene",
		"rename_scene",
		"rename_scene",
		"Rename the currently active scene.",
		objectSchema({ name: { type: "string", minLength: 1 } }, ["name"]),
	),
	tool(
		"scene",
		"add_bookmark",
		"add_bookmark",
		"Add a bookmark at the given time (in ticks — 1 second = 120_000 ticks).",
		objectSchema(
			{
				time: numberSchema(0),
				note: { type: "string" },
				color: { type: "string" },
			},
			["time"],
		),
	),
	tool(
		"scene",
		"remove_bookmark",
		"remove_bookmark",
		"Remove the bookmark at the given time.",
		objectSchema({ time: numberSchema(0) }, ["time"]),
	),
	tool(
		"scene",
		"list_bookmarks",
		"list_bookmarks",
		"List all bookmarks (timeline markers) on the active scene. Returns each bookmark's time (in ticks), note, color, and duration. Use this to read markers the user placed manually, then split_element at each bookmark time to cut the video at those marks.",
		objectSchema({}),
	),
	tool(
		"scene",
		"update_bookmark",
		"update_bookmark",
		"Update a bookmark's note, color, or duration at the given time.",
		objectSchema(
			{
				time: numberSchema(0),
				note: { type: "string" },
				color: { type: "string" },
				duration: numberSchema(0),
			},
			["time"],
		),
	),
	tool(
		"scene",
		"move_bookmark",
		"move_bookmark",
		"Move a bookmark from one time to another.",
		objectSchema(
			{ fromTime: numberSchema(0), toTime: numberSchema(0) },
			["fromTime", "toTime"],
		),
	),

	/* --------------------------------- Track --------------------------------- */
	tool(
		"track",
		"add_track",
		"add_track",
		"Add a new track. type must be one of video|text|audio|graphic|effect.",
		objectSchema(
			{
				type: enumSchema(["video", "text", "audio", "graphic", "effect"]),
				index: numberSchema(0, 32),
			},
			["type"],
		),
	),
	tool(
		"track",
		"remove_track",
		"remove_track",
		"Remove a track by its id. WARNING: this also drops every element on it.",
		objectSchema({ trackId: { type: "string" } }, ["trackId"]),
	),
	tool(
		"track",
		"set_track_muted",
		"set_track_muted",
		"Mute or unmute a track. Only valid for video and audio tracks.",
		objectSchema({ trackId: { type: "string" }, muted: { type: "boolean" } }, [
			"trackId",
			"muted",
		]),
	),
	tool(
		"track",
		"set_track_visible",
		"set_track_visible",
		"Hide or show a track.",
		objectSchema(
			{ trackId: { type: "string" }, visible: { type: "boolean" } },
			["trackId", "visible"],
		),
	),

	/* -------------------------------- Element -------------------------------- */
	tool(
		"element",
		"insert_text_element",
		"insert_text_element",
		"Insert a text element on the given track (or the top overlay track if omitted) at the current playhead.",
		objectSchema({
			trackId: { type: "string" },
			content: { type: "string" },
			durationSeconds: numberSchema(0.1, 60),
			fontSize: numberSchema(4, 320),
			color: { type: "string" },
		}),
	),
	tool(
		"element",
		"insert_camera_layer",
		"insert_camera_layer",
		"Insert a 3D camera layer for parallax-style 3D motion.",
		objectSchema({
			durationSeconds: numberSchema(0.1, 60),
		}),
	),
	tool(
		"element",
		"insert_null_layer",
		"insert_null_layer",
		"Insert a null (invisible) layer that can act as a parent for grouping / transforms.",
		objectSchema({
			durationSeconds: numberSchema(0.1, 60),
		}),
	),
	tool(
		"element",
		"move_element",
		"move_element",
		"Move an element to a new startTime and/or target track.",
		objectSchema(
			{
				sourceTrackId: { type: "string" },
				elementId: { type: "string" },
				targetTrackId: { type: "string" },
				newStartTime: numberSchema(0),
			},
			["sourceTrackId", "elementId", "newStartTime"],
		),
	),
	tool(
		"element",
		"split_element",
		"split_element",
		"Split a single element at the given time. Returns the id of the right half.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				time: numberSchema(0),
				retainSide: enumSchema(["both", "left", "right"]),
			},
			["trackId", "elementId", "time"],
		),
	),
	tool(
		"element",
		"delete_elements",
		"delete_elements",
		"Delete one or more elements. ids are paired with their trackId.",
		objectSchema(
			{
				elements: {
					type: "array",
					items: {
						type: "object",
						properties: {
							trackId: { type: "string" },
							elementId: { type: "string" },
						},
						required: ["trackId", "elementId"],
						additionalProperties: false,
					},
					minItems: 1,
				},
			},
			["elements"],
		),
	),
	tool(
		"element",
		"update_element",
		"update_element",
		"Patch a single element. Any subset of the fields is applied; the rest is left alone. All time/duration/trim/fade fields are in ticks (1s = 120_000). Transform fields (positionX/Y/Z, scaleX/Y, rotate, pivotX/Y, rotateX/Y, skewX/Y) are merged into the existing transform — passing only positionX does NOT reset scale or rotate. blendMode is one of: normal, darken, multiply, color-burn, lighten, screen, plus-lighter, color-dodge, overlay, soft-light, hard-light, difference, exclusion, hue, saturation, color, luminosity.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				startTime: numberSchema(0),
				duration: numberSchema(1),
				trimStart: numberSchema(0),
				trimEnd: numberSchema(0),
				opacity: numberSchema(0, 1),
				hidden: { type: "boolean" },
				customName: { type: "string" },
				content: { type: "string" },
				color: { type: "string" },
				fontSize: numberSchema(4, 320),
				// ── Transform (2D + 3D) — merged, not replaced ──
				positionX: numberSchema(),
				positionY: numberSchema(),
				positionZ: numberSchema(),
				scaleX: numberSchema(),
				scaleY: numberSchema(),
				rotate: numberSchema(-360, 360),
				pivotX: numberSchema(0, 1),
				pivotY: numberSchema(0, 1),
				// 3D rotation (sets transform3d if the element doesn't have one yet)
				rotateX: numberSchema(-360, 360),
				rotateY: numberSchema(-360, 360),
				// Skew ("nyerong") in degrees
				skewX: numberSchema(-89, 89),
				skewY: numberSchema(-89, 89),
				// ── Appearance ──
				blendMode: enumSchema([
					"normal",
					"darken",
					"multiply",
					"color-burn",
					"lighten",
					"screen",
					"plus-lighter",
					"color-dodge",
					"overlay",
					"soft-light",
					"hard-light",
					"difference",
					"exclusion",
					"hue",
					"saturation",
					"color",
					"luminosity",
				]),
				// ── Audio (video/audio elements only) ──
				volume: numberSchema(),
				pan: numberSchema(-100, 100),
				fadeInDuration: numberSchema(0),
				fadeOutDuration: numberSchema(0),
			},
			["trackId", "elementId"],
		),
	),
	tool(
		"element",
		"list_elements",
		"list_elements",
		"List every element currently on the active scene's timeline. Returns each element's trackId, elementId, type, name, startTime, duration, trimStart, trimEnd (all time fields in ticks). Call this when you need an elementId/trackId you don't already have (e.g. the user added a clip manually, or you lost track of an ID from a previous step) instead of asking the user.",
		objectSchema({}),
	),

	/* --------------------------------- Effect -------------------------------- */
	tool(
		"effect",
		"add_clip_effect",
		"add_clip_effect",
		"Add an effect to a clip. effectType is the registry key, e.g. 'blur', 'glow', 'glitch'.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				effectType: { type: "string" },
			},
			["trackId", "elementId", "effectType"],
		),
	),
	tool(
		"effect",
		"remove_clip_effect",
		"remove_clip_effect",
		"Remove an effect from a clip.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				effectId: { type: "string" },
			},
			["trackId", "elementId", "effectId"],
		),
	),
	tool(
		"effect",
		"update_clip_effect_params",
		"update_clip_effect_params",
		"Update an effect's parameter values. params is a free-form key→value map (numbers 0..1, strings for colors/enums).",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				effectId: { type: "string" },
				params: { type: "object", additionalProperties: true },
			},
			["trackId", "elementId", "effectId", "params"],
		),
	),

	/* ---------------------------------- Mask --------------------------------- */
	tool(
		"mask",
		"remove_mask",
		"remove_mask",
		"Remove a mask from an element.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				maskId: { type: "string" },
			},
			["trackId", "elementId", "maskId"],
		),
	),

	/* ------------------------------- Keyframe -------------------------------- */
	tool(
		"keyframe",
		"upsert_keyframe",
		"upsert_keyframe",
		"Insert or update a keyframe on a numeric property. time is in ticks. value is the new value at that time. easing matches the editor's easing enum.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				path: { type: "string" },
				time: numberSchema(0),
				value: { type: "number" },
				easing: {
					type: "string",
					enum: [
						"linear",
						"hold",
						"ease-in",
						"ease-out",
						"ease-in-out",
						"custom-bezier",
						"bounce",
						"elastic",
						"cyclic",
						"random",
					],
				},
			},
			["trackId", "elementId", "path", "time", "value", "easing"],
		),
	),
	tool(
		"keyframe",
		"remove_keyframe",
		"remove_keyframe",
		"Remove a single keyframe from a property.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				path: { type: "string" },
				time: numberSchema(0),
			},
			["trackId", "elementId", "path", "time"],
		),
	),

	/* ------------------------------ Transition ------------------------------- */
	tool(
		"transition",
		"add_transition",
		"add_transition",
		"Add a transition between two elements. transitionType is the registry key, e.g. 'fade', 'wipe', 'glitch'.",
		objectSchema(
			{
				fromTrackId: { type: "string" },
				fromElementId: { type: "string" },
				toTrackId: { type: "string" },
				toElementId: { type: "string" },
				transitionType: { type: "string" },
				startTime: numberSchema(0),
				duration: numberSchema(1),
			},
			[
				"fromTrackId",
				"fromElementId",
				"toTrackId",
				"toElementId",
				"startTime",
				"duration",
			],
		),
	),

	/* -------------------------------- Playback ------------------------------- */
	tool(
		"playback",
		"play",
		"play",
		"Start playback from the current playhead position.",
		objectSchema({}),
	),
	tool("playback", "pause", "pause", "Pause playback.", objectSchema({})),
	tool(
		"playback",
		"seek",
		"seek",
		"Move the playhead. time is in ticks.",
		objectSchema({ time: numberSchema(0) }, ["time"]),
	),
	tool(
		"playback",
		"set_volume",
		"set_volume",
		"Set the master playback volume. 0..1.",
		objectSchema({ value: numberSchema(0, 1) }, ["value"]),
	),
	tool(
		"playback",
		"toggle_playback",
		"toggle_playback",
		"Toggle between play and pause.",
		objectSchema({}),
	),
	tool(
		"playback",
		"mute_playback",
		"mute_playback",
		"Mute the master playback audio.",
		objectSchema({}),
	),
	tool(
		"playback",
		"unmute_playback",
		"unmute_playback",
		"Unmute the master playback audio.",
		objectSchema({}),
	),
	tool(
		"playback",
		"save_snapshot",
		"save_snapshot",
		"Save the current preview frame as a PNG image file (downloads to the user's device).",
		objectSchema({}),
	),
	tool(
		"playback",
		"copy_snapshot",
		"copy_snapshot",
		"Copy the current preview frame to the system clipboard as an image.",
		objectSchema({}),
	),

	/* --------------------------------- Audio --------------------------------- */
	tool(
		"audio",
		"detect_beats",
		"detect_beats",
		"Analyze an audio or video clip's audio track and return beat timestamps. Pass the trackId+elementId of the audio/video element to analyze. Returns an array of beats, each with timeSeconds and ticks (1s = 120_000 ticks). Use the returned tick times with split_element (to cut on every beat = jedag-jedug) or upsert_keyframe (to animate on the beat). Optionally pass limit to return only the strongest N beats (sorted by energy) — useful for 'the highest beat' requests and much faster on long videos.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				limit: numberSchema(1, 1000),
				sortBy: enumSchema(["energy", "time"]),
			},
			["trackId", "elementId"],
		),
	),
	tool(
		"audio",
		"apply_beat_sync",
		"apply_beat_sync",
		"Snap element start times to the nearest beat. Pass beatTimes (array of tick values from detect_beats) and the elements to snap. Each element's startTime is moved to the closest beat time. Use this for beat-synced placement.",
		objectSchema(
			{
				beatTimes: {
					type: "array",
					items: { type: "number", minimum: 0 },
					minItems: 1,
				},
				elements: elementRefArraySchema(1),
			},
			["beatTimes", "elements"],
		),
	),

	/* --------------------------------- Asset --------------------------------- */
	tool(
		"asset",
		"import_asset_from_url",
		"import_asset_from_url",
		"Add a media asset by URL. The file is downloaded server-side (max 200MB) and added to the project's media library.",
		objectSchema(
			{
				url: { type: "string", format: "uri" },
				name: { type: "string" },
			},
			["url"],
		),
	),
	tool(
		"asset",
		"list_assets",
		"list_assets",
		"List the assets currently in the project's media library. Returns name, type, duration, and id for each.",
		objectSchema({}),
	),
	tool(
		"asset",
		"view_asset",
		"view_asset",
		"View (see) a media asset's visual content so you can reason about its composition, colors, subjects, and layout. Pass the assetId from list_assets. For images, the image is attached as a vision input. For videos, sample frames are extracted and attached (or the video is sent natively when the active chat model supports video input, e.g. Gemini). For audio, only metadata is returned (audio cannot be viewed visually). Use this before suggesting edits that depend on what's actually in the media.",
		objectSchema(
			{
				assetId: { type: "string" },
				/**
				 * Optional. For video assets, the number of sample frames to
				 * extract (default 3, max 8). Ignored for images and audio,
				 * and when the model supports native video input.
				 */
				sampleFrames: numberSchema(1, 8),
			},
			["assetId"],
		),
	),
	tool(
		"asset",
		"add_media_to_timeline",
		"add_media_to_timeline",
		"Add an existing media library asset to the timeline as a video/image/audio clip. Call list_assets first to get the assetId. trackId is optional — omit it to auto-place on the right track type. startTime defaults to the current playhead position (in ticks).",
		objectSchema(
			{
				assetId: { type: "string" },
				trackId: { type: "string" },
				startTime: numberSchema(0),
			},
			["assetId"],
		),
	),
	tool(
		"asset",
		"import_and_add_to_timeline",
		"import_and_add_to_timeline",
		"Download a media file from a URL and immediately add it to the timeline as a clip. Combines import_asset_from_url + add_media_to_timeline in one step. startTime defaults to the current playhead.",
		objectSchema(
			{
				url: { type: "string", format: "uri" },
				name: { type: "string" },
				trackId: { type: "string" },
				startTime: numberSchema(0),
			},
			["url"],
		),
	),

	/* -------------------------------- Capture -------------------------------- */
	tool(
		"playback",
		"capture_frame",
		"capture_frame",
		"Capture the current preview frame as a PNG screenshot. Returns a base64 data URL that can be used for vision-based analysis. Use this to 'see' what's currently on the canvas — e.g. check composition, colors, text rendering, layout.",
		objectSchema({}),
	),

	/* --------------------------------- Style --------------------------------- */
	tool(
		"style",
		"apply_preset",
		"apply_preset",
		"Apply a named style preset to the project (e.g. 'cinematic', 'vlog', 'documentary'). This is a batch action that adjusts color grade, typography defaults, and transition style in one go.",
		objectSchema({ preset: { type: "string" } }, ["preset"]),
	),

	/* --------------------------------- Export -------------------------------- */
	tool(
		"export",
		"export_project",
		"export_project",
		"Export the project. format: mp4 | webm | hevc. quality: low | medium | high. includeAudio defaults to true.",
		objectSchema(
			{
				format: enumSchema(["mp4", "webm", "hevc"]),
				quality: enumSchema(["low", "medium", "high"]),
				includeAudio: { type: "boolean" },
			},
			["format", "quality"],
		),
	),

	/* -------------------------------- History -------------------------------- */
	tool(
		"history",
		"undo",
		"undo",
		"Undo the last editor action.",
		objectSchema({}),
	),
	tool(
		"history",
		"redo",
		"redo",
		"Redo the last undone editor action.",
		objectSchema({}),
	),

	/* ------------------------------- Selection ------------------------------- */
	tool(
		"selection",
		"select_elements",
		"select_elements",
		"Set the current selection to the given elements (each a {trackId, elementId} pair).",
		objectSchema({ elements: elementRefArraySchema(1) }, ["elements"]),
	),
	tool(
		"selection",
		"clear_selection",
		"clear_selection",
		"Clear the current selection.",
		objectSchema({}),
	),

	/* ------------------------------- Clipboard ------------------------------- */
	tool(
		"clipboard",
		"copy",
		"copy",
		"Copy the currently selected elements to the clipboard.",
		objectSchema({}),
	),
	tool(
		"clipboard",
		"paste",
		"paste",
		"Paste the clipboard contents. Optional time (ticks) sets where to paste; defaults to the playhead.",
		objectSchema({ time: numberSchema(0) }),
	),
	tool(
		"clipboard",
		"copy-style",
		"copy-style",
		"Copy the style of the currently selected element (font, color, size, etc.) to the style clipboard slot.",
		objectSchema({}),
	),
	tool(
		"clipboard",
		"paste-style",
		"paste-style",
		"Paste the style from the style clipboard slot onto the currently selected element.",
		objectSchema({}),
	),
	tool(
		"clipboard",
		"copy-effect",
		"copy-effect",
		"Copy a specific effect (by type) to the effect clipboard slot. effectType is the registry key, e.g. 'blur'.",
		objectSchema({ effectType: { type: "string", minLength: 1 } }, [
			"effectType",
		]),
	),
	tool(
		"clipboard",
		"paste-effect",
		"paste-effect",
		"Paste the effect from the effect clipboard slot onto the currently selected visual elements.",
		objectSchema({}),
	),

	/* ---------------------------- Scene (additional) ------------------------- */
	tool(
		"scene",
		"delete_scene",
		"delete_scene",
		"Delete a scene by its id.",
		objectSchema({ sceneId: { type: "string" } }, ["sceneId"]),
	),
	tool(
		"scene",
		"switch_scene",
		"switch_scene",
		"Switch the active scene to the one with the given id.",
		objectSchema({ sceneId: { type: "string" } }, ["sceneId"]),
	),

	/* --------------------------- Element grouping ---------------------------- */
	tool(
		"element",
		"group_elements",
		"group_elements",
		"Group two or more elements so they move and transform together. Returns the new groupId.",
		objectSchema({ elements: elementRefArraySchema(2) }, ["elements"]),
	),
	tool(
		"element",
		"ungroup_elements",
		"ungroup_elements",
		"Ungroup a previously grouped set of elements by its groupId.",
		objectSchema({ groupId: { type: "string" } }, ["groupId"]),
	),

	/* ----------------------------- Asset folders ----------------------------- */
	tool(
		"asset",
		"create_folder",
		"create_folder",
		"Create a media-library folder. Returns its id.",
		objectSchema({ name: { type: "string", minLength: 1, maxLength: 80 } }, [
			"name",
		]),
	),
	tool(
		"asset",
		"move_asset_to_folder",
		"move_asset_to_folder",
		"Move an asset into a folder. Omit folderId to move it back to the library root.",
		objectSchema(
			{ assetId: { type: "string" }, folderId: { type: "string" } },
			["assetId"],
		),
	),

	/* ------------------------- Element (advanced) --------------------------- */
	tool(
		"element",
		"duplicate_elements",
		"duplicate_elements",
		"Duplicate one or more elements. The copies are placed right after the originals on the same track.",
		objectSchema({ elements: elementRefArraySchema(1) }, ["elements"]),
	),
	tool(
		"element",
		"toggle_source_audio_separation",
		"toggle_source_audio_separation",
		"Toggle audio separation on a video element — splits the audio into its own track for independent editing.",
		objectSchema(
			{ trackId: { type: "string" }, elementId: { type: "string" } },
			["trackId", "elementId"],
		),
	),
	tool(
		"element",
		"set_parent",
		"set_parent",
		"Set a parent for an element (for nested transforms / parallax). Omit parentId to unset.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				parentId: { type: "string" },
			},
			["trackId", "elementId"],
		),
	),
	tool(
		"element",
		"unlink_parent",
		"unlink_parent",
		"Remove the parent link from an element.",
		objectSchema(
			{ trackId: { type: "string" }, elementId: { type: "string" } },
			["trackId", "elementId"],
		),
	),
	tool(
		"element",
		"combine_elements",
		"combine_elements",
		"Combine two or more adjacent elements on the same track into a single clip.",
		objectSchema({ elements: elementRefArraySchema(2) }, ["elements"]),
	),

	/* --------------------------- Transition (extra) ------------------------- */
	tool(
		"transition",
		"remove_transition",
		"remove_transition",
		"Remove a transition by its id.",
		objectSchema({ transitionId: { type: "string" } }, ["transitionId"]),
	),
	tool(
		"transition",
		"update_transition",
		"update_transition",
		"Update a transition's properties (type, startTime, duration).",
		objectSchema(
			{
				transitionId: { type: "string" },
				transitionType: { type: "string" },
				startTime: numberSchema(0),
				duration: numberSchema(1),
			},
			["transitionId"],
		),
	),

	/* ----------------------------- Effect (extra) --------------------------- */
	tool(
		"effect",
		"toggle_effect_enabled",
		"toggle_effect_enabled",
		"Enable or disable a clip effect without removing it.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				effectId: { type: "string" },
			},
			["trackId", "elementId", "effectId"],
		),
	),
	tool(
		"effect",
		"reorder_effects",
		"reorder_effects",
		"Move an effect from one position to another in the effect stack.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				fromIndex: numberSchema(0),
				toIndex: numberSchema(0),
			},
			["trackId", "elementId", "fromIndex", "toIndex"],
		),
	),

	/* ------------------------------ Mask (extra) ---------------------------- */
	tool(
		"mask",
		"toggle_mask_inverted",
		"toggle_mask_inverted",
		"Toggle whether a mask is inverted (shows the opposite region).",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				maskId: { type: "string" },
			},
			["trackId", "elementId", "maskId"],
		),
	),

	/* --------------------------- Keyframe (extra) --------------------------- */
	tool(
		"keyframe",
		"retime_keyframe",
		"retime_keyframe",
		"Move a keyframe to a new time on the same property.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				path: { type: "string" },
				keyframeId: { type: "string" },
				newTime: numberSchema(0),
			},
			["trackId", "elementId", "path", "keyframeId", "newTime"],
		),
	),
	tool(
		"keyframe",
		"upsert_effect_param_keyframe",
		"upsert_effect_param_keyframe",
		"Insert or update a keyframe on an effect parameter (e.g. blur intensity over time).",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				effectId: { type: "string" },
				paramKey: { type: "string" },
				time: numberSchema(0),
				value: {},
			},
			["trackId", "elementId", "effectId", "paramKey", "time", "value"],
		),
	),
	tool(
		"keyframe",
		"remove_effect_param_keyframe",
		"remove_effect_param_keyframe",
		"Remove a keyframe from an effect parameter.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				effectId: { type: "string" },
				paramKey: { type: "string" },
				keyframeId: { type: "string" },
			},
			["trackId", "elementId", "effectId", "paramKey", "keyframeId"],
		),
	),

	/* --------------------------- Asset (extra) ------------------------------ */
	tool(
		"asset",
		"delete_asset",
		"delete_asset",
		"Delete a media asset from the project library.",
		objectSchema({ assetId: { type: "string" } }, ["assetId"]),
	),
	tool(
		"asset",
		"rename_folder",
		"rename_folder",
		"Rename a media library folder.",
		objectSchema(
			{ folderId: { type: "string" }, name: { type: "string", minLength: 1 } },
			["folderId", "name"],
		),
	),
	tool(
		"asset",
		"delete_folder",
		"delete_folder",
		"Delete a media library folder. Assets inside are moved to root.",
		objectSchema({ folderId: { type: "string" } }, ["folderId"]),
	),

	/* -------------------------- Clipboard (extra) --------------------------- */
	tool(
		"clipboard",
		"paste_keyframes",
		"paste_keyframes",
		"Paste copied keyframes onto an element at the given time (ticks).",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
				time: numberSchema(0),
			},
			["trackId", "elementId", "time"],
		),
	),

	/* --------------------------------- Web ---------------------------------- */
	tool(
		"web",
		"web_fetch",
		"web_fetch",
		"Fetch a public web page and return its text content. Use this when the user asks about something online, references a URL, or needs current facts from a specific page. The URL must be public (http/https) and not a private/internal address.",
		objectSchema(
			{
				url: {
					type: "string",
					description: "Full public URL to fetch (e.g. https://example.com/article)",
				},
			},
			["url"],
		),
	),

	/* ------------------------------- Planning -------------------------------- */
	tool(
		"plan",
		"create_plan",
		"create_plan",
		"Create a step-by-step plan before executing a complex task. Each step has a short title and description. Call this FIRST when the user's request involves multiple steps (e.g. 'make a 60s reel' or 'add captions and color grade'). The plan is shown to the user as a visual checklist. After creating the plan, proceed to execute each step using the appropriate tools.",
		objectSchema(
			{
				title: { type: "string", description: "Short title for the overall plan" },
				steps: {
					type: "array",
					description: "Ordered list of steps",
					items: {
						type: "object",
						properties: {
							title: { type: "string", description: "Short step title" },
							description: {
								type: "string",
								description: "What this step involves",
							},
						},
						required: ["title", "description"],
						additionalProperties: false,
					},
					minItems: 1,
				},
			},
			["title", "steps"],
		),
	),
	tool(
		"plan",
		"update_todo",
		"update_todo",
		"Update the status of a plan step. Mark steps as 'in_progress' when you start them, 'done' when complete, or 'skipped' if no longer needed. The user sees the checklist update in real time.",
		objectSchema(
			{
				stepIndex: {
					type: "number",
					description: "0-based index of the step to update",
					minimum: 0,
				},
				status: {
					type: "string",
					enum: ["pending", "in_progress", "done", "skipped"],
					description:
						"New status: pending (not started), in_progress (working on it), done (complete), skipped (abandoned)",
				},
			},
			["stepIndex", "status"],
		),
	),

	/* ------------------------------- Generate ------------------------------- */
	// AI media generation tools. These call Puter.js SDK APIs (txt2vid,
	// txt2img, txt2speech) to generate video, images, and audio from text
	// prompts. They are gated by the provider's media model configuration —
	// when the corresponding model field is empty, the tool is filtered out
	// by getFilteredToolDefinitions() so the LLM never sees it.
	tool(
		"generate",
		"generate_video",
		"generate_video",
		"Generate a short video clip from a text prompt using AI. The generated video is automatically imported into the project's media library. Requires a video generation model to be configured on the active provider (e.g. sora-2, seedance-1.0-pro, wan-2.2).",
		objectSchema(
			{
				prompt: {
					type: "string",
					description: "Text description of the video to generate",
				},
				seconds: {
					type: "number",
					description: "Target clip length in seconds (e.g. 4, 8, 12)",
				},
			},
			["prompt"],
		),
	),
	tool(
		"generate",
		"generate_image",
		"generate_image",
		"Generate an image from a text prompt using AI. The generated image is automatically imported into the project's media library. Requires an image generation model to be configured on the active provider (e.g. dall-e-3, gpt-image-1, flux-1).",
		objectSchema(
			{
				prompt: {
					type: "string",
					description: "Text description of the image to generate",
				},
			},
			["prompt"],
		),
	),
	tool(
		"generate",
		"generate_audio",
		"generate_audio",
		"Convert text to speech using AI, generating an audio file. The generated audio is automatically imported into the project's media library. Requires an audio generation model to be configured on the active provider (e.g. tts-1, aws-polly).",
		objectSchema(
			{
				text: {
					type: "string",
					description: "The text to convert to speech (max 3000 characters)",
				},
				voice: {
					type: "string",
					description:
						"Voice ID to use (provider-specific, e.g. 'Joanna', 'alloy')",
				},
			},
			["text"],
		),
	),
	tool(
		"generate",
		"generate_media",
		"generate_media",
		"Generate media (e.g. music, sound effects) from a text prompt using AI. The generated media is automatically imported into the project's media library. Requires a media generation model to be configured on the active provider.",
		objectSchema(
			{
				prompt: {
					type: "string",
					description: "Text description of the media to generate",
				},
			},
			["prompt"],
		),
	),

	/* --------------------------------- Skill -------------------------------- */
	tool(
		"skill",
		"save_skill",
		"save_skill",
		"Save a sequence of tool calls as a named skill (macro/recipe) that can be replayed later with run_skill. Each step is a toolName + args pair using EXACT tool names from the registry. The skill is persisted across sessions. Use this when the user asks to save a workflow, create a preset, or make a reusable effect.",
		objectSchema(
			{
				name: { type: "string", minLength: 1, maxLength: 60 },
				description: { type: "string", maxLength: 200 },
				steps: {
					type: "array",
					items: {
						type: "object",
						properties: {
							toolName: { type: "string" },
							args: {
								type: "object",
								additionalProperties: true,
							},
						},
						required: ["toolName", "args"],
						additionalProperties: false,
					},
					minItems: 1,
				},
			},
			["name", "steps"],
		),
	),
	tool(
		"skill",
		"list_skills",
		"list_skills",
		"List all saved AI skills (macros/recipes). Returns each skill's id, name, description, and step count.",
		objectSchema({}),
	),
	tool(
		"skill",
		"delete_skill",
		"delete_skill",
		"Delete a saved skill by its id.",
		objectSchema({ skillId: { type: "string" } }, ["skillId"]),
	),
	tool(
		"skill",
		"run_skill",
		"run_skill",
		"Replay a saved skill: execute each stored tool call in sequence. Each step goes through the same validation and safety checks as a live tool call. Returns a summary of which steps succeeded or failed.",
		objectSchema({ skillId: { type: "string" } }, ["skillId"]),
	),

	/* ---------------------------------- Info ---------------------------------- */
	tool(
		"info",
		"get_playhead",
		"get_playhead",
		"Get the current playhead position in ticks (1s = 120_000 ticks). Use this to know where the user's cursor is on the timeline.",
		objectSchema({}),
	),
	tool(
		"info",
		"is_playing",
		"is_playing",
		"Check whether playback is currently active (true) or paused (false).",
		objectSchema({}),
	),
	tool(
		"info",
		"get_volume",
		"get_volume",
		"Get the current master playback volume (0..1).",
		objectSchema({}),
	),
	tool(
		"info",
		"get_selection",
		"get_selection",
		"Get the currently selected elements as an array of {trackId, elementId}. Use this to find which clip(s) the user has highlighted before applying an operation to 'the selected clip'.",
		objectSchema({}),
	),
	tool(
		"info",
		"get_project_info",
		"get_project_info",
		"Get the active project's metadata: name, fps, canvas size (width×height), and total timeline duration (in ticks).",
		objectSchema({}),
	),
	tool(
		"info",
		"list_scenes",
		"list_scenes",
		"List all scenes in the project. Returns each scene's id, name, isMain flag, and bookmark count. The active scene is flagged.",
		objectSchema({}),
	),
	tool(
		"info",
		"get_timeline_duration",
		"get_timeline_duration",
		"Get the total timeline duration of the active scene in ticks (1s = 120_000 ticks).",
		objectSchema({}),
	),
	tool(
		"info",
		"list_tracks",
		"list_tracks",
		"List all tracks on the active scene. Returns each track's id, type, name, element count, muted state, and hidden state. Use this to find a trackId when you need to place an element on a specific track type.",
		objectSchema({}),
	),
	tool(
		"info",
		"has_clipboard",
		"has_clipboard",
		"Check whether the clipboard has content to paste (true/false). Also reports whether the style and effect clipboard slots have content.",
		objectSchema({}),
	),
	tool(
		"info",
		"is_dirty",
		"is_dirty",
		"Check whether the project has unsaved changes (true = needs save, false = all changes saved).",
		objectSchema({}),
	),

	/* --------------------------- Background removal -------------------------- */
	tool(
		"effect",
		"cutout_person",
		"cutout_person",
		"Remove the background from an image element using ML person segmentation (MediaPipe). Isolates people and drops the backdrop to transparent. For video elements, applies the 'remove-background' shader effect instead (real-time, no ML overhead). Use this for talking-head content, portraits, and people.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
			},
			["trackId", "elementId"],
		),
	),
	tool(
		"effect",
		"ai_cutout",
		"ai_cutout",
		"Remove the background from an image element using AI general-subject segmentation (transformers.js RMBG model). Works on ANY subject — people, products, objects. Heavier than cutout_person (~1-3s) but handles non-human subjects. For video elements, applies the 'remove-background' shader effect instead.",
		objectSchema(
			{
				trackId: { type: "string" },
				elementId: { type: "string" },
			},
			["trackId", "elementId"],
		),
	),
];

/* -------------------------------------------------------------------------- */
/*                                  Lookups                                  */
/* -------------------------------------------------------------------------- */

export const TOOLS_BY_NAME: Record<string, RegisteredTool> = Object.fromEntries(
	ALL_TOOLS.map((t) => [t.def.function.name, t]),
);

export const TOOLS_BY_EXECUTOR_KEY: Record<string, RegisteredTool> =
	Object.fromEntries(ALL_TOOLS.map((t) => [t.executorKey, t]));

export function getToolDefinitions(): ToolDefinition[] {
	return ALL_TOOLS.map((t) => t.def);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
	return ALL_TOOLS.filter((t) => t.category === category).map((t) => t.def);
}

/**
 * Tool names that require a specific media generation model to be
 * configured on the provider. When the corresponding model field is
 * empty, these tools are filtered out so the LLM cannot call them.
 *
 * This is the gating mechanism: the AI can only call generation tools
 * for media types the user has explicitly configured a model for.
 */
const VIDEO_GEN_TOOLS = new Set<string>([
	"generate_video",
	"generate_clip",
]);

const IMAGE_GEN_TOOLS = new Set<string>([
	"generate_image",
	"generate_thumbnail",
]);

const AUDIO_GEN_TOOLS = new Set<string>([
	"generate_audio",
	"generate_voiceover",
]);

const MEDIA_GEN_TOOLS = new Set<string>([
	"generate_media",
	"generate_music",
]);

/**
 * Filter the built-in tool definitions based on which media
 * generation models the provider has configured. Tools whose
 * corresponding model field is empty are excluded so the LLM
 * never sees (and therefore never calls) a generation tool it
 * can't actually use.
 *
 * Non-generation tools (editing, timeline, playback, etc.) are
 * always included regardless of media model configuration.
 */
export function getFilteredToolDefinitions(mediaModels: {
	videoModel?: string;
	imageModel?: string;
	audioModel?: string;
	mediaModel?: string;
}): ToolDefinition[] {
	return ALL_TOOLS.filter((t) => {
		const name = t.def.function.name;
		if (VIDEO_GEN_TOOLS.has(name) && !mediaModels.videoModel?.trim())
			return false;
		if (IMAGE_GEN_TOOLS.has(name) && !mediaModels.imageModel?.trim())
			return false;
		if (AUDIO_GEN_TOOLS.has(name) && !mediaModels.audioModel?.trim())
			return false;
		if (MEDIA_GEN_TOOLS.has(name) && !mediaModels.mediaModel?.trim())
			return false;
		return true;
	}).map((t) => t.def);
}
