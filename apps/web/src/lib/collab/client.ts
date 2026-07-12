/**
 * Browser-side client for the collaboration API. Wraps the REST
 * endpoints in `/api/collab` so UI code never hand-builds requests.
 *
 * All endpoints return typed results; errors are thrown as Error
 * instances with human-readable messages.
 */

import type {
	CollabMode,
	CreateRoomResult,
	JoinRoomResult,
	RoomState,
} from "./types";

export async function createRoom({
	projectName,
	mode,
	nickname,
}: {
	projectName: string;
	mode: CollabMode;
	nickname: string;
}): Promise<CreateRoomResult> {
	const res = await fetch("/api/collab/create", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ projectName, mode, nickname }),
	});
	if (!res.ok) {
		const detail = await res.json().catch(() => null);
		throw new Error(detail?.error ?? "Could not create collaboration room.");
	}
	return (await res.json()) as CreateRoomResult;
}

export async function joinRoom({
	roomId,
	nickname,
}: {
	roomId: string;
	nickname: string;
}): Promise<JoinRoomResult> {
	const res = await fetch(`/api/collab/${encodeURIComponent(roomId)}/join`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ nickname }),
	});
	if (res.status === 404)
		throw new Error("This collaboration link is no longer active.");
	if (!res.ok) {
		const detail = await res.json().catch(() => null);
		throw new Error(detail?.error ?? "Could not join the collaboration room.");
	}
	return (await res.json()) as JoinRoomResult;
}

export async function pollRoomState({
	roomId,
	sessionId,
	fromSeq,
}: {
	roomId: string;
	sessionId: string;
	fromSeq: number;
}): Promise<RoomState> {
	const res = await fetch(
		`/api/collab/${encodeURIComponent(roomId)}?sessionId=${encodeURIComponent(sessionId)}&fromSeq=${fromSeq}`,
		{ method: "GET" },
	);
	if (!res.ok) throw new Error("Could not fetch room state.");
	return (await res.json()) as RoomState;
}

export async function sendCommand({
	roomId,
	sessionId,
	commandName,
	args,
}: {
	roomId: string;
	sessionId: string;
	commandName: string;
	args: Record<string, unknown>;
}): Promise<void> {
	const res = await fetch(`/api/collab/${encodeURIComponent(roomId)}/command`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sessionId, commandName, args }),
	});
	if (!res.ok) {
		const detail = await res.json().catch(() => null);
		throw new Error(detail?.error ?? "Could not send command.");
	}
}

export async function sendCursor({
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
	// Fire-and-forget — cursor updates are high-frequency and lossy.
	// Use keepalive so the request survives even if the tab is closing.
	try {
		await fetch(`/api/collab/${encodeURIComponent(roomId)}/cursor`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ sessionId, x, y, elementId }),
			keepalive: true,
		});
	} catch {
		// Cursor updates are best-effort; swallow network errors.
	}
}

export async function lockElement({
	roomId,
	sessionId,
	elementId,
}: {
	roomId: string;
	sessionId: string;
	elementId: string;
}): Promise<boolean> {
	const res = await fetch(`/api/collab/${encodeURIComponent(roomId)}/lock`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sessionId, elementId }),
	});
	if (!res.ok) return false;
	const data = (await res.json()) as { ok: boolean };
	return data.ok;
}

export async function unlockElement({
	roomId,
	sessionId,
	elementId,
}: {
	roomId: string;
	sessionId: string;
	elementId: string;
}): Promise<void> {
	await fetch(`/api/collab/${encodeURIComponent(roomId)}/lock`, {
		method: "DELETE",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sessionId, elementId }),
	}).catch(() => {
		// Best-effort unlock.
	});
}

export async function leaveRoom({
	roomId,
	sessionId,
}: {
	roomId: string;
	sessionId: string;
}): Promise<void> {
	await fetch(`/api/collab/${encodeURIComponent(roomId)}/leave`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sessionId }),
		keepalive: true,
	}).catch(() => {
		// Best-effort leave.
	});
}

export async function setRoomMode({
	roomId,
	sessionId,
	mode,
}: {
	roomId: string;
	sessionId: string;
	mode: CollabMode;
}): Promise<void> {
	const res = await fetch(`/api/collab/${encodeURIComponent(roomId)}/mode`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sessionId, mode }),
	});
	if (!res.ok) throw new Error("Could not change room mode.");
}

/** Build the join URL for a room ID. */
export function buildJoinUrl(roomId: string): string {
	const origin =
		typeof window !== "undefined"
			? window.location.origin
			: "https://artidor.vercel.app";
	return `${origin}/c/${roomId}`;
}
