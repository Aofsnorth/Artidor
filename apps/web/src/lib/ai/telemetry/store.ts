/**
 * Self-improvement telemetry.
 *
 * Every time the user (or the AI) executes a command, we record it here.
 * The LLM prompt gets a "recent commands" snapshot so it can mirror the
 * user's editing style over time — e.g. if the user has been cutting on
 * beats at 120 BPM, the AI will prefer the same pace next time.
 *
 * Storage:
 *  - Persisted to localStorage (privacy-first: never leaves the device).
 *  - Hard cap of 500 events to keep the prompt small and the storage
 *    footprint bounded.
 *  - Records are stored as plain JSON; args are deeply serialised.
 *
 * Why a separate module:
 *  - We don't want a circular import with the AI manager, and the
 *    telemetry store is also useful to non-AI features (e.g. an undo
 *    history visualizer in the future).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TelemetryEvent {
	id: string;
	timestamp: number;
	command: string;
	args: Record<string, unknown>;
	/** Optional human-readable summary, e.g. "Cut clip at 00:12.4". */
	summary?: string;
	/** "user" for clicks/keyboard, "ai" for AI-dispatched. */
	source: "user" | "ai";
}

const MAX_EVENTS = 500;

interface TelemetryState {
	events: TelemetryEvent[];
	record: (e: Omit<TelemetryEvent, "id" | "timestamp">) => void;
	clear: () => void;
	/** Return the last N events in chronological order. */
	recent: (n: number) => TelemetryEvent[];
	/** Return all events matching a command name, e.g. "split_element". */
	byCommand: (name: string) => TelemetryEvent[];
}

export const useTelemetryStore = create<TelemetryState>()(
	persist(
		(set, get) => ({
			events: [],
			record: (e) => {
				const event: TelemetryEvent = {
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					...e,
				};
				const next = [event, ...get().events].slice(0, MAX_EVENTS);
				set({ events: next });
			},
			clear: () => set({ events: [] }),
			recent: (n) => get().events.slice(0, n).reverse(),
			byCommand: (name) => get().events.filter((e) => e.command === name),
		}),
		{ name: "artidor-ai-telemetry" },
	),
);

/* -------------------------------------------------------------------------- */
/*                          Wiring into CommandManager                        */
/* -------------------------------------------------------------------------- */

/**
 * Hook the telemetry store into the CommandManager so every executed
 * command — whether it came from a click, a keyboard shortcut, or the
 * AI — is recorded automatically. Call once from the EditorProvider.
 */
export function attachTelemetryToCommands(): () => void {
	if (typeof window === "undefined") return () => {};
	const onCommand = (event: Event) => {
		const detail = (event as CustomEvent<TelemetryEvent>).detail;
		if (!detail) return;
		useTelemetryStore.getState().record(detail);
	};
	window.addEventListener("artidor:command", onCommand as EventListener);
	return () =>
		window.removeEventListener("artidor:command", onCommand as EventListener);
}

/**
 * Format a compact summary of recent events for inclusion in a system
 * prompt. The cap is intentionally low — every token counts.
 */
export function summariseRecentEvents(events: TelemetryEvent[]): string {
	if (events.length === 0) return "No prior edits observed yet.";
	const byCmd = new Map<string, number>();
	for (const e of events) {
		byCmd.set(e.command, (byCmd.get(e.command) ?? 0) + 1);
	}
	const top = Array.from(byCmd.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([cmd, n]) => `${cmd}(${n})`)
		.join(", ");

	const last5 = events
		.slice(0, 5)
		.map((e) => {
			const ago = Math.max(1, Math.round((Date.now() - e.timestamp) / 1000));
			return `- ${e.summary ?? e.command} (${ago}s ago, ${e.source})`;
		})
		.join("\n");

	return `Top commands: ${top}.\nLast 5:\n${last5}`;
}
