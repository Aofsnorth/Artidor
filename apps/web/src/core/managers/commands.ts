import type { EditorCore } from "@/core";
import type { Command, CommandResult } from "@/lib/commands";
import { applyRippleAdjustments, computeRippleAdjustments } from "@/lib/ripple";
import type { ElementRef, SceneTracks } from "@/lib/timeline/types";

interface CommandHistoryEntry {
	command: Command;
	previousSelection: ElementRef[];
	selectionOverride?: ElementRef[];
}

/**
 * Maximum number of retained undo entries. The history was unbounded
 * (every executed command retained its full before/after snapshots
 * forever), so long sessions leaked memory proportional to edit count.
 * Evicted entries drop out of the undo window; an optional `dispose`
 * hook on the command is invoked so entries holding external resources
 * (e.g. Blob URLs) release them. Plain-data snapshots need no hook —
 * dropping the reference lets GC reclaim them.
 *
 * Tradeoff: AI revert snapshots (`AIManager.revertToMessage`) older than
 * this window can only partially revert — the revert loop already
 * terminates via `canUndo()`, so it undoes what is retained and stops.
 */
export const MAX_COMMAND_HISTORY_LENGTH = 100;

export class CommandManager {
	public isRippleEnabled = false;
	// When true, every mutating command is rejected. This is the single
	// enforcement point for read-only / shared-viewer sessions: hiding UI is
	// cosmetic, but routing all edits through `execute()` means one switch
	// reliably blocks inserts, deletes, keyframes, effects, paste, etc.
	public readOnly = false;
	private history: CommandHistoryEntry[] = [];
	private redoStack: CommandHistoryEntry[] = [];
	private reactors: Array<(command: Command) => void> = [];

	constructor(private editor: EditorCore) {}

	execute({ command }: { command: Command }): Command {
		if (this.readOnly) {
			// Silently ignore in production; warn in dev so accidental edit paths
			// surface. The returned command is never pushed to history.
			if (process.env.NODE_ENV !== "production") {
				console.warn(
					`[read-only] blocked command: ${command.constructor.name}`,
				);
			}
			return command;
		}
		const beforeTracks = this.isRippleEnabled
			? (this.editor.scenes.getActiveSceneOrNull()?.tracks ?? null)
			: null;
		const previousSelection = this.getSelectionSnapshot();
		const result = command.execute();
		this.applyRippleIfEnabled({ beforeTracks });
		const selectionOverride = this.applySelectionOverride(result);
		this.runReactors(command);
		this.appendHistory({
			command,
			previousSelection,
			selectionOverride,
		});
		this.redoStack = [];
		return command;
	}

	push({ command }: { command: Command }): void {
		this.appendHistory({
			command,
			previousSelection: this.getSelectionSnapshot(),
		});
		this.redoStack = [];
	}

	/**
	 * Append one entry, evicting the oldest entries past
	 * `MAX_HISTORY_LENGTH` (oldest-first) so the undo stack stays bounded.
	 * When `dispose` exists on the evicted command it is invoked so entries
	 * holding external resources (Blob URLs, object URLs) release them;
	 * plain-data snapshots are reclaimed by GC once the reference drops.
	 */
	private appendHistory(entry: CommandHistoryEntry): void {
		this.history.push(entry);
		while (this.history.length > MAX_COMMAND_HISTORY_LENGTH) {
			const evicted = this.history.shift();
			evicted?.command.dispose?.();
		}
	}

	/** Subscribe until the returned idempotent disposer is called. */
	registerReactor(reactor: (command: Command) => void): () => void {
		const subscription = (command: Command) => reactor(command);
		this.reactors.push(subscription);
		return () => {
			this.reactors = this.reactors.filter((entry) => entry !== subscription);
		};
	}

	undo(): void {
		if (this.readOnly) return;
		if (this.history.length === 0) return;
		const entry = this.history.pop();
		entry?.command.undo();
		if (entry) {
			// Only restore selection for commands that explicitly changed it.
			// Commands without selection intent leave selection untouched,
			// preserving any UI-driven selection changes (clicks, box select)
			// that happened between commands. Commands that remove elements
			// must declare { select: [] } to clear stale refs.
			if (entry.selectionOverride !== undefined) {
				this.editor.selection.setSelectedElements({
					elements: [...entry.previousSelection],
				});
			}
			this.redoStack.push(entry);
		}
	}

	redo(): void {
		if (this.readOnly) return;
		if (this.redoStack.length === 0) return;
		const entry = this.redoStack.pop();
		if (!entry) {
			return;
		}

		const beforeTracks = this.isRippleEnabled
			? (this.editor.scenes.getActiveSceneOrNull()?.tracks ?? null)
			: null;
		const previousSelection = this.getSelectionSnapshot();
		const result = entry.command.redo();
		this.applyRippleIfEnabled({ beforeTracks });
		const selectionOverride = this.applySelectionOverride(result);
		this.runReactors(entry.command);

		this.appendHistory({
			command: entry.command,
			previousSelection,
			selectionOverride,
		});
	}

	canUndo(): boolean {
		return this.history.length > 0;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	/**
	 * Current number of entries in the undo stack. Used by the AI
	 * manager to snapshot the history length before processing a user
	 * message, so it can revert all AI-made edits later.
	 */
	getHistoryLength(): number {
		return this.history.length;
	}

	getHistoryLabels(): string[] {
		return this.history.map(({ command }) =>
			command.constructor.name
				.replace(/Command$/, "")
				.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
		);
	}

	clear(): void {
		this.history = [];
		this.redoStack = [];
	}

	private getSelectionSnapshot(): ElementRef[] {
		return [...this.editor.selection.getSelectedElements()];
	}

	private applySelectionOverride(
		result: CommandResult | undefined,
	): ElementRef[] | undefined {
		if (result?.select === undefined) {
			return undefined;
		}

		const selectionOverride = [...result.select];
		this.editor.selection.setSelectedElements({ elements: selectionOverride });
		return selectionOverride;
	}

	private runReactors(command: Command): void {
		for (const reactor of this.reactors) {
			reactor(command);
		}
	}

	private applyRippleIfEnabled({
		beforeTracks,
	}: {
		beforeTracks: SceneTracks | null;
	}): void {
		if (!this.isRippleEnabled || !beforeTracks) {
			return;
		}

		const afterTracks = this.editor.scenes.getActiveSceneOrNull()?.tracks;
		if (!afterTracks) {
			return;
		}
		const adjustments = computeRippleAdjustments({
			beforeTracks,
			afterTracks,
		});
		if (adjustments.length === 0) {
			return;
		}

		const tracksWithRipple = applyRippleAdjustments({
			tracks: afterTracks,
			adjustments,
		});
		this.editor.timeline.updateTracks(tracksWithRipple);
	}
}
