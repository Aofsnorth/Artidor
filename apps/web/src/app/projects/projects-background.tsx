"use client";

/**
 * ProjectsBackground — clean slate base with vignettes and radial washes for the projects page.
 * Completely removed the wireframe primitives and particle fields (shape lines) to keep it clean.
 */

export function ProjectsBackground() {
	return (
		<div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-[#08090c]">
			{/* Soft cyan + violet radial wash for atmospheric depth */}
			<div
				className="absolute inset-0"
				style={{
					background: [
						"radial-gradient(ellipse 900px 600px at 18% 22%, rgba(120, 140, 220, 0.08) 0%, transparent 65%)",
						"radial-gradient(ellipse 800px 500px at 82% 78%, rgba(180, 110, 220, 0.07) 0%, transparent 65%)",
					].join(", "),
				}}
			/>

			{/* Vignette */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse 100% 100% at 50% 0%, transparent 55%, rgba(6, 7, 10, 0.65) 100%)",
				}}
			/>

			{/* Bottom fade */}
			<div
				className="absolute inset-0"
				style={{
					background:
						"linear-gradient(to bottom, transparent 80%, #08090c 100%)",
				}}
			/>
		</div>
	);
}
