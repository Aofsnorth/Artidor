"use client";

/**
 * Aurora overlay — a thin, full-screen animated gradient shown while the
 * AI is "taking control" of the editor. Sits above the editor chrome
 * (header, panels, timeline, preview) but below the AI chat panel and
 * any dialogs, so the chat remains interactive and the permission dialog
 * stays visible.
 *
 * The overlay also acts as a pointer-events catcher on the editor area,
 * locking out clicks on everything except the AI chat. The chat panel
 * itself is rendered with a higher z-index in the editor page so it
 * stays above this overlay.
 */

import { useEffect, useState } from "react";
import { useAIControlStore } from "@/stores/ai-control-store";
import { cn } from "@/utils/ui";

export function AuroraOverlay() {
	const takeoverState = useAIControlStore((s) => s.takeoverState);
	const activeToolCall = useAIControlStore((s) => s.activeToolCall);
	const revokeApproval = useAIControlStore((s) => s.revokeApproval);

	// Mount/unmount fade — avoids a hard pop when the overlay appears.
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		if (takeoverState === "active") {
			// Next tick so the CSS transition can play from 0.
			const id = requestAnimationFrame(() => setMounted(true));
			return () => cancelAnimationFrame(id);
		}
		setMounted(false);
	}, [takeoverState]);

	if (takeoverState !== "active") return null;

	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-auto fixed inset-0 z-[200]",
				"transition-opacity duration-300",
				mounted ? "opacity-100" : "opacity-0",
			)}
			// Catch clicks on the editor area but let the chat panel
			// (rendered at z-[210] in the editor page) stay interactive.
			onClick={(e) => {
				// Clicking the overlay itself does nothing — the editor is
				// locked. But we surface a hint via cursor.
				e.stopPropagation();
			}}
			style={{ cursor: "not-allowed" }}
		>
			{/* Aurora gradient layer — thin, doesn't fully obscure content */}
			<div className="ai-aurora-overlay absolute inset-0" />

			{/* Subtle darkening so the aurora reads against any background */}
			<div className="absolute inset-0 bg-black/[0.18]" />

			{/* Moving scanline — gives a "scanning/working" feel */}
			<div
				className="ai-aurora-scanline absolute inset-x-0 top-0 h-px"
				style={{
					background:
						"linear-gradient(90deg, transparent, rgba(99,179,237,0.6), rgba(167,139,250,0.6), transparent)",
				}}
			/>

			{/* Animated border around the whole editor area */}
			<div className="ai-aurora-border absolute inset-0 rounded-none p-px">
				<div className="size-full rounded-none" />
			</div>

			{/* Status badge — top center, shows what the AI is doing */}
			<div className="absolute top-3 left-1/2 -translate-x-1/2">
				<div
					className={cn(
						"flex items-center gap-2 rounded-full border border-cyan-400/25",
						"bg-[#0a0a0f]/85 px-3.5 py-1.5 backdrop-blur-md",
						"shadow-[0_8px_32px_-8px_rgba(99,179,237,0.35)]",
					)}
				>
					<span className="relative flex size-2">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400/70" />
						<span className="relative inline-flex size-2 rounded-full bg-cyan-300" />
					</span>
					<span className="font-mono text-[10px] uppercase tracking-wider text-cyan-100/90">
						{activeToolCall?.label ?? "AI in control"}
					</span>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							revokeApproval();
						}}
						className={cn(
							"ml-1 rounded-full border border-white/15 px-2 py-0.5",
							"text-[9px] font-medium text-white/60",
							"transition-colors hover:border-red-400/40 hover:text-red-300",
						)}
					>
						Revoke
					</button>
				</div>
			</div>
		</div>
	);
}
