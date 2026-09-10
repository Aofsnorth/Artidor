/**
 * React-scope perf regressions: effect-preview cards stay off the playback
 * subscription path (rounds 17-20).
 *
 * Playback-subsystem exclusion: `EffectItem` / `EffectPreviewCanvas` /
 * `AdjustmentItem` / `TransitionItem` / `DraggableItem` must not subscribe
 * to the `playback` EditorSubsystem (60fps during playback). They read
 * playback state imperatively inside event handlers (click → add to
 * timeline), which performs zero subscriptions.
 *
 * Strategy (no React renderer in bun test): static source scan of the
 * OWN-subsurface card files. Each card file must contain zero
 * `["playback"]` subscriptions and zero playback-tick selectors
 * (`getIsPlaying`, `getCurrentTime` inside `useEditor(`). An imperative
 * `editor.playback.getCurrentTime()` outside `useEditor(` is the allowed
 * pattern (asserted present so the test is not vacuous).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const CARD_FILES = [
	`${import.meta.dir}/../../components/editor/panels/assets/views/effects.tsx`,
	`${import.meta.dir}/../../components/editor/panels/assets/views/adjustments.tsx`,
	`${import.meta.dir}/../../components/editor/panels/assets/views/transitions.tsx`,
	`${import.meta.dir}/../../components/editor/panels/assets/draggable-item.tsx`,
];

function read(file: string): string {
	return readFileSync(file, "utf8");
}

describe("react perf: effect cards off the playback path (rounds 17-20)", () => {
	test("round 17: no card subscribes to the playback subsystem", () => {
		for (const file of CARD_FILES) {
			const source = read(file);
			expect(
				source.includes('["playback"]'),
				`${file} must not subscribe to ["playback"]`,
			).toBe(false);
		}
	});

	test("round 18: no card selects playback tick state via useEditor(", () => {
		for (const file of CARD_FILES) {
			const source = read(file);
			const selectorUsesPlayback =
				/useEditor\(\s*\([^)]*get(IsPlaying|CurrentTime)/.test(source);
			expect(
				selectorUsesPlayback,
				`${file} must not select playback state via useEditor(`,
			).toBe(false);
		}
	});

	test("round 19: cards read playhead imperatively in handlers (allowed pattern)", () => {
		// effects + adjustments cards snapshot the playhead at click time via
		// `editor.playback.getCurrentTime()` — zero subscriptions, value read
		// exactly once per user gesture. transitions + draggable-item go
		// through the `useTransitions` hook / `onAddToTimeline` callback prop
		// instead (same property: no playback subscription in the card),
		// so only the two direct readers are asserted here; round 17/18
		// already pin that NONE of the four files subscribes.
		for (const file of CARD_FILES.slice(0, 2)) {
			const source = read(file);
			expect(
				source.includes("editor.playback.getCurrentTime()"),
				`${file} must keep the imperative playhead read in its add handler`,
			).toBe(true);
		}
	});

	test("round 20: preview service stays idle-chunked (bounded queue intact)", () => {
		// The idle-chunking contract the cards rely on: bounded concurrency
		// + idle drain + cancellable jobs. If a future edit removes any of
		// these, the Effects tab floods the GPU pipeline again.
		const source = readFileSync(
			`${import.meta.dir}/../../services/renderer/effect-preview.ts`,
			"utf8",
		);
		expect(source.includes("MAX_CONCURRENT_RENDERS")).toBe(true);
		expect(source.includes("requestIdleCallback")).toBe(true);
		expect(source.includes("scheduleRender")).toBe(true);
	});
});
