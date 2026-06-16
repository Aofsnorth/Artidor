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
import { registerDefaultEffects } from "@/lib/effects";
import { registerDefaultMasks } from "@/lib/masks";
import { registerDefaultTransitions } from "@/lib/transitions";
import { registerDefaultAnimationPresets } from "@/lib/animation/presets";
import { registerTranscriptionDiagnostics } from "@/lib/transcription/diagnostics";
import { attachTelemetryToCommands } from "@/lib/ai/telemetry/store";

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
