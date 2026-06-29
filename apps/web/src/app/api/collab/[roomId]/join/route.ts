/**
 * Join a collaboration room. The joining user provides a nickname and
 * receives a session ID + assigned color.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { joinRoomStore } from "@/lib/collab/room-store";
import type { JoinRoomResult } from "@/lib/collab/types";
import { getOptionalSession } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	nickname: z.string().min(1).max(50),
});

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ roomId: string }> },
) {
	const session = await getOptionalSession();
	if (!session) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}

	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return Response.json({ error: "Too many requests" }, { status: 429 });
	}

	const { roomId } = await params;

	let body: z.infer<typeof bodySchema>;
	try {
		body = bodySchema.parse(await request.json());
	} catch (err) {
		return Response.json(
			{ error: err instanceof Error ? err.message : "Invalid request" },
			{ status: 400 },
		);
	}

	const result = await joinRoomStore({ roomId, nickname: body.nickname });
	if (!result) {
		return Response.json({ error: "Room not found" }, { status: 404 });
	}

	const response: JoinRoomResult = {
		sessionId: result.sessionId,
		color: result.room.collaborators.find((c) => c.id === result.sessionId)?.color ?? "#ef4444",
		isHost: false,
		room: {
			roomId: result.room.roomId,
			mode: result.room.mode,
			collaborators: result.room.collaborators,
			cursors: result.room.cursors,
			locks: result.room.locks,
			commands: result.room.commands,
			comments: result.room.comments,
			suggestions: result.room.suggestions,
			seq: result.room.seq,
		},
	};
	return Response.json(response);
}
