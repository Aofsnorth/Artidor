/**
 * Regression tests for collaboration room-store semantics.
 *
 * The store is the authorization point for every collab route, so these tests
 * run the real Redis-backed implementation. Redis is REQUIRED — an in-memory
 * mock cannot prove atomicity, and fabricated pass results are forbidden. When
 * Redis is unavailable the suite reports (and skips) rather than silently
 * degrading to memory-only assertions.
 *
 * Requires a real Redis at REDIS_URL (default redis://127.0.0.1:6379). The
 * store's production client (Upstash REST, https-only) is swapped for a
 * raw-TCP RESP2 adapter so the real store functions run against real Redis.
 */

import { afterAll, describe, expect, test } from "bun:test";
import {
	appendCommand,
	createRoomStore,
	getRoomState,
	joinRoomStore,
	leaveRoomStore,
	setCollabRedisOverride,
	setModeStore,
	tryLockElement,
	unlockElementStore,
	updateCursor,
} from "./room-store";
import { RawRedisAdapter } from "./raw-redis-adapter";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

/** Isolated namespace per run so tests never collide on room IDs. */
const RUN_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const roomIds: string[] = [];

function newRoomId(): string {
	const id = `t_${RUN_ID}_${roomIds.length}`;
	roomIds.push(id);
	return id;
}

async function probeRedis(): Promise<{
	available: boolean;
	adapter: RawRedisAdapter | null;
}> {
	try {
		const candidate = new RawRedisAdapter(REDIS_URL);
		await candidate.connect();
		const pong = await candidate.get("__never__");
		// A completed round-trip (null for a missing key) proves the connection.
		if (pong === null) {
			setCollabRedisOverride(candidate);
			return { available: true, adapter: candidate };
		}
		candidate.close();
	} catch {
		// Redis is optional outside a Redis-enabled environment; the suite below
		// is then skipped (never degraded to a memory fake).
	}
	return { available: false, adapter: null };
}

// The probe runs at module load, not in `beforeAll`: `describe.skipIf` is
// evaluated when the suite is *registered*, which happens before any hook, so a
// beforeAll probe would still read `false` here and the suite could never run.
const { available: redisAvailable, adapter } = await probeRedis();

afterAll(() => {
	setCollabRedisOverride(null);
	adapter?.close();
});

describe.skipIf(!redisAvailable)("Collaboration Room Store (Redis)", () => {
	test("requires real Redis", async () => {
		expect(redisAvailable).toBe(true);
	});

	test("join fails once the host leaves (deleted room, no resurrect)", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});
		await leaveRoomStore({ roomId, sessionId: host.sessionId });

		expect(await joinRoomStore({ roomId, nickname: "Late" })).toBeNull();
		expect(
			await getRoomState({ roomId, sessionId: host.sessionId }),
		).toBeNull();
	}, 20000);

	test("concurrent joins and commands do not lose each other's writes", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});

		const joinResults = await Promise.all(
			Array.from({ length: 8 }, (_, i) =>
				joinRoomStore({ roomId, nickname: `Guest${i}` }),
			),
		);
		for (const joined of joinResults) {
			expect(joined).not.toBeNull();
		}
		const state = await getRoomState({
			roomId,
			sessionId: host.sessionId,
		});
		expect(state?.collaborators.length).toBe(9); // host + 8 guests, none lost

		// Concurrent command appends must all be retained.
		const send = (sessionId: string) =>
			appendCommand({
				roomId,
				sessionId,
				commandName: "local-edit",
				args: {},
			});
		await Promise.all([
			send(host.sessionId),
			...joinResults
				.filter((j): j is NonNullable<typeof j> => j !== null)
				.map((j) => send(j.sessionId)),
		]);
		const after = await getRoomState({
			roomId,
			sessionId: host.sessionId,
		});
		expect(after?.commands.length).toBe(9);
		expect(after?.seq).toBe(9);
	}, 30000);

	test("zombie session cannot poll, lock, or command after leave", async () => {
		const roomId = newRoomId();
		await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});
		const guest = await joinRoomStore({ roomId, nickname: "Guest" });
		expect(guest).not.toBeNull();
		if (!guest) return;

		await leaveRoomStore({ roomId, sessionId: guest.sessionId });

		expect(
			await getRoomState({ roomId, sessionId: guest.sessionId }),
		).toBeNull();
		expect(
			await tryLockElement({
				roomId,
				sessionId: guest.sessionId,
				elementId: "e1",
			}),
		).toBe(false);
		expect(
			await appendCommand({
				roomId,
				sessionId: guest.sessionId,
				commandName: "local-edit",
				args: {},
			}),
		).toBeNull();
	}, 20000);

	test("stale host terminates room for everyone on next operation", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});
		const guest = await joinRoomStore({ roomId, nickname: "Guest" });
		expect(guest).not.toBeNull();

		// Simulate the host going stale by back-dating its lastSeenAt directly
		// in Redis (the store prunes stale members before authorizing).
		if (!adapter) throw new Error("Redis adapter missing");
		const key = `collab:room:${roomId}`;
		const raw = await adapter.get(key);
		const room = JSON.parse(String(raw)) as {
			collaborators: { id: string; lastSeenAt: number }[];
		};
		room.collaborators.forEach((c) => {
			if (c.id === host.sessionId) c.lastSeenAt = Date.now() - 120_000;
		});
		await adapter.set(key, JSON.stringify(room));

		// The guest's next poll ends the room: pruned host ⇒ room deleted.
		expect(
			await getRoomState({ roomId, sessionId: guest?.sessionId ?? "x" }),
		).toBeNull();
		expect(await joinRoomStore({ roomId, nickname: "Late" })).toBeNull();
	}, 30000);

	test("command log entries are notification-only; args stay empty", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});
		expect(
			await appendCommand({
				roomId,
				sessionId: host.sessionId,
				commandName: "AddTrackCommand",
				args: { type: "video", savedState: { big: "private" } },
			}),
		).toBeNull();

		const state = await getRoomState({
			roomId,
			sessionId: host.sessionId,
		});
		expect(state?.commands.length).toBe(0);
	}, 20000);

	test("room state projection hides other participants' session IDs", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});
		const guest = await joinRoomStore({ roomId, nickname: "Guest" });
		expect(guest).not.toBeNull();
		if (!guest) return;

		const guestView = await getRoomState({
			roomId,
			sessionId: guest.sessionId,
		});
		const guestViewRoom = guestView?.collaborators.find(
			(c) => c.nickname === "Host",
		);
		expect(guestViewRoom?.id === host.sessionId).toBe(false);
		// The guest still sees its own real session ID (needed for
		// self-identification in the store/UI).
		expect(guestView?.collaborators.some((c) => c.id === guest.sessionId)).toBe(
			true,
		);
	}, 20000);

	test("guest poll exposes host project name and id for the join route", async () => {
		const roomId = newRoomId();
		await createRoomStore({
			roomId,
			mode: "view",
			projectName: "Host Movie",
			nickname: "Host",
			projectId: "proj-9",
		});
		const guest = await joinRoomStore({ roomId, nickname: "Guest" });
		expect(guest).not.toBeNull();
		if (!guest) return;

		const state = await getRoomState({
			roomId,
			sessionId: guest.sessionId,
		});
		// The join route needs both to land the guest in a labeled placeholder.
		expect(state?.projectId).toBe("proj-9");
		expect(state?.projectName).toBe("Host Movie");
	}, 20000);

	test("mode change restricted to host; guests cannot lock in view mode", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
		projectId: "proj-1",
		});
		const guest = await joinRoomStore({ roomId, nickname: "Guest" });
		expect(guest).not.toBeNull();
		if (!guest) return;

		expect(
			await setModeStore({ roomId, sessionId: guest.sessionId, mode: "view" }),
		).toBe(false);
		expect(
			await setModeStore({ roomId, sessionId: host.sessionId, mode: "view" }),
		).toBe(true);

		// Guest cannot lock or append commands in view mode.
		expect(
			await tryLockElement({
				roomId,
				sessionId: guest.sessionId,
				elementId: "e1",
			}),
		).toBe(false);
		expect(
			await appendCommand({
				roomId,
				sessionId: guest.sessionId,
				commandName: "local-edit",
				args: {},
			}),
		).toBeNull();

		// Host can still broadcast its own edits in any mode.
		expect(
			await appendCommand({
				roomId,
				sessionId: host.sessionId,
				commandName: "local-edit",
				args: {},
			}),
		).not.toBeNull();
	}, 20000);

	test("element locking and release", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});
		const guest = await joinRoomStore({ roomId, nickname: "Guest" });
		expect(guest).not.toBeNull();
		if (!guest) return;

		expect(
			await tryLockElement({
				roomId,
				sessionId: host.sessionId,
				elementId: "clip-1",
			}),
		).toBe(true);
		expect(
			await tryLockElement({
				roomId,
				sessionId: guest.sessionId,
				elementId: "clip-1",
			}),
		).toBe(false);
		await unlockElementStore({
			roomId,
			sessionId: host.sessionId,
			elementId: "clip-1",
		});
		expect(
			await tryLockElement({
				roomId,
				sessionId: guest.sessionId,
				elementId: "clip-1",
			}),
		).toBe(true);
	}, 20000);

	test("cursor update keeps a single entry per collaborator", async () => {
		const roomId = newRoomId();
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "P",
			nickname: "Host",
			projectId: "proj-1",
		});
		await updateCursor({ roomId, sessionId: host.sessionId, x: 1, y: 2 });
		await updateCursor({ roomId, sessionId: host.sessionId, x: 3, y: 4 });

		const state = await getRoomState({
			roomId,
			sessionId: host.sessionId,
		});
		expect(state?.cursors.length).toBe(1);
		expect(state?.cursors[0]?.x).toBe(3);
	}, 20000);
});

// Honest bookkeeping for the no-Redis case: the authoritative suite above is
// visibly SKIPPED (it must never be reported as passing against a fake), and no
// store override is left behind that could make memory-only assertions pass.
test.skipIf(redisAvailable)(
	"Redis suite is skipped because no real Redis is reachable",
	() => {
		expect(redisAvailable).toBe(false);
		expect(adapter).toBeNull();
	},
);
