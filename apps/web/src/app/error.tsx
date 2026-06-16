"use client";

/**
 * Route-level error boundary. Next.js surfaces any uncaught render
 * error to this component. We show a calm, on-brand fallback with
 * a single retry action so the user is never stuck on a stack trace.
 */

import { useEffect } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// eslint-disable-next-line no-console
		console.error("[Artidor] Route error:", error);
	}, [error]);

	return (
		<div className="bg-[#0a0a0c] flex min-h-screen items-center justify-center px-6 text-white">
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
					Something broke.
				</h1>
				<p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">
					Artidor hit an unexpected error rendering this page. The editor itself
					is still on disk — try again, or jump back to your projects.
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
						Try again
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
