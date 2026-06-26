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
	| "style"
	| "export"
	| "history"
	| "selection"
	| "clipboard";

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
		"Patch a single element. Any subset of the fields is applied; the rest is left alone. time/duration/trim are in ticks (1s = 120_000).",
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
			},
			["trackId", "elementId"],
		),
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
