import { afterEach, describe, expect, mock, test } from "bun:test";

/**
 * media-bughunt-2 R05/R06/R14: insert-batch undo shape, teleprompter
 * manager routing, caption tick rounding.
 *
 * EditorCore is mocked at the module boundary (same pattern as
 * core/managers/commands-100-pass-owned.test.ts) so no DOM is needed.
 */
type Track = { id: string; type: string; name: string; elements: unknown[] };
type Tracks = {
	overlay: Track[];
	main: Track;
	overlayAfter: Track[];
	audio: Track[];
};

function emptyTracks(): Tracks {
	return {
		overlay: [],
		main: { id: "main", type: "video", name: "Main", elements: [] },
		overlayAfter: [],
		audio: [],
	};
}

const executedBatches: Array<{ names: string[] }> = [];

// insert.ts pulls Add/Insert/Remove commands from the @/lib/commands barrel,
// which transitively imports sonner (DOM CSS injection). Stub the three
// sibling command modules with minimal fakes so this suite stays DOM-free;
// the assertion target is the BATCH SHAPE (rename included), not the
// commands' own execute() logic (covered by their owners' suites).
const executedInner: Array<{ constructor: { name: string } }> = [];
// Shared mutable scene state so fakes behave like the real commands
// without importing the real (DOM-touching) command graph.
const fakeWorld = {
	tracks: emptyTracks(),
};
class FakeCommand {
	execute() {
		executedInner.push(this);
	}
	undo() {}
	redo() {
		return undefined;
	}
}
// Fakes mirror the REAL commands' track effects (add/remove/rename) so
// the test observes the post-batch track state exactly as production would.
// NOTE: fake classes intentionally reuse the REAL command names — the R05
// assertion checks the batch contains an "UpdateTrackCommand" entry.
class AddTrackCommand extends FakeCommand {
	private trackId = `track-${Math.random().toString(36).slice(2)}`;
	getTrackId() {
		return this.trackId;
	}
	override execute() {
		super.execute();
		fakeWorld.tracks = {
			...fakeWorld.tracks,
			overlay: [
				...fakeWorld.tracks.overlay,
				{ id: this.trackId, type: "text", name: "New track", elements: [] },
			],
		};
	}
}
class InsertElementCommand extends FakeCommand {}
class RemoveTrackCommand extends FakeCommand {}
class UpdateTrackCommand extends FakeCommand {
	constructor(private params: { trackId: string; updates: { name: string } }) {
		super();
	}
	override execute() {
		super.execute();
		fakeWorld.tracks = {
			...fakeWorld.tracks,
			overlay: fakeWorld.tracks.overlay.map((t) =>
				t.id === this.params.trackId
					? { ...t, name: this.params.updates.name }
					: t,
			),
		};
	}
}
class BatchCommand extends FakeCommand {
	constructor(public commands: FakeCommand[]) {
		super();
	}
	override execute() {
		super.execute();
		for (const c of this.commands) c.execute();
	}
}

mock.module("@/lib/commands", () => ({
	AddTrackCommand,
	BatchCommand,
	InsertElementCommand,
	RemoveTrackCommand,
}));
mock.module("@/lib/commands/timeline/track/update-track", () => ({
	UpdateTrackCommand,
}));

// insert.ts uses the PASSED editor (not the singleton) for scene reads;
// the singleton mock below only serves the fake commands' internals.
const passedEditor = {
	scenes: { getActiveScene: () => ({ tracks: fakeWorld.tracks }) },
	project: {
		getActive: () => ({
			settings: { canvasSize: { width: 1920, height: 1080 } },
		}),
	},
	command: {
		execute: ({ command }: { command: FakeCommand }) => {
			const batch = command as unknown as BatchCommand;
			executedBatches.push({
				names: batch.commands.map((c) => c.constructor.name),
			});
			batch.execute();
		},
	},
	timeline: {
		updateTracks: (next: Tracks) => {
			fakeWorld.tracks = next;
		},
	},
};

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => passedEditor },
}));

const { insertCaptionChunksAsTextTrack } = await import("./insert");

// The canvas stub below is set per-test; restore afterwards so a leaked
// global document can't break other suites sharing the bun process
// (e.g. sonner's CSS injection in media suites).
afterEach(() => {
	const g = globalThis as unknown as { document?: unknown };
	delete g.document;
});

describe("caption insert bughunt-2 regressions", () => {
	test("R05: batch contains rename command (single-step undo covers rename)", () => {
		// Builder measures via canvas when available; null context is an
		// explicit fallback path (positions default to 0,0).
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ getContext: () => null, width: 0, height: 0 }),
		};
		fakeWorld.tracks = emptyTracks();
		executedBatches.length = 0;
		insertCaptionChunksAsTextTrack({
			editor: passedEditor as never,
			captions: [{ text: "hi", startTime: 0, duration: 1 }],
		});
		expect(executedBatches).toHaveLength(1);
		expect(executedBatches[0]?.names).toContain("UpdateTrackCommand");
		const track = fakeWorld.tracks.overlay[0];
		expect(track?.name).toBe("Captions");
	});

	test("R14: fractional seconds round to whole ticks", async () => {
		const { buildSubtitleTextElement } = await import(
			"./build-subtitle-text-element"
		);
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ getContext: () => null, width: 0, height: 0 }),
		};
		const element = buildSubtitleTextElement({
			index: 0,
			caption: { text: "x", startTime: 1 / 120000, duration: 0.000001 },
			canvasSize: { width: 1920, height: 1080 },
		});
		expect(Number.isInteger(element.startTime)).toBe(true);
		expect(element.duration).toBeGreaterThanOrEqual(1);
	});
});
