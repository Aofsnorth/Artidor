"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/utils/ui";

interface MarqueeTextProps {
	children: string;
	className?: string;
	/**
	 * Fraction of the cycle (0..1) spent holding at the right end before
	 * the loop restarts. Larger values feel less rushed but the loop
	 * also feels longer overall. 0.3 is a good default.
	 */
	pauseRatio?: number;
	/**
	 * Speed in pixels per second for the actual scroll portion. Slower
	 * values feel premium but waste time; faster values are harder to read.
	 */
	pxPerSecond?: number;
	style?: CSSProperties;
}

/**
 * Horizontally scrolling text that only animates when the content actually
 * overflows its parent. Static (no animation) when the text fits — this
 * matters because the inspector summary runs marquees for short names
 * without overflow looks visually noisy.
 *
 * Implementation: the inner span is duplicated (two copies) so the scroll
 * loop is seamless. A single keyframe (`marquee-cycle`) bakes both the
 * scroll and the pause into one animation: it scrolls for the first
 * portion of the cycle, then holds for the remainder. This is more
 * reliable than a multi-animation approach because the entire cycle is
 * driven by one timeline, so there's no risk of the two animations
 * drifting apart on slow frames.
 */
export function MarqueeText({
	children,
	className,
	pauseRatio = 0.3,
	pxPerSecond = 40,
	style,
}: MarqueeTextProps) {
	const containerRef = useRef<HTMLSpanElement | null>(null);
	const innerRef = useRef<HTMLSpanElement | null>(null);
	const [shouldScroll, setShouldScroll] = useState(false);
	const [duration, setDuration] = useState(0);

	// Measure overflow + recompute duration whenever the text or width
	// changes. ResizeObserver catches container width changes (panel
	// resize, summary-size dropdown, etc.).
	useEffect(() => {
		const container = containerRef.current;
		const inner = innerRef.current;
		if (!container || !inner) return;

		const measure = () => {
			// clientWidth is the visible area; scrollWidth is the full
			// text width. The first copy is what we measure; the
			// duplicated second copy sits in the gutter and never
			// affects the overflow check.
			const overflow = inner.scrollWidth - container.clientWidth;
			if (overflow <= 1) {
				setShouldScroll(false);
				return;
			}
			setShouldScroll(true);
			const scrollSeconds = overflow / pxPerSecond;
			// total cycle = scroll + pause. Clamp pauseRatio to avoid
			// weird values from a caller passing 0/negative/large args.
			const ratio = Math.max(0, Math.min(0.8, pauseRatio));
			const totalSeconds = scrollSeconds / (1 - ratio);
			setDuration(totalSeconds);
		};

		measure();
		const ro = new ResizeObserver(() => measure());
		ro.observe(container);
		// also re-measure when the text content changes (the dependency
		// array below handles re-runs on `children`, but RO catches
		// font-load-driven reflows that don't change `children`).
		return () => ro.disconnect();
	}, [children, pxPerSecond, pauseRatio]);

	const animationStyle: CSSProperties | undefined =
		shouldScroll && duration > 0
			? { animationDuration: `${duration}s` }
			: undefined;

	return (
		<span
			ref={containerRef}
			className={cn(
				"relative inline-block max-w-full overflow-hidden whitespace-nowrap align-bottom",
				className,
			)}
			style={style}
		>
			{/* Two copies, side-by-side. The CSS animation translates the
			   track left by 50% so the second copy slides in from the
			   right exactly as the first copy exits the left edge. */}
			<span
				ref={innerRef}
				className={cn(
					"inline-block whitespace-nowrap",
					shouldScroll && "animate-marquee-cycle",
				)}
				style={animationStyle}
			>
				<span className="inline-block pr-8">{children}</span>
				{shouldScroll && (
					<span aria-hidden className="inline-block pr-8">
						{children}
					</span>
				)}
			</span>
		</span>
	);
}
