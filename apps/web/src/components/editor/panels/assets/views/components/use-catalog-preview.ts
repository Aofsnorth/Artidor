"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Observe the card itself: content-visibility can suppress child intersections. */
export function useCatalogPreviewVisibility() {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		let intersecting = typeof IntersectionObserver === "undefined";
		const update = () => setVisible(intersecting && !document.hidden);
		const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
			for (const entry of entries) {
				intersecting = entry.isIntersecting;
			}
			update();
		});
		observer?.observe(node);
		document.addEventListener("visibilitychange", update);
		update();
		return () => {
			observer?.disconnect();
			document.removeEventListener("visibilitychange", update);
		};
	}, []);

	return { ref, visible };
}

/** Motion runs only for an on-screen, hovered or keyboard-focused card. */
export function useCatalogPreviewMotion() {
	const { ref, visible } = useCatalogPreviewVisibility();
	const reducedMotion = useReducedMotion();
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);

	return {
		ref,
		active: visible && !reducedMotion && (hovered || focused),
		interactionProps: {
			onPointerEnter: (event: React.PointerEvent<HTMLDivElement>) => {
				if (event.pointerType !== "touch") setHovered(true);
			},
			onPointerLeave: () => setHovered(false),
			onFocus: () => setFocused(true),
			onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
				if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
			},
		},
	};
}
