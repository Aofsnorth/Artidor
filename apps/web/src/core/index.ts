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
import { registerDefaultEffects } from "@/lib/effects";
import { registerDefaultMasks } from "@/lib/masks";
import { registerDefaultTransitions } from "@/lib/transitions";
import { registerDefaultAnimationPresets } from "@/lib/animation/presets";
import { registerTranscriptionDiagnostics } from "@/lib/transcription/diagnostics";
import { AddTrackCommand } from "@/lib/commands/timeline/track/add-track";

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
		registerTranscriptionDiagnostics({ diagnostics: this.diagnostics });
		this.playback.bindTimelineScope();
		this.command.registerReactor((command) => {
			// Empty tracks are normally pruned after each command so the
			// timeline doesn't accumulate dead lanes. But adding a track
			// is the one case where an empty lane is intentional — the
			// user just asked for it and hasn't dropped a clip yet. Skip
			// the prune for AddTrackCommand so the new track survives.
			if (command instanceof AddTrackCommand) {
				return;
			}

			const activeScene = this.scenes.getActiveSceneOrNull();
			if (!activeScene) {
				return;
			}

			const tracks = activeScene.tracks;
			const prunedTracks = {
				...tracks,
				overlay: tracks.overlay.filter((track) => track.elements.length > 0),
				audio: tracks.audio.filter((track) => track.elements.length > 0),
			};
			if (
				prunedTracks.overlay.length !== tracks.overlay.length ||
				prunedTracks.audio.length !== tracks.audio.length
			) {
				this.timeline.updateTracks(prunedTracks);
			}
		});
		this.save.start();
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
