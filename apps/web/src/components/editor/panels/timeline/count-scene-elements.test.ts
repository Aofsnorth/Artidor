import { describe, expect, test } from "bun:test";
import type { SceneTracks } from "@/lib/timeline";
import { countSceneElements } from "./timeline-toolbar";

/**
 * Select-all gating reads only a COUNT of the scene's elements, so the
 * selector had to stop materializing every element on every editor
 * notification. This pins the replacement to the expression it replaced —
 * the classic way to get it wrong is to forget that `tracks.main` is a single
 * track rather than a list, which would silently under-count and disable
 * select-all.
 */

function track(id: string, elementCount: number) {
	return {
		id,
		name: id,
		muted: false,
		hidden: false,
		elements: Array.from({ length: elementCount }, (_, i) => ({
			id: `${id}-${i}`,
			type: "video",
			startTime: 0,
			duration: 1,
		})),
	};
}

function tracks(partial: Partial<SceneTracks>): SceneTracks {
	return {
		main: track("main", 0) as unknown as SceneTracks["main"],
		overlay: [],
		overlayAfter: [],
		audio: [],
		...partial,
	} as SceneTracks;
}

/** The pre-optimisation expression, kept verbatim as the oracle. */
function legacyCount(sceneTracks: SceneTracks): number {
	return Object.values(sceneTracks)
		.flat()
		.flatMap((t) => t.elements).length;
}

describe("timeline toolbar: countSceneElements", () => {
	test("matches the legacy flattened count on an empty scene", () => {
		const sceneTracks = tracks({});
		expect(countSceneElements(sceneTracks)).toBe(0);
		expect(countSceneElements(sceneTracks)).toBe(legacyCount(sceneTracks));
	});

	test("counts the main track, which is a single track not a list", () => {
		const sceneTracks = tracks({});
		sceneTracks.main = track("main", 3) as unknown as SceneTracks["main"];
		expect(countSceneElements(sceneTracks)).toBe(3);
		expect(countSceneElements(sceneTracks)).toBe(legacyCount(sceneTracks));
	});

	test("counts every bucket", () => {
		const sceneTracks = tracks({
			main: track("main", 3) as unknown as SceneTracks["main"],
			overlay: [
				track("ov-a", 2),
				track("ov-b", 0),
			] as unknown as SceneTracks["overlay"],
			overlayAfter: [
				track("ova", 1),
			] as unknown as SceneTracks["overlayAfter"],
			audio: [
				track("au-a", 4),
				track("au-b", 1),
			] as unknown as SceneTracks["audio"],
		});
		expect(countSceneElements(sceneTracks)).toBe(11);
		expect(countSceneElements(sceneTracks)).toBe(legacyCount(sceneTracks));
	});
});
