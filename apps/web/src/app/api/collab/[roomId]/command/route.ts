/**
 * Broadcast a command to all collaborators in a room. The command is
 * stored in the room's command log and will be picked up by other
 * clients on their next poll.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import {
	appendCommand,
} from "@/lib/collab/room-store";
import { LOCAL_EDIT } from "@/lib/collab/protocol";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	sessionId: z.string().min(1),
	// Only the "local-edit" notification tag is accepted; args stay empty.
	commandName: z.literal(LOCAL_EDIT),
	args: z.record(z.string(), z.unknown()),
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

	let command: Awaited<ReturnType<typeof appendCommand>>;
	try {
		command = await appendCommand({
			roomId,
			sessionId: body.sessionId,
			commandName: body.commandName,
			args: body.args,
		});
	} catch {
		// Backing store unreachable — the edit was NOT stored. Report it
		// instead of pretending it reached other participants.
		return Response.json(
			{ error: "Collaboration storage unavailable" },
			{ status: 503 },
		);
	}
	if (!command) {
		// Unknown session or no edit permission (non-edit mode, not host).
		return Response.json(
			{ error: "Room or collaborator not found" },
			{ status: 404 },
		);
	}
	return Response.json({ ok: true });
}
