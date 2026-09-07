import { expect, test, describe } from "bun:test";
import {
	createRoomStore,
	joinRoomStore,
	getRoomState,
	tryLockElement,
	unlockElementStore,
	leaveRoomStore,
	setModeStore,
} from "./room-store";
import { buildJoinUrl } from "./client";
import { POST as handleCreateRoom } from "@/app/api/collab/create/route";
import { GET as handleGetRoomState } from "@/app/api/collab/[roomId]/route";
import { POST as handleJoinRoom } from "@/app/api/collab/[roomId]/join/route";
import {
	POST as handleLock,
	DELETE as handleUnlock,
} from "@/app/api/collab/[roomId]/lock/route";
import { POST as handleCommand } from "@/app/api/collab/[roomId]/command/route";
import { POST as handleCursor } from "@/app/api/collab/[roomId]/cursor/route";
import { POST as handleMode } from "@/app/api/collab/[roomId]/mode/route";
import { POST as handleLeave } from "@/app/api/collab/[roomId]/leave/route";

describe("Collaboration Room Store", () => {
	test("creates a room and joins it", async () => {
		const roomId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const created = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "Test Project",
			nickname: "HostAlex",
		});

		expect(created.sessionId).toBeDefined();
		expect(created.room.roomId).toBe(roomId);
		expect(created.room.mode).toBe("edit");
		expect(created.room.collaborators.length).toBe(1);
		expect(created.room.collaborators[0].nickname).toBe("HostAlex");
		expect(created.room.collaborators[0].isHost).toBe(true);

		// Guest joins
		const joined = await joinRoomStore({
			roomId,
			nickname: "GuestSam",
		});

		expect(joined).not.toBeNull();
		if (!joined) return;

		expect(joined.sessionId).not.toBe(created.sessionId);
		expect(joined.room.collaborators.length).toBe(2);
		expect(joined.room.collaborators[1].nickname).toBe("GuestSam");
		expect(joined.room.collaborators[1].isHost).toBe(false);

		// State can be fetched
		const state = await getRoomState({
			roomId,
			sessionId: created.sessionId,
		});

		expect(state).not.toBeNull();
		expect(state?.collaborators.length).toBe(2);
	});

	test("element locking and releasing", async () => {
		const roomId = `test_lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "Lock Test",
			nickname: "HostUser",
		});
		const guest = await joinRoomStore({
			roomId,
			nickname: "GuestUser",
		});

		expect(guest).not.toBeNull();
		if (!guest) return;

		const elementId = "clip-123";

		// Host locks clip-123
		const hostLocked = await tryLockElement({
			roomId,
			sessionId: host.sessionId,
			elementId,
		});
		expect(hostLocked).toBe(true);

		// Guest tries to lock the same element — should be blocked
		const guestLocked = await tryLockElement({
			roomId,
			sessionId: guest.sessionId,
			elementId,
		});
		expect(guestLocked).toBe(false);

		// Host unlocks
		await unlockElementStore({
			roomId,
			sessionId: host.sessionId,
			elementId,
		});

		// Guest tries to lock again — should succeed
		const guestLockedAgain = await tryLockElement({
			roomId,
			sessionId: guest.sessionId,
			elementId,
		});
		expect(guestLockedAgain).toBe(true);
	});

	test("mode change restricted to host", async () => {
		const roomId = `test_mode_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "Mode Test",
			nickname: "HostUser",
		});
		const guest = await joinRoomStore({
			roomId,
			nickname: "GuestUser",
		});

		expect(guest).not.toBeNull();
		if (!guest) return;

		// Guest cannot change mode
		const guestModeChanged = await setModeStore({
			roomId,
			sessionId: guest.sessionId,
			mode: "view",
		});
		expect(guestModeChanged).toBe(false);

		// Host can change mode
		const hostModeChanged = await setModeStore({
			roomId,
			sessionId: host.sessionId,
			mode: "view",
		});
		expect(hostModeChanged).toBe(true);
	});

	test("collaborator leaves room", async () => {
		const roomId = `test_leave_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const host = await createRoomStore({
			roomId,
			mode: "edit",
			projectName: "Leave Test",
			nickname: "HostUser",
		});
		const guest = await joinRoomStore({
			roomId,
			nickname: "GuestUser",
		});

		expect(guest).not.toBeNull();
		if (!guest) return;

		await leaveRoomStore({
			roomId,
			sessionId: guest.sessionId,
		});

		const state = await getRoomState({
			roomId,
			sessionId: host.sessionId,
		});
		expect(state?.collaborators.length).toBe(1);
		expect(state?.collaborators[0].id).toBe(host.sessionId);
	});
});

describe("Collaboration Client URL Helper", () => {
	test("buildJoinUrl produces valid URL with custom origin", () => {
		const url = buildJoinUrl("room123", "http://localhost:3005");
		expect(url).toBe("http://localhost:3005/c/room123");
	});
});

describe("Collaboration API Route POST /api/collab/create", () => {
	test("allows room creation without user account (anonymous local-first)", async () => {
		const request = new Request("http://localhost:3005/api/collab/create", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				host: "localhost:3005",
			},
			body: JSON.stringify({
				projectName: "My Awesome Video",
				mode: "edit",
				nickname: "Arthenyx",
			}),
		});

		const response = await handleCreateRoom(request);
		expect(response.status).toBe(200);

		const data = (await response.json()) as {
			roomId: string;
			joinUrl: string;
			sessionId: string;
		};

		expect(data.roomId).toBeDefined();
		expect(data.sessionId).toBeDefined();
		expect(data.joinUrl).toContain(`/c/${data.roomId}`);
		expect(data.joinUrl).toContain("localhost:3005");
	});

	test("end-to-end api route lifecycle without auth block", async () => {
		// 1. Create Room via API
		const createReq = new Request("http://localhost:3005/api/collab/create", {
			method: "POST",
			headers: { "content-type": "application/json", host: "localhost:3005" },
			body: JSON.stringify({
				projectName: "Lifecycle Test",
				mode: "edit",
				nickname: "HostCreator",
			}),
		});
		const createRes = await handleCreateRoom(createReq);
		expect(createRes.status).toBe(200);
		const { roomId, sessionId: hostSessionId } = (await createRes.json()) as {
			roomId: string;
			sessionId: string;
		};
		const params = Promise.resolve({ roomId });

		// 2. Poll room state via GET /api/collab/[roomId]
		const pollReq = new Request(
			`http://localhost:3005/api/collab/${roomId}?sessionId=${hostSessionId}&fromSeq=0`,
		);
		const pollRes = await handleGetRoomState(pollReq, { params });
		expect(pollRes.status).toBe(200);

		// 3. Guest joins via POST /api/collab/[roomId]/join
		const joinReq = new Request(
			`http://localhost:3005/api/collab/${roomId}/join`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ nickname: "GuestParticipant" }),
			},
		);
		const joinRes = await handleJoinRoom(joinReq, { params });
		expect(joinRes.status).toBe(200);
		const { sessionId: guestSessionId } = (await joinRes.json()) as {
			sessionId: string;
		};

		// 4. Cursor broadcast via POST /api/collab/[roomId]/cursor
		const cursorReq = new Request(
			`http://localhost:3005/api/collab/${roomId}/cursor`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					sessionId: guestSessionId,
					x: 150,
					y: 75,
				}),
			},
		);
		const cursorRes = await handleCursor(cursorReq, { params });
		expect(cursorRes.status).toBe(200);

		// 5. Command broadcast via POST /api/collab/[roomId]/command
		const commandReq = new Request(
			`http://localhost:3005/api/collab/${roomId}/command`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					sessionId: hostSessionId,
					commandName: "SplitClipCommand",
					args: { clipId: "c1", time: 5 },
				}),
			},
		);
		const commandRes = await handleCommand(commandReq, { params });
		expect(commandRes.status).toBe(200);

		// 6. Element lock via POST /api/collab/[roomId]/lock
		const lockReq = new Request(
			`http://localhost:3005/api/collab/${roomId}/lock`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					sessionId: hostSessionId,
					elementId: "clip-99",
				}),
			},
		);
		const lockRes = await handleLock(lockReq, { params });
		expect(lockRes.status).toBe(200);
		const lockData = (await lockRes.json()) as { ok: boolean };
		expect(lockData.ok).toBe(true);

		// 7. Element unlock via DELETE /api/collab/[roomId]/lock
		const unlockReq = new Request(
			`http://localhost:3005/api/collab/${roomId}/lock`,
			{
				method: "DELETE",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					sessionId: hostSessionId,
					elementId: "clip-99",
				}),
			},
		);
		const unlockRes = await handleUnlock(unlockReq, { params });
		expect(unlockRes.status).toBe(200);

		// 8. Mode change via POST /api/collab/[roomId]/mode (host only)
		const modeReq = new Request(
			`http://localhost:3005/api/collab/${roomId}/mode`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					sessionId: hostSessionId,
					mode: "comment",
				}),
			},
		);
		const modeRes = await handleMode(modeReq, { params });
		expect(modeRes.status).toBe(200);

		// 9. Leave room via POST /api/collab/[roomId]/leave
		const leaveReq = new Request(
			`http://localhost:3005/api/collab/${roomId}/leave`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId: guestSessionId }),
			},
		);
		const leaveRes = await handleLeave(leaveReq, { params });
		expect(leaveRes.status).toBe(200);
	});
});
