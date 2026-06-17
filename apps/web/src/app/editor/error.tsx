"use client";

/**
 * Editor-route error boundary. Specialises the global error UI for
 * the editor's chrome — keeps the dark luxury palette and offers a
 * path back to the projects list.
 */

import { useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

export default function EditorError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// eslint-disable-next-line no-console
		console.error("[Artidor/editor] Route error:", error);
	}, [error]);

	return (
		<div className="dark editing-screen flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#111114] text-white">
			<div className="panel glass-strong relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 p-8 text-center">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 -z-10"
					style={{
						background:
							"radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,200,150,0.08), transparent 70%)",
					}}
				/>
				<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.05]">
					<HugeiconsIcon
						icon={AlertCircleIcon}
						className="size-5 text-amber-200"
					/>
				</div>
				<h1 className="font-serif text-2xl font-medium italic tracking-[-0.01em]">
					Editor hit a snag.
				</h1>
				<p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">
					Your project is still saved. Reloading usually fixes transient state
					glitches.
				</p>
				{error.digest && (
					<p className="mt-3 font-mono text-[10.5px] text-white/35">
						digest: {error.digest}
					</p>
				)}
				<div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
					<Button
						type="button"
						onClick={reset}
						className="h-9 rounded-full bg-white px-4 text-[13px] font-medium text-[#0a0a0c] hover:bg-white/90"
					>
						Reload editor
					</Button>
					<Link href="/projects">
						<Button
							type="button"
							variant="outline"
							className="h-9 rounded-full border-white/15 bg-white/[0.04] px-4 text-[13px] font-medium text-white/90 hover:bg-white/[0.08]"
						>
							Back to projects
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
