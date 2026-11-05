/**
 * Prismatic Optical Darkroom Shell.
 *
 * Establishes the pitch-black obsidian canvas (`#020204`), blown-glass
 * chromatic refraction plates, and subtle analog film grain shared across
 * the landing experience — free of decorative grid clutter or HUD chrome.
 */

import type { ReactNode } from "react";

export function PageShell({
	children,
	variant = "default",
}: {
	children: ReactNode;
	variant?: "default" | "marketing" | "docs";
}) {
	return (
		<div
			className="relative isolate min-h-screen bg-[#020204] text-white selection:bg-white/20 selection:text-white"
			data-page-shell={variant}
		>
			{/* Upper Prismatic Crystalline Refraction Field */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 -z-30 h-[120svh] overflow-hidden"
			>
				<div
					className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 mix-blend-screen"
					style={{
						backgroundImage: "url(/wallpaper/prism-butterfly.jpg)",
						maskImage:
							"radial-gradient(ellipse 72% 65% at 50% 38%, black 15%, rgba(0,0,0,0.5) 55%, transparent 85%)",
						WebkitMaskImage:
							"radial-gradient(ellipse 72% 65% at 50% 38%, black 15%, rgba(0,0,0,0.5) 55%, transparent 85%)",
					}}
				/>
				<div
					className="absolute -top-24 left-1/2 h-[920px] w-[1400px] -translate-x-1/2 bg-cover bg-center bg-no-repeat opacity-25 mix-blend-screen blur-[2px]"
					style={{
						backgroundImage: "url(/wallpaper/liquid-dispersion.jpg)",
						maskImage:
							"radial-gradient(ellipse 62% 55% at 50% 36%, black 10%, transparent 76%)",
						WebkitMaskImage:
							"radial-gradient(ellipse 62% 55% at 50% 36%, black 10%, transparent 76%)",
					}}
				/>
			</div>

			{/* Mid & Lower Iridescent Blown-Glass Caustics */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-[105svh] bottom-0 -z-30 overflow-hidden"
			>
				<div
					className="sticky top-0 h-screen w-full bg-cover bg-center bg-no-repeat opacity-[0.18] mix-blend-screen"
					style={{
						backgroundImage: "url(/wallpaper/optical-caustics.jpg)",
						maskImage:
							"radial-gradient(ellipse 78% 68% at 50% 50%, black 10%, transparent 80%)",
						WebkitMaskImage:
							"radial-gradient(ellipse 78% 68% at 50% 50%, black 10%, transparent 80%)",
					}}
				/>
			</div>

			{/* Deep Obsidian Vignette */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
				style={{
					background:
						"linear-gradient(180deg, rgba(2,2,4,0.3) 0%, rgba(2,2,4,0.72) 48%, rgba(2,2,4,0.92) 100%)",
				}}
			/>

			{/* Subtle Analog Film Grain */}
			<div
				aria-hidden
				className="pointer-events-none fixed inset-0 -z-10 opacity-[0.038] mix-blend-overlay"
				style={{
					backgroundImage:
						"radial-gradient(rgba(255,255,255,0.7) 0.5px, transparent 0.6px)",
					backgroundSize: "3px 3px",
				}}
			/>

			<div className="relative">{children}</div>
		</div>
	);
}
