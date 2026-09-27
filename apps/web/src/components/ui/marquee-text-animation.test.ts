import { afterEach, beforeEach, expect, test } from "bun:test";
import {
	createMarqueeAnimation,
	getMarqueeObserverStats,
	observeMarqueeText,
} from "./marquee-text-animation";

test("@fast marquee travels at the requested speed regardless of overflow length", () => {
	for (const overflow of [2, 15, 90, 600]) {
		const cycle = createMarqueeAnimation({ overflow, pxPerSecond: 30 });
		expect(cycle).not.toBeNull();
		if (!cycle) throw new Error("Expected an overflowing title to animate");
		const hold = cycle.keyframes.at(1)?.offset ?? 0;
		const end = cycle.keyframes.at(2)?.offset ?? 0;
		const duration = Number(cycle.options.duration);
		expect((end - hold) * duration).toBeCloseTo((overflow / 30) * 1_000);
		expect(hold * duration).toBeGreaterThanOrEqual(1_000);
		expect(cycle.options.easing).toBe("linear");
		expect(cycle.keyframes.at(-1)?.transform).toBe("translateX(0px)");
	}
});

test("@fast fitting and invalid widths do not animate", () => {
	for (const overflow of [-10, 0, 1, Number.NaN, Number.POSITIVE_INFINITY]) {
		expect(createMarqueeAnimation({ overflow })).toBeNull();
	}
});

test("@fast invalid speeds and pause ratios use finite safe timings", () => {
	for (const pxPerSecond of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
		const cycle = createMarqueeAnimation({ overflow: 90, pxPerSecond, pauseRatio: Number.NaN });
		expect(cycle).toEqual(createMarqueeAnimation({ overflow: 90 }));
	}
	const noPause = createMarqueeAnimation({ overflow: 90, pauseRatio: 0 });
	expect(noPause?.options.duration).toBe(6_000);
	const clampedPause = createMarqueeAnimation({ overflow: 90, pauseRatio: 10 });
	expect(clampedPause).toEqual(createMarqueeAnimation({ overflow: 90, pauseRatio: 0.8 }));
});

/* ────────────────────────────────────────────────────────────────────────────
 * Shared-observation tests.
 *
 * The registry module keeps its observers in module scope, so each test
 * installs a fresh set of DOM stubs, runs, and then tears every label down
 * (which drops the registry back to zero) before restoring the globals.
 * ──────────────────────────────────────────────────────────────────────────── */

interface FakeResizeObserver {
	observed: Set<Element>;
	unobserved: Set<Element>;
	callback: ResizeObserverCallback;
	disconnect(): void;
}

interface FakeIntersectionObserver {
	observed: Set<Element>;
	unobserved: Set<Element>;
	callback: IntersectionObserverCallback;
	disconnect(): void;
}

let resizeObservers: FakeResizeObserver[] = [];
let intersectionObservers: FakeIntersectionObserver[] = [];
let matchMediaCalls: number;
let visibilityListeners: ((...args: never[]) => void)[];
let documentHidden: boolean;
let reducedMotion: boolean;
let cancelCount: number;

function installDomStubs() {
	resizeObservers = [];
	intersectionObservers = [];
	matchMediaCalls = 0;
	visibilityListeners = [];
	documentHidden = false;
	reducedMotion = false;
	cancelCount = 0;

	class StubResizeObserver implements FakeResizeObserver {
		observed = new Set<Element>();
		unobserved = new Set<Element>();
		disconnect = () => {
			this.observed.clear();
		};
		constructor(public callback: ResizeObserverCallback) {
			resizeObservers.push(this);
		}
		observe = (target: Element) => {
			this.observed.add(target);
		};
		unobserve = (target: Element) => {
			this.observed.delete(target);
			this.unobserved.add(target);
		};
	}
	class StubIntersectionObserver implements FakeIntersectionObserver {
		observed = new Set<Element>();
		unobserved = new Set<Element>();
		disconnect = () => {
			this.observed.clear();
		};
		constructor(public callback: IntersectionObserverCallback) {
			intersectionObservers.push(this);
		}
		observe = (target: Element) => {
			this.observed.add(target);
		};
		unobserve = (target: Element) => {
			this.observed.delete(target);
			this.unobserved.add(target);
		};
	}
	class StubMediaQueryList extends EventTarget {
		get matches() {
			return reducedMotion;
		}
	}

	const globals = globalThis as unknown as Record<string, unknown>;
	globals.ResizeObserver = StubResizeObserver;
	globals.IntersectionObserver = StubIntersectionObserver;
	globals.matchMedia = () => {
		matchMediaCalls += 1;
		return new StubMediaQueryList();
	};
	globals.document = {
		get hidden() {
			return documentHidden;
		},
		addEventListener: (type: string, listener: () => void) => {
			if (type === "visibilitychange") visibilityListeners.push(listener);
		},
		removeEventListener: (type: string, listener: () => void) => {
			if (type !== "visibilitychange") return;
			visibilityListeners = visibilityListeners.filter((l) => l !== listener);
		},
	};
	globals.window = globalThis;
}

function uninstallDomStubs() {
	const globals = globalThis as unknown as Record<string, unknown>;
	delete globals.ResizeObserver;
	delete globals.IntersectionObserver;
	delete globals.matchMedia;
	delete globals.document;
	delete globals.window;
}

/** A label pair with a known overflow, and a spy for its Web Animations call. */
function createLabel(overflow: number) {
	const animates: { keyframes: Keyframe[]; options: KeyframeAnimationOptions }[] = [];
	const viewport = { clientWidth: 100 } as unknown as HTMLSpanElement;
	const content = {
		scrollWidth: 100 + overflow,
		animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
			animates.push({ keyframes, options });
			return {
				cancel: () => {
					cancelCount += 1;
				},
			} as unknown as Animation;
		},
	} as unknown as HTMLSpanElement;
	return { viewport, content, animates };
}

function setIntersecting(
	observer: FakeIntersectionObserver,
	target: Element,
	isIntersecting: boolean,
) {
	observer.callback(
		[{ target, isIntersecting } as IntersectionObserverEntry],
		observer as unknown as IntersectionObserver,
	);
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
	installDomStubs();
});

afterEach(() => {
	for (const cleanup of cleanups) cleanup();
	cleanups = [];
	// The registry lives in module scope, so a leaked label would silently
	// poison every later test. Fail loudly here instead.
	expect(getMarqueeObserverStats().labels).toBe(0);
	uninstallDomStubs();
});

test("@fast 200 labels share one set of observers, media query and visibility listener", () => {
	for (let i = 0; i < 200; i++) {
		const label = createLabel(40);
		cleanups.push(
			observeMarqueeText({
				viewport: label.viewport,
				content: label.content,
			}),
		);
	}

	// One observer pair, one matchMedia, one visibilitychange listener —
	// not 200 of each.
	expect(resizeObservers).toHaveLength(1);
	expect(intersectionObservers).toHaveLength(1);
	expect(matchMediaCalls).toBe(1);
	expect(visibilityListeners).toHaveLength(1);

	// Every label is registered with the shared observers, and nothing has
	// started animating because none of them is on screen yet.
	expect(getMarqueeObserverStats().labels).toBe(200);
	expect(resizeObservers[0]?.observed.size).toBe(400);
	expect(intersectionObservers[0]?.observed.size).toBe(200);
});

test("@fast a label only animates once it is visible, and stops when it leaves", () => {
	const label = createLabel(40);
	cleanups.push(
		observeMarqueeText({ viewport: label.viewport, content: label.content }),
	);
	const observer = intersectionObservers[0];
	if (!observer) throw new Error("Expected a shared IntersectionObserver");

	// Visible: the measured overflow turns into exactly one animation.
	setIntersecting(observer, label.viewport, true);
	expect(label.animates).toHaveLength(1);

	// Still visible: re-notifying must not restart the cycle.
	setIntersecting(observer, label.viewport, true);
	expect(label.animates).toHaveLength(1);

	// Off screen: the animation is cancelled and is not re-created.
	const before = cancelCount;
	setIntersecting(observer, label.viewport, false);
	expect(cancelCount).toBe(before + 1);
	setIntersecting(observer, label.viewport, false);
	expect(label.animates).toHaveLength(1);
});

test("@fast shared observers and listeners are released when the last label unmounts", () => {
	const first = createLabel(40);
	const second = createLabel(40);
	const disposeFirst = observeMarqueeText({
		viewport: first.viewport,
		content: first.content,
	});
	const disposeSecond = observeMarqueeText({
		viewport: second.viewport,
		content: second.content,
	});

	disposeFirst();
	// Still one label mounted: the shared observers stay wired.
	expect(getMarqueeObserverStats().labels).toBe(1);
	expect(resizeObservers[0]?.unobserved.has(first.viewport)).toBe(true);
	expect(resizeObservers[0]?.unobserved.has(first.content)).toBe(true);
	expect(resizeObservers).toHaveLength(1);
	expect(visibilityListeners).toHaveLength(1);

	disposeSecond();
	// Nothing left: the registry is empty and no observer is retained.
	const stats = getMarqueeObserverStats();
	expect(stats.labels).toBe(0);
	expect(stats.observedElements).toBe(0);
	expect(stats.resizeObservers).toBeNull();
	expect(stats.intersectionObservers).toBeNull();
	expect(stats.motionQueries).toBeNull();
	expect(visibilityListeners).toHaveLength(0);
});

test("@fast hidden documents and reduced motion stop every label", () => {
	const labels = [createLabel(40), createLabel(40)];
	for (const label of labels) {
		cleanups.push(
			observeMarqueeText({
				viewport: label.viewport,
				content: label.content,
			}),
		);
	}
	const observer = intersectionObservers[0];
	if (!observer) throw new Error("Expected a shared IntersectionObserver");
	for (const label of labels) setIntersecting(observer, label.viewport, true);
	expect(labels.every((label) => label.animates.length === 1)).toBe(true);

	// Tab in the background: the single visibility listener cancels both.
	documentHidden = true;
	for (const listener of [...visibilityListeners]) listener();
	expect(cancelCount).toBe(2);

	// Back in the foreground with reduced motion on: still no animation.
	documentHidden = false;
	reducedMotion = true;
	for (const listener of [...visibilityListeners]) listener();
	expect(labels.every((label) => label.animates.length === 1)).toBe(true);
});
