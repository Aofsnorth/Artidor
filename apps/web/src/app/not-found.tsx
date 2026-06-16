import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 / not-found page. Stays on-brand — dark luxury glassmorphism
 * so users don't bounce when they hit a broken link.
 */

export default function NotFound() {
	return (
		<div className="bg-[#0a0a0c] flex min-h-screen items-center justify-center px-6 text-white">
			<div
				aria-hidden
				className="pointer-events-none fixed inset-0 -z-10"
				style={{
					background:
						"radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.05), transparent 70%)",
				}}
			/>
			<div className="panel glass-strong relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 p-10 text-center">
				<div className="font-serif text-7xl font-medium italic leading-none tracking-[-0.04em] text-white/85">
					404
				</div>
				<h1 className="mt-4 font-serif text-3xl font-medium italic tracking-[-0.01em]">
					That page wandered off.
				</h1>
				<p className="mt-3 text-[14px] font-light leading-relaxed text-white/65">
					The link is broken, or the page never existed. Try the editor — most
					things live there now.
				</p>
				<div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
					<Link href="/projects">
						<Button className="h-10 rounded-full bg-white px-5 text-[13px] font-medium text-[#0a0a0c] hover:bg-white/90">
							Open the editor
						</Button>
					</Link>
					<Link href="/">
						<Button
							variant="outline"
							className="h-10 rounded-full border-white/15 bg-white/[0.04] px-5 text-[13px] font-medium text-white/90 hover:bg-white/[0.08]"
						>
							Back home
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
