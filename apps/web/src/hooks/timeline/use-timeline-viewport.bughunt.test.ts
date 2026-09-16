import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression: the culling window used by `shouldMountTimelineElement` was
 * permanently stuck at `[-OVERSCAN, +OVERSCAN]` (viewport width 0) because
 * `useTimelineViewport` returned early when `tracksScrollRef.current` was
 * still null on a simultaneous mount (child layout effects run before the
 * parent ScrollArea's host ref is assigned). No scroll listener and no
 * ResizeObserver were ever attached, so:
 *
 *  - clips past ~600px were only mounted while selected (selection bypass),
 *  - the first click on an empty track area (which clears the selection)
 *    unmounted the second clip and it never came back on scroll.
 *
 * The fix resolves the element defensively with a rAF retry. These tests
 * pin that contract (source-level, matching the repo's react-perf suite
 * style, since bun tests here run without a DOM renderer).
 */

const VIEWPORT_SOURCE = readFileSync(
	join(import.meta.dir, "use-timeline-viewport.ts"),
	"utf8",
);

const PLAYHEAD_SOURCE = readFileSync(
	join(import.meta.dir, "use-timeline-playhead.ts"),
	"utf8",
);

describe("useTimelineViewport (bughunt: stale culling window)", () => {
	test("attaches the subscription via a resolved element, not the raw ref", () => {
		// The subscribe effect must depend on a state-resolved element so it
		// re-runs once the ref finally exists.
		expect(VIEWPORT_SOURCE).toContain("setElement");
		expect(VIEWPORT_SOURCE).toContain("}, [element]);");
	});

	test("retries element resolution with rAF instead of returning early", () => {
		// The resolve effect must schedule a retry when the ref is null —
		// a bare `if (!element) return;` on the raw ref is the bug.
		expect(VIEWPORT_SOURCE).toContain("requestAnimationFrame");
		const effectMarker = "useLayoutEffect(() => {";
		const resolveEffectStart = VIEWPORT_SOURCE.indexOf(effectMarker);
		const subscribeEffectStart = VIEWPORT_SOURCE.indexOf(
			effectMarker,
			resolveEffectStart + 1,
		);
		const resolveEffect = VIEWPORT_SOURCE.slice(
			resolveEffectStart,
			subscribeEffectStart,
		);
		expect(resolveEffect).toContain("tick");
		expect(resolveEffect).toContain("cancelAnimationFrame");
	});

	test("scroll + resize listeners stay wired on the resolved element", () => {
		const subscribeEffect = VIEWPORT_SOURCE.slice(
			VIEWPORT_SOURCE.lastIndexOf("useLayoutEffect"),
		);
		expect(subscribeEffect).toContain("ResizeObserver");
		expect(subscribeEffect).toContain('addEventListener("scroll"');
		expect(subscribeEffect).toContain("removeEventListener");
	});
});

describe("useTimelinePlayhead (bughunt: paused seek leaves viewport)", () => {
	test("a paused seek still runs the keep-playhead-visible scroll logic", () => {
		// The gate must let `playback-seek` events through while paused;
		// only non-seek updates require the playing flag.
		expect(PLAYHEAD_SOURCE).toContain('e.type === "playback-seek"');
		expect(PLAYHEAD_SOURCE).toContain("!isPlayingRef.current && !isSeek");
	});

	test("centre-following stays exclusive to playback, not paused seeks", () => {
		// Paused seeks use the needsScroll branch; centering mid-pause would
		// yank the viewport on every click-to-seek.
		expect(PLAYHEAD_SOURCE).toContain(
			"isPlayingRef.current && autoScrollEnabledRef.current",
		);
	});
});
