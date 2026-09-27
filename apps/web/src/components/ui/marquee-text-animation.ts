const DEFAULT_PX_PER_SECOND = 30;
const DEFAULT_PAUSE_RATIO = 0.3;
const MIN_HOLD_MS = 1_000;

/** One round trip over the actual overflow, with readable holds at both ends. */
export function createMarqueeAnimation({
	overflow,
	pxPerSecond = DEFAULT_PX_PER_SECOND,
	pauseRatio = DEFAULT_PAUSE_RATIO,
}: {
	overflow: number;
	pxPerSecond?: number;
	pauseRatio?: number;
}): { keyframes: Keyframe[]; options: KeyframeAnimationOptions } | null {
	if (!Number.isFinite(overflow) || overflow <= 1) return null;

	const speed =
		Number.isFinite(pxPerSecond) && pxPerSecond > 0
			? pxPerSecond
			: DEFAULT_PX_PER_SECOND;
	const ratio = Number.isFinite(pauseRatio)
		? Math.max(0, Math.min(0.8, pauseRatio))
		: DEFAULT_PAUSE_RATIO;
	const travelMs = (overflow / speed) * 1_000;
	const holdMs =
		ratio > 0 ? Math.max(MIN_HOLD_MS, (travelMs * ratio) / (1 - ratio)) : 0;
	const duration = 2 * (travelMs + holdMs);
	const start = "translateX(0px)";
	const end = `translateX(-${overflow}px)`;

	return {
		keyframes: [
			{ transform: start, offset: 0 },
			{ transform: start, offset: holdMs / duration },
			{ transform: end, offset: (holdMs + travelMs) / duration },
			{ transform: end, offset: (2 * holdMs + travelMs) / duration },
			{ transform: start, offset: 1 },
		],
		options: { duration, iterations: Number.POSITIVE_INFINITY, easing: "linear" },
	};
}

/* ────────────────────────────────────────────────────────────────────────────
 * Shared observation
 *
 * One marquee label used to cost 1 ResizeObserver + 1 IntersectionObserver +
 * 1 matchMedia + 2 listeners, which on a 200-card catalog tab meant ~250
 * observers and ~500 listeners. The animation itself is per-label (each
 * label has its own overflow, so its own keyframes), but *observing* is
 * global: one ResizeObserver, one IntersectionObserver, one
 * prefers-reduced-motion query and one visibilitychange listener now serve
 * every label on the page. They are created on the first registration and
 * torn down when the last label unmounts, so nothing is left running.
 * ──────────────────────────────────────────────────────────────────────────── */

interface MarqueeEntry {
	viewport: HTMLSpanElement;
	content: HTMLSpanElement;
	pxPerSecond?: number;
	pauseRatio?: number;
	visible: boolean;
	overflow: number;
	animation: Animation | null;
}

/** Observed element → the label it belongs to. Both halves map to one entry. */
const entriesByElement = new Map<Element, MarqueeEntry>();
/** Every live label, in registration order. Drives the whole-registry sweeps. */
const entries = new Set<MarqueeEntry>();

let resizeObserver: ResizeObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;
let motionQuery: MediaQueryList | null = null;
let refCount = 0;

const cancelAnimation = (entry: MarqueeEntry) => {
	entry.animation?.cancel();
	entry.animation = null;
};

const updateAnimation = (entry: MarqueeEntry) => {
	if (
		!entry.visible ||
		document.hidden ||
		motionQuery?.matches ||
		entry.overflow <= 1
	) {
		cancelAnimation(entry);
		return;
	}
	if (entry.animation) return;

	const cycle = createMarqueeAnimation({
		overflow: entry.overflow,
		pxPerSecond: entry.pxPerSecond,
		pauseRatio: entry.pauseRatio,
	});
	if (cycle) entry.animation = entry.content.animate(cycle.keyframes, cycle.options);
};

const measure = (entry: MarqueeEntry) => {
	const nextOverflow =
		entry.viewport.clientWidth > 0
			? Math.max(0, entry.content.scrollWidth - entry.viewport.clientWidth)
			: 0;
	if (nextOverflow !== entry.overflow) {
		cancelAnimation(entry);
		entry.overflow = nextOverflow;
	}
	updateAnimation(entry);
};

const updateAll = () => {
	for (const entry of entries) updateAnimation(entry);
};

const teardownObservers = () => {
	resizeObserver?.disconnect();
	intersectionObserver?.disconnect();
	motionQuery?.removeEventListener("change", updateAll);
	document.removeEventListener("visibilitychange", updateAll);
	resizeObserver = null;
	intersectionObserver = null;
	motionQuery = null;
};

const setupObservers = () => {
	resizeObserver = new ResizeObserver((observed) => {
		const dirty = new Set<MarqueeEntry>();
		for (const { target } of observed) {
			const entry = entriesByElement.get(target);
			if (entry) dirty.add(entry);
		}
		for (const entry of dirty) measure(entry);
	});

	intersectionObserver = new IntersectionObserver((observed) => {
		const dirty = new Set<MarqueeEntry>();
		for (const { target, isIntersecting } of observed) {
			const entry = entriesByElement.get(target);
			if (!entry || entry.visible === isIntersecting) continue;
			entry.visible = isIntersecting;
			dirty.add(entry);
		}
		for (const entry of dirty) updateAnimation(entry);
	});

	motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	motionQuery.addEventListener("change", updateAll);
	document.addEventListener("visibilitychange", updateAll);
};

/** Observe layout and visibility; no frame loop, timer, or idle animation. */
export function observeMarqueeText({
	viewport,
	content,
	pxPerSecond,
	pauseRatio,
}: {
	viewport: HTMLSpanElement;
	content: HTMLSpanElement;
	pxPerSecond?: number;
	pauseRatio?: number;
}): () => void {
	const entry: MarqueeEntry = {
		viewport,
		content,
		pxPerSecond,
		pauseRatio,
		visible: false,
		overflow: 0,
		animation: null,
	};

	entries.add(entry);
	entriesByElement.set(viewport, entry);
	// The intrinsic-width span also changes size after text edits and font loads.
	entriesByElement.set(content, entry);
	if (refCount++ === 0) setupObservers();

	resizeObserver?.observe(viewport);
	resizeObserver?.observe(content);
	intersectionObserver?.observe(viewport);
	measure(entry);

	return () => {
		entries.delete(entry);
		entriesByElement.delete(viewport);
		entriesByElement.delete(content);
		cancelAnimation(entry);
		resizeObserver?.unobserve(viewport);
		resizeObserver?.unobserve(content);
		intersectionObserver?.unobserve(viewport);
		if (--refCount === 0) teardownObservers();
	};
}

/**
 * Live observer/animation counts, for tests and diagnostics. Exposed read-only
 * so a caller can assert the shared registry really is shared.
 */
export function getMarqueeObserverStats(): {
	labels: number;
	observedElements: number;
	resizeObservers: ResizeObserver | null;
	intersectionObservers: IntersectionObserver | null;
	motionQueries: MediaQueryList | null;
} {
	return {
		labels: entries.size,
		observedElements: entriesByElement.size,
		resizeObservers: resizeObserver,
		intersectionObservers: intersectionObserver,
		motionQueries: motionQuery,
	};
}
