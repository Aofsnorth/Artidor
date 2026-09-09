import type { EditorCore } from "@/core";

type SaveManagerOptions = {
	debounceMs?: number;
};

/**
 * Serializes project persistence behind a single in-flight write.
 *
 * Important behavior:
 * - `flush()` resolves only after every pending edit is durably written, so
 *   callers can navigate away or close the project immediately afterwards.
 * - A rejected write re-marks the manager dirty and re-arms the debounce;
 *   the storage error propagates to the explicit `flush()` caller.
 * - `pause()` cancels the armed debounce timer but never drops pending work,
 *   so `resume()` re-arms it.
 * - While paused (project load), queued timers cannot fire into a half-loaded
 *   workspace.
 *
 * Edge cases:
 * - Edits made while a write is in flight stay pending and are written by a
 *   follow-up pass before `flush()` resolves.
 * - If persistence is externally gated (project load, storage migration, or
 *   no active project), `flush()` returns without writing but keeps the work
 *   marked dirty so the debounce retries once the gate lifts.
 * - `stop()` unsubscribes listeners and disarms the timer, but deliberately
 *   keeps dirty state: the owning lifecycle (project close/exit) must flush.
 */
export class SaveManager {
	private debounceMs: number;
	private isPaused = false;
	private isSaving = false;
	private hasPendingSave = false;
	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private unsubscribeHandlers: Array<() => void> = [];
	private saveInFlight: Promise<void> | null = null;

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

	/**
	 * Durably write all pending edits.
	 *
	 * Resolves only when no write is in flight and nothing is dirty. Rejects
	 * with the underlying storage error while keeping the work dirty for the
	 * debounced retry.
	 */
	async flush(): Promise<void> {
		this.hasPendingSave = true;
		while (true) {
			const inFlight = this.saveInFlight;
			if (inFlight) {
				// Wait for the debounced/concurrent pass, then re-evaluate the
				// real dirty flag. Its error is swallowed here on purpose: this
				// loop retries, and a failure of this flush's own pass below
				// propagates to this caller.
				await inFlight.catch(() => undefined);
				continue;
			}
			if (!this.hasPendingSave) return;
			const pass = this.tryStartSave();
			if (!pass) return;
			await pass;
		}
	}

	getIsDirty(): boolean {
		return this.hasPendingSave || this.isSaving;
	}

	private queueSave(): void {
		if (this.isPaused || this.isSaving) return;
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}
		this.saveTimer = setTimeout(() => {
			this.saveTimer = null;
			this.tryStartSave()?.catch(() => {
				// Dirty state is retained and re-queued; explicit flush
				// reports the storage error.
			});
		}, this.debounceMs);
	}

	/**
	 * Start one serialized write pass, or return null when a pass is already
	 * running, nothing is pending, or persistence is externally gated.
	 */
	private tryStartSave(): Promise<void> | null {
		if (this.isSaving || !this.hasPendingSave) return null;

		const activeProject = this.editor.project.getActiveOrNull();
		if (!activeProject) return null;
		if (this.editor.project.getIsLoading()) return null;
		if (this.editor.project.getMigrationState().isMigrating) return null;

		// Follow-up pass semantics: `hasPendingSave` is only true here when an
		// edit was marked dirty *during* the write above (tryStartSave cleared it
		// before starting, and markDirty is the only setter while paused/saving
		// guards are down). Checking it after the write — instead of relying on
		// the debounced timer alone — prevents that edit from being stranded
		// until the next user interaction, which previously made persisted
		// content silently lag one edit behind (or vanish when the queue was
		// torn down in that window).
		this.isSaving = true;
		this.hasPendingSave = false;
		this.clearTimer();

		const pass = this.editor.project.saveCurrentProject().then(
			() => {
				this.finishSave({ requeueIfDirty: true });
			},
			(error: unknown) => {
				this.finishSave({ requeueIfDirty: false });
				this.hasPendingSave = true;
				this.queueSave();
				throw error;
			},
		);
		this.saveInFlight = pass;
		return pass;
	}

	private finishSave({ requeueIfDirty }: { requeueIfDirty: boolean }): void {
		this.isSaving = false;
		this.saveInFlight = null;
		// queueSave() is a no-op while paused/while a pass is running; calling it
		// here catches up on edits that landed during the write. tryStartSave()
		// is intentionally NOT called inline: saves stay on the debounce path so
		// the burst from loadProject's initializeScenes collapses into one write.
		if (requeueIfDirty && this.hasPendingSave) {
			this.queueSave();
		}
	}

	private clearTimer(): void {
		if (!this.saveTimer) return;
		clearTimeout(this.saveTimer);
		this.saveTimer = null;
	}
}
