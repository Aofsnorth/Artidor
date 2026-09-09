/**
 * Media command regressions (editor-100-pass, commands scope): the fps
 * ratchet on add-asset undo. Only the EditorCore singleton boundary is
 * mocked (pattern: lib/commands/timeline/track/remove-track.test.ts).
 */
import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { FrameRate } from "artidor-wasm";
import type { MediaAsset } from "@/lib/media/types";
import { buildSceneTracks } from "@/tests/factories/editor";

let assets: MediaAsset[] = [];
let projectFps: FrameRate = { numerator: 30, denominator: 1 };

// storageService must never touch real browser storage in tests.
const storageMock = {
	saveMediaAsset: mock(async () => {}),
	deleteMediaAsset: mock(async () => {}),
};
mock.module("@/services/storage/service", () => ({
	storageService: storageMock,
}));

const editorMock = {
	scenes: {
		getActiveScene: () => ({ tracks: buildSceneTracks() }),
		getActiveSceneOrNull: () => ({ tracks: buildSceneTracks() }),
	},
	selection: {
		getSelectedElements: () => [],
		setSelectedElements: () => {},
	},
	// The real UpdateProjectSettingsCommand calls editor.save.markDirty().
	save: { markDirty: () => {} },
	media: {
		getAssets: () => assets,
		setAssets: ({ assets: next }: { assets: MediaAsset[] }) => {
			assets = next;
		},
	},
	project: {
		getActiveOrNull: () => ({ settings: { fps: projectFps } }),
		getActive: () => ({
			settings: { fps: projectFps },
			metadata: { updatedAt: new Date() },
		}),
		ratchetFpsForImportedMedia({
			importedAssets,
		}: {
			importedAssets: MediaAsset[];
		}): FrameRate {
			const fpsValues = importedAssets
				.filter((asset) => asset.type === "video" && asset.fps)
				.map((asset) => asset.fps as number);
			const highest = Math.max(0, ...fpsValues);
			if (highest > 0) {
				// Simplified float→FrameRate for the test rates used here.
				projectFps =
					highest === 60
						? { numerator: 60, denominator: 1 }
						: { numerator: 30, denominator: 1 };
			}
			return projectFps;
		},
		// The real UpdateProjectSettingsCommand applies fps through here.
		setActiveProject: ({
			project,
		}: {
			project: { settings: { fps: FrameRate } };
		}) => {
			if (project.settings.fps) projectFps = project.settings.fps;
		},
	},
} as unknown as EditorCore;

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => editorMock },
}));

const { CommandManager } = await import("@/core/managers/commands");
const { AddMediaAssetCommand } = await import("../media/add-media-asset");

afterAll(() => {
	mock.restore();
});

beforeEach(() => {
	assets = [];
	projectFps = { numerator: 30, denominator: 1 };
	storageMock.saveMediaAsset.mockClear();
	storageMock.deleteMediaAsset.mockClear();
});

function buildVideoAsset(fps: number): Omit<MediaAsset, "id"> {
	return {
		name: `video-${fps}fps`,
		type: "video",
		file: new File([], "video.mp4"),
		fps,
		width: 1920,
		height: 1080,
	};
}

test("undo lowers the fps the import ratcheted when nothing justifies it", () => {
	const manager = new CommandManager(editorMock);

	const command = new AddMediaAssetCommand("project-1", buildVideoAsset(60));
	manager.execute({ command });

	// The import raised the project fps to 60.
	expect(projectFps).toEqual({ numerator: 60, denominator: 1 });
	expect(assets).toHaveLength(1);

	// Undo removes the asset and must restore the pre-import fps.
	manager.undo();
	expect(assets).toHaveLength(0);
	expect(projectFps).toEqual({ numerator: 30, denominator: 1 });
});

test("undo keeps 30fps when the remaining asset did not cause the raise", () => {
	const manager = new CommandManager(editorMock);

	// First import: 30fps video into a 30fps project (no change).
	manager.execute({
		command: new AddMediaAssetCommand("project-1", buildVideoAsset(30)),
	});
	// Second import: 60fps video raises the project to 60.
	manager.execute({
		command: new AddMediaAssetCommand("project-1", buildVideoAsset(60)),
	});
	expect(projectFps).toEqual({ numerator: 60, denominator: 1 });

	// Undo ONLY the 60fps import: the 30fps asset remains, which does NOT
	// justify 60fps → fps lowers to 30 again.
	manager.undo();
	expect(assets).toHaveLength(1);
	expect(projectFps).toEqual({ numerator: 30, denominator: 1 });
});

test("add-media-asset undo of a no-ratchet import leaves fps untouched", () => {
	const manager = new CommandManager(editorMock);

	// Project is 30fps; a 24fps video does not raise it (ratchet only up).
	const command = new AddMediaAssetCommand("project-1", buildVideoAsset(24));
	manager.execute({ command });
	expect(projectFps).toEqual({ numerator: 30, denominator: 1 });

	manager.undo();
	// No ratchet happened, so undo must not have touched the fps either.
	expect(projectFps).toEqual({ numerator: 30, denominator: 1 });
});
