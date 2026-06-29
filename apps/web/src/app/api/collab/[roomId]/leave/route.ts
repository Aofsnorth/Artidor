/**
 * Leave a collaboration room. Removes the collaborator and their
 * cursors/locks from the room state.
 */

import { z } from "zod";
import { leaveRoomStore } from "@/lib/collab/room-store";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOptionalSession } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	sessionId: z.string().min(1),
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
	} catch {
		return Response.json({ error: "Invalid request" }, { status: 400 });
	}

	await leaveRoomStore({ roomId, sessionId: body.sessionId });
	return Response.json({ ok: true });
}
