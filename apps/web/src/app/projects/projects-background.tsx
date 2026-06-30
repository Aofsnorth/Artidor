"use client";

/**
 * ProjectsBackground — PinedIn-inspired background layer for the
 * projects page. Replaces the old Covenant artwork wallpaper with a
 * dark canvas, subtle hex pattern top-left, soft animated gradient
 * wash, and a legibility vignette. No external dependencies, no image
 * fetch.
 *
 * Layout contract:
 *   - absolutely positioned, full bleed, behind all page chrome
 *   - `aria-hidden` so screen readers skip it
 *   - respects `prefers-reduced-motion`
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

		const draw = (timeSeconds: number) => {
			ctx.clearRect(0, 0, cssWidth, cssHeight);

			// Soft drifting wash — three low-opacity radial gradients
			// that slowly drift. Hues stay away from the banned
			// 260-310 (purple/violet) and 160-200 (cyan) AI bands.
			const drift = Math.sin(timeSeconds * 0.25) * 18;
			const driftY = Math.cos(timeSeconds * 0.18) * 14;

			const washes: Array<{
				x: number;
				y: number;
				rx: number;
				ry: number;
				color: string;
			}> = [
				{
					x: cssWidth * 0.28 + drift,
					y: cssHeight * 0.22 + driftY,
					rx: cssWidth * 0.48,
					ry: cssHeight * 0.38,
					color: "rgba(90, 110, 190, 0.055)",
				},
				{
					x: cssWidth * 0.72 - drift,
					y: cssHeight * 0.62 - driftY,
					rx: cssWidth * 0.38,
					ry: cssHeight * 0.46,
					color: "rgba(180, 150, 170, 0.045)",
				},
				{
					x: cssWidth * 0.5,
					y: cssHeight * 0.92 + driftY * 0.5,
					rx: cssWidth * 0.55,
					ry: cssHeight * 0.42,
					color: "rgba(160, 130, 90, 0.04)",
				},
			];

		for (const wash of washes) {
				ctx.save();
				ctx.beginPath();
				ctx.ellipse(wash.x, wash.y, wash.rx, wash.ry, 0, 0, Math.PI * 2);
				const grad = ctx.createRadialGradient(
					wash.x,
					wash.y,
					0,
					wash.x,
					wash.y,
					Math.max(wash.rx, wash.ry),
				);
				grad.addColorStop(0, wash.color);
				grad.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = grad;
				ctx.fill();
				ctx.restore();
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
			{/* Base canvas — off-black matching PinedIn (#050507), not pure #000. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-20 bg-[#050507]"
			/>

			{/* Hex pattern — top-left decorative tile, faded radially. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-20 opacity-[0.08]"
				style={{
					maskImage:
						"radial-gradient(ellipse 38% 48% at 10% 12%, black 0%, transparent 100%)",
					WebkitMaskImage:
						"radial-gradient(ellipse 38% 48% at 10% 12%, black 0%, transparent 100%)",
				}}
			>
				<svg
					width="100%"
					height="100%"
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
								stroke="white"
								strokeWidth="0.8"
							/>
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#projects-hex)" />
				</svg>
			</div>

			{/* Animated wash — very low opacity drifting radial gradients. */}
			<canvas
				ref={canvasRef}
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-20 size-full"
			/>

			{/* Vignette + legibility wash — keeps foreground chrome readable. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10"
				style={{
					background: [
						"radial-gradient(ellipse at center, transparent 55%, rgba(5, 5, 7, 0.55) 100%)",
						"linear-gradient(180deg, rgba(5, 5, 7, 0.40) 0%, rgba(5, 5, 7, 0.10) 35%, rgba(5, 5, 7, 0.18) 70%, rgba(5, 5, 7, 0.55) 100%)",
					].join(", "),
				}}
			/>
		</>
	);
}
