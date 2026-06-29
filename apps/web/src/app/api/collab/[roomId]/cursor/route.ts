/**
 * Update a collaborator's cursor position. High-frequency, best-effort.
 * The cursor is stored in the room state and picked up by other clients
 * on their next poll.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { updateCursor } from "@/lib/collab/room-store";
import { getOptionalSession } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	sessionId: z.string().min(1),
	x: z.number(),
	y: z.number(),
	elementId: z.string().optional(),
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

	await updateCursor({
		roomId,
		sessionId: body.sessionId,
		x: body.x,
		y: body.y,
		elementId: body.elementId,
	});
	return Response.json({ ok: true });
}
