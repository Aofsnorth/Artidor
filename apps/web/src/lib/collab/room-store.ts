/**
 * Server-side collaboration room store backed by Upstash Redis.
 *
 * Each room's state is stored as a JSON blob under `collab:room:{roomId}`.
 * Commands and cursor updates are appended to a list under
 * `collab:room:{roomId}:events` for polling-based retrieval.
 *
 * This uses the existing @upstash/redis dependency (already used for
 * rate limiting) — no new dependencies are introduced.
 */

import { Redis } from "@upstash/redis";
import { webEnv } from "@/lib/env/web";
import {
	COLLAB_COLORS,
	LOCK_TIMEOUT_MS,
	STALE_COLLABORATOR_MS,
	type CollabCommand,
	type CollabComment,
	type CollabCursor,
	type CollabMode,
	type Collaborator,
	type ElementLock,
	type RoomState,
} from "./types";

const redis = new Redis({
	url: webEnv.UPSTASH_REDIS_REST_URL,
	token: webEnv.UPSTASH_REDIS_REST_TOKEN,
});

const ROOM_KEY = (roomId: string) => `collab:room:${roomId}`;
const ROOM_TTL_SECONDS = 6 * 60 * 60; // 6 hours

interface StoredRoom {
	roomId: string;
	mode: CollabMode;
	projectName: string;
	hostSessionId: string;
	collaborators: Collaborator[];
	cursors: CollabCursor[];
	locks: ElementLock[];
	commands: CollabCommand[];
	comments: CollabComment[];
	suggestions: import("./types").CollabSuggestion[];
	seq: number;
}

function emptyRoom(
	roomId: string,
	mode: CollabMode,
	projectName: string,
	hostSessionId: string,
): StoredRoom {
	return {
		roomId,
		mode,
		projectName,
		hostSessionId,
		collaborators: [],
		cursors: [],
		locks: [],
		commands: [],
		comments: [],
		suggestions: [],
		seq: 0,
	};
}

/** Pick the next color from the palette that isn't already in use. */
function pickColor(taken: string[]): string {
	for (const color of COLLAB_COLORS) {
		if (!taken.includes(color)) return color;
	}
	// All colors taken — cycle by hashing the count.
	return COLLAB_COLORS[taken.length % COLLAB_COLORS.length] ?? "#ef4444";
}

/** Remove stale collaborators and their cursors/locks. */
function pruneStale(room: StoredRoom): void {
	const now = Date.now();
	const active = room.collaborators.filter(
		(c) => now - c.lastSeenAt < STALE_COLLABORATOR_MS,
	);
	const activeIds = new Set(active.map((c) => c.id));
	room.collaborators = active;
	room.cursors = room.cursors.filter((c) => activeIds.has(c.collaboratorId));
	room.locks = room.locks.filter(
		(l) => activeIds.has(l.lockedBy) && now - l.lockedAt < LOCK_TIMEOUT_MS,
	);
}

async function getRoom(roomId: string): Promise<StoredRoom | null> {
	const raw = await redis.get<StoredRoom>(ROOM_KEY(roomId));
	return raw ?? null;
}

async function saveRoom(room: StoredRoom): Promise<void> {
	await redis.set(ROOM_KEY(room.roomId), room, { ex: ROOM_TTL_SECONDS });
}

export async function createRoomStore({
	roomId,
	mode,
	projectName,
	nickname,
}: {
	roomId: string;
	mode: CollabMode;
	projectName: string;
	nickname: string;
}): Promise<{ sessionId: string; room: StoredRoom }> {
	const sessionId = crypto.randomUUID();
	const room = emptyRoom(roomId, mode, projectName, sessionId);
	const host: Collaborator = {
		id: sessionId,
		nickname,
		color: pickColor([]),
		isHost: true,
		lastSeenAt: Date.now(),
	};
	room.collaborators.push(host);
	await saveRoom(room);
	return { sessionId, room };
}

export async function joinRoomStore({
	roomId,
	nickname,
}: {
	roomId: string;
	nickname: string;
}): Promise<{ sessionId: string; room: StoredRoom } | null> {
	const room = await getRoom(roomId);
	if (!room) return null;
	pruneStale(room);
	const sessionId = crypto.randomUUID();
	const taken = room.collaborators.map((c) => c.color);
	const collaborator: Collaborator = {
		id: sessionId,
		nickname,
		color: pickColor(taken),
		isHost: false,
		lastSeenAt: Date.now(),
	};
	room.collaborators.push(collaborator);
	await saveRoom(room);
	return { sessionId, room };
}

export async function getRoomState({
	roomId,
	sessionId,
}: {
	roomId: string;
	sessionId: string;
}): Promise<RoomState | null> {
	const room = await getRoom(roomId);
	if (!room) return null;
	// Update last-seen for the polling collaborator.
	const collab = room.collaborators.find((c) => c.id === sessionId);
	if (collab) collab.lastSeenAt = Date.now();
	pruneStale(room);
	await saveRoom(room);
	return toRoomState(room);
}

export async function updateCursor({
	roomId,
	sessionId,
	x,
	y,
	elementId,
}: {
	roomId: string;
	sessionId: string;
	x: number;
	y: number;
	elementId?: string;
}): Promise<void> {
	const room = await getRoom(roomId);
	if (!room) return;
	const collab = room.collaborators.find((c) => c.id === sessionId);
	if (!collab) return;
	collab.lastSeenAt = Date.now();
	const existing = room.cursors.find((c) => c.collaboratorId === sessionId);
	if (existing) {
		existing.x = x;
		existing.y = y;
		existing.elementId = elementId;
	} else {
		room.cursors.push({ collaboratorId: sessionId, x, y, elementId });
	}
	await saveRoom(room);
}

export async function appendCommand({
	roomId,
	sessionId,
	commandName,
	args,
}: {
	roomId: string;
	sessionId: string;
	commandName: string;
	args: Record<string, unknown>;
}): Promise<CollabCommand | null> {
	const room = await getRoom(roomId);
	if (!room) return null;
	const collab = room.collaborators.find((c) => c.id === sessionId);
	if (!collab) return null;
	collab.lastSeenAt = Date.now();
	const command: CollabCommand = {
		id: crypto.randomUUID(),
		collaboratorId: sessionId,
		commandName,
		args,
		timestamp: Date.now(),
	};
	room.commands.push(command);
	// Keep only the last 100 commands to bound memory.
	room.commands = room.commands.slice(-100);
	room.seq += 1;
	await saveRoom(room);
	return command;
}

export async function tryLockElement({
	roomId,
	sessionId,
	elementId,
}: {
	roomId: string;
	sessionId: string;
	elementId: string;
}): Promise<boolean> {
	const room = await getRoom(roomId);
	if (!room) return false;
	const collab = room.collaborators.find((c) => c.id === sessionId);
	if (!collab) return false;
	collab.lastSeenAt = Date.now();
	pruneStale(room);
	const existing = room.locks.find((l) => l.elementId === elementId);
	if (existing && existing.lockedBy !== sessionId) return false;
	if (existing) {
		existing.lockedAt = Date.now();
	} else {
		room.locks.push({ elementId, lockedBy: sessionId, lockedAt: Date.now() });
	}
	await saveRoom(room);
	return true;
}

export async function unlockElementStore({
	roomId,
	sessionId,
	elementId,
}: {
	roomId: string;
	sessionId: string;
	elementId: string;
}): Promise<void> {
	const room = await getRoom(roomId);
	if (!room) return;
	room.locks = room.locks.filter(
		(l) => !(l.elementId === elementId && l.lockedBy === sessionId),
	);
	await saveRoom(room);
}

export async function leaveRoomStore({
	roomId,
	sessionId,
}: {
	roomId: string;
	sessionId: string;
}): Promise<void> {
	const room = await getRoom(roomId);
	if (!room) return;
	room.collaborators = room.collaborators.filter((c) => c.id !== sessionId);
	room.cursors = room.cursors.filter((c) => c.collaboratorId !== sessionId);
	room.locks = room.locks.filter((l) => l.lockedBy !== sessionId);
	await saveRoom(room);
}

export async function setModeStore({
	roomId,
	sessionId,
	mode,
}: {
	roomId: string;
	sessionId: string;
	mode: CollabMode;
}): Promise<boolean> {
	const room = await getRoom(roomId);
	if (!room) return false;
	const collab = room.collaborators.find((c) => c.id === sessionId);
	if (!collab?.isHost) return false;
	room.mode = mode;
	await saveRoom(room);
	return true;
}

function toRoomState(room: StoredRoom): RoomState {
	return {
		roomId: room.roomId,
		mode: room.mode,
		collaborators: room.collaborators,
		cursors: room.cursors,
		locks: room.locks,
		commands: room.commands,
		comments: room.comments,
		suggestions: room.suggestions,
		seq: room.seq,
	};
}
