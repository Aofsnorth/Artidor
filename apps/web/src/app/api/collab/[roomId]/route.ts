/**
 * Get room state (polling endpoint). Clients poll this every ~1s to
 * receive the latest collaborators, cursors, locks, and commands.
 */

import { checkRateLimit } from "@/lib/rate-limit";
import { getRoomState } from "@/lib/collab/room-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ roomId: string }> },
) {
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return Response.json({ error: "Too many requests" }, { status: 429 });
	}

	const { roomId } = await params;
	const url = new URL(request.url);
	const sessionId = url.searchParams.get("sessionId");

	if (!sessionId) {
		return Response.json({ error: "Missing sessionId" }, { status: 400 });
	}

	const state = await getRoomState({ roomId, sessionId });
	if (!state) {
		return Response.json({ error: "Room not found" }, { status: 404 });
	}

	return Response.json(state);
}
