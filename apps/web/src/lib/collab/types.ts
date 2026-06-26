/**
 * Collaboration types — shared between client and server for the
 * real-time multiplayer editing feature.
 *
 * Architecture:
 *   - A "room" is a collaboration session keyed by a random room ID.
 *   - Each room has a mode (view / comment / edit / suggest) set by the host.
 *   - Collaborators join via a link, provide a nickname, and get assigned
 *     a unique color for their cursor.
 *   - Edits are broadcast as serialized commands through the server.
 *   - Element-level locking prevents two users from editing the same
 *     timeline element simultaneously.
 *   - Presence (cursors, selections) is broadcast for live awareness.
 *
 * Transport: SSE (server→client) + POST (client→server), with Upstash
 * Redis as the pub/sub relay. No new dependencies — Redis is already
 * used for rate limiting.
 */

/** Collaboration permission modes. */
export type CollabMode = "view" | "comment" | "edit" | "suggest";

/**
 * A participant in a collaboration session. Each collaborator gets a
 * unique color (from a fixed palette) so their cursor is distinguishable.
 */
export interface Collaborator {
	/** Stable session ID assigned by the server on join. */
	id: string;
	/** User-chosen display name. */
	nickname: string;
	/** Hex color from the collaborator palette, e.g. "#ef4444". */
	color: string;
	/** Whether this collaborator is the room host (can change mode). */
	isHost: boolean;
	/** ISO timestamp of last activity (for stale-collaborator cleanup). */
	lastSeenAt: number;
}

/**
 * A cursor position on the timeline. Coordinates are in timeline pixels
 * relative to the track area, so they map directly to the rendered DOM.
 */
export interface CollabCursor {
	/** The collaborator session ID this cursor belongs to. */
	collaboratorId: string;
	/** X position in timeline pixels (horizontal scroll position). */
	x: number;
	/** Y position in timeline pixels (vertical position within track area). */
	y: number;
	/** Optional element ID the cursor is hovering over (for lock display). */
	elementId?: string;
}

/**
 * An element lock prevents two collaborators from editing the same
 * timeline element at the same time. Locks are owned by a collaborator
 * and expire after a timeout if the collaborator disconnects.
 */
export interface ElementLock {
	/** The element ID that is locked. */
	elementId: string;
	/** The collaborator session ID that holds the lock. */
	lockedBy: string;
	/** ISO timestamp when the lock was acquired. */
	lockedAt: number;
}

/**
 * A serialized command broadcast from one collaborator to others.
 * The command name + args are enough for the receiving client to
 * reconstruct and execute the command locally (without adding to
 * undo history, to avoid cross-user undo confusion).
 */
export interface CollabCommand {
	/** Unique message ID for dedup. */
	id: string;
	/** The collaborator session ID that originated the command. */
	collaboratorId: string;
	/** The command class name, e.g. "AddTrackCommand". */
	commandName: string;
	/** Serialized command arguments (JSON). */
	args: Record<string, unknown>;
	/** ISO timestamp. */
	timestamp: number;
}

/**
 * A comment annotation on the timeline. Comments are pinned to a
 * time position and optionally to a specific element.
 */
export interface CollabComment {
	id: string;
	collaboratorId: string;
	nickname: string;
	color: string;
	/** Timeline position in ticks, or null for a general comment. */
	position: number | null;
	/** Optional element ID the comment is attached to. */
	elementId?: string;
	text: string;
	createdAt: number;
}

/**
 * A suggested edit from a collaborator in "suggest" mode. The host
 * can approve or reject each suggestion.
 */
export interface CollabSuggestion {
	id: string;
	collaboratorId: string;
	nickname: string;
	color: string;
	commandName: string;
	args: Record<string, unknown>;
	description: string;
	status: "pending" | "approved" | "rejected";
	createdAt: number;
}

/** The full state of a collaboration room, returned by the server. */
export interface RoomState {
	roomId: string;
	mode: CollabMode;
	collaborators: Collaborator[];
	cursors: CollabCursor[];
	locks: ElementLock[];
	commands: CollabCommand[];
	comments: CollabComment[];
	suggestions: CollabSuggestion[];
	/** Sequence number for incremental polling (monotonic). */
	seq: number;
}

/** Server response when creating a room. */
export interface CreateRoomResult {
	roomId: string;
	/** The join URL to share with collaborators. */
	joinUrl: string;
	/** The host's session ID. */
	sessionId: string;
}

/** Server response when joining a room. */
export interface JoinRoomResult {
	sessionId: string;
	color: string;
	isHost: boolean;
	room: RoomState;
}

/** Color palette for collaborator cursors. High-contrast, distinguishable. */
export const COLLAB_COLORS = [
	"#ef4444", // red
	"#f97316", // orange
	"#eab308", // yellow
	"#22c55e", // green
	"#06b6d4", // cyan
	"#3b82f6", // blue
	"#8b5cf6", // violet
	"#ec4899", // pink
] as const;

/** Lock timeout in ms — locks auto-expire after this if not renewed. */
export const LOCK_TIMEOUT_MS = 30_000;

/** Stale collaborator cleanup — removed if no activity for this long. */
export const STALE_COLLABORATOR_MS = 60_000;
