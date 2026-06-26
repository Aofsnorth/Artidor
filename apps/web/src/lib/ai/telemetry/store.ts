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
	/** Project id this event was recorded in (for project-scoped learning). */
	projectId?: string;
}

const MAX_EVENTS = 500;

interface TelemetryState {
	events: TelemetryEvent[];
	/**
	 * Whether auto-learning is enabled. When disabled, `record` is a
	 * no-op and no events are collected. Defaults to true (the original
	 * behavior) so existing users keep their learning unless they opt out.
	 */
	enabled: boolean;
	/** Current project id — attached to each recorded event. */
	currentProjectId: string | null;
	record: (e: Omit<TelemetryEvent, "id" | "timestamp">) => void;
	clear: () => void;
	/** Enable or disable auto-learning. */
	setEnabled: (enabled: boolean) => void;
	/** Set the current project id for event tagging. */
	setCurrentProjectId: (id: string | null) => void;
	/** Return the last N events in chronological order (all projects). */
	recent: (n: number) => TelemetryEvent[];
	/** Return the last N events for a specific project (chronological). */
	recentForProject: (n: number, projectId: string) => TelemetryEvent[];
	/** Return all events matching a command name, e.g. "split_element". */
	byCommand: (name: string) => TelemetryEvent[];
}

export const useTelemetryStore = create<TelemetryState>()(
	persist(
		(set, get) => ({
			events: [],
			enabled: false,
			currentProjectId: null,
			record: (e) => {
				// Auto-learning toggle: when disabled, don't collect events.
				if (!get().enabled) return;
				const event: TelemetryEvent = {
					id: crypto.randomUUID(),
					timestamp: Date.now(),
					projectId: get().currentProjectId ?? undefined,
					...e,
				};
				const next = [event, ...get().events].slice(0, MAX_EVENTS);
				set({ events: next });
			},
			clear: () => set({ events: [] }),
			setEnabled: (enabled) => set({ enabled }),
			setCurrentProjectId: (id) => set({ currentProjectId: id }),
			recent: (n) => get().events.slice(0, n).reverse(),
			recentForProject: (n, projectId) =>
				get()
					.events.filter((e) => e.projectId === projectId)
					.slice(0, n)
					.reverse(),
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
