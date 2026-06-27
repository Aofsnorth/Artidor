"use client";

/**
 * Takeover active banner — a compact inline banner shown inside the AI
 * chat panel while the AI is actively controlling the editor.
 *
 * Instead of showing a static tool label, the banner cycles through a
 * list of evocative action words (like Claude Code's status animation)
 * so the AI's activity feels alive and dynamic. The words are purely
 * atmospheric — they don't describe the actual tool being executed.
 *
 * The Revoke button lives only in the aurora overlay (screen edge),
 * not here — the chat banner is purely a status indicator.
 */

import { memo } from "react";
import { useAIControlStore } from "@/stores/ai-control-store";
import { cn } from "@/utils/ui";

/**
 * 79 atmospheric action words that cycle while the AI is working.
 * Inspired by Claude Code's status animation — these don't describe
 * the actual operation, they just make the AI feel "alive".
 */
const ACTION_WORDS = [
	"Thinking",
	"Reasoning",
	"Pondering",
	"Reflecting",
	"Imagining",
	"Dreaming",
	"Visualizing",
	"Conjuring",
	"Crafting",
	"Shaping",
	"Molding",
	"Sculpting",
	"Painting",
	"Drawing",
	"Sketching",
	"Designing",
	"Arranging",
	"Composing",
	"Orchestrating",
	"Harmonizing",
	"Tuning",
	"Polishing",
	"Refining",
	"Smoothing",
	"Blending",
	"Mixing",
	"Weaving",
	"Stitching",
	"Knitting",
	"Spinning",
	"Flowing",
	"Drifting",
	"Floating",
	"Gliding",
	"Soaring",
	"Flying",
	"Swimming",
	"Diving",
	"Surfing",
	"Sailing",
	"Wandering",
	"Roaming",
	"Exploring",
	"Discovering",
	"Searching",
	"Seeking",
	"Hunting",
	"Gathering",
	"Collecting",
	"Foraging",
	"Harvesting",
	"Planting",
	"Growing",
	"Blooming",
	"Blossoming",
	"Sprouting",
	"Rising",
	"Climbing",
	"Ascending",
	"Scaling",
	"Leaping",
	"Bounding",
	"Dancing",
	"Prancing",
	"Strutting",
	"Marching",
	"Striding",
	"Walking",
	"Running",
	"Sprinting",
	"Racing",
	"Chasing",
	"Pursuing",
	"Following",
	"Tracking",
	"Tracing",
	"Mapping",
	"Charting",
	"Navigating",
] as const;

/** Seconds each word stays fully readable before the next one slides in. */
const WORD_DURATION_S = 2.2;

export const TakeoverActiveBanner = memo(function TakeoverActiveBanner() {
	const takeoverState = useAIControlStore((s) => s.takeoverState);

	if (takeoverState !== "active") return null;

	// Duplicate the first word at the end so the CSS loop is seamless.
	const words = [...ACTION_WORDS, ACTION_WORDS[0]];
	const totalDuration = words.length * WORD_DURATION_S;

	return (
		<div className="flex justify-center py-0.5">
			<div
				className={cn(
					"flex w-full items-center gap-2.5 rounded-xl border border-white/[0.1]",
					"bg-gradient-to-r from-white/[0.06] to-white/[0.02]",
					"px-3 py-2",
				)}
			>
				{/* Pulsing indicator */}
				<span className="relative flex size-2 shrink-0">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60" />
					<span className="relative inline-flex size-2 rounded-full bg-white/90" />
				</span>

				{/* Animated cycling word — continuous vertical CSS scroll.
				    A mask fades words in/out at the top and bottom while the
				    stack translates upward. No JS interval, no re-renders,
				    no setTimeout scheduling jitter — fully GPU-driven. */}
				<div
					className={cn(
						"ai-word-cycle-mask min-w-0 flex-1 overflow-hidden",
						"font-mono text-[10px] uppercase tracking-wider",
					)}
					style={{ height: "1.2em" }}
				>
					<div
						className="ai-word-cycle-stack"
						style={{
							animationDuration: `${totalDuration}s`,
						}}
					>
						{words.map((word, i) => (
							<span
								key={i}
								className="ai-word-cycle-line block whitespace-nowrap text-white/70"
							>
								{word}
								{i < words.length - 1 && (
									<span className="ml-0.5 animate-pulse text-white/40">…</span>
								)}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	);
});
