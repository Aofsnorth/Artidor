/**
 * Leave a collaboration room. Removes the collaborator and their
 * cursors/locks from the room state.
 */

import { z } from "zod";
import { leaveRoomStore } from "@/lib/collab/room-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	sessionId: z.string().min(1),
});

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ roomId: string }> },
) {
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
