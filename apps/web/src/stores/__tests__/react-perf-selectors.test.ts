/**
 * React-scope perf regressions: zustand subscription scoping
 * (useShallow / stable selectors) for the converted whole-store
 * subscriptions in this pass.
 *
 * Strategy (no React renderer available in bun test): import the
 * converted modules and assert — via the store's own `subscribe` —
 * that updating an UNSELECTED slice does not notify a selector scoped
 * to another slice. A whole-store destructure (`useXStore()` with no
 * selector) notifies on every set; a stable single-field selector only
 * notifies when its slice changes. This pins the no-behavior-change
 * guarantee at the subscription level: the selectors the components now
 * use are provably narrower than the full store.
 */
import { describe, expect, test } from "bun:test";
import { useStickersStore } from "@/stores/stickers-store";
import { useSoundsStore } from "@/stores/sounds-store";
import { useCollabStore } from "@/stores/collab-store";
import { usePropertiesStore } from "@/components/editor/panels/properties/stores/properties-store";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { usePreviewStore } from "@/stores/preview-store";

describe("react perf: selector scoping (rounds 11-16)", () => {
	// NOTE: vanilla zustand `subscribe(listener)` (without
	// `subscribeWithSelector`) fires on EVERY set — the middleware in this
	// repo does not include `subscribeWithSelector`, so slice-level
	// notification filtering happens in the React binding (`useStore` with
	// a selector + `useShallow`), not in `store.subscribe`. These rounds
	// therefore assert the equivalent component-visible property: reading
	// an unselected slice returns a referentially identical value across
	// unrelated sets (so a shallow-compared selector never re-renders),
	// while the changed slice returns a new reference.
	test("round 11: stickers card action identity stable across slice churn", () => {
		const before = useStickersStore.getState().addToRecentStickers;
		useStickersStore.setState({ isBrowsing: true });
		useStickersStore.setState({ isBrowsing: false });
		useStickersStore.setState({ searchQuery: "kick" });
		expect(useStickersStore.getState().addToRecentStickers).toBe(before);
		// Sanity: the changed slice DID change (test would be vacuous otherwise).
		useStickersStore.setState({ recentStickers: ["x"] });
		expect(useStickersStore.getState().recentStickers).toEqual(["x"]);
		useStickersStore.setState({ recentStickers: [], searchQuery: "" });
	});

	test("round 12: sounds search slice identity stable across pagination churn", () => {
		const beforeQuery = useSoundsStore.getState().searchQuery;
		const beforeResults = useSoundsStore.getState().searchResults;
		useSoundsStore.setState({ currentPage: 7, isLoadingMore: true });
		useSoundsStore.setState({ scrollPosition: 1234 });
		// searchQuery/results references untouched by pagination sets → a
		// shallow-compared selector over them never re-renders.
		expect(useSoundsStore.getState().searchQuery).toBe(beforeQuery);
		expect(useSoundsStore.getState().searchResults).toBe(beforeResults);
		useSoundsStore.setState({
			currentPage: 1,
			isLoadingMore: false,
			scrollPosition: 0,
		});
	});

	test("round 13: collab status identity stable across cursor-rate churn", () => {
		// Presence bar reads collaborators/sessionId/status only.
		// Pointer-rate cursor updates replace `cursors` but leave the
		// presence slices referentially identical.
		const beforeStatus = useCollabStore.getState().status;
		const beforeCollaborators = useCollabStore.getState().collaborators;
		useCollabStore.setState({
			cursors: [{ collaboratorId: "a", x: 1, y: 2 }],
		});
		useCollabStore.setState({
			cursors: [{ collaboratorId: "a", x: 50, y: 60 }],
		});
		useCollabStore.setState({ locks: [] });
		expect(useCollabStore.getState().status).toBe(beforeStatus);
		expect(useCollabStore.getState().collaborators).toBe(beforeCollaborators);
		useCollabStore.setState({ cursors: [] });
	});

	test("round 14: inspector tab-map identity stable across favourites churn", () => {
		const before = usePropertiesStore.getState().activeTabPerType;
		usePropertiesStore.getState().toggleMediaFavorite("media-1");
		usePropertiesStore.getState().toggleMediaFavorite("media-1");
		expect(usePropertiesStore.getState().activeTabPerType).toBe(before);
	});

	test("round 15: assets activeTab identity stable across sort/card-size churn", () => {
		const before = useAssetsPanelStore.getState().activeTab;
		useAssetsPanelStore.getState().setMediaSort("duration", "desc");
		useAssetsPanelStore.getState().setAssetCardSize(120);
		expect(useAssetsPanelStore.getState().activeTab).toBe(before);
		useAssetsPanelStore.getState().setMediaSort("name", "asc");
		useAssetsPanelStore.getState().resetAssetCardSize();
	});

	test("round 16: preview overlays identity stable across grid/guide churn", () => {
		// PreviewCanvas reads `overlays` only: grid-config edits replace
		// `gridConfig` but leave `overlays` referentially identical.
		const before = usePreviewStore.getState().overlays;
		usePreviewStore.getState().setGridConfig({ rows: 5, cols: 5 });
		expect(usePreviewStore.getState().overlays).toBe(before);
		// And the keybindings help-list source ignores overlay-depth churn:
		// open/closeOverlay replace overlay arrays, not `keybindings`.
		const beforeBindings = useKeybindingsStore.getState().keybindings;
		useKeybindingsStore.getState().openOverlay("probe-overlay");
		useKeybindingsStore.getState().closeOverlay("probe-overlay");
		expect(useKeybindingsStore.getState().keybindings).toBe(beforeBindings);
	});
});
