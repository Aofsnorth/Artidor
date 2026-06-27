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

import { useEffect, useState } from "react";
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

/** Interval between word changes (ms). Matches Claude Code's cadence. */
const WORD_INTERVAL_MS = 2200;
/** Transition duration for the fade/slide animation (ms). */
const WORD_TRANSITION_MS = 400;

export function TakeoverActiveBanner() {
	const takeoverState = useAIControlStore((s) => s.takeoverState);
	const [wordIndex, setWordIndex] = useState(0);
	const [isExiting, setIsExiting] = useState(false);

	// Cycle through action words while the AI is active. Each word
	// fades out, then the next word fades in — a smooth crossfade
	// that makes the status feel alive without being distracting.
	useEffect(() => {
		if (takeoverState !== "active") return;

		// Reset to the first word when takeover (re)starts so the
		// user always sees "Thinking" first.
		setWordIndex(0);
		setIsExiting(false);

		const cycleTimer = setInterval(() => {
			// Start exit animation
			setIsExiting(true);
			// After the exit animation, swap to the next word and
			// fade back in.
			setTimeout(() => {
				setWordIndex((prev) => (prev + 1) % ACTION_WORDS.length);
				setIsExiting(false);
			}, WORD_TRANSITION_MS);
		}, WORD_INTERVAL_MS);

		return () => clearInterval(cycleTimer);
	}, [takeoverState]);

	if (takeoverState !== "active") return null;

	const currentWord = ACTION_WORDS[wordIndex] ?? "Thinking";

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

				{/* Animated cycling word — Claude Code style crossfade */}
				<div
					className={cn(
						"min-w-0 flex-1 overflow-hidden",
						"font-mono text-[10px] uppercase tracking-wider",
					)}
					style={{ height: "1.2em" }}
				>
					<span
						key={wordIndex}
						className={cn(
							"inline-block whitespace-nowrap text-white/70",
							"transition-all duration-[400ms] ease-in-out",
							isExiting
								? "translate-y-[-100%] opacity-0"
								: "translate-y-0 opacity-100",
						)}
					>
						{currentWord}
						<span className="ml-0.5 animate-pulse text-white/40">…</span>
					</span>
				</div>
			</div>
		</div>
	);
}
