/**
 * Join a collaboration room. The joining user provides a nickname and
 * receives a session ID + assigned color.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { joinRoomStore } from "@/lib/collab/room-store";
import type { JoinRoomResult } from "@/lib/collab/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	nickname: z.string().min(1).max(50),
});

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ roomId: string }> },
) {
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

	let result: Awaited<ReturnType<typeof joinRoomStore>>;
	try {
		result = await joinRoomStore({ roomId, nickname: body.nickname });
	} catch {
		return Response.json(
			{ error: "Collaboration storage unavailable" },
			{ status: 503 },
		);
	}
	if (!result) {
		return Response.json({ error: "Room not found" }, { status: 404 });
	}

	const response: JoinRoomResult = {
		sessionId: result.sessionId,
		color:
			result.room.collaborators.find((c) => c.id === result.sessionId)?.color ??
			"#ef4444",
		isHost: false,
		room: result.room,
	};
	return Response.json(response);
}
