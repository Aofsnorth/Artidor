/**
 * Tool executor — turns a validated LLM tool call into one or more
 * EditorCore method invocations and returns a serialisable result.
 *
 * Why a separate file:
 *  - The AI provider is a pure function: it sends messages and gets
 *    back tool calls. It MUST NOT touch the DOM or singleton managers.
 *  - The executor, in turn, is allowed to use EditorCore. It runs in
 *    the React tree (the AI panel), not the API route.
 *
 * Each handler is a small async function that pulls the right manager
 * off EditorCore and calls it. The result is wrapped in a uniform
 * shape so the chat UI can render the outcome without parsing strings.
 */

import type { EditorCore } from "@/core";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { TOOLS_BY_EXECUTOR_KEY } from "./registry";

export interface ToolExecutionResult {
	ok: boolean;
	message?: string;
	data?: unknown;
}

/* -------------------------------------------------------------------------- */
/*                              Helper: safeArgs                              */
/* -------------------------------------------------------------------------- */

function asString(v: unknown, fallback = ""): string {
	return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
	return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asBool(v: unknown, fallback = false): boolean {
	return typeof v === "boolean" ? v : fallback;
}
function asInt(v: unknown, fallback = 0): number {
	return Math.round(asNumber(v, fallback));
}
function secondsToTicks(seconds: unknown, fallbackTicks = 0): number {
	if (typeof seconds === "number" && Number.isFinite(seconds)) {
		return Math.round(seconds * TICKS_PER_SECOND);
	}
	return fallbackTicks;
}
function asArray<T>(v: unknown): T[] {
	return Array.isArray(v) ? (v as T[]) : [];
}

interface ElementRef {
	trackId: string;
	elementId: string;
}

function dispatchCommand(
	_editor: EditorCore,
	commandFactory: () => unknown,
): ToolExecutionResult {
	try {
		// All CommandManager.execute() implementations return the command.
		// The side effect is what we care about.
		commandFactory();
		return { ok: true };
	} catch (err) {
		return {
			ok: false,
			message: err instanceof Error ? err.message : "Command failed",
		};
	}
}

/* -------------------------------------------------------------------------- */
/*                                 Public API                                 */
/* -------------------------------------------------------------------------- */

export async function executeTool({
	editor,
	toolName,
	arguments: args,
	source = "ai",
}: {
	editor: EditorCore;
	toolName: string;
	arguments: Record<string, unknown>;
	source?: "user" | "ai";
}): Promise<ToolExecutionResult> {
	const registered = TOOLS_BY_EXECUTOR_KEY[toolName];
	if (!registered) {
		return { ok: false, message: `Unknown tool: ${toolName}` };
	}
	const handler = HANDLERS[toolName];
	if (!handler) {
		return {
			ok: false,
			message: `No executor registered for ${toolName}`,
		};
	}
	const result = await handler(editor, args);
	if (result.ok) {
		// Emit a window event the telemetry hook is listening to.
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("artidor:command", {
					detail: {
						command: toolName,
						args,
						source,
						summary: result.message,
						timestamp: Date.now(),
					},
				}),
			);
		}
	}
	return result;
}

/* -------------------------------------------------------------------------- */
/*                                 Handlers                                   */
/* -------------------------------------------------------------------------- */

type Handler = (
	editor: EditorCore,
	args: Record<string, unknown>,
) => Promise<ToolExecutionResult>;

const HANDLERS: Record<string, Handler> = {
	/* ------------------------------ project ----------------------------- */
	set_project_fps: async (editor, args) => {
		const fps = asNumber(args.fps);
		if (!fps) return { ok: false, message: "fps is required" };
		const project = editor.project.getActive();
		if (!project) return { ok: false, message: "No active project" };
		editor.project.setActiveProject({
			project: {
				...project,
				settings: {
					...project.settings,
					fps: { numerator: fps, denominator: 1 },
				},
			},
		});
		return { ok: true, message: `Set fps to ${fps}` };
	},

	set_project_canvas: async (editor, args) => {
		const w = asInt(args.width);
		const h = asInt(args.height);
		if (!w || !h) return { ok: false, message: "width/height required" };
		const project = editor.project.getActive();
		if (!project) return { ok: false, message: "No active project" };
		editor.project.setActiveProject({
			project: {
				...project,
				settings: {
					...project.settings,
					canvasSize: { width: w, height: h },
					canvasSizeMode: asString(args.mode, "custom") as "preset" | "custom",
				},
			},
		});
		return { ok: true, message: `Canvas set to ${w}×${h}` };
	},

	set_project_background: async (editor, args) => {
		const type = asString(args.type, "color");
		const project = editor.project.getActive();
		if (!project) return { ok: false, message: "No active project" };
		editor.project.setActiveProject({
			project: {
				...project,
				settings: {
					...project.settings,
					background:
						type === "blur"
							? {
									type: "blur",
									blurIntensity: asNumber(args.blurIntensity, 12),
								}
							: { type: "color", color: asString(args.color, "#000000") },
				},
			},
		});
		return { ok: true, message: `Background → ${type}` };
	},

	save_project: async (editor) => {
		try {
			await editor.project.saveCurrentProject();
			return { ok: true, message: "Project saved" };
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : "Save failed",
			};
		}
	},

	/* -------------------------------- scene ----------------------------- */
	create_scene: async (editor, args) => {
		const name = asString(args.name, "New scene");
		try {
			const id = await editor.scenes.createScene({
				name,
				isMain: asBool(args.isMain, false),
			});
			return { ok: true, message: `Created scene "${name}"`, data: { id } };
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : "createScene failed",
			};
		}
	},

	rename_scene: async (editor, args) => {
		const scene = editor.scenes.getActiveSceneOrNull();
		if (!scene) return { ok: false, message: "No active scene" };
		await editor.scenes.renameScene({
			sceneId: scene.id,
			name: asString(args.name, scene.name),
		});
		return { ok: true, message: `Renamed scene` };
	},

	add_bookmark: async (editor, args) => {
		const time = asNumber(args.time, 0);
		await editor.scenes.toggleBookmark({ time });
		return { ok: true, message: `Bookmark at ${time}` };
	},

	remove_bookmark: async (editor, args) => {
		const time = asNumber(args.time, 0);
		await editor.scenes.removeBookmark({ time });
		return { ok: true, message: `Removed bookmark` };
	},

	/* -------------------------------- track ----------------------------- */
	add_track: async (editor, args) => {
		const type = asString(args.type, "video") as
			| "video"
			| "text"
			| "audio"
			| "graphic"
			| "effect";
		const id = editor.timeline.addTrack({ type, index: asInt(args.index, -1) });
		return { ok: true, message: `Added ${type} track`, data: { id } };
	},

	remove_track: async (editor, args) => {
		editor.timeline.removeTrack({ trackId: asString(args.trackId) });
		return { ok: true, message: "Track removed" };
	},

	set_track_muted: async (editor, args) => {
		// The TrackMute command flips whatever the current state is. We
		// want an absolute setter, so we read first.
		const track = editor.timeline.getTrackById({
			trackId: asString(args.trackId),
		});
		if (!track) return { ok: false, message: "Track not found" };
		const isMuted = "muted" in track ? track.muted : false;
		const wantMuted = asBool(args.muted);
		if (isMuted !== wantMuted) {
			editor.timeline.toggleTrackMute({ trackId: asString(args.trackId) });
		}
		return { ok: true, message: wantMuted ? "Muted" : "Unmuted" };
	},

	set_track_visible: async (editor, args) => {
		const track = editor.timeline.getTrackById({
			trackId: asString(args.trackId),
		});
		if (!track) return { ok: false, message: "Track not found" };
		const isHidden = "hidden" in track ? track.hidden : false;
		const wantVisible = asBool(args.visible);
		if (isHidden === wantVisible) {
			editor.timeline.toggleTrackVisibility({
				trackId: asString(args.trackId),
			});
		}
		return { ok: true, message: wantVisible ? "Visible" : "Hidden" };
	},

	/* ------------------------------- element ----------------------------- */
	insert_text_element: async (editor, args) => {
		const { generateUUID } = await import("@/utils/id");
		const tracks = editor.scenes.getActiveScene().tracks;
		const playhead = editor.playback.getCurrentTime();
		const duration = secondsToTicks(args.durationSeconds, 5 * TICKS_PER_SECOND);
		const element = {
			id: generateUUID(),
			type: "text" as const,
			name: asString(args.name, "Text"),
			startTime: playhead,
			duration,
			trimStart: 0,
			trimEnd: 0,
			hidden: false,
			content: asString(args.content, "Text"),
			fontFamily: "Inter",
			fontSize: asNumber(args.fontSize, 48),
			fontWeight: "normal" as const,
			fontStyle: "normal" as const,
			textDecoration: "none" as const,
			textAlign: "center" as const,
			letterSpacing: 0,
			lineHeight: 1.2,
			color: asString(args.color, "#ffffff"),
			background: {
				enabled: false,
				color: "#000000",
				cornerRadius: 0,
				paddingX: 0,
				paddingY: 0,
				offsetX: 0,
				offsetY: 0,
			},
			transform: {
				scaleX: 1,
				scaleY: 1,
				position: { x: 0, y: 0 },
				rotate: 0,
			},
			opacity: 1,
		};
		// Use the caller's trackId if it is compatible with a text
		// element; otherwise fall back to "auto" placement, which
		// resolves to the first compatible text track (creating one
		// if none exists) — mirroring how the UI's text preset drag
		// works (apps/web/src/components/editor/panels/assets/views/text.tsx).
		const requestedTrackId = asString(args.trackId, "");
		const targetTrack = requestedTrackId
			? [tracks.main, ...tracks.overlay, ...tracks.audio].find(
					(track) => track.id === requestedTrackId,
				)
			: undefined;
		const isCompatible = targetTrack?.type === "text";
		editor.timeline.insertElement({
			element,
			placement: isCompatible
				? { mode: "explicit", trackId: requestedTrackId }
				: { mode: "auto" },
		});
		// After insertion, find the element the command actually placed
		// (the command may regenerate `id` to avoid collisions, and
		// "auto" mode may have inserted onto a different track than
		// the caller asked for). Return the real, on-timeline id so
		// downstream callers can address it.
		const afterTracks = editor.scenes.getActiveScene().tracks;
		const placed = [
			afterTracks.main,
			...afterTracks.overlay,
			...afterTracks.audio,
		]
			.flatMap((track) => track.elements as readonly TimelineElement[])
			.find(
				(candidate): candidate is TextElement =>
					candidate.type === "text" && candidate.id !== element.id,
			);
		return {
			ok: true,
			message: `Inserted text "${element.name}"`,
			data: { id: placed?.id ?? element.id },
		};
	},

	insert_camera_layer: async (editor) => {
		editor.timeline.insertCameraLayer();
		return { ok: true, message: "Inserted 3D camera layer" };
	},

	insert_null_layer: async (editor) => {
		editor.timeline.insertNullLayer();
		return { ok: true, message: "Inserted null layer" };
	},

	move_element: async (editor, args) => {
		editor.timeline.moveElement({
			sourceTrackId: asString(args.sourceTrackId),
			targetTrackId: asString(args.targetTrackId, asString(args.sourceTrackId)),
			elementId: asString(args.elementId),
			newStartTime: asNumber(args.newStartTime, 0),
		});
		return { ok: true, message: "Moved element" };
	},

	split_element: async (editor, args) => {
		const result = editor.timeline.splitElements({
			elements: [
				{
					trackId: asString(args.trackId),
					elementId: asString(args.elementId),
				},
			],
			splitTime: asNumber(args.time, 0),
			retainSide: asString(args.retainSide, "both") as
				| "both"
				| "left"
				| "right",
		});
		return { ok: true, message: "Split", data: { result } };
	},

	delete_elements: async (editor, args) => {
		const elements = asArray<ElementRef>(args.elements);
		if (elements.length === 0) return { ok: false, message: "No elements" };
		editor.timeline.deleteElements({ elements });
		return { ok: true, message: `Deleted ${elements.length} element(s)` };
	},

	update_element: async (editor, args) => {
		const trackId = asString(args.trackId);
		const elementId = asString(args.elementId);
		const patch: Record<string, unknown> = {};
		if (typeof args.startTime === "number") patch.startTime = args.startTime;
		if (typeof args.duration === "number") patch.duration = args.duration;
		if (typeof args.trimStart === "number") patch.trimStart = args.trimStart;
		if (typeof args.trimEnd === "number") patch.trimEnd = args.trimEnd;
		if (typeof args.opacity === "number") patch.opacity = args.opacity;
		if (typeof args.hidden === "boolean") patch.hidden = args.hidden;
		if (typeof args.customName === "string") patch.customName = args.customName;
		if (typeof args.content === "string") patch.content = args.content;
		if (typeof args.color === "string") patch.color = args.color;
		if (typeof args.fontSize === "number") patch.fontSize = args.fontSize;

		editor.timeline.updateElements({
			updates: [{ trackId, elementId, patch }],
			pushHistory: true,
		});
		return { ok: true, message: "Updated element" };
	},

	/* -------------------------------- effect ----------------------------- */
	add_clip_effect: async (editor, args) => {
		const id = editor.timeline.addClipEffect({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			effectType: asString(args.effectType),
		});
		return { ok: true, message: `Added effect`, data: { id } };
	},

	remove_clip_effect: async (editor, args) => {
		editor.timeline.removeClipEffect({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			effectId: asString(args.effectId),
		});
		return { ok: true, message: "Removed effect" };
	},

	update_clip_effect_params: async (editor, args) => {
		editor.timeline.updateClipEffectParams({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			effectId: asString(args.effectId),
			params: args.params ?? {},
		});
		return { ok: true, message: "Updated effect params" };
	},

	/* --------------------------------- mask ------------------------------ */
	remove_mask: async (editor, args) => {
		editor.timeline.removeMask({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			maskId: asString(args.maskId),
		});
		return { ok: true, message: "Removed mask" };
	},

	/* ------------------------------ keyframe ----------------------------- */
	upsert_keyframe: async (editor, args) => {
		const easing = asString(args.easing, "linear") as
			| "linear"
			| "hold"
			| "ease-in"
			| "ease-out"
			| "ease-in-out"
			| "custom-bezier"
			| "bounce"
			| "elastic"
			| "cyclic"
			| "random";
		// Direct file import — the index re-exports in lib/commands/timeline
		// only cover the track/* and the snapshot command, so we go to the
		// keyframes folder explicitly to keep the executor self-contained.
		const mod = await import(
			"@/lib/commands/timeline/element/keyframes/upsert-keyframe"
		);
		const cmd = new mod.UpsertKeyframeCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			propertyPath: asString(args.path) as never,
			time: asNumber(args.time, 0),
			value: asNumber(args.value, 0) as never,
			interpolation: easing as never,
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Keyframe upserted" };
	},

	remove_keyframe: async (editor, args) => {
		const trackId = asString(args.trackId);
		const elementId = asString(args.elementId);
		const path = asString(args.path);
		const time = asNumber(args.time, 0);

		// Find the keyframe at this time so we can pass the real
		// keyframeId to RemoveKeyframeCommand. The lookup walks the
		// element's animations graph, which is the canonical source
		// of truth for what's on the timeline.
		const track = editor.timeline.getTrackById({ trackId });
		const element = track?.elements.find((e) => e.id === elementId);
		// Pull `animations` off the element. The shape is dynamic
		// per-property; we narrow it where we read it.
		const rawAnimations = (element as unknown as { animations?: unknown })
			?.animations;
		const animations =
			rawAnimations && typeof rawAnimations === "object"
				? (rawAnimations as Record<
						string,
						{
							keyframes?: Array<{
								id: string;
								time: number;
								value: unknown;
							}>;
						}
					>)
				: undefined;
		const channel = animations?.[path];
		const keyframe = channel?.keyframes?.find(
			(k) => Math.abs(k.time - time) < 1,
		);
		if (!keyframe) {
			return { ok: false, message: "No keyframe at that time" };
		}

		const mod = await import(
			"@/lib/commands/timeline/element/keyframes/remove-keyframe"
		);
		const cmd = new mod.RemoveKeyframeCommand({
			trackId,
			elementId,
			propertyPath: path as never,
			keyframeId: keyframe.id,
			valueAtPlayhead: keyframe.value as never,
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Keyframe removed" };
	},

	/* ----------------------------- transition ---------------------------- */
	add_transition: async (editor, args) => {
		const { generateUUID } = await import("@/utils/id");
		const mod = await import("@/lib/commands/scene/transition");
		const cmd = new mod.AddTransitionCommand({
			id: generateUUID(),
			transitionType: asString(args.transitionType, "fade"),
			fromTrackId: asString(args.fromTrackId),
			fromElementId: asString(args.fromElementId),
			toTrackId: asString(args.toTrackId),
			toElementId: asString(args.toElementId),
			startTime: asNumber(args.startTime, 0),
			duration: asNumber(args.duration, TICKS_PER_SECOND),
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Added transition" };
	},

	/* ------------------------------ playback ----------------------------- */
	play: async (editor) => {
		editor.playback.play();
		return { ok: true, message: "Playing" };
	},
	pause: async (editor) => {
		editor.playback.pause();
		return { ok: true, message: "Paused" };
	},
	seek: async (editor, args) => {
		editor.playback.seek({ time: asNumber(args.time, 0) });
		return { ok: true, message: "Seeked" };
	},
	set_volume: async (editor, args) => {
		editor.playback.setVolume({ volume: asNumber(args.value, 1) });
		return { ok: true, message: "Volume updated" };
	},

	/* ------------------------------- assets ------------------------------ */
	import_asset_from_url: async (_editor, args) => {
		const url = asString(args.url);
		if (!url) return { ok: false, message: "url required" };
		try {
			const res = await fetch("/api/drive/import", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url }),
			});
			const data = await res.json();
			if (!data.ok) {
				return { ok: false, message: data.message ?? "Import failed" };
			}
			return {
				ok: true,
				message: `Imported ${data.fileName ?? "asset"}`,
				data,
			};
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : "Import failed",
			};
		}
	},

	list_assets: async (editor) => {
		const assets = editor.media.getAssets();
		return {
			ok: true,
			message: `${assets.length} assets`,
			data: {
				assets: assets.map((a) => ({
					id: a.id,
					name: a.name,
					type: a.type,
					duration: a.duration,
				})),
			},
		};
	},

	/* -------------------------------- style ------------------------------ */
	apply_preset: async (editor, args) => {
		const preset = asString(args.preset, "cinematic").toLowerCase();
		// Pragmatic preset → batch of operations. This intentionally
		// keeps the action set small while still doing useful work.
		const project = editor.project.getActive();
		if (!project) return { ok: false, message: "No active project" };

		const PRESETS: Record<
			string,
			{
				bg:
					| { type: "color"; color: string }
					| { type: "blur"; blurIntensity: number };
				intro: string;
			}
		> = {
			cinematic: {
				bg: { type: "blur", blurIntensity: 16 },
				intro: "21:9 letterbox bars + warm tone",
			},
			vlog: {
				bg: { type: "color", color: "#101010" },
				intro: "Snappy cuts at ~2s per shot",
			},
			documentary: {
				bg: { type: "color", color: "#0a0a0a" },
				intro: "Long takes, neutral grade",
			},
			music: {
				bg: { type: "blur", blurIntensity: 24 },
				intro: "Beat-synced cuts",
			},
			"social-vertical": {
				bg: { type: "color", color: "#000000" },
				intro: "9:16 punchy edits",
			},
		};
		const def = PRESETS[preset];
		if (!def) return { ok: false, message: `Unknown preset: ${preset}` };

		editor.project.setActiveProject({
			project: {
				...project,
				settings: { ...project.settings, background: def.bg },
			},
		});
		return { ok: true, message: `Applied preset "${preset}" (${def.intro})` };
	},

	/* -------------------------------- export ----------------------------- */
	export_project: async (editor, args) => {
		const format = asString(args.format, "mp4") as "mp4" | "webm" | "hevc";
		const quality = asString(args.quality, "high") as "low" | "medium" | "high";
		const includeAudio = args.includeAudio !== false;
		try {
			const result = await editor.project.export({
				options: { format, quality, includeAudio },
			});
			return {
				ok: result.success,
				message: result.success
					? "Exported"
					: (result.error ?? "Export failed"),
				data: result,
			};
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : "Export failed",
			};
		}
	},

	/* ------------------------------ history ----------------------------- */
	undo: async (editor) => {
		editor.command.undo();
		return { ok: true, message: "Undid last action" };
	},
	redo: async (editor) => {
		editor.command.redo();
		return { ok: true, message: "Redid last action" };
	},

	/* ----------------------------- selection ---------------------------- */
	select_elements: async (editor, args) => {
		const elements = asArray<ElementRef>(args.elements);
		if (elements.length === 0) return { ok: false, message: "No elements" };
		editor.selection.setSelectedElements({ elements });
		return { ok: true, message: `Selected ${elements.length} element(s)` };
	},
	clear_selection: async (editor) => {
		editor.selection.clearSelection();
		return { ok: true, message: "Selection cleared" };
	},

	/* ----------------------------- clipboard ---------------------------- */
	copy: async (editor) => {
		const ok = editor.clipboard.copy();
		return { ok, message: ok ? "Copied" : "Nothing to copy" };
	},
	paste: async (editor, args) => {
		const ok =
			typeof args.time === "number"
				? editor.clipboard.paste({ time: asNumber(args.time) })
				: editor.clipboard.paste();
		return { ok, message: ok ? "Pasted" : "Nothing to paste" };
	},

	/* -------------------------- scene (additional) ---------------------- */
	delete_scene: async (editor, args) => {
		await editor.scenes.deleteScene({ sceneId: asString(args.sceneId) });
		return { ok: true, message: "Scene deleted" };
	},
	switch_scene: async (editor, args) => {
		await editor.scenes.switchToScene({ sceneId: asString(args.sceneId) });
		return { ok: true, message: "Switched scene" };
	},

	/* ------------------------- element (grouping) ----------------------- */
	group_elements: async (editor, args) => {
		const elementRefs = asArray<ElementRef>(args.elements);
		if (elementRefs.length < 2) {
			return { ok: false, message: "Need at least 2 elements to group" };
		}
		const groupId = editor.timeline.groupElements({ elementRefs });
		return groupId
			? { ok: true, message: "Grouped elements", data: { groupId } }
			: { ok: false, message: "Could not group elements" };
	},
	ungroup_elements: async (editor, args) => {
		editor.timeline.ungroupElements({ groupId: asString(args.groupId) });
		return { ok: true, message: "Ungrouped" };
	},

	/* -------------------------- asset (folders) ------------------------- */
	create_folder: async (editor, args) => {
		const project = editor.project.getActive();
		if (!project) return { ok: false, message: "No active project" };
		const folder = await editor.media.createFolder({
			projectId: project.metadata.id,
			name: asString(args.name, "Untitled folder"),
		});
		return {
			ok: true,
			message: `Created folder "${folder.name}"`,
			data: { id: folder.id },
		};
	},
	move_asset_to_folder: async (editor, args) => {
		const folderId = args.folderId ? asString(args.folderId) : null;
		await editor.media.moveAssetToFolder({
			assetId: asString(args.assetId),
			folderId,
		});
		return {
			ok: true,
			message: folderId ? "Moved to folder" : "Moved to root",
		};
	},
};
