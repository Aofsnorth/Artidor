"use client";

/**
 * Aurora overlay — a thin animated border glow shown while the AI is
 * "taking control" of the editor. Only the border is visible; the
 * center is fully transparent so the editor content stays readable.
 *
 * When co-edit mode is enabled (Settings → AI), the overlay does NOT
 * capture pointer events, so the user can edit alongside the AI.
 * When co-edit is off (default), the overlay locks the editor chrome.
 *
 * The overlay sits above the editor chrome (z-200) but below the AI
 * chat panel (z-210), so the chat always stays interactive.
 */

import { useEffect, useState, useCallback } from "react";
import { useAIControlStore } from "@/stores/ai-control-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";

export function AuroraOverlay() {
	const takeoverState = useAIControlStore((s) => s.takeoverState);
	const activeToolCall = useAIControlStore((s) => s.activeToolCall);
	const revokeApproval = useAIControlStore((s) => s.revokeApproval);
	const coEditMode = useSettingsStore((s) => s.aiCoEditMode);
	const editor = useEditor();

	// Revoke: stop the AI manager's current processing AND clear the
	// session approval. Without cancelling the AI manager, the tool
	// execution loop keeps running because the abort signal is never
	// triggered — the store state change alone doesn't stop it.
	const handleRevoke = useCallback(() => {
		editor.ai.cancel();
		revokeApproval();
	}, [editor, revokeApproval]);

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
				"fixed inset-0 z-[200]",
				"transition-opacity duration-300",
				mounted ? "opacity-100" : "opacity-0",
				// Only lock the editor when co-edit mode is OFF.
				coEditMode ? "pointer-events-none" : "pointer-events-auto",
			)}
			// When locking, catch clicks so they don't reach the editor.
			onClick={(e) => {
				if (!coEditMode) e.stopPropagation();
			}}
			style={{ cursor: coEditMode ? "default" : "not-allowed" }}
		>
			{/* Animated border — thin white glow around the editor area.
			    Center is transparent; only the border shimmer is visible. */}
			<div className="ai-aurora-border absolute inset-0 p-px">
				<div className="ai-aurora-border-inner size-full" />
			</div>

			{/* Status badge — top center, shows what the AI is doing */}
			<div className="absolute top-3 left-1/2 -translate-x-1/2">
				<div
					className={cn(
						"flex items-center gap-2 rounded-full border border-white/20",
						"bg-[#0a0a0f]/85 px-3.5 py-1.5 backdrop-blur-md",
						"shadow-[0_8px_32px_-8px_rgba(255,255,255,0.15)]",
					)}
				>
					<span className="relative flex size-2">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60" />
						<span className="relative inline-flex size-2 rounded-full bg-white/90" />
					</span>
					<span className="font-mono text-[10px] uppercase tracking-wider text-white/80">
						{activeToolCall?.label ?? "AI in control"}
					</span>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleRevoke();
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
