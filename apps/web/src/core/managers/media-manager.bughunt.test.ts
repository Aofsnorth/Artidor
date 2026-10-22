import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import type { EditorCore } from "@/core";
import type { MediaAsset } from "@/lib/media/types";
import * as realStorage from "@/services/storage/service";

let loadAllMedia: (args: { projectId: string }) => Promise<MediaAsset[]> =
	async () => [];
let saveMedia: (args: {
	projectId: string;
	mediaAsset: MediaAsset;
}) => Promise<void> = async () => {};

mock.module("@/services/storage/service", () => ({
	...realStorage,
	storageService: {
		...realStorage.storageService,
		loadAllMediaAssets: (args: { projectId: string }) => loadAllMedia(args),
		saveMediaAsset: (args: { projectId: string; mediaAsset: MediaAsset }) =>
			saveMedia(args),
		deleteMediaAsset: async () => {},
		isQuotaExceededError: () => false,
	},
}));

const { MediaManager } = await import("./media-manager");

function asset({
	id,
	url,
	thumbnailUrl,
}: {
	id: string;
	url?: string;
	thumbnailUrl?: string;
}): MediaAsset {
	return {
		id,
		name: id,
		type: "video",
		file: new File([], `${id}.mp4`),
		url,
		thumbnailUrl,
	};
}

function buildEditor() {
	const editor = {
		project: {
			ratchetFpsForImportedMedia: () => null,
		},
	} as unknown as EditorCore;
	return { editor, manager: new MediaManager(editor) };
}

let revoke: ReturnType<typeof spyOn>;

beforeEach(() => {
	loadAllMedia = async () => [];
	saveMedia = async () => {};
	revoke = spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
	revoke.mockRestore();
});

test("STORE-13: replacing assets revokes the previous object URLs", async () => {
	const { manager } = buildEditor();
	const first = asset({ id: "a", url: "blob:a" });
	loadAllMedia = async () => [first];
	await manager.loadProjectMedia({ projectId: "p" });

	const second = asset({ id: "b", url: "blob:b" });
	loadAllMedia = async () => [second];
	await manager.loadProjectMedia({ projectId: "p" });

	expect(manager.getAssets()).toEqual([second]);
	expect(revoke).toHaveBeenCalledWith("blob:a");
});

test("STORE-13: a stale load cannot overwrite newer assets and releases its URLs", async () => {
	const { manager } = buildEditor();
	const pending = new Map<
		string,
		(resolve: (assets: MediaAsset[]) => void) => void
	>();
	loadAllMedia = ({ projectId }) =>
		new Promise((resolve) => {
			pending.set(projectId, resolve);
		});

	const staleLoad = manager.loadProjectMedia({ projectId: "old" });
	const freshLoad = manager.loadProjectMedia({ projectId: "new" });

	const fresh = asset({ id: "fresh", url: "blob:fresh" });
	pending.get("new")?.([fresh]);
	await freshLoad;
	expect(manager.getAssets()).toEqual([fresh]);

	const stale = asset({ id: "stale", url: "blob:stale" });
	pending.get("old")?.([stale]);
	await staleLoad;

	expect(manager.getAssets()).toEqual([fresh]);
	expect(revoke).toHaveBeenCalledWith("blob:stale");
});

test("STORE-13: a failed asset save rolls back and revokes the new URLs", async () => {
	const { manager } = buildEditor();
	saveMedia = async () => {
		throw new Error("quota exceeded");
	};

	const { id: _ignoredId, ...newAsset } = asset({
		id: "new",
		url: "blob:new",
	});
	const added = await manager.addMediaAsset({
		projectId: "p",
		asset: newAsset,
	});

	expect(added).toBeNull();
	expect(manager.getAssets()).toEqual([]);
	expect(revoke).toHaveBeenCalledWith("blob:new");
});
