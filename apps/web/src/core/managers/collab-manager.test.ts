/**
 * Regression tests for the collaboration permission-mode handling.
 *
 * The room `mode` is the permission level for *guests*. These tests lock in
 * that the host is never put into the room's mode (which used to lock the
 * host's own editor read-only right after starting a "view" session).
 */

import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { createJSONStorage } from "zustand/middleware";
import type { EditorCore } from "@/core";
import * as realClient from "@/lib/collab/client";
import type { RoomState } from "@/lib/collab/types";

/* In-memory storage so the real zustand collab store works under bun test. */
const memoryStorage = new Map<string, string>();
mock.module("@/stores/browser-storage", () => ({
	browserStorage: createJSONStorage(() => ({
		getItem: (key: string) => memoryStorage.get(key) ?? null,
		setItem: (key: string, value: string) => {
			memoryStorage.set(key, value);
		},
		removeItem: (key: string) => {
			memoryStorage.delete(key);
		},
	})),
}));

/* The manager only touches `editor.command`. */
const registerReactorMock = mock((fn: (command: unknown) => void) => {
	void fn;
	return () => {};
});

function buildEditorMock() {
	return {
		command: {
			readOnly: false,
			registerReactor: registerReactorMock,
		},
	} as unknown as EditorCore;
}

let currentEditor = buildEditorMock();

mock.module("@/core", () => ({
	EditorCore: { getInstance: () => currentEditor },
}));

function buildRoomState(mode: RoomState["mode"]): RoomState {
	return {
		roomId: "room-1",
		mode,
		projectId: "host-project-1",
		projectName: "Host Project",
		collaborators: [],
		cursors: [],
		locks: [],
		commands: [],
		comments: [],
		suggestions: [],
		seq: 1,
	};
}

const client = {
	createRoom: mock(async () => ({
		roomId: "room-1",
		joinUrl: "http://localhost/c/room-1",
		sessionId: "host-session",
	})),
	joinRoom: mock(async () => ({
		sessionId: "guest-session",
		color: "#22c55e",
		isHost: false,
		room: buildRoomState("view"),
	})),
	pollRoomState: mock(async () => buildRoomState("view")),
	sendCommand: mock(async (_args: {
		roomId: string;
		sessionId: string;
		commandName: string;
		args: Record<string, unknown>;
	}) => {}),
	sendCursor: mock(async () => {}),
	lockElement: mock(async () => true),
	unlockElement: mock(async () => {}),
	leaveRoom: mock(async () => {}),
	setRoomMode: mock(async () => {}),
};

// Partial mock: keep the real module's other exports (e.g. buildJoinUrl)
// intact so sibling test files sharing this process still see them.
mock.module("@/lib/collab/client", () => ({
	...realClient,
	createRoom: client.createRoom,
	joinRoom: client.joinRoom,
	pollRoomState: client.pollRoomState,
	sendCommand: client.sendCommand,
	sendCursor: client.sendCursor,
	lockElement: client.lockElement,
	unlockElement: client.unlockElement,
	leaveRoom: client.leaveRoom,
	setRoomMode: client.setRoomMode,
}));

const { CollabManager } = await import("./collab-manager");
const { useCollabStore } = await import("@/stores/collab-store");

type Pollable = { poll(): Promise<void> };
type ManagerLike = Pollable & {
	host(args: {
		projectName: string;
		mode: RoomState["mode"];
		nickname: string;
		projectId: string | null;
	}): Promise<void>;
	join(args: { roomId: string; nickname: string }): Promise<void>;
	setMode(mode: RoomState["mode"]): Promise<void>;
	disconnect(): Promise<void>;
};

async function runPollTick(manager: ManagerLike): Promise<void> {
	await manager.poll();
}

afterAll(() => {
	mock.restore();
});

afterEach(() => {
	useCollabStore.getState().disconnect();
	for (const fn of Object.values(client)) fn.mockClear();
	currentEditor = buildEditorMock();
});

describe("CollabManager permission modes", () => {
	test("host stays editable after starting a session in view mode", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		await manager.host({
			projectName: "Demo",
			mode: "view",
			nickname: "Host",
			projectId: "host-project-1",
		});

		const store = useCollabStore.getState();
		expect(store.isHost).toBe(true);
		expect(store.mode).toBe("view");
		expect(store.hostProjectId).toBe("host-project-1");

		// Simulate the polling tick that used to flip the host to read-only.
		await runPollTick(manager);

		expect(currentEditor.command.readOnly).toBe(false);
		await manager.disconnect();
	});

	test("host stays editable after switching the room to view mode", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		await manager.host({
			projectName: "Demo",
			mode: "edit",
			nickname: "Host",
			projectId: "host-project-1",
		});

		await manager.setMode("view");

		expect(useCollabStore.getState().mode).toBe("view");
		expect(currentEditor.command.readOnly).toBe(false);
		await manager.disconnect();
	});

	test("guest is read-only in view mode and released when the mode changes", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		await manager.join({ roomId: "room-1", nickname: "Guest" });

		expect(useCollabStore.getState().isHost).toBe(false);
		expect(currentEditor.command.readOnly).toBe(true);
		// The joiner learns the host's project id so the join page can land
		// them in the editor screen.
		expect(useCollabStore.getState().hostProjectId).toBe("host-project-1");

		// Host opens the room up for editing.
		client.pollRoomState.mockImplementation(async () => buildRoomState("edit"));
		await runPollTick(manager);

		expect(currentEditor.command.readOnly).toBe(false);
		await manager.disconnect();
	});

	test("host edits still broadcast while the room is in view mode", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		await manager.host({
			projectName: "Demo",
			mode: "view",
			nickname: "Host",
			projectId: "host-project-1",
		});

	const reactors = registerReactorMock.mock.calls;
		const reactor = reactors.at(-1)?.[0] as
			| ((command: unknown) => void)
			| undefined;
		expect(reactor).toBeDefined();
		if (!reactor) return;

		class FakeCommand {}
		reactor(new FakeCommand());

		// The protocol is notification-only: every local edit broadcasts the
		// fixed "local-edit" tag with empty args — never the command's name or
		// fields (editor internals/undo snapshots must not leave the host).
		expect(client.sendCommand).toHaveBeenCalledTimes(1);
		expect(client.sendCommand.mock.calls[0][0]).toEqual({
			roomId: "room-1",
			sessionId: "host-session",
			commandName: "local-edit",
			args: {},
		});
		await manager.disconnect();
	});

	test("guest session ends locally when the host ends the room", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		await manager.join({ roomId: "room-1", nickname: "Guest" });
		expect(useCollabStore.getState().status).toBe("connected");

		// The host ended the session — the room is gone, polling 404s.
		client.pollRoomState.mockImplementation(async () => {
			throw new realClient.CollabSessionEndedError();
		});
		await runPollTick(manager);

		expect(useCollabStore.getState().status).toBe("disconnected");
		expect(currentEditor.command.readOnly).toBe(false);
	});

	test("guest in comment mode is read-only until the room switches to edit", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		// Join returns a room in comment mode (non-edit ⇒ guests read-only).
		client.joinRoom.mockImplementationOnce(async () => ({
			sessionId: "guest-session",
			color: "#22c55e",
			isHost: false,
			room: buildRoomState("comment"),
		}));
		await manager.join({ roomId: "room-1", nickname: "Guest" });

		expect(currentEditor.command.readOnly).toBe(true);

		// Host switches the room to edit mode — the next poll releases the gate.
		client.pollRoomState.mockImplementation(async () => buildRoomState("edit"));
		await runPollTick(manager);

		expect(currentEditor.command.readOnly).toBe(false);
		await manager.disconnect();
	});

	test("guest edit notifications are suppressed in non-edit modes", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		client.joinRoom.mockImplementationOnce(async () => ({
			sessionId: "guest-session",
			color: "#22c55e",
			isHost: false,
			room: buildRoomState("suggest"),
		}));
		await manager.join({ roomId: "room-1", nickname: "Guest" });

		const reactors = registerReactorMock.mock.calls;
		const reactor = reactors.at(-1)?.[0] as
			| ((command: unknown) => void)
			| undefined;
		expect(reactor).toBeDefined();
		if (!reactor) return;

		class LocalCommand {}
		reactor(new LocalCommand());

		// A guest in suggest mode must not broadcast edit notifications — the
		// server would reject them, and a local gate must not emit doomed traffic.
		expect(client.sendCommand).not.toHaveBeenCalled();
		await manager.disconnect();
	});

	test("late poll response from a previous session is dropped", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		await manager.join({ roomId: "room-1", nickname: "Guest" });

		// Poll hangs; while it is in flight the guest disconnects and joins a
		// new session. The stale response must not update the new session.
		let resolveStale: (state: RoomState) => void = () => {};
		client.pollRoomState.mockImplementationOnce(
			() =>
				new Promise<RoomState>((resolve) => {
					resolveStale = resolve;
			}),
		);
		const staleTick = runPollTick(manager);
		await manager.disconnect();

		client.joinRoom.mockImplementationOnce(async () => ({
			sessionId: "guest-session-2",
			color: "#22c55e",
			isHost: false,
			room: { ...buildRoomState("edit"), roomId: "room-2", seq: 50 },
		}));
		await manager.join({ roomId: "room-2", nickname: "Guest" });

		// The old session's response arrives now — with collaborators from
		// room-1 and a lower seq. It must be dropped, not applied to room-2.
		resolveStale(buildRoomState("view"));
		await staleTick;

		expect(useCollabStore.getState().roomId).toBe("room-2");
		expect(useCollabStore.getState().sessionId).toBe("guest-session-2");
		await manager.disconnect();
	});

	test("poll rejection is contained and the session stays alive", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		client.joinRoom.mockImplementationOnce(async () => ({
			sessionId: "guest-session",
			color: "#22c55e",
			isHost: false,
			room: buildRoomState("edit"),
		}));
		await manager.join({ roomId: "room-1", nickname: "Guest" });

		// A non-session-ended failure (network/500) must not unhandled-reject:
		// the interval caller awaits poll, so a throw would crash the tick.
		client.pollRoomState.mockImplementationOnce(async () => {
			throw new Error("network down");
		});
		await expect(runPollTick(manager)).resolves.toBeUndefined();

		expect(useCollabStore.getState().status).toBe("connected");
		await manager.disconnect();
	});

	test("poll does not apply a room sequence regression", async () => {
		const manager = new CollabManager(currentEditor) as unknown as ManagerLike;
		client.joinRoom.mockImplementationOnce(async () => ({
			sessionId: "guest-session",
			color: "#22c55e",
			isHost: false,
			// Join snapshot at seq 10.
			room: { ...buildRoomState("edit"), seq: 10 },
		}));
		await manager.join({ roomId: "room-1", nickname: "Guest" });
		const baseline = useCollabStore.getState().collaborators;

		// A stale/re-created room answers with seq 3 and different members.
		client.pollRoomState.mockImplementationOnce(async () => ({
			...buildRoomState("edit"),
			seq: 3,
			collaborators: [
				{ id: "ghost", nickname: "Ghost", color: "#ef4444", isHost: false, lastSeenAt: 0 },
			],
		}));
		await runPollTick(manager);

		// The regression is dropped: members unchanged, not replaced by ghosts.
		// (The CollabState mirror has no `seq`; identity is asserted through the
		// member list the stale response tried to replace.)
		void baseline;
		expect(
			useCollabStore.getState().collaborators.some(
				(c) => c.nickname === "Ghost",
			),
		).toBe(false);
		await manager.disconnect();
	});
});
