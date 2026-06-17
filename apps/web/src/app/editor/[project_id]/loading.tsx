/**
 * Loading skeleton for the editor route.
 *
 * Renders while `app/editor/[project_id]/page.tsx` is being fetched /
 * hydrated. Shows a glassmorphic skeleton that mirrors the actual
 * editor's layout (header + 3-panel workspace + timeline strip) so
 * the perceived load time is much shorter than the real one.
 */

import { Sparkles } from "lucide-react";

export default function EditorLoading() {
	return (
		<div className="dark editing-screen flex h-screen w-screen flex-col overflow-hidden bg-[#111114] text-white">
			{/* Top bar skeleton */}
			<div className="h-14 shrink-0 border-b border-white/10 bg-black/40 backdrop-blur">
				<div className="flex h-full items-center gap-3 px-4">
					<div className="size-7 animate-pulse rounded-md bg-white/[0.06]" />
					<div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
					<div className="flex-1" />
					<div className="h-7 w-20 animate-pulse rounded-full bg-white/[0.06]" />
				</div>
			</div>

			{/* Workspace skeleton */}
			<div className="flex min-h-0 flex-1 gap-2 p-2">
				{/* Tab bar */}
				<div className="w-[4.5rem] shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-2">
					<div className="flex flex-col gap-1">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								// Static skeleton, index is the only stable id.
								// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
								key={i}
								className="h-[1.95rem] animate-pulse rounded-lg bg-white/[0.04]"
								style={{ animationDelay: `${i * 80}ms` }}
							/>
						))}
					</div>
				</div>

				{/* Assets panel + preview + properties */}
				<div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-1 lg:grid-cols-[18rem_1fr_18rem]">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
							key={i}
							className="rounded-xl border border-white/10 bg-white/[0.03]"
							style={{ animationDelay: `${i * 100}ms` }}
						/>
					))}
				</div>
			</div>

			{/* Timeline skeleton */}
			<div className="h-44 shrink-0 border-t border-white/10 bg-black/40">
				<div className="flex h-full items-center justify-center">
					<div className="flex items-center gap-2 text-[12px] text-white/45">
						<Sparkles className="size-3.5 animate-pulse text-white/70" />
						<span>Loading editor…</span>
					</div>
				</div>
			</div>
		</div>
	);
}
