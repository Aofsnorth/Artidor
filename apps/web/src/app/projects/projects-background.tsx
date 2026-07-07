"use client";

/**
 * ProjectsBackground — elegant gray canvas background for the projects page.
 *
 * A layered gray gradient base with a subtle diamond/grid pattern, soft
 * animated wave lines tuned for a light-on-gray aesthetic, a cool radial
 * glow for depth, and a vignette + bottom fade for legibility.
 *
 * Design direction (from research: "subtle, thoughtful patterns add depth
 * without drawing attention"; seamless gray/white diamond motifs):
 *  - Base: layered gray gradient (#1a1a1d → #232328) — not flat, not pure black
 *  - Pattern: subtle diamond grid, low-contrast white-on-gray, top-left fade
 *  - Waves: thin horizontal sine lines, very low opacity, slow drift
 *  - Glow: cool blue-gray radial bloom at top-centre for depth
 *  - Vignette: soft edge darkening for cinematic framing
 *  - Bottom fade: smooth transition into the base
 *
 * Layout contract:
 *   - absolutely positioned, full bleed, behind all page chrome
 *   - uses positive z-index (z-0 → z-1) because the <body> element
 *     carries its own bg-background layer that would cover any
 *     negative z-index elements
 *   - `aria-hidden` so screen readers skip it
 *   - respects `prefers-reduced-motion`
 *   - the parent page container MUST have `z-20` (or higher) so
 *     the page chrome renders above these background layers
 */

import { useEffect, useRef } from "react";

export function ProjectsBackground() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		);
		if (prefersReducedMotion.matches) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let frameId = 0;
		let cssWidth = 0;
		let cssHeight = 0;

		const resize = () => {
			const rect = canvas.getBoundingClientRect();
			cssWidth = rect.width;
			cssHeight = rect.height;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.round(cssWidth * dpr);
			canvas.height = Math.round(cssHeight * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		// Draw horizontal wave lines — thin, very low-opacity sine curves
		// that drift slowly. Tuned for a light-on-gray aesthetic: slightly
		// warmer alpha and gentler amplitude than the old black version.
		const draw = (timeSeconds: number) => {
			ctx.clearRect(0, 0, cssWidth, cssHeight);

			const lineCount = 14;
			const baseSpacing = cssHeight / (lineCount + 1);

			for (let i = 1; i <= lineCount; i++) {
				const baseY = baseSpacing * i;
				const phase = timeSeconds * 0.10 + i * 0.7;
				const amplitude = 10 + Math.sin(timeSeconds * 0.07 + i) * 5;
				const frequency = 0.0025 + Math.sin(timeSeconds * 0.04 + i * 1.3) * 0.0008;

				// Fade lines towards edges
				const yNorm = baseY / cssHeight;
				const edgeFade = Math.sin(yNorm * Math.PI);
				const alpha = 0.035 * edgeFade;

				if (alpha < 0.002) continue;

				ctx.beginPath();
				// Soft warm-white lines on gray — elegant, not stark.
				ctx.strokeStyle = `rgba(220, 220, 230, ${alpha})`;
				ctx.lineWidth = 0.7;

				for (let x = 0; x <= cssWidth; x += 4) {
					const y =
						baseY +
						Math.sin(x * frequency + phase) * amplitude +
						Math.sin(x * frequency * 2.3 + phase * 1.4) * amplitude * 0.3;

					if (x === 0) {
						ctx.moveTo(x, y);
					} else {
						ctx.lineTo(x, y);
					}
				}
				ctx.stroke();
			}
		};

		const tick = (timestamp: number) => {
			draw(timestamp / 1000);
			frameId = window.requestAnimationFrame(tick);
		};

		resize();
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);
		frameId = window.requestAnimationFrame(tick);

		return () => {
			window.cancelAnimationFrame(frameId);
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<>
			{/* Base layer — elegant gray gradient. Not flat, not pure black.
			    A subtle vertical gradient from #1a1a1d (top) to #232328 (bottom)
			    gives the page depth without being heavy. z-0 places this above
			    the body's bg-background layer. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0"
				style={{
					background:
						"linear-gradient(180deg, #1a1a1d 0%, #1e1e22 40%, #232328 100%)",
				}}
			/>

			{/* Diamond grid pattern — top-left decorative tile, faded radially.
			    Low-contrast white-on-gray diamond motif for an elegant texture
			    that adds depth without drawing attention. */}
			<div
				aria-hidden
				className="pointer-events-none absolute top-0 left-0 z-0 size-[360px] opacity-60"
				style={{ color: "rgba(255, 255, 255, 0.06)" }}
			>
				<svg
					width="360"
					height="360"
					viewBox="0 0 360 360"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					role="presentation"
				>
					<defs>
						<pattern
							id="projects-diamond"
							x="0"
							y="0"
							width="36"
							height="36"
							patternUnits="userSpaceOnUse"
						>
							{/* Diamond grid — rotated squares forming an elegant
							    lattice. Thin strokes, wide spacing. */}
							<path
								d="M18 2 L34 18 L18 34 L2 18 Z"
								fill="none"
								stroke="currentColor"
								strokeWidth="0.6"
							/>
						</pattern>
						<mask id="projects-diamond-fade">
							<radialGradient
								id="projects-diamond-rg"
								cx="0"
								cy="0"
								r="360"
								gradientUnits="userSpaceOnUse"
							>
								<stop offset="0%" stopColor="white" stopOpacity="1" />
								<stop offset="100%" stopColor="white" stopOpacity="0" />
							</radialGradient>
							<rect width="360" height="360" fill="url(#projects-diamond-rg)" />
						</mask>
					</defs>
					<rect
						width="360"
						height="360"
						fill="url(#projects-diamond)"
						mask="url(#projects-diamond-fade)"
					/>
				</svg>
			</div>

			{/* Animated wave lines — thin horizontal sine waves that
			    drift slowly. Very low opacity warm-white on gray. */}
			<canvas
				ref={canvasRef}
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0 size-full"
			/>

			{/* Cool radial glow — a soft blue-gray light bloom at the
			    top-centre that gives the page depth and elegance. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-[1]"
				style={{
					background:
						"radial-gradient(ellipse 900px 600px at 50% -10%, rgba(180, 190, 210, 0.05) 0%, transparent 70%)",
				}}
			/>

			{/* Vignette — darkens edges for cinematic depth and
			    focus on the centre content area. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-[1]"
				style={{
					background:
						"radial-gradient(ellipse 100% 100% at 50% 0%, transparent 50%, rgba(10, 10, 12, 0.5) 100%)",
				}}
			/>

			{/* Bottom fade — smooth transition from content area to
			    the darker base, grounding the page. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-[1]"
				style={{
					background:
						"linear-gradient(to bottom, transparent 80%, #161618 100%)",
				}}
			/>
		</>
	);
}
