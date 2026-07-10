import { PlaybackManager } from "./managers/playback-manager";
import { TimelineManager } from "./managers/timeline-manager";
import { ScenesManager } from "./managers/scenes-manager";
import { ProjectManager } from "./managers/project-manager";
import { MediaManager } from "./managers/media-manager";
import { RendererManager } from "./managers/renderer-manager";
import { CommandManager } from "./managers/commands";
import { SaveManager } from "./managers/save-manager";
import { AudioManager } from "./managers/audio-manager";
import { SelectionManager } from "./managers/selection-manager";
import { ClipboardManager } from "./managers/clipboard-manager";
import { DiagnosticsManager } from "./managers/diagnostics-manager";
import { TeleprompterManager } from "./managers/teleprompter-manager";
import { AIManager } from "./managers/ai-manager";
import { CollabManager } from "./managers/collab-manager";
import { registerDefaultEffects } from "@/lib/effects";
import { registerDefaultMasks } from "@/lib/masks";
import { registerDefaultTransitions } from "@/lib/transitions";
import { registerDefaultAnimationPresets } from "@/lib/animation/presets";
import { registerTranscriptionDiagnostics } from "@/lib/transcription/diagnostics";
import { attachTelemetryToCommands } from "@/lib/ai/telemetry/store";
import { createEditorApi, type EditorApi } from "@/lib/api/editor-api";
import { useSavePresetDialogStore } from "@/stores/save-preset-dialog-store";
import { useToolModeStore } from "@/stores/tool-mode-store";
import { generateUUID } from "@/utils/id";

export class EditorCore {
	private static instance: EditorCore | null = null;
	public readonly timeline: TimelineManager;
	public readonly command: CommandManager;
	public readonly playback: PlaybackManager;
	public readonly scenes: ScenesManager;
	public readonly project: ProjectManager;
	public readonly media: MediaManager;
	public readonly renderer: RendererManager;
	public readonly save: SaveManager;
	public readonly audio: AudioManager;
	public readonly selection: SelectionManager;
	public readonly clipboard: ClipboardManager;
	public readonly diagnostics: DiagnosticsManager;
	public readonly teleprompter: TeleprompterManager;
	public readonly ai: AIManager;
	public readonly collab: CollabManager;
	/** Public, framework-free command API (Scripting tab / bridge / MCP). */
	public readonly api: EditorApi;

	private constructor() {
		registerDefaultEffects();
		registerDefaultMasks();
		registerDefaultTransitions();
		registerDefaultAnimationPresets();
		this.command = new CommandManager(this);
		this.timeline = new TimelineManager(this);
		this.playback = new PlaybackManager(this);
		this.scenes = new ScenesManager(this);
		this.project = new ProjectManager(this);
		this.media = new MediaManager(this);
		this.renderer = new RendererManager(this);
		this.save = new SaveManager(this);
		this.audio = new AudioManager(this);
		this.selection = new SelectionManager(this);
		this.clipboard = new ClipboardManager(this);
		this.diagnostics = new DiagnosticsManager(this);
		this.teleprompter = new TeleprompterManager(this);
		this.ai = new AIManager(this);
		this.collab = new CollabManager(this);
		this.api = createEditorApi(this);
		registerTranscriptionDiagnostics({ diagnostics: this.diagnostics });
		this.playback.bindTimelineScope();
		// Tracks that have held at least one element at some point. An empty
		// lane is only "dead" (safe to prune) if it once had a clip and then
		// lost it — e.g. the user dragged the last element out. A track the
		// user just created has never been in this set, so it survives until
		// they actually use it. This is what makes "Add track" stick and lets
		// a still-empty track be hidden / renamed without vanishing on the
		// very next command (the previous prune nuked every empty lane, so
		// any action after adding a track silently deleted it again).
		const tracksThatHeldElements = new Set<string>();
		this.command.registerReactor(() => {
			const activeScene = this.scenes.getActiveSceneOrNull();
			if (!activeScene) {
				return;
			}

			const tracks = activeScene.tracks;
			for (const track of [...tracks.overlay, ...tracks.audio]) {
				if (track.elements.length > 0) {
					tracksThatHeldElements.add(track.id);
				}
			}

			const isDeadLane = (track: { id: string; elements: unknown[] }) =>
				track.elements.length === 0 && tracksThatHeldElements.has(track.id);

			const prunedTracks = {
				...tracks,
				overlay: tracks.overlay.filter((track) => !isDeadLane(track)),
				audio: tracks.audio.filter((track) => !isDeadLane(track)),
			};
			if (
				prunedTracks.overlay.length !== tracks.overlay.length ||
				prunedTracks.audio.length !== tracks.audio.length
			) {
				this.timeline.updateTracks(prunedTracks);
			}
		});
		this.save.start();
		// Self-improvement: route every command execution through the
		// telemetry store. This runs in the browser (no network) and is
		// what powers the AI's "match the user's recent style" prompt.
		if (typeof window !== "undefined") {
			attachTelemetryToCommands();
			// Expose the public command API on the live editor tab so scripts,
			// other same-origin tabs, and the MCP relay can drive the editor.
			window.__ARTIDOR_API__ = this.api; // Dev-only: expose a read-only snapshot of the live editor state so
			// end-to-end tests (Playwright) and the in-browser console can
			// inspect tracks / elements / selection without re-implementing
			// the entire state-walking logic. Tree-shaken out of prod builds
			// because `process.env.NODE_ENV` is statically replaced to
			// `"production"` at build time.
			if (process.env.NODE_ENV !== "production") {
				const insertMockVideo = (opts?: {
					durationSeconds?: number;
				}): string => {
					const TICKS_PER_SECOND = 120_000;
					const duration = (opts?.durationSeconds ?? 5) * TICKS_PER_SECOND;
					const element = {
						id: generateUUID(),
						type: "video" as const,
						name: "Mock Video",
						startTime: 0,
						duration,
						trimStart: 0,
						trimEnd: 0,
						hidden: false,
						mediaId: undefined,
						sourceUrl: "",
						transform: {
							scaleX: 1,
							scaleY: 1,
							position: { x: 0, y: 0 },
							rotate: 0,
						},
						opacity: 1,
					};
					const tracks = this.scenes.getActiveScene().tracks;
					this.timeline.insertElement({
						element: element as never,
						placement: { mode: "explicit", trackId: tracks.main.id },
					});
					const afterTracks = this.scenes.getActiveScene().tracks;
					const placed = afterTracks.main.elements.at(-1);
					return placed?.id ?? element.id;
				};
				window.__ARTIDOR_DEBUG__ = {
					getState: (): {
						activeSceneId: string | null;
						tracks: {
							main: { id: string; name: string; elementCount: number };
							overlay: { id: string; name: string; elementCount: number }[];
							audio: { id: string; name: string; elementCount: number }[];
						} | null;
						elements: Array<{
							id: string;
							trackId: string;
							type: string;
							name: string;
						}>;
					} => {
						const scene = this.scenes.getActiveSceneOrNull();
						if (!scene) {
							return {
								activeSceneId: null,
								tracks: null,
								elements: [],
							};
						}
						const allElements: Array<{
							id: string;
							trackId: string;
							type: string;
							name: string;
						}> = [];
						const collect = (track: {
							id: string;
							elements: Array<{ id: string; type: string; name: string }>;
						}) => {
							for (const el of track.elements) {
								allElements.push({
									id: el.id,
									trackId: track.id,
									type: el.type,
									name: el.name,
								});
							}
						};
						collect(scene.tracks.main);
						scene.tracks.overlay.forEach(collect);
						scene.tracks.audio.forEach(collect);
						return {
							activeSceneId: scene.id,
							tracks: {
								main: {
									id: scene.tracks.main.id,
									name: scene.tracks.main.name,
									elementCount: scene.tracks.main.elements.length,
								},
								overlay: scene.tracks.overlay.map((t) => ({
									id: t.id,
									name: t.name,
									elementCount: t.elements.length,
								})),
								audio: scene.tracks.audio.map((t) => ({
									id: t.id,
									name: t.name,
									elementCount: t.elements.length,
								})),
							},
							elements: allElements,
						};
					},
					/**
					 * Test-only helper. Inserts a synthetic video
					 * element onto the main track so E2E tests can
					 * drive retime / speed / frame-interpolation
					 * without an actual media upload. Returns the
					 * new element id. The element has no mediaId,
					 * so the renderer just skips it; the inspector
					 * treats it like any other retimable element.
					 */
					insertMockVideo,
					insertMockVideos: (
						count: number,
						opts?: { durationSeconds?: number },
					): void => {
						for (let i = 0; i < count; i++) {
							insertMockVideo(opts);
						}
					},
					/**
					 * Test-only: open the "Save to preset" dialog with
					 * the given elements pre-selected. The timeline
					 * right-click menu (the user-facing entry point)
					 * calls into the same `useSavePresetDialogStore`
					 * under the hood, so reaching it through the
					 * store proves the post-conditions the menu
					 * item is supposed to deliver.
					 */
					openSavePresetDialog: (input: {
						elements: Array<{ trackId: string; elementId: string }>;
						defaultName: string;
					}): void => {
						useSavePresetDialogStore.getState().openDialog(input);
					},
					/**
					 * Test-only: set the editor's tool mode
					 * (`select` | `draw` | `vector`) so tests can
					 * drive the freehand / vector flows without
					 * having to click the (DOM-shifting) preview
					 * toolbar buttons.
					 */
					setToolMode: (mode: "select" | "draw" | "vector"): void => {
						useToolModeStore.getState().setToolMode(mode);
					},
				};
			}
		}
	}

	static getInstance(): EditorCore {
		if (!EditorCore.instance) {
			EditorCore.instance = new EditorCore();
		}
		return EditorCore.instance;
	}

	static reset(): void {
		EditorCore.instance = null;
	}
}
