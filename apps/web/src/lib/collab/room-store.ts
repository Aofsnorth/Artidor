/**
 * Redis-backed ephemeral rooms. Every mutation (including heartbeat and delete)
 * commits against the exact snapshot read, so stale writers cannot recreate a
 * deleted room or overwrite a concurrent edit. Redis errors fail closed: a
 * process-local fallback would split membership and authorization across hosts.
 *
 * Reads (the 1 Hz poll) are served from their own GET and commit only the
 * session heartbeat, and only when that heartbeat is actually due — see
 * `getRoomState`.
 */
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { webEnv } from "@/lib/env/web";
import {
	COLLAB_COLORS,
	LOCK_TIMEOUT_MS,
	STALE_COLLABORATOR_MS,
	type CollabCommand,
	type CollabMode,
	type RoomState,
} from "./types";
import { isCollabNotification } from "./protocol";

/**
 * Minimal Redis surface the room store needs. Production uses Upstash REST;
 * tests can inject a raw-TCP adapter over the same interface so atomicity is
 * proven against a real Redis without depending on the REST gateway.
 */
export interface CollabRedis {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, opts?: { ex?: number; nx?: boolean }): Promise<string | null>;
	eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown>;
}

/** Injection point for tests; null means "use the production Upstash client". */
let redisOverride: CollabRedis | null = null;

/** Swap the backing client. Test-only — production code never calls this. */
export function setCollabRedisOverride(override: CollabRedis | null): void {
	redisOverride = override;
}

const redis = new Redis({
	url: webEnv.UPSTASH_REDIS_REST_URL,
	token: webEnv.UPSTASH_REDIS_REST_TOKEN,
	automaticDeserialization: false,
	retry: false,
	signal: () => AbortSignal.timeout(1500),
});
const roomKey = (roomId: string) => `collab:room:${roomId}`;
const ROOM_TTL_SECONDS = 6 * 60 * 60;
const MAX_COMMIT_ATTEMPTS = 32;
/**
 * How often the read path must commit the one field a poll changes
 * (session liveness). Polling no longer rewrites the room on every tick,
 * so the heartbeat is renewed on this cadence instead.
 * STALE_COLLABORATOR_MS is 60s — 4x this interval — so a live session can
 * never be pruned between heartbeats, and an abandoned one is still
 * pruned within the same window as before. A cursor update also refreshes
 * `lastSeenAt`, so a client that is actively moving skips the poll's
 * write entirely.
 */
const HEARTBEAT_INTERVAL_MS = 15_000;

interface StoredRoom extends RoomState {
	projectName: string;
	hostSessionId: string;
	/** Prevents ABA when a heartbeat writes otherwise identical JSON. */
	revision: string;
}

/** Atomic snapshot validation + write/delete; tested against real Redis. */
export const COMMIT_ROOM_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if ARGV[2] == '' then
  redis.call('DEL', KEYS[1])
else
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
end
return 1
`;

/** Public, sanitized failure: callers must not report a successful mutation. */
export class CollabStoreUnavailableError extends Error {
	constructor() {
		super("Collaboration storage is unavailable. Please retry.");
		this.name = "CollabStoreUnavailableError";
	}
}

/** Pick an unused cursor color, then cycle the palette. */
function pickColor(taken: string[]): string {
	return COLLAB_COLORS.find((color) => !taken.includes(color)) ??
		COLLAB_COLORS[taken.length % COLLAB_COLORS.length] ?? "#ef4444";
}

function pruneStale(room: StoredRoom): void {
	const now = Date.now();
	room.collaborators = room.collaborators.filter(
		(c) => now - c.lastSeenAt < STALE_COLLABORATOR_MS,
	);
	const active = new Set(room.collaborators.map((c) => c.id));
	room.cursors = room.cursors.filter((c) => active.has(c.collaboratorId));
	room.locks = room.locks.filter(
		(l) => active.has(l.lockedBy) && now - l.lockedAt < LOCK_TIMEOUT_MS,
	);
}

/**
 * Retry only a definite CAS conflict, never an ambiguous network failure.
 * The callback is synchronous and may be repeated; it must have no side effects.
 * Pruning occurs before authorization/heartbeat, so an expired session cannot
 * revive itself. Host expiry terminates the room on every operation, not just join.
 *
 * Redis availability: this module talks to Upstash Redis. At rest the client
 * sends real network traffic; callers must route through the public store
 * functions, whose failures surface as CollabStoreUnavailableError.
 */
async function mutateRoom<T>(
	roomId: string,
	missing: T,
	mutate: (room: StoredRoom) => { result: T; remove?: boolean },
): Promise<T> {
	const client = redisOverride ?? redis;
	try {
		for (let attempt = 0; attempt < MAX_COMMIT_ATTEMPTS; attempt++) {
			const snapshot = await client.get(roomKey(roomId));
			if (snapshot === null) return missing;
			const room = JSON.parse(snapshot) as StoredRoom;
			pruneStale(room);
			const hasHost = room.collaborators.some((c) => c.id === room.hostSessionId);
			const change = hasHost ? mutate(room) : { result: missing, remove: true };
			room.revision = crypto.randomUUID();
			// Upstash's Redis client types Lua EVAL results as `unknown` because
			// Redis is untyped on the wire. The COMMIT_ROOM_SCRIPT contract is
			// "returns the integer 1 on commit, 0 on CAS conflict", so narrow at
			// runtime instead of casting: anything that is not a commit result
			// must not be treated as success.
			const committedResult = await client.eval(
				COMMIT_ROOM_SCRIPT,
				[roomKey(roomId)],
				[
					snapshot,
					change.remove ? "" : JSON.stringify(room),
					String(ROOM_TTL_SECONDS),
				],
			);
			const committed =
				typeof committedResult === "number" ||
				(typeof committedResult === "string" && /^-?\d+$/.test(committedResult))
					? Number(committedResult)
					: NaN;
			if (committed === 1) return change.result;
		}
	} catch {
		throw new CollabStoreUnavailableError();
	}
	throw new CollabStoreUnavailableError();
}

function member(room: StoredRoom, sessionId: string) {
	return room.collaborators.find((c) => c.id === sessionId);
}

function canEdit(room: StoredRoom, sessionId: string): boolean {
	return !!member(room, sessionId) &&
		(room.hostSessionId === sessionId || room.mode === "edit");
}

/**
 * A session ID is a bearer capability, NOT a public participant identifier.
 * Keep the caller's ID for existing UI self-filtering; hash every other ID in
 * all response collections. Hashes are domain-separated and never accepted as
 * credentials. Do not return the stored room directly from an API route.
 */
function toRoomState(room: StoredRoom, sessionId: string): RoomState {
	const publicId = (id: string) => id === sessionId ? id :
		createHash("sha256").update(`collab-participant:${room.roomId}:${id}`).digest("hex");
	return {
		roomId: room.roomId,
		mode: room.mode,
		projectId: room.projectId ?? null,
		projectName: room.projectName ?? null,
		collaborators: room.collaborators.map((c) => ({ ...c, id: publicId(c.id) })),
		cursors: room.cursors.map((c) => ({ ...c, collaboratorId: publicId(c.collaboratorId) })),
		locks: room.locks.map((l) => ({ ...l, lockedBy: publicId(l.lockedBy) })),
		// Older clients uploaded private command fields. Never relay that data.
		commands: room.commands.filter(isCollabNotification).map((c) => ({ ...c, collaboratorId: publicId(c.collaboratorId) })),
		comments: room.comments.map((c) => ({ ...c, collaboratorId: publicId(c.collaboratorId) })),
		suggestions: [],
		seq: room.seq,
	};
}

/** Create a fresh room without overwriting an existing capability. */
export async function createRoomStore({ roomId, mode, projectName, nickname, projectId }: {
	roomId: string; mode: CollabMode; projectName: string; nickname: string; projectId: string | null;
}): Promise<{ sessionId: string; room: RoomState }> {
	const sessionId = crypto.randomUUID();
	const room: StoredRoom = {
		roomId, mode, projectName, projectId, hostSessionId: sessionId,
		revision: crypto.randomUUID(),
		collaborators: [{ id: sessionId, nickname, color: pickColor([]), isHost: true, lastSeenAt: Date.now() }],
		cursors: [], locks: [], commands: [], comments: [], suggestions: [], seq: 0,
	};
	try {
		const created = await (redisOverride ?? redis).set(
			roomKey(roomId),
			JSON.stringify(room),
			{ ex: ROOM_TTL_SECONDS, nx: true },
		);
		if (created !== "OK") throw new CollabStoreUnavailableError();
	} catch {
		throw new CollabStoreUnavailableError();
	}
	return { sessionId, room: toRoomState(room, sessionId) };
}

/** Join only while the host is active; concurrent stop invalidates this commit. */
export async function joinRoomStore({ roomId, nickname }: {
	roomId: string; nickname: string;
}): Promise<{ sessionId: string; room: RoomState } | null> {
	const sessionId = crypto.randomUUID();
	return mutateRoom<{ sessionId: string; room: RoomState } | null>(roomId, null, (room) => {
		room.collaborators.push({ id: sessionId, nickname,
			color: pickColor(room.collaborators.map((c) => c.color)), isHost: false, lastSeenAt: Date.now() });
		return { result: { sessionId, room: toRoomState(room, sessionId) } };
	});
}

/**
 * `fromSeq` is advisory: only a finite, non-negative sequence enables a
 * delta response. Anything else (including an omitted value, which is
 * what every pre-delta client sends) gets the full snapshot.
 */
function normalizeFromSeq(fromSeq: number | undefined): number | null {
	return typeof fromSeq === "number" &&
		Number.isFinite(fromSeq) &&
		fromSeq >= 0
		? fromSeq
		: null;
}

/**
 * Project a room for one session, optionally as a delta against the
 * caller's sequence.
 *
 * Collaborators, cursors and locks change on every other client's write
 * (cursors at 10 Hz), so they always travel in full — a delta that
 * omitted them would silently freeze remote presence. The command log is
 * the only unbounded collection, so it is the one that honours `seq`.
 * A baseline older than the retained window cannot be served as a delta
 * without skipping commands, so it falls back to the full log.
 */
function projectRoom(
	room: StoredRoom,
	sessionId: string,
	fromSeq: number | null,
): RoomState {
	const state = toRoomState(room, sessionId);
	if (fromSeq === null) return state;
	if (fromSeq < room.seq - room.commands.length) return state;
	return {
		...state,
		commands: state.commands.filter((command) => command.seq > fromSeq),
	};
}

/** Polling is an authenticated heartbeat; missing/expired members get no state.
 *
 * A poll is a READ, so it is served from the single Redis GET it already
 * needs instead of routing through `mutateRoom`, which turned every
 * 1 Hz poll from every client into a full JSON parse plus a complete
 * compare-and-swap rewrite of the room. The guarantees `mutateRoom`
 * provides are preserved where they actually matter:
 *
 *  - host expiry still terminates the room, through the CAS path, because
 *    a read must never delete on a snapshot it did not validate;
 *  - the heartbeat commits against the exact snapshot it read, so a
 *    stale poll still cannot overwrite a concurrent edit;
 *  - a non-member (zombie) session still gets no state, and now performs
 *    no write at all — a zombie poll can no longer keep a room alive;
 *  - Redis errors still fail closed.
 *
 * `fromSeq` (optional) makes the response a delta containing only the
 * commands the caller has not seen. Omit it for a full snapshot; the
 * response shape is a `RoomState` either way, so a pre-delta client that
 * omits it parses the response exactly as before.
 */
export async function getRoomState({ roomId, sessionId, fromSeq }: {
	roomId: string; sessionId: string; fromSeq?: number;
}): Promise<RoomState | null> {
	const client = redisOverride ?? redis;
	let room: StoredRoom;
	try {
		const snapshot = await client.get(roomKey(roomId));
		if (snapshot === null) return null;
		room = JSON.parse(snapshot) as StoredRoom;
	} catch {
		throw new CollabStoreUnavailableError();
	}

	pruneStale(room);
	// Host expiry terminates the room on every operation, not just join.
	// That is a write, so hand it to the CAS path, which re-reads and
	// re-validates before deleting.
	if (!room.collaborators.some((c) => c.id === room.hostSessionId)) {
		return mutateRoom<RoomState | null>(roomId, null, () => ({ result: null }));
	}

	const collaborator = member(room, sessionId);
	if (!collaborator) return null;

	const delta = normalizeFromSeq(fromSeq);
	// Liveness is the only field a poll changes, and it is already fresh
	// whenever a cursor update or another write just refreshed it.
	if (Date.now() - collaborator.lastSeenAt >= HEARTBEAT_INTERVAL_MS) {
		return mutateRoom<RoomState | null>(roomId, null, (committed) => {
			const live = member(committed, sessionId);
			if (!live) return { result: null };
			live.lastSeenAt = Date.now();
			return { result: projectRoom(committed, sessionId, delta) };
		});
	}
	return projectRoom(room, sessionId, delta);
}

/** Update presence for an active member only. */
export async function updateCursor({ roomId, sessionId, x, y, elementId }: {
	roomId: string; sessionId: string; x: number; y: number; elementId?: string;
}): Promise<void> {
	await mutateRoom(roomId, undefined, (room) => {
		const collaborator = member(room, sessionId);
		if (collaborator) {
			collaborator.lastSeenAt = Date.now();
			room.cursors = room.cursors.filter((c) => c.collaboratorId !== sessionId);
			room.cursors.push({ collaboratorId: sessionId, x, y, elementId });
		}
		return { result: undefined };
	});
}

/** Append a validated edit notification, NOT an executable editor command. */
export async function appendCommand({ roomId, sessionId, commandName, args }: {
	roomId: string; sessionId: string; commandName: string; args: Record<string, unknown>;
}): Promise<CollabCommand | null> {
	if (!isCollabNotification({ commandName, args })) return null;
	return mutateRoom<CollabCommand | null>(roomId, null, (room) => {
		if (!canEdit(room, sessionId)) return { result: null };
		const collaborator = member(room, sessionId);
		if (collaborator) collaborator.lastSeenAt = Date.now();
		room.seq += 1;
		const command: CollabCommand = { id: crypto.randomUUID(), collaboratorId: sessionId,
			commandName, args: {}, timestamp: Date.now(), seq: room.seq };
		room.commands = [...room.commands.slice(-99), command];
		return { result: command };
	});
}

/** Atomically acquire/renew one lock; restricted guests cannot lock out the host. */
export async function tryLockElement({ roomId, sessionId, elementId }: {
	roomId: string; sessionId: string; elementId: string;
}): Promise<boolean> {
	return mutateRoom(roomId, false, (room) => {
		if (!canEdit(room, sessionId)) return { result: false };
		const existing = room.locks.find((l) => l.elementId === elementId);
		if (existing && existing.lockedBy !== sessionId) return { result: false };
		if (existing) existing.lockedAt = Date.now();
		else room.locks.push({ elementId, lockedBy: sessionId, lockedAt: Date.now() });
		return { result: true };
	});
}

/** Release only the authenticated member's lock. */
export async function unlockElementStore({ roomId, sessionId, elementId }: {
	roomId: string; sessionId: string; elementId: string;
}): Promise<void> {
	await mutateRoom(roomId, undefined, (room) => {
		if (member(room, sessionId)) {
			room.locks = room.locks.filter((l) => !(l.elementId === elementId && l.lockedBy === sessionId));
		}
		return { result: undefined };
	});
}

/** Host leave atomically deletes the room; guest leave only removes that member. */
export async function leaveRoomStore({ roomId, sessionId }: {
	roomId: string; sessionId: string;
}): Promise<void> {
	await mutateRoom(roomId, undefined, (room) => {
		if (room.hostSessionId === sessionId) return { result: undefined, remove: true };
		room.collaborators = room.collaborators.filter((c) => c.id !== sessionId);
		room.cursors = room.cursors.filter((c) => c.collaboratorId !== sessionId);
		room.locks = room.locks.filter((l) => l.lockedBy !== sessionId);
		return { result: undefined };
	});
}

/** Only the active host can set guest permissions, checked at commit time. */
export async function setModeStore({ roomId, sessionId, mode }: {
	roomId: string; sessionId: string; mode: CollabMode;
}): Promise<boolean> {
	return mutateRoom(roomId, false, (room) => {
		if (!member(room, sessionId) || room.hostSessionId !== sessionId) return { result: false };
		room.mode = mode;
		if (mode !== "edit") room.locks = room.locks.filter((l) => l.lockedBy === sessionId);
		return { result: true };
	});
}
