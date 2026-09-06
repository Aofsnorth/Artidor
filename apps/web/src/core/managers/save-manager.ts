import type { EditorCore } from "@/core";
import { toast } from "sonner";

type SaveManagerOptions = {
	debounceMs?: number;
};

export class SaveManager {
	private debounceMs: number;
	private isPaused = false;
	private activeSave: Promise<void> | null = null;
	private hasPendingSave = false;
	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private unsubscribeHandlers: Array<() => void> = [];

	constructor(
		private editor: EditorCore,
		{ debounceMs = 800 }: SaveManagerOptions = {},
	) {
		this.debounceMs = debounceMs;
	}

	start(): void {
		if (this.unsubscribeHandlers.length > 0) return;

		this.unsubscribeHandlers = [
			this.editor.scenes.subscribe(() => {
				this.markDirty();
			}),
			this.editor.timeline.subscribe(() => {
				this.markDirty();
			}),
		];
	}

	stop(): void {
		for (const unsubscribe of this.unsubscribeHandlers) {
			unsubscribe();
		}
		this.unsubscribeHandlers = [];
		this.clearTimer();
	}

	pause(): void {
		this.isPaused = true;
		this.clearTimer();
	}

	resume(): void {
		this.isPaused = false;
		if (this.hasPendingSave) {
			this.queueSave();
		}
	}

	markDirty({ force = false }: { force?: boolean } = {}): void {
		if (this.isPaused && !force) return;
		this.hasPendingSave = true;
		this.queueSave();
	}

	/** Drain in-flight and newly dirtied snapshots before allowing navigation. */
	async flush(): Promise<void> {
		this.hasPendingSave = true;
		this.clearTimer();
		while (this.getIsDirty()) {
			if (!this.activeSave && !this.canSave()) return;
			// Writes must be serialized; a concurrent edit can dirty the next snapshot.
			await this.saveNow();
		}
	}

	getIsDirty(): boolean {
		return this.hasPendingSave || this.activeSave !== null;
	}

	private queueSave(): void {
		if (this.activeSave || this.isPaused) return;
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}
		this.saveTimer = setTimeout(() => {
			this.saveNow().catch(() => {
				toast.error("Changes could not be saved", {
					description: "Your edits are still in memory. Retry saving before closing the editor.",
				});
			});
		}, this.debounceMs);
	}

	private canSave(): boolean {
		return this.editor.project.getActiveOrNull() !== null &&
			!this.editor.project.getIsLoading() &&
			!this.editor.project.getMigrationState().isMigrating;
	}

	private async saveNow(): Promise<void> {
		if (this.activeSave) return this.activeSave;
		if (!this.hasPendingSave || !this.canSave()) return;

		this.hasPendingSave = false;
		this.clearTimer();
		this.activeSave = Promise.resolve().then(() => this.editor.project.saveCurrentProject());
		try {
			await this.activeSave;
		} catch (error) {
			this.hasPendingSave = true;
			throw error;
		} finally {
			this.activeSave = null;
		}
		// Failed saves remain dirty but do not spin in an automatic retry loop.
		if (this.hasPendingSave) this.queueSave();
	}

	private clearTimer(): void {
		if (!this.saveTimer) return;
		clearTimeout(this.saveTimer);
		this.saveTimer = null;
	}
}
