import type { ElementRef } from "@/lib/timeline/types";

export interface CommandResult {
	select?: ElementRef[];
}

export abstract class Command {
	abstract execute(): CommandResult | undefined;

	/**
	 * Release external resources held by an evicted history entry
	 * (e.g. Blob/object URLs minted by undo). The default is a no-op:
	 * plain-data snapshots are reclaimed by GC once the history reference
	 * drops. `CommandManager` invokes this on history-cap eviction.
	 */
	dispose(): void {}

	undo(): void {
		throw new Error("Undo not implemented for this command");
	}

	redo(): CommandResult | undefined {
		return this.execute();
	}
}
