import { afterAll, describe, expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { SceneTracks, TimelineElement } from "@/lib/timeline";

/**
 * useElementPreview per-scene element index.
 *
 * The hook runs once per timeline clip, so resolving a clip must be O(1) after
 * an index is built once per `SceneTracks` revision. These tests pin both
 * halves of that contract:
 *
 * - the index is built ONCE per tracks object and reused for every clip
 *   (a second clip must not re-read the element arrays), and
 * - replacing the tracks object invalidates it, so a lookup never returns a
 *   stale element after an edit.
 *
 * Resolution must stay identical to the old `findTrackInSceneTracks(...)` +
 * `track.elements.find(...)` pair, including the first-match-wins track
 * lookup order.
 */

const editorMock = {
	scenes: {
		getActiveScene: () => sceneState.committed,
		getActiveSceneOrNull: () => sceneState.committed,
	},
	timeline: {
		getPreviewTracks: () => sceneState.preview ?? sceneState.committed.tracks,
		previewElements: () => {},
		commitPreview: () => {},
	},
};

const sceneState: {
	committed: { tracks: SceneTracks };
	preview: SceneTracks | null;
} = {
	committed: { tracks: makeTracks() },
	preview: null,
};

// The hook subscribes through the SELECTOR overload of `useEditor` (it
// needs a snapshot that changes when the clip's own data changes), so the
// mock has to apply the selector the way the real hook does.
mock.module("@/hooks/use-editor", () => ({
	useEditor: ((selector?: (editor: unknown) => unknown) =>
		selector
			? selector(editorMock)
			: editorMock) as unknown as () => typeof editorMock,
}));

const { useElementPreview } = await import("./use-element-preview");

afterAll(() => {
	mock.restore();
});

function element(id: string): TimelineElement {
	return {
		id,
		type: "video",
		startTime: 0,
		duration: 1,
	} as unknown as TimelineElement;
}

/** Tracks whose `elements` arrays count reads, so index reuse is observable. */
function makeTracks(
	readCounter?: () => void,
	overrides: { idSuffix?: string; videoId?: string } = {},
): SceneTracks {
	const idSuffix = overrides.idSuffix ?? "";
	const videoId = overrides.videoId ?? `video${idSuffix}`;
	const mainElements = [element(videoId), element(`main-b${idSuffix}`)];
	return {
		main: {
			id: "main-track",
			name: "Main",
			type: "video",
			muted: false,
			hidden: false,
			get elements() {
				readCounter?.();
				return mainElements;
			},
		} as unknown as SceneTracks["main"],
		overlay: [
			{
				id: "overlay-track",
				name: "Overlay",
				type: "text",
				muted: false,
				hidden: false,
				get elements() {
					readCounter?.();
					return [element(`overlay${idSuffix}`)];
				},
			} as unknown as SceneTracks["overlay"][number],
		],
		overlayAfter: [],
		audio: [],
	};
}

function resolve(params: {
	trackId: string;
	elementId: string;
	fallback?: TimelineElement;
}): TimelineElement {
	let captured: TimelineElement | null = null;
	function Test() {
		const result = useElementPreview<TimelineElement>({
			trackId: params.trackId,
			elementId: params.elementId,
			fallback: params.fallback ?? element("fallback"),
		});
		captured = result.renderElement;
		return createElement("div", null, "ok");
	}
	renderToString(createElement(Test));
	if (!captured) throw new Error("hook did not resolve an element");
	return captured as TimelineElement;
}

function useScene(next: {
	committed?: SceneTracks;
	preview?: SceneTracks | null;
}) {
	sceneState.committed = {
		tracks: next.committed ?? sceneState.committed.tracks,
	};
	sceneState.preview = next.preview ?? null;
}

describe("useElementPreview element index", () => {
	test("resolves elements from every track bucket", () => {
		const tracks = makeTracks();
		useScene({ committed: tracks });

		expect(resolve({ trackId: "main-track", elementId: "video" }).id).toBe(
			"video",
		);
		expect(resolve({ trackId: "overlay-track", elementId: "overlay" }).id).toBe(
			"overlay",
		);
	});

	test("builds the index once per tracks revision, not once per clip", () => {
		let elementArrayReads = 0;
		const tracks = makeTracks(() => {
			elementArrayReads += 1;
		});
		useScene({ committed: tracks });

		// First clip pays for the index build.
		resolve({ trackId: "main-track", elementId: "video" });
		expect(elementArrayReads).toBeGreaterThan(0);
		const readsAfterBuild = elementArrayReads;

		// Every further clip on the same revision is a map lookup: zero
		// additional reads of the element arrays.
		resolve({ trackId: "main-track", elementId: "main-b" });
		resolve({ trackId: "overlay-track", elementId: "overlay" });
		resolve({ trackId: "main-track", elementId: "video" });
		expect(elementArrayReads).toBe(readsAfterBuild);
	});

	test("a new tracks object is re-indexed (no stale element)", () => {
		useScene({ committed: makeTracks() });
		expect(resolve({ trackId: "main-track", elementId: "video" }).id).toBe(
			"video",
		);

		// Same track id, different element id: the old index must not answer.
		useScene({
			committed: makeTracks(undefined, {
				idSuffix: "-2",
				videoId: "video-2",
			}),
		});
		expect(resolve({ trackId: "main-track", elementId: "video-2" }).id).toBe(
			"video-2",
		);
		expect(resolve({ trackId: "main-track", elementId: "video" }).id).toBe(
			"fallback",
		);
	});

	test("an in-progress preview wins over the committed element", () => {
		const committed = makeTracks();
		const preview = makeTracks(undefined, {
			idSuffix: "-p",
			videoId: "video-p",
		});
		useScene({ committed, preview });

		expect(resolve({ trackId: "main-track", elementId: "video-p" }).id).toBe(
			"video-p",
		);
		// The committed element is shadowed while the preview is active.
		expect(resolve({ trackId: "main-track", elementId: "video" }).id).toBe(
			"fallback",
		);

		// Committing drops the preview and the committed element is back.
		useScene({ committed });
		expect(resolve({ trackId: "main-track", elementId: "video" }).id).toBe(
			"video",
		);
	});

	test("unknown track / element falls back to the caller-provided element", () => {
		useScene({ committed: makeTracks() });
		expect(resolve({ trackId: "main-track", elementId: "nope" }).id).toBe(
			"fallback",
		);
		expect(resolve({ trackId: "no-such-track", elementId: "video" }).id).toBe(
			"fallback",
		);
	});
});
