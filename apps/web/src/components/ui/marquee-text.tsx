"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/utils/ui";
import { observeMarqueeText } from "./marquee-text-animation";

interface MarqueeTextProps {
	children: string;
	className?: string;
	/** Fraction of the cycle spent holding at the ends, with a one-second minimum per hold. */
	pauseRatio?: number;
	/**
	 * Speed in pixels per second for the actual scroll portion. Slower
	 * values feel premium but waste time; faster values are harder to read.
	 */
	pxPerSecond?: number;
	style?: CSSProperties;
}

/** Centered titles when they fit; otherwise reveal each end at a constant speed. */
export function MarqueeText({
	children,
	className,
	pauseRatio,
	pxPerSecond,
	style,
}: MarqueeTextProps) {
	const containerRef = useRef<HTMLSpanElement | null>(null);
	const innerRef = useRef<HTMLSpanElement | null>(null);

	useEffect(() => {
		const viewport = containerRef.current;
		const content = innerRef.current;
		if (!viewport || !content || !children) return;

		return observeMarqueeText({ viewport, content, pxPerSecond, pauseRatio });
	}, [children, pxPerSecond, pauseRatio]);

	return (
		<span
			className={cn(
				"relative inline-block min-w-0 max-w-full overflow-hidden whitespace-nowrap text-center align-bottom",
				className,
			)}
			style={style}
			title={children}
		>
			<span ref={containerRef} className="block overflow-hidden">
				<span ref={innerRef} className="block w-max min-w-full">
					{children}
				</span>
			</span>
		</span>
	);
}
