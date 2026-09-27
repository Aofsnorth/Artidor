/**
 * Read-path tests for the collaboration room store.
 *
 * `collab.test.ts` stays the authoritative contract for this store: it
 * runs the real implementation against a REAL Redis because an in-memory
 * fake cannot prove compare-and-swap atomicity, and it reports/skips when
 * Redis is absent. Nothing here replaces it.
 *
 * What a fake CAN prove honestly is which Redis operations the read path
 * performs and what a `fromSeq` delta contains — both of which the Redis
 * suite does not assert. `FakeRedis` below implements the same
 * GET/SET/EVAL surface the store depends on, including the exact
 * "compare against ARGV[1], write ARGV[2], else return 0" contract of
 * COMMIT_ROOM_SCRIPT, so branch selection is exercised for real. It is
 * NOT a concurrency test: CAS atomicity is collab.test.ts's job.
 */

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	appendCommand,
	createRoomStore,
	getRoomState,
	joinRoomStore,
	setCollabRedisOverride,
	updateCursor,
	type CollabRedis,
} from "./room-store";

class FakeRedis implements CollabRedis {
	readonly data = new Map<string, string>();
	/** Number of EVAL calls — a CAS commit is the only write path. */
	evalCalls = 0;

	async get(key: string): Promise<string | null> {
		return this.data.get(key) ?? null;
	}

	async set(
		key: string,
		value: string,
		opts?: { ex?: number; nx?: boolean },
	): Promise<string | null> {
		void opts;
		if (opts?.nx && this.data.has(key)) return null;
		this.data.set(key, value);
		return "OK";
	}

	async eval(
		_script: string,
		keys: string[],
		args: (string | number)[],
	): Promise<unknown> {
		this.evalCalls += 1;
		const key = keys[0];
		if (key === undefined) return 0;
		const current = this.data.get(key) ?? null;
		// COMMIT_ROOM_SCRIPT: refuse unless the stored bytes are exactly the
		// snapshot the caller read.
		if (current !== String(args[0])) return 0;
		const next = String(args[1]);
		if (next === "") this.data.delete(key);
		else this.data.set(key, next);
		return 1;
	}
}

interface StoredRoomShape {
	collaborators: { id: string; lastSeenAt: number }[];
	commands: { seq: number }[];
	seq: number;
	revision: string;
}

let fake: FakeRedis;

function roomKeyOf(roomId: string): string {
	return `collab:room:${roomId}`;
}

function readStoredRoom(roomId: string): StoredRoomShape {
	const raw = fake.data.get(roomKeyOf(roomId));
	if (raw === undefined) throw new Error(`room ${roomId} is not stored`);
	return JSON.parse(raw) as StoredRoomShape;
}

function writeStoredRoom(roomId: string, room: StoredRoomShape): void {
	fake.data.set(roomKeyOf(roomId), JSON.stringify(room));
}

function backDateCollaborator(roomId: string, sessionId: string, ms: number): void {
	const room = readStoredRoom(roomId);
	const collaborator = room.collaborators.find((c) => c.id === sessionId);
	if (!collaborator) throw new Error(`session ${sessionId} is not a member`);
	collaborator.lastSeenAt = Date.now() - ms;
	writeStoredRoom(roomId, room);
}

let roomCounter = 0;
function newRoomId(): string {
	roomCounter += 1;
	return `poll_${Date.now()}_${roomCounter}`;
}

async function newHostRoom(roomId: string): Promise<string> {
	const created = await createRoomStore({
		roomId,
		mode: "edit",
		projectName: "P",
		nickname: "Host",
		projectId: "proj-1",
	});
	return created.sessionId;
}

beforeEach(() => {
	fake = new FakeRedis();
	setCollabRedisOverride(fake);
});

afterEach(() => {
	setCollabRedisOverride(null);
});

afterAll(() => {
	setCollabRedisOverride(null);
});

describe("room store read path", () => {
	test("a poll with a fresh heartbeat performs no write at all", async () => {
		const roomId = newRoomId();
		const sessionId = await newHostRoom(roomId);
		const before = fake.data.get(roomKeyOf(roomId));
		fake.evalCalls = 0;

		const state = await getRoomState({ roomId, sessionId });

		expect(state?.collaborators.length).toBe(1);
		// A read used to cost a full compare-and-swap EVAL that rewrote the
		// whole room; the poll must now be a single GET.
		expect(fake.evalCalls).toBe(0);
		// Byte-identical stored snapshot: nothing was rewritten.
		expect(fake.data.get(roomKeyOf(roomId))).toBe(before);
	});

	test("repeated polls stay write-free until the heartbeat is due", async () => {
		const roomId = newRoomId();
		const sessionId = await newHostRoom(roomId);
		fake.evalCalls = 0;

		for (let i = 0; i < 10; i++) {
			await getRoomState({ roomId, sessionId });
		}
		expect(fake.evalCalls).toBe(0);

		// Past the heartbeat interval the liveness field must be committed
		// through the CAS path, and nothing else may change.
		backDateCollaborator(roomId, sessionId, 20_000);
		const stale = readStoredRoom(roomId);
		const state = await getRoomState({ roomId, sessionId });

		expect(fake.evalCalls).toBe(1);
		expect(state?.seq).toBe(stale.seq);
		const after = readStoredRoom(roomId);
		expect(after.seq).toBe(stale.seq);
		expect(after.commands.length).toBe(0);
		const host = after.collaborators.find((c) => c.id === sessionId);
		expect(host?.lastSeenAt).toBeGreaterThan(
			stale.collaborators.find((c) => c.id === sessionId)?.lastSeenAt ?? 0,
		);
	});

	test("a cursor update keeps a poll from writing a redundant heartbeat", async () => {
		const roomId = newRoomId();
		const sessionId = await newHostRoom(roomId);
		// The cursor write refreshes liveness, so the poll's own heartbeat is
		// already covered.
		backDateCollaborator(roomId, sessionId, 20_000);
		await updateCursor({ roomId, sessionId, x: 1, y: 2 });
		fake.evalCalls = 0;

		await getRoomState({ roomId, sessionId });

		expect(fake.evalCalls).toBe(0);
	});

	test("a poll for a session that is not a member gets no state and no write", async () => {
		const roomId = newRoomId();
		const sessionId = await newHostRoom(roomId);
		backDateCollaborator(roomId, sessionId, 20_000);
		fake.evalCalls = 0;

		const state = await getRoomState({ roomId, sessionId: "not-a-member" });

		// A zombie poll must not be able to keep a room alive.
		expect(state).toBeNull();
		expect(fake.evalCalls).toBe(0);
	});

	test("a stale host still terminates the room through the CAS path", async () => {
		const roomId = newRoomId();
		const hostSessionId = await newHostRoom(roomId);
		const guest = await joinRoomStore({ roomId, nickname: "Guest" });
		if (!guest) throw new Error("guest failed to join");
		backDateCollaborator(roomId, hostSessionId, 120_000);
		fake.evalCalls = 0;

		// Host expiry is a write, so it must go through the validating path.
		expect(await getRoomState({ roomId, sessionId: guest.sessionId })).toBeNull();
		expect(fake.evalCalls).toBe(1);
		expect(fake.data.has(roomKeyOf(roomId))).toBe(false);
		expect(await joinRoomStore({ roomId, nickname: "Late" })).toBeNull();
	});
});

describe("room store fromSeq delta", () => {
	test("omitting fromSeq returns the full command log (pre-delta clients)", async () => {
		const roomId = newRoomId();
		const sessionId = await newHostRoom(roomId);
		for (let i = 0; i < 3; i++) {
			await appendCommand({
				roomId,
				sessionId,
				commandName: "local-edit",
				args: {},
			});
		}

		const state = await getRoomState({ roomId, sessionId });

		expect(state?.seq).toBe(3);
		expect(state?.commands.length).toBe(3);
	});

	test("fromSeq returns only the commands the caller has not seen", async () => {
		const roomId = newRoomId();
		const sessionId = await newHostRoom(roomId);
		await appendCommand({ roomId, sessionId, commandName: "local-edit", args: {} });

		const caughtUp = await getRoomState({ roomId, sessionId, fromSeq: 1 });
		// Nothing new since the caller's baseline: the command log costs
		// nothing instead of replaying the full 100-entry log every second.
		expect(caughtUp?.seq).toBe(1);
		expect(caughtUp?.commands.length).toBe(0);
		// Presence still travels in full — a delta that dropped it would
		// freeze remote cursors.
		expect(caughtUp?.collaborators.length).toBe(1);

		await appendCommand({ roomId, sessionId, commandName: "local-edit", args: {} });
		await appendCommand({ roomId, sessionId, commandName: "local-edit", args: {} });

		const behind = await getRoomState({ roomId, sessionId, fromSeq: 1 });
		expect(behind?.seq).toBe(3);
		expect(behind?.commands.map((c) => c.seq)).toEqual([2, 3]);
	});

	test("a baseline older than the retained window falls back to the full log", async () => {
		const roomId = newRoomId();
		const sessionId = await newHostRoom(roomId);
		for (let i = 0; i < 3; i++) {
			await appendCommand({ roomId, sessionId, commandName: "local-edit", args: {} });
		}

		// seq 0 predates nothing here, but a caller whose baseline is far
		// behind must never silently skip commands.
		const behind = await getRoomState({ roomId, sessionId, fromSeq: 0 });
		expect(behind?.commands.length).toBe(3);

		const negative = await getRoomState({ roomId, sessionId, fromSeq: -1 });
		expect(negative?.commands.length).toBe(3);
	});
});
