/**
 * Collaboration Manager — bridges the editor's CommandManager with the
 * real-time collaboration transport.
 *
 * Responsibilities:
 *  - Host: create a room, notify collaborators of local edits.
 *  - Guest: join a room, mirror room state (presence, locks, mode).
 *  - All: broadcast cursor position, manage element locks, poll for
 *    room state updates, and update the collab store for UI.
 *
 * What this manager does NOT do: apply remote edits. There is no safe
 * wire protocol for reconstructing editor commands from serialized data
 * (commands capture editor internals and undo snapshots as private
 * state), no shared project baseline, and no undo reconciliation. A
 * `local-edit` notification is broadcast for awareness only. Remote
 * command application is a tracked limitation, not a stubbed success.
 *
 * Conflict prevention: before executing a local command that targets a
 * specific element, the manager acquires an element lock. If the lock
 * is held by another collaborator, the command is blocked with a
 * user-visible message.
 */

import type { EditorCore } from "@/core";
import { useCollabStore } from "@/stores/collab-store";
import {
	CollabSessionEndedError,
	createRoom,
	joinRoom,
	pollRoomState,
	sendCommand,
	sendCursor,
	lockElement,
	unlockElement,
	leaveRoom,
	setRoomMode,
} from "@/lib/collab/client";
import { LOCAL_EDIT } from "@/lib/collab/protocol";
import type { CollabMode } from "@/lib/collab/types";
import type { Command } from "@/lib/commands";

/** Polling interval for room state updates (ms). */
const POLL_INTERVAL_MS = 1000;
/** Cursor throttle interval (ms) — don't send more often than this. */
const CURSOR_THROTTLE_MS = 100;
/**
 * Coalescing window for local-edit notifications (ms). The first edit of a
 * burst is broadcast immediately; the rest are carried by one ordered batch
 * when the window closes, instead of each one firing its own request in the
 * middle of the edits that produced it.
 */
const COMMAND_BATCH_WINDOW_MS = 200;

export class CollabManager {
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private cursorThrottle: ReturnType<typeof setTimeout> | null = null;
	private pendingCursor: { x: number; y: number; elementId?: string } | null =
		null;
	/** Local edits broadcast but not yet sent. */
	private pendingCommands = 0;
	/** Trailing coalescing window for edit notifications. */
	private commandWindow: ReturnType<typeof setTimeout> | null = null;
	/** True while a batch is being replayed, so batches never interleave. */
	private drainingCommands = false;
	/** Unsubscribe from CommandManager reactors; null while detached. */
	private detachReactor: (() => void) | null = null;
	private lastSeq = 0;
	/** Highest command sequence already reflected in local room state. */
	private lastCommandSeq = 0;
	/** Element IDs currently locked by this session. */
	private myLocks = new Set<string>();
	/** Guard against double host/join/start and concurrent disconnects. */
	private joining = false;
	private disconnecting: Promise<void> | null = null;
	/** Increments on every host/join/disconnect; in-flight async work tags its
	 * epoch at start and drops results when the epoch moved on. Prevents a
	 * late response from a previous session being applied to the current one. */
	private sessionEpoch = 0;

	constructor(private editor: EditorCore) {}

	/** Host: create a collaboration room and start polling. */
	async host({
		projectName,
		mode,
		nickname,
		projectId,
	}: {
		projectName: string;
		mode: CollabMode;
		nickname: string;
		/** Host's local project id — joiners use it to land in the editor. */
		projectId: string | null;
	}): Promise<void> {
		if (this.joining || this.detachReactor) return;
		this.joining = true;
		const store = useCollabStore.getState();
		store.setStatus("connecting");

		try {
			const result = await createRoom({
				projectName,
				mode,
				nickname,
				projectId,
			});
			// Invalidate any still-in-flight work from a previous session before
			// this session's polling starts.
			this.sessionEpoch += 1;
			store.setRoom({
				roomId: result.roomId,
				joinUrl: result.joinUrl,
				sessionId: result.sessionId,
				nickname,
				color: "#ef4444", // host gets first color; server assigns actual
				isHost: true,
				mode,
				hostProjectId: projectId ?? null,
			});
			this.resetSyncState();
			this.start();
		} catch (err) {
			store.setError(
				err instanceof Error ? err.message : "Could not start collaboration.",
			);
			throw err;
		} finally {
			this.joining = false;
		}
	}

	/** Guest: join an existing room and start polling. */
	async join({
		roomId,
		nickname,
	}: {
		roomId: string;
		nickname: string;
	}): Promise<void> {
		if (this.joining || this.detachReactor) return;
		this.joining = true;
		const store = useCollabStore.getState();
		store.setStatus("connecting");

		try {
			const result = await joinRoom({ roomId, nickname });
			this.sessionEpoch += 1;
			store.setRoom({
				roomId,
				joinUrl: "",
				sessionId: result.sessionId,
				nickname,
				color: result.color,
				isHost: false,
				mode: result.room.mode,
				hostProjectId: result.room.projectId ?? null,
			});
			store.updateRoomState(result.room);
			this.resetSyncState();
			// Adopt the server's monotonic sequence as this session's baseline so
			// the first poll starts from the exact snapshot we just received.
			this.lastSeq = result.room.seq;
			this.lastCommandSeq = result.room.seq;

			// Guests are read-only unless the room's mode permits edits. The
			// server is the enforcement point (canEdit/tryLockElement), but the
			// local flag blocks edit UI noise immediately on join instead of
			// after the first poll tick. Hosts are never read-only: the room mode
			// is the permission level for guests, not for the owner.
			this.editor.command.readOnly = result.room.mode !== "edit";

			this.start();
		} catch (err) {
			store.setError(
				err instanceof Error ? err.message : "Could not join collaboration.",
			);
			throw err;
		} finally {
			this.joining = false;
		}
	}

	/** Disconnect from the room and clean up. Idempotent and reentrant. */
	async disconnect(): Promise<void> {
		if (this.disconnecting) return this.disconnecting;
		this.sessionEpoch += 1;
		this.disconnecting = this.doDisconnect();
		try {
			await this.disconnecting;
		} finally {
			this.disconnecting = null;
		}
	}

	private async doDisconnect(): Promise<void> {
		const store = useCollabStore.getState();
		const { roomId, sessionId } = store;

		this.stop();
		this.editor.command.readOnly = false;
		this.myLocks.clear();

		if (roomId && sessionId) {
			await leaveRoom({ roomId, sessionId });
		}
		store.disconnect();
	}

	/** Change the room mode (host only). */
	async setMode(mode: CollabMode): Promise<void> {
		const store = useCollabStore.getState();
		if (!store.roomId || !store.sessionId || !store.isHost) return;
		await setRoomMode({
			roomId: store.roomId,
			sessionId: store.sessionId,
			mode,
		});
		useCollabStore.getState().setMode(mode);
		// The room mode is the permission level for *guests* — the host
		// always keeps full edit control, so the local editor's read-only
		// flag is intentionally untouched here.
	}

	/** Broadcast the local cursor position (throttled). */
	broadcastCursor(x: number, y: number, elementId?: string): void {
		if (!this.hasActiveSession()) return;

		this.pendingCursor = { x, y, elementId };

		if (this.cursorThrottle) return;
		this.cursorThrottle = setTimeout(() => {
			this.cursorThrottle = null;
			if (!this.pendingCursor) return;
			const { roomId, sessionId } = useCollabStore.getState();
			if (!roomId || !sessionId) return;
			void sendCursor({
				roomId,
				sessionId,
				x: this.pendingCursor.x,
				y: this.pendingCursor.y,
				elementId: this.pendingCursor.elementId,
			});
			this.pendingCursor = null;
		}, CURSOR_THROTTLE_MS);
	}

	/** Try to acquire a lock on an element before editing. */
	async tryAcquireLock(elementId: string): Promise<boolean> {
		// No session ⇒ no contention: the local editor may edit freely.
		if (!this.hasActiveSession()) return true;
		if (this.myLocks.has(elementId)) return true;
		const { roomId, sessionId } = useCollabStore.getState();
		if (!roomId || !sessionId) return true;
		const ok = await lockElement({
			roomId,
			sessionId,
			elementId,
		});
		if (ok) this.myLocks.add(elementId);
		return ok;
	}

	/** Release a lock on an element. */
	releaseLock(elementId: string): void {
		if (!this.hasActiveSession()) return;
		if (!this.myLocks.has(elementId)) return;
		const { roomId, sessionId } = useCollabStore.getState();
		if (!roomId || !sessionId) return;
		this.myLocks.delete(elementId);
		void unlockElement({
			roomId,
			sessionId,
			elementId,
		});
	}

	/**
	 * Check if an element is locked by another collaborator.
	 *
	 * Lock state comes from the polled room state; the caller's own sessionId
	 * filters self-owned locks. With no session there are no remote locks.
	 */
	isLockedByOther(elementId: string): boolean {
		const store = useCollabStore.getState();
		if (!store.sessionId) return false;
		const lock = store.locks.find((l) => l.elementId === elementId);
		return !!lock && lock.lockedBy !== store.sessionId;
	}

	/** Get the collaborator who holds a lock, for UI display. */
	getLockHolder(elementId: string): { nickname: string; color: string } | null {
		const store = useCollabStore.getState();
		const lock = store.locks.find((l) => l.elementId === elementId);
		if (!lock) return null;
		const collab = store.collaborators.find((c) => c.id === lock.lockedBy);
		if (!collab) return null;
		return { nickname: collab.nickname, color: collab.color };
	}

	/* ------------------------------------------------------------------ */
	/*                          Internal plumbing                          */
	/* ------------------------------------------------------------------ */

	/** Register the reactor and start polling. Assumes no active session. */
	private start(): void {
		if (this.detachReactor) return;
		this.detachReactor = this.editor.command.registerReactor((command) => {
			this.onLocalCommand(command);
		});
		this.startPolling();
	}

	private stop(): void {
		this.stopPolling();
		if (this.cursorThrottle) {
			clearTimeout(this.cursorThrottle);
			this.cursorThrottle = null;
		}
		this.pendingCursor = null;
		if (this.commandWindow) {
			clearTimeout(this.commandWindow);
			this.commandWindow = null;
		}
		this.pendingCommands = 0;
		if (this.detachReactor) {
			this.detachReactor();
			this.detachReactor = null;
		}
	}

	private resetSyncState(): void {
		this.lastSeq = 0;
		this.lastCommandSeq = 0;
		this.myLocks.clear();
	}

	/**
	 * Called after every local command execution. Broadcasts an edit
	 * notification so other collaborators see that an edit happened.
	 *
	 * The notification carries no command fields: remote application is
	 * not implemented, and broadcasting editor internals would leak
	 * undo snapshots without any receiver able to apply them.
	 */
	private onLocalCommand(command: Command): void {
		void command;
		const store = useCollabStore.getState();
		if (!store.roomId || !store.sessionId) return;
		if (store.status !== "connected") return;
		if (this.disconnecting) return;

		// Guests in non-edit modes are locally read-only, so their commands
		// never reach here in practice. But the local gate is only hygiene:
		// the server rejects non-host appends in every mode except "edit".
		// Re-check here so a stale local mode (set between poll ticks) can
		// never emit a broadcast the server would charge against the room log.
		if (!store.isHost && store.mode !== "edit") return;

		// Counted, not sent: a burst is coalesced into one ordered batch
		// (see scheduleCommandFlush) instead of one request per command.
		this.pendingCommands += 1;
		this.scheduleCommandFlush();
	}

	/**
	 * Open the coalescing window, or send immediately on the leading edge.
	 *
	 * Every executed command used to fire its own `POST /command` the
	 * moment it ran, so a burst of edits (a drag, a repeated nudge)
	 * interleaved N requests and N room rewrites with the very input that
	 * produced them. The first edit still goes out at once — a single edit
	 * is never delayed — and the rest ride one ordered batch when the
	 * window closes.
	 */
	private scheduleCommandFlush(): void {
		if (this.commandWindow) return;
		if (this.pendingCommands > 1) {
			this.commandWindow = setTimeout(() => {
				this.commandWindow = null;
				void this.flushCommandNotifications();
			}, COMMAND_BATCH_WINDOW_MS);
			return;
		}
		void this.flushCommandNotifications();
	}

	/**
	 * Send the coalesced local-edit notifications in execution order.
	 *
	 * The command route accepts one notification per request, so a batch
	 * of N is replayed as N ordered requests and the room log stays
	 * complete — nothing is deduplicated or dropped. A single request and
	 * a single room write for a whole batch needs a batch field on
	 * `POST /api/collab/[roomId]/command` (server-side follow-up).
	 *
	 * The outer loop also picks up edits that land while the batch is in
	 * flight, and `drainingCommands` keeps two batches from interleaving.
	 */
	private async flushCommandNotifications(): Promise<void> {
		if (this.drainingCommands || this.pendingCommands === 0) return;
		this.drainingCommands = true;
		// Arm the window unconditionally so a notification queued behind an
		// in-flight batch still gets a trigger.
		if (!this.commandWindow) {
			this.commandWindow = setTimeout(() => {
				this.commandWindow = null;
				void this.flushCommandNotifications();
			}, COMMAND_BATCH_WINDOW_MS);
		}
		const flushEpoch = this.sessionEpoch;
		try {
			for (;;) {
				const batch = this.pendingCommands;
				if (batch === 0) return;
				this.pendingCommands = 0;
				// A session change (leave, re-join) invalidates the batch: the
				// room it belonged to is gone.
				if (flushEpoch !== this.sessionEpoch) return;
				const { roomId, sessionId } = useCollabStore.getState();
				if (!roomId || !sessionId || !this.hasActiveSession()) return;
				for (let i = 0; i < batch; i++) {
					if (flushEpoch !== this.sessionEpoch) return;
					try {
						await sendCommand({
							roomId,
							sessionId,
							commandName: LOCAL_EDIT,
							args: {},
						});
					} catch {
						// A rejected broadcast must never crash the reactor
						// loop or the command that already executed locally.
					}
				}
			}
		} finally {
			this.drainingCommands = false;
		}
	}

	/** True while a session is active — used by broadcast/lock paths to gate
	 * presence traffic so a disconnected manager never sends server writes. */
	private hasActiveSession(): boolean {
		const { status, roomId } = useCollabStore.getState();
		return status === "connected" && !!roomId;
	}

	private startPolling(): void {
		this.stopPolling();
		this.pollTimer = setInterval(() => {
			void this.poll();
		}, POLL_INTERVAL_MS);
	}

	private stopPolling(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
	}

	private async poll(): Promise<void> {
		const store = useCollabStore.getState();
		if (!store.roomId || !store.sessionId || store.status !== "connected")
			return;

		// Capture the session this poll belongs to. If the room is left/joined
		// again while the request is in flight, a late response must not be
		// applied to the NEW session (stale epoch application).
		const pollEpoch = this.sessionEpoch;
		const pollSessionId = store.sessionId;
		try {
			const state = await pollRoomState({
				roomId: store.roomId,
				sessionId: pollSessionId,
				fromSeq: this.lastSeq,
			});
			// Late response from a previous session, or a disconnect raced the
			// response: drop it entirely instead of poisoning the new session's
			// store state or sequence baseline.
			if (pollEpoch !== this.sessionEpoch || this.disconnecting) return;
			const current = useCollabStore.getState();
			if (current.sessionId !== pollSessionId || current.status !== "connected")
				return;
			// Room sequence must never move backwards (server restarts, or a
			// re-created room reusing the id would look like a regression).
			if (state.seq < this.lastSeq) return;
			useCollabStore.getState().updateRoomState(state);
			this.lastSeq = state.seq;
			this.lastCommandSeq = Math.max(this.lastCommandSeq, state.seq);

			// The room mode is the permission level for *guests*. Only guests
			// follow it — the host must never be locked out of their own editor
			// by starting a session in a restricted mode. Non-edit modes are
			// read-only for guests (view = watch-only, comment/suggest have no
			// implemented editing surface beyond the host's timeline).
			this.editor.command.readOnly =
				!useCollabStore.getState().isHost && state.mode !== "edit";
		} catch (err) {
			if (err instanceof CollabSessionEndedError) {
				// The room is gone (host ended the session) — end the local
				// session instead of polling a ghost room. Store-unavailable
				// errors are transient and deliberately retried.
				await this.disconnect();
				return;
			}
			// Transient store/network errors are retried on the next tick. Any
			// other rejection is logged, never rethrown: poll runs on an interval,
			// and an unhandled rejection would kill the host page.
			if (err instanceof Error) {
				console.warn("[collab] poll failed; retrying next tick", err.message);
			}
		}
	}
}
