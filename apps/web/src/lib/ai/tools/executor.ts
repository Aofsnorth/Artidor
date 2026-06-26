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
import type { TextElement, TimelineElement } from "@/lib/timeline";
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
		const placed = editor.timeline.insertElement({
			element,
			placement: isCompatible
				? { mode: "explicit", trackId: requestedTrackId }
				: { mode: "auto" },
		});
		// insertElement returns the real on-timeline id + trackId the
		// command assigned (it regenerates the id and "auto" mode may
		// place on a different track than requested). Prefer those; fall
		// back to a post-insertion scan only if the command didn't report
		// them (defensive — should not normally happen).
		let elementId = placed?.elementId;
		let placedTrackId = placed?.trackId;
		if (!elementId) {
			const afterTracks = editor.scenes.getActiveScene().tracks;
			const found = [
				afterTracks.main,
				...afterTracks.overlay,
				...afterTracks.audio,
			]
				.flatMap((track) => track.elements as readonly TimelineElement[])
				.find(
					(candidate): candidate is TextElement =>
						candidate.type === "text" && candidate.id !== element.id,
				);
			elementId = found?.id ?? element.id;
		}
		if (!placedTrackId) {
			const afterTracks = editor.scenes.getActiveScene().tracks;
			const foundTrack = [
				afterTracks.main,
				...afterTracks.overlay,
				...afterTracks.audio,
			].find((track) =>
				track.elements.some((el) => el.id === elementId),
			);
			placedTrackId = foundTrack?.id;
		}
		return {
			ok: true,
			message: `Inserted text "${element.name}". elementId=${elementId}, trackId=${placedTrackId ?? "(unknown)"}. Use these IDs for follow-up edits.`,
			data: { id: elementId, elementId, trackId: placedTrackId },
		};
	},

	insert_camera_layer: async (editor) => {
		const placed = editor.timeline.insertCameraLayer();
		if (!placed) return { ok: false, message: "Failed to insert camera layer" };
		return {
			ok: true,
			message: `Inserted 3D camera layer. elementId=${placed.elementId}, trackId=${placed.trackId}.`,
			data: { elementId: placed.elementId, trackId: placed.trackId },
		};
	},

	insert_null_layer: async (editor) => {
		const placed = editor.timeline.insertNullLayer();
		if (!placed) return { ok: false, message: "No overlay track available" };
		return {
			ok: true,
			message: `Inserted null layer. elementId=${placed.elementId}, trackId=${placed.trackId}.`,
			data: { elementId: placed.elementId, trackId: placed.trackId },
		};
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
		const rightSide = editor.timeline.splitElements({
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
		const right = rightSide[0];
		return {
			ok: true,
			message: right
				? `Split at ${asNumber(args.time, 0)} ticks. Right half → elementId=${right.elementId}, trackId=${right.trackId}. Left half keeps the original elementId. Use these IDs for further trim/delete/move.`
				: `Split at ${asNumber(args.time, 0)} ticks (retainSide=${asString(args.retainSide, "both")}).`,
			data: { rightSide: rightSide },
		};
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

	list_elements: async (editor) => {
		const scene = editor.scenes.getActiveSceneOrNull();
		if (!scene) {
			return { ok: false, message: "No active scene" };
		}
		type ElSummary = {
			trackId: string;
			trackType: string;
			elementId: string;
			type: string;
			name: string;
			startTime: number;
			duration: number;
			trimStart: number;
			trimEnd: number;
			mediaId?: string;
		};
		const out: ElSummary[] = [];
		const collect = (
			trackId: string,
			trackType: string,
			elements: readonly TimelineElement[],
		) => {
			for (const el of elements) {
				out.push({
					trackId,
					trackType,
					elementId: el.id,
					type: el.type,
					name:
						(el as { customName?: string }).customName ??
						(el as { name?: string }).name ??
						"",
					startTime: el.startTime,
					duration: el.duration,
					trimStart: el.trimStart ?? 0,
					trimEnd: el.trimEnd ?? 0,
					mediaId: (el as { mediaId?: string }).mediaId,
				});
			}
		};
		collect(scene.tracks.main.id, scene.tracks.main.type, scene.tracks.main.elements);
		for (const t of scene.tracks.overlay) {
			collect(t.id, t.type, t.elements);
		}
		for (const t of scene.tracks.audio) {
			collect(t.id, t.type, t.elements);
		}
		if (out.length === 0) {
			return {
				ok: true,
				message: "Timeline is empty — no elements yet.",
				data: { elements: [] },
			};
		}
		const summary = out
			.map(
				(e) =>
					`${e.type} "${e.name}" elementId=${e.elementId} trackId=${e.trackId} (${e.trackType}) start=${e.startTime} dur=${e.duration} trim=${e.trimStart}-${e.trimEnd}`,
			)
			.join("\n");
		return {
			ok: true,
			message: `${out.length} element(s) on timeline:\n${summary}`,
			data: { elements: out },
		};
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

	web_fetch: async (_editor, args) => {
		const url = asString(args.url);
		if (!url) return { ok: false, message: "url is required" };
		try {
			const res = await fetch("/api/web/fetch", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url }),
			});
			const data = await res.json();
			if (!data.ok) {
				return {
					ok: false,
					message: data.error ?? "Failed to fetch page",
				};
			}
			return {
				ok: true,
				message: `Fetched ${url}`,
				data: {
					url: data.url,
					contentType: data.contentType,
					text: data.text,
					truncated: data.truncated,
				},
			};
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : "Fetch failed",
			};
		}
	},

	add_media_to_timeline: async (editor, args) => {
		const assetId = asString(args.assetId);
		if (!assetId) return { ok: false, message: "assetId required" };
		const assets = editor.media.getAssets();
		const asset = assets.find((a) => a.id === assetId);
		if (!asset) return { ok: false, message: "Asset not found" };

		const { buildElementFromMedia } = await import(
			"@/lib/timeline/element-utils"
		);
		const startTime =
			typeof args.startTime === "number"
				? asNumber(args.startTime)
				: editor.playback.getCurrentTime();
		const duration =
			asset.duration != null
				? Math.round(asset.duration * TICKS_PER_SECOND)
				: Math.round(5 * TICKS_PER_SECOND);

		const element = buildElementFromMedia({
			mediaId: asset.id,
			mediaType: asset.type,
			name: asset.name,
			duration,
			startTime,
		});

		// Snapshot element count before insertion so we can verify
		// the command actually placed the element (InsertElementCommand
		// can silently fail validation without throwing).
		const sceneBefore = editor.scenes.getActiveSceneOrNull();
		const countBefore = sceneBefore
			? sceneBefore.tracks.main.elements.length +
				sceneBefore.tracks.overlay.reduce(
					(n, t) => n + t.elements.length,
					0,
				) +
				sceneBefore.tracks.audio.reduce(
					(n, t) => n + t.elements.length,
					0,
				)
			: 0;

		const trackId = asString(args.trackId);
		const placed =
			trackId
				? editor.timeline.insertElement({
						element,
						placement: { mode: "explicit", trackId },
					})
				: editor.timeline.insertElement({
						element,
						placement: {
							mode: "auto",
							trackType: asset.type === "audio" ? "audio" : "video",
						},
					});

		// Verify the element was actually inserted — InsertElementCommand
		// can return undefined (silent validation failure) without throwing.
		const sceneAfter = editor.scenes.getActiveSceneOrNull();
		const countAfter = sceneAfter
			? sceneAfter.tracks.main.elements.length +
				sceneAfter.tracks.overlay.reduce(
					(n, t) => n + t.elements.length,
					0,
				) +
				sceneAfter.tracks.audio.reduce(
					(n, t) => n + t.elements.length,
					0,
				)
			: 0;

		if (countAfter <= countBefore || !placed) {
			return {
				ok: false,
				message: `Failed to add "${asset.name}" to timeline — the element may be incompatible with the target track. Try a different track or check the asset type.`,
			};
		}

		// Return the placed element's id + trackId so the LLM can chain
		// follow-up operations (trim, split, move, update) on the exact
		// clip it just added, plus the resolved timing fields it needs to
		// reason about trimming the "climax" portion etc.
		return {
			ok: true,
			message: `Added "${asset.name}" to timeline at ${startTime} ticks (duration ${duration}). elementId=${placed.elementId}, trackId=${placed.trackId}. Use these IDs for follow-up trim/split/move/update calls.`,
			data: {
				elementId: placed.elementId,
				trackId: placed.trackId,
				startTime,
				duration,
				trimStart: 0,
				trimEnd: 0,
				assetId: asset.id,
				assetType: asset.type,
			},
		};
	},

	import_and_add_to_timeline: async (editor, args) => {
		const url = asString(args.url);
		if (!url) return { ok: false, message: "url required" };
		// Step 1: import the asset.
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
			// Step 2: find the newly imported asset in the library.
			// The import endpoint returns fileName; we match by name.
			const assets = editor.media.getAssets();
			const fileName: string = data.fileName ?? "";
			const asset =
				assets.find((a) => a.name === fileName) ?? assets.at(-1);
			if (!asset) {
				return {
					ok: false,
					message: "Imported but asset not found in library",
				};
			}
			// Step 3: add to timeline.
			const { buildElementFromMedia } = await import(
				"@/lib/timeline/element-utils"
			);
			const startTime =
				typeof args.startTime === "number"
					? asNumber(args.startTime)
					: editor.playback.getCurrentTime();
			const duration =
				asset.duration != null
					? Math.round(asset.duration * TICKS_PER_SECOND)
					: Math.round(5 * TICKS_PER_SECOND);

			const element = buildElementFromMedia({
				mediaId: asset.id,
				mediaType: asset.type,
				name: asset.name,
				duration,
				startTime,
			});

			const trackId = asString(args.trackId);
			const placed =
				trackId
					? editor.timeline.insertElement({
							element,
							placement: { mode: "explicit", trackId },
						})
					: editor.timeline.insertElement({
							element,
							placement: {
								mode: "auto",
								trackType: asset.type === "audio" ? "audio" : "video",
							},
						});
			if (!placed) {
				return {
					ok: false,
					message: `Imported "${asset.name}" but failed to place it on the timeline.`,
				};
			}
			return {
				ok: true,
				message: `Imported and added "${asset.name}" to timeline at ${startTime} ticks (duration ${duration}). elementId=${placed.elementId}, trackId=${placed.trackId}. Use these IDs for follow-up trim/split/move/update calls.`,
				data: {
					assetId: asset.id,
					elementId: placed.elementId,
					trackId: placed.trackId,
					startTime,
					duration,
				},
			};
		} catch (err) {
			return {
				ok: false,
				message: err instanceof Error ? err.message : "Import failed",
			};
		}
	},

	/* ------------------------------- capture ----------------------------- */
	capture_frame: async (editor) => {
		const result = await editor.renderer.captureFrameAsDataURL();
		if (!result.success || !result.dataUrl) {
			return {
				ok: false,
				message: result.error ?? "Failed to capture frame",
			};
		}
		// Return the data URL. The AI manager will detect this and
		// attach it as a vision input to the next LLM request.
		return {
			ok: true,
			message: "Frame captured (PNG, base64)",
			data: { dataUrl: result.dataUrl, mimeType: "image/png" },
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
	"copy-style": async (editor) => {
		const ok = editor.clipboard.copyStyle();
		return { ok, message: ok ? "Style copied" : "Nothing to copy style from" };
	},
	"paste-style": async (editor) => {
		const ok = editor.clipboard.pasteStyle();
		return {
			ok,
			message: ok ? "Style pasted" : "Nothing to paste style onto",
		};
	},
	"copy-effect": async (editor, args) => {
		const effectType = asString(args.effectType);
		// The effect entry on the clipboard is { type, params, enabled }.
		// We don't have a params map at copy-time from the user; the
		// clipboard manager fills in defaults from the registry, then
		// callers (the inspector / AI agent) can override later.
		const ok = editor.clipboard.copyEffect({
			type: effectType,
			params: {},
			enabled: true,
		});
		return { ok, message: ok ? "Effect copied" : "Failed to copy effect" };
	},
	"paste-effect": async (editor) => {
		const ok = editor.clipboard.pasteEffect();
		return {
			ok,
			message: ok ? "Effect pasted" : "Nothing to paste effect onto",
		};
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

	/* ----------------------- element (advanced) -------------------------- */
	duplicate_elements: async (editor, args) => {
		const elements = asArray<ElementRef>(args.elements);
		if (elements.length === 0)
			return { ok: false, message: "No elements to duplicate" };
		const copies = editor.timeline.duplicateElements({ elements });
		return {
			ok: true,
			message: `Duplicated ${copies.length} element(s)`,
			data: { copies },
		};
	},

	toggle_source_audio_separation: async (editor, args) => {
		editor.timeline.toggleSourceAudioSeparation({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
		});
		return { ok: true, message: "Toggled audio separation" };
	},

	set_parent: async (editor, args) => {
		const ref: ElementRef = {
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
		};
		const parentId = args.parentId ? asString(args.parentId) : undefined;
		editor.timeline.setParent({ ref, parentId });
		return {
			ok: true,
			message: parentId ? "Parent set" : "Parent removed",
		};
	},

	unlink_parent: async (editor, args) => {
		editor.timeline.unlinkParent({
			ref: {
				trackId: asString(args.trackId),
				elementId: asString(args.elementId),
			},
		});
		return { ok: true, message: "Parent unlinked" };
	},

	combine_elements: async (editor, args) => {
		const elementRefs = asArray<ElementRef>(args.elements);
		if (elementRefs.length < 2)
			return { ok: false, message: "Need 2+ elements to combine" };
		const resultId = editor.timeline.combineElements({ elementRefs });
		return resultId
			? { ok: true, message: "Combined elements", data: { id: resultId } }
			: { ok: false, message: "Could not combine (not adjacent?)" };
	},

	/* ------------------------- transition (extra) ------------------------ */
	remove_transition: async (editor, args) => {
		const mod = await import("@/lib/commands/scene/transition");
		const cmd = new mod.RemoveTransitionCommand(asString(args.transitionId));
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Transition removed" };
	},

	update_transition: async (editor, args) => {
		const mod = await import("@/lib/commands/scene/transition");
		const patch: Record<string, unknown> = {};
		if (typeof args.transitionType === "string")
			patch.transitionType = args.transitionType;
		if (typeof args.startTime === "number") patch.startTime = args.startTime;
		if (typeof args.duration === "number") patch.duration = args.duration;
		const cmd = new mod.UpdateTransitionCommand(
			asString(args.transitionId),
			patch as never,
		);
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Transition updated" };
	},

	/* --------------------------- effect (extra) -------------------------- */
	toggle_effect_enabled: async (editor, args) => {
		const mod = await import(
			"@/lib/commands/timeline/element/effects/toggle-effect"
		);
		const cmd = new mod.ToggleClipEffectCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			effectId: asString(args.effectId),
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Effect toggled" };
	},

	reorder_effects: async (editor, args) => {
		const mod = await import(
			"@/lib/commands/timeline/element/effects/reorder-effect"
		);
		const cmd = new mod.ReorderClipEffectsCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			fromIndex: asInt(args.fromIndex),
			toIndex: asInt(args.toIndex),
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Effects reordered" };
	},

	/* ---------------------------- mask (extra) --------------------------- */
	toggle_mask_inverted: async (editor, args) => {
		const mod = await import(
			"@/lib/commands/timeline/element/masks/toggle-mask-inverted"
		);
		const cmd = new mod.ToggleMaskInvertedCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			maskId: asString(args.maskId),
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Mask inversion toggled" };
	},

	/* -------------------------- keyframe (extra) ------------------------- */
	retime_keyframe: async (editor, args) => {
		const mod = await import(
			"@/lib/commands/timeline/element/keyframes/retime-keyframe"
		);
		const cmd = new mod.RetimeKeyframeCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			propertyPath: asString(args.path) as never,
			keyframeId: asString(args.keyframeId),
			nextTime: asNumber(args.newTime, 0),
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Keyframe retimed" };
	},

	upsert_effect_param_keyframe: async (editor, args) => {
		const mod = await import(
			"@/lib/commands/timeline/element/keyframes/upsert-effect-param-keyframe"
		);
		const cmd = new mod.UpsertEffectParamKeyframeCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			effectId: asString(args.effectId),
			paramKey: asString(args.paramKey),
			time: asNumber(args.time, 0),
			value: args.value as never,
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Effect param keyframe upserted" };
	},

	remove_effect_param_keyframe: async (editor, args) => {
		const mod = await import(
			"@/lib/commands/timeline/element/keyframes/remove-effect-param-keyframe"
		);
		const cmd = new mod.RemoveEffectParamKeyframeCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			effectId: asString(args.effectId),
			paramKey: asString(args.paramKey),
			keyframeId: asString(args.keyframeId),
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Effect param keyframe removed" };
	},

	/* ---------------------------- asset (extra) -------------------------- */
	delete_asset: async (editor, args) => {
		const project = editor.project.getActive();
		if (!project) return { ok: false, message: "No active project" };
		editor.media.removeMediaAsset({
			projectId: project.metadata.id,
			id: asString(args.assetId),
		});
		return { ok: true, message: "Asset deleted" };
	},

	rename_folder: async (editor, args) => {
		await editor.media.renameFolder({
			id: asString(args.folderId),
			name: asString(args.name, "Untitled"),
		});
		return { ok: true, message: "Folder renamed" };
	},

	delete_folder: async (editor, args) => {
		await editor.media.deleteFolder({ id: asString(args.folderId) });
		return { ok: true, message: "Folder deleted" };
	},

	/* ------------------------- clipboard (extra) ------------------------- */
	paste_keyframes: async (editor, args) => {
		const mod = await import(
			"@/lib/commands/timeline/clipboard/paste-keyframes"
		);
		const cmd = new mod.PasteKeyframesCommand({
			trackId: asString(args.trackId),
			elementId: asString(args.elementId),
			time: asNumber(args.time, 0),
			clipboardItems: [],
		});
		dispatchCommand(editor, () => editor.command.execute({ command: cmd }));
		return { ok: true, message: "Keyframes pasted" };
	},
};
