"use client";

/**
 * ProjectsBackground — PinedIn-inspired background layer for the
 * projects page. Dark canvas with a top-left hex pattern, animated
 * horizontal wave lines, a soft white radial glow top-centre, and a
 * vignette + bottom fade for legibility. No external dependencies, no
 * image fetch.
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

		// Draw horizontal wave lines — thin, low-opacity sine curves
		// that drift slowly, matching the PinedIn "line-waves" aesthetic.
		const draw = (timeSeconds: number) => {
			ctx.clearRect(0, 0, cssWidth, cssHeight);

			const lineCount = 18;
			const baseSpacing = cssHeight / (lineCount + 1);

			for (let i = 1; i <= lineCount; i++) {
				const baseY = baseSpacing * i;
				const phase = timeSeconds * 0.12 + i * 0.7;
				const amplitude = 12 + Math.sin(timeSeconds * 0.08 + i) * 6;
				const frequency = 0.003 + Math.sin(timeSeconds * 0.05 + i * 1.3) * 0.001;

				// Fade lines towards edges
				const yNorm = baseY / cssHeight;
				const edgeFade = Math.sin(yNorm * Math.PI);
				const alpha = 0.04 * edgeFade;

				if (alpha < 0.002) continue;

				ctx.beginPath();
				ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
				ctx.lineWidth = 0.8;

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
			{/* Base canvas — pure black matching PinedIn (--bg: #000).
			    z-0 places this above the body's bg-background layer. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0 bg-black"
			/>

			{/* Hex pattern — top-left decorative tile, faded radially.
			    Opacity 0.8 + 12% white matches PinedIn's hex treatment. */}
			<div
				aria-hidden
				className="pointer-events-none absolute top-0 left-0 z-0 size-[320px] opacity-80"
				style={{ color: "rgba(255, 255, 255, 0.12)" }}
			>
				<svg
					width="320"
					height="320"
					viewBox="0 0 320 320"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					role="presentation"
				>
					<defs>
						<pattern
							id="projects-hex"
							x="0"
							y="0"
							width="40"
							height="46"
							patternUnits="userSpaceOnUse"
						>
							<polygon
								points="20,2 38,12 38,34 20,44 2,34 2,12"
								fill="none"
								stroke="currentColor"
								strokeWidth="0.8"
							/>
						</pattern>
						<mask id="projects-hex-fade">
							<radialGradient
								id="projects-hex-rg"
								cx="0"
								cy="0"
								r="320"
								gradientUnits="userSpaceOnUse"
							>
								<stop offset="0%" stopColor="white" stopOpacity="1" />
								<stop offset="100%" stopColor="white" stopOpacity="0" />
							</radialGradient>
							<rect width="320" height="320" fill="url(#projects-hex-rg)" />
						</mask>
					</defs>
					<rect
						width="320"
						height="320"
						fill="url(#projects-hex)"
						mask="url(#projects-hex-fade)"
					/>
				</svg>
			</div>

			{/* Animated wave lines — thin horizontal sine waves that
			    drift slowly, matching PinedIn's line-waves-container. */}
			<canvas
				ref={canvasRef}
				aria-hidden
				className="pointer-events-none absolute inset-0 z-0 size-full"
			/>

			{/* White radial glow — the signature PinedIn "light bloom"
			    at the top-centre that gives the page depth. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-[1]"
				style={{
					background:
						"radial-gradient(ellipse 900px 600px at 50% -10%, rgba(255, 255, 255, 0.04) 0%, transparent 70%)",
				}}
			/>

			{/* Vignette — darkens edges for cinematic depth,
			    matching PinedIn's body::before treatment. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-[1]"
				style={{
					background:
						"radial-gradient(ellipse 100% 100% at 50% 0%, transparent 50%, rgba(0, 0, 0, 0.4) 100%)",
				}}
			/>

			{/* Bottom fade — smooth transition from content area to
			    the black base, matching PinedIn's hero-overlay-gradient. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 z-[1]"
				style={{
					background:
						"linear-gradient(to bottom, transparent 80%, black 100%)",
				}}
			/>
		</>
	);
}
