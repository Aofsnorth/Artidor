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
	const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	let visible = false;
	let overflow = 0;
	let animation: Animation | null = null;

	const cancelAnimation = () => {
		animation?.cancel();
		animation = null;
	};
	const updateAnimation = () => {
		if (!visible || document.hidden || motionQuery.matches || overflow <= 1) {
			cancelAnimation();
			return;
		}
		if (animation) return;

		const cycle = createMarqueeAnimation({ overflow, pxPerSecond, pauseRatio });
		if (cycle) animation = content.animate(cycle.keyframes, cycle.options);
	};
	const measure = () => {
		const nextOverflow =
			viewport.clientWidth > 0
				? Math.max(0, content.scrollWidth - viewport.clientWidth)
				: 0;
		if (nextOverflow !== overflow) {
			cancelAnimation();
			overflow = nextOverflow;
		}
		updateAnimation();
	};

	const resizeObserver = new ResizeObserver(measure);
	resizeObserver.observe(viewport);
	// The intrinsic-width span also changes size after text edits and font loads.
	resizeObserver.observe(content);
	const intersectionObserver = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.target === viewport) visible = entry.isIntersecting;
		}
		updateAnimation();
	});
	intersectionObserver.observe(viewport);
	motionQuery.addEventListener("change", updateAnimation);
	document.addEventListener("visibilitychange", updateAnimation);
	measure();

	return () => {
		resizeObserver.disconnect();
		intersectionObserver.disconnect();
		motionQuery.removeEventListener("change", updateAnimation);
		document.removeEventListener("visibilitychange", updateAnimation);
		cancelAnimation();
	};
}
