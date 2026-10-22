import type { ReactNode } from "react";
import { cn } from "@/utils/ui";

/**
 * Page-level chrome shared by landing, marketing, and content routes.
 *
 * When `variant="marketing"`, applies the Editorial Monograph design
 * system (`.editorial-landing`) inspired by the print-poster reference:
 * warm stone canvas (#D2CEC5), crisp 1px architectural hairlines, and
 * subtle matte paper grain without dark cosmic wallpapers or glassmorphism.
 */
export function PageShell({
	children,
	variant = "default",
}: {
	children: ReactNode;
	variant?: "default" | "marketing" | "docs";
}) {
	const isMarketing = variant === "marketing";

	return (
		<div
			className={cn(
				"relative isolate min-h-screen overflow-x-clip",
				isMarketing
					? "editorial-landing bg-[#D2CEC5] text-[#141413]"
					: "bg-[#0a0a0c] text-white",
			)}
			data-page-shell={variant}
		>
			{isMarketing ? (
				<>
					{/* Subtle warm tonal vignette matching the studio lighting of the poster reference */}
					<div
						aria-hidden="true"
						className="pointer-events-none fixed inset-0 -z-20"
						style={{
							background:
								"radial-gradient(ellipse 85% 75% at 62% 34%, rgba(234, 231, 223, 0.55) 0%, rgba(210, 206, 197, 0.2) 55%, rgba(182, 176, 165, 0.45) 100%)",
						}}
					/>

					{/* Fine matte print grain — pure CSS, zero external network or heavy image decode */}
					<div
						aria-hidden="true"
						className="pointer-events-none fixed inset-0 -z-10 opacity-[0.045] mix-blend-multiply"
						style={{
							backgroundImage:
								"radial-gradient(rgba(20, 20, 19, 0.75) 0.55px, transparent 0.65px)",
							backgroundSize: "3px 3px",
						}}
					/>

					{/* Architectural vertical margin hairlines on wide viewports */}
					<div
						aria-hidden="true"
						className="pointer-events-none fixed inset-y-0 left-1/2 -z-10 hidden w-full max-w-[1440px] -translate-x-1/2 border-x border-[#141413]/[0.08] xl:block"
					/>
				</>
			) : (
				<>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 -z-20 min-h-screen"
						style={{
							backgroundImage: "url(/wallpaper/hero-fantasy-2x.webp)",
							backgroundRepeat: "no-repeat",
							backgroundSize: "cover",
							backgroundPosition: "center",
						}}
					/>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 -z-10 min-h-screen"
						style={{
							background:
								"linear-gradient(180deg, rgba(4,4,6,0.86) 0%, rgba(4,4,6,0.76) 18%, rgba(4,4,6,0.72) 50%, rgba(4,4,6,0.80) 80%, rgba(4,4,6,0.90) 100%)",
						}}
					/>
				</>
			)}

			<div className="relative">{children}</div>
		</div>
	);
}
