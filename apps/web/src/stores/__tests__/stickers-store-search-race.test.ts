/**
 * Sticker search is async and the provider layer can answer out of order. The
 * store must keep the newest query's results even when an older request
 * resolves later.
 */
import { afterAll, expect, mock, test } from "bun:test";
import type {
	StickerBrowseResult,
	StickerSearchResult,
} from "@/lib/stickers/types";

const NEW_RESULT = {
	sections: [{ id: "new-result" }],
} as unknown as StickerBrowseResult;
const OLD_RESULT = {
	sections: [{ id: "old-result" }],
} as unknown as StickerBrowseResult;

const oldRequest = Promise.withResolvers<StickerBrowseResult>();
const newRequest = Promise.withResolvers<StickerBrowseResult>();

mock.module("@/lib/stickers", () => ({
	browseAll: async () => ({ sections: [] }) as StickerBrowseResult,
	browseCategory: async () => ({ sections: [] }) as StickerBrowseResult,
	searchAll: ({ query }: { query: string }) =>
		query === "old" ? oldRequest.promise : newRequest.promise,
	searchStickers: async () =>
		({ items: [], total: 0, hasMore: false }) as StickerSearchResult,
}));

const { useStickersStore } = await import("../stickers-store");

afterAll(() => {
	mock.restore();
});

test("an older search response cannot overwrite a newer one", async () => {
	const older = useStickersStore.getState().searchStickers({ query: "old" });
	const newer = useStickersStore.getState().searchStickers({ query: "new" });

	// The newest query answers first...
	newRequest.resolve(NEW_RESULT);
	await newer;
	expect(useStickersStore.getState().browseContent).toEqual(NEW_RESULT);

	// ...then the stale response arrives and must be ignored.
	oldRequest.resolve(OLD_RESULT);
	await older;
	expect(useStickersStore.getState().browseContent).toEqual(NEW_RESULT);
	expect(useStickersStore.getState().isSearching).toBe(false);
});
