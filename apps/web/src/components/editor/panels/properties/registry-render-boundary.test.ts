import { describe, expect, test } from "bun:test";
import type { MediaAsset } from "@/lib/media/types";
import type { TimelineElement } from "@/lib/timeline";
import { getPropertiesConfig } from "./registry";

/**
 * Registry render-boundary regressions.
 *
 * Two contracts are locked here, both of which the inspector's memoization
 * depends on:
 *
 * 1. WHICH tabs are offered, in which order, and which one is the default.
 *    The tab tree is data-driven now, so a careless edit to the config switch
 *    silently changes the inspector's UI. This is the full before/after table.
 * 2. Every `content` is a memoized *component* with a stable identity. The
 *    identity is what stops a config rebuild from remounting the visible tab
 *    and what lets `memo` actually block a render; the memo wrapper is what
 *    lets the tab bail out of a re-render of the inspector around it.
 */

const REACT_MEMO = Symbol.for("react.memo");

const NO_ASSETS: MediaAsset[] = [];

function asset({
	id,
	hasAudio,
}: {
	id: string;
	hasAudio?: boolean;
}): MediaAsset {
	return {
		id,
		name: id,
		type: "video",
		url: `${id}.mp4`,
		duration: 1_000_000,
		...((hasAudio === undefined ? {} : { hasAudio }) as Partial<MediaAsset>),
	} as MediaAsset;
}

function element(
	partial: Record<string, unknown> & { type: TimelineElement["type"] },
): TimelineElement {
	return partial as unknown as TimelineElement;
}

const TEXT = element({ id: "t1", type: "text", content: "hi" });
const NULL_LAYER = element({
	id: "t2",
	type: "text",
	content: "",
	nullLayer: true,
});
const VIDEO_WITH_AUDIO = element({ id: "v1", type: "video", mediaId: "a1" });
const IMAGE = element({ id: "i1", type: "image", mediaId: "a1" });
const STICKER = element({ id: "s1", type: "sticker" });
const GRAPHIC = element({ id: "g1", type: "graphic" });
const AUDIO = element({ id: "au1", type: "audio", mediaId: "a2" });
const EFFECT = element({ id: "e1", type: "effect" });
const CAMERA = element({ id: "c1", type: "camera" });

function tabIds(el: TimelineElement, assets: MediaAsset[] = NO_ASSETS) {
	return getPropertiesConfig({ element: el, mediaAssets: assets }).tabs.map(
		(tab) => tab.id,
	);
}

describe("properties registry: tab table", () => {
	test("text elements get the text-first inspector", () => {
		const config = getPropertiesConfig({
			element: TEXT,
			mediaAssets: NO_ASSETS,
		});
		expect(config.defaultTab).toBe("text");
		expect(config.tabs.map((tab) => tab.id)).toEqual([
			"text",
			"adjust",
			"graphics-style",
			"transform",
			"parenting",
			"camera",
			"animations",
		]);
	});

	test("null layers only expose info / transform / link / animation", () => {
		const config = getPropertiesConfig({
			element: NULL_LAYER,
			mediaAssets: NO_ASSETS,
		});
		expect(config.defaultTab).toBe("transform");
		expect(config.tabs.map((tab) => tab.id)).toEqual([
			"element-info",
			"transform",
			"adjust",
			"parenting",
			"animations",
		]);
	});

	test("video exposes the audio tab unless the asset has no audio", () => {
		expect(
			tabIds(VIDEO_WITH_AUDIO, [asset({ id: "a1", hasAudio: true })]),
		).toContain("audio");
		// `hasAudio` unknown (mediabunny returns null/undefined mid-scan) is
		// deliberately treated as "maybe has audio" — see getVideoConfig.
		expect(tabIds(VIDEO_WITH_AUDIO, [asset({ id: "a1" })])).toContain("audio");
		expect(tabIds(VIDEO_WITH_AUDIO)).toContain("audio");
		expect(
			tabIds(VIDEO_WITH_AUDIO, [asset({ id: "a1", hasAudio: false })]),
		).not.toContain("audio");
	});

	test("video default tab and full tab list", () => {
		const config = getPropertiesConfig({
			element: VIDEO_WITH_AUDIO,
			mediaAssets: [asset({ id: "a1" })],
		});
		expect(config.defaultTab).toBe("transform");
		expect(config.tabs.map((tab) => tab.id)).toEqual([
			"element-info",
			"transform",
			"adjust",
			"graphics-style",
			"audio",
			"speed",
			"speed-ramp",
			"parenting",
			"camera",
			"animations",
			"masks",
			"effects",
		]);
	});

	test("image, sticker, graphic, audio, effect and camera tab lists", () => {
		const imageConfig = getPropertiesConfig({
			element: IMAGE,
			mediaAssets: NO_ASSETS,
		});
		expect(imageConfig.defaultTab).toBe("transform");
		expect(tabIds(IMAGE)).toEqual([
			"element-info",
			"image",
			// The CapCut-parity Adjust tab (basic adjustments) rides with the
			// image's own tab group.
			"adjust",
			"graphics-style",
			"transform",
			"parenting",
			"camera",
			"animations",
			"masks",
			"effects",
		]);

		const stickerConfig = getPropertiesConfig({
			element: STICKER,
			mediaAssets: NO_ASSETS,
		});
		expect(stickerConfig.defaultTab).toBe("transform");
		expect(tabIds(STICKER)).toEqual([
			"element-info",
			"transform",
			"adjust",
			"parenting",
			"camera",
			"animations",
			"effects",
		]);

		const graphicConfig = getPropertiesConfig({
			element: GRAPHIC,
			mediaAssets: NO_ASSETS,
		});
		expect(graphicConfig.defaultTab).toBe("graphic");
		expect(tabIds(GRAPHIC)).toEqual([
			"element-info",
			"graphic",
			"adjust",
			"transform",
			"parenting",
			"camera",
			"masks",
			"effects",
		]);

		const audioConfig = getPropertiesConfig({
			element: AUDIO,
			mediaAssets: NO_ASSETS,
		});
		expect(audioConfig.defaultTab).toBe("audio-element");
		expect(tabIds(AUDIO)).toEqual([
			"element-info",
			"audio-element",
			"speed",
			"speed-ramp",
			"audio-effects",
		]);

		const effectConfig = getPropertiesConfig({
			element: EFFECT,
			mediaAssets: NO_ASSETS,
		});
		expect(effectConfig.defaultTab).toBe("effects");
		expect(tabIds(EFFECT)).toEqual(["element-info", "effects"]);

		const cameraConfig = getPropertiesConfig({
			element: CAMERA,
			mediaAssets: NO_ASSETS,
		});
		expect(cameraConfig.defaultTab).toBe("camera-inspect");
		expect(tabIds(CAMERA)).toEqual(["camera-inspect", "element-info"]);
	});
});

describe("properties registry: tab content is a memo component", () => {
	test("every tab content is a React.memo component", () => {
		for (const el of [
			TEXT,
			NULL_LAYER,
			VIDEO_WITH_AUDIO,
			IMAGE,
			STICKER,
			GRAPHIC,
			AUDIO,
			EFFECT,
			CAMERA,
		]) {
			for (const tab of getPropertiesConfig({
				element: el,
				mediaAssets: NO_ASSETS,
			}).tabs) {
				// `memo()` returns a `{ $$typeof, type, compare }` record, not a
				// bare function — the $$typeof tag is what identifies it.
				expect((tab.content as unknown as { $$typeof?: symbol }).$$typeof).toBe(
					REACT_MEMO,
				);
			}
		}
	});

	test("content identity survives a config rebuild (no remount on commit)", () => {
		// Two different elements of the same type produce two different
		// configs. The tab *content* must be the very same component object in
		// both, otherwise committing an element swap would unmount and
		// remount the whole tab subtree, losing focus and local UI state.
		const before = getPropertiesConfig({
			element: TEXT,
			mediaAssets: NO_ASSETS,
		});
		const after = getPropertiesConfig({
			element: element({ id: "t-other", type: "text", content: "other" }),
			mediaAssets: NO_ASSETS,
		});
		const again = getPropertiesConfig({
			element: TEXT,
			mediaAssets: NO_ASSETS,
		});

		expect(after.tabs.map((tab) => tab.content)).toEqual(
			before.tabs.map((tab) => tab.content),
		);
		expect(again.tabs.map((tab) => tab.content)).toEqual(
			before.tabs.map((tab) => tab.content),
		);
		before.tabs.forEach((tab, i) => {
			expect(tab.content).toBe(after.tabs[i].content);
		});
	});

	test("the same tab id always maps to the same content component", () => {
		// "effects" exists twice (clip effects vs standalone effect) and
		// "audio" twice (video audio vs audio element); the other ids are
		// shared across configs and must stay identical.
		const shared = ["transform", "parenting", "camera", "element-info"];
		const seen = new Map<string, unknown>();
		for (const el of [TEXT, IMAGE, STICKER, GRAPHIC, AUDIO, CAMERA]) {
			for (const tab of getPropertiesConfig({
				element: el,
				mediaAssets: NO_ASSETS,
			}).tabs) {
				if (!shared.includes(tab.id)) continue;
				const previous = seen.get(tab.id);
				if (previous === undefined) {
					seen.set(tab.id, tab.content);
				} else {
					expect(tab.content).toBe(previous);
				}
			}
		}
		expect([...seen.keys()].sort()).toEqual([...shared].sort());
	});
});
