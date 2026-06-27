/**
 * Broadcast a command to all collaborators in a room. The command is
 * stored in the room's command log and will be picked up by other
 * clients on their next poll.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { appendCommand } from "@/lib/collab/room-store";
import { getOptionalSession } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	sessionId: z.string().min(1),
	commandName: z.string().min(1).max(100),
	args: z.record(z.string(), z.unknown()),
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

	const command = await appendCommand({
		roomId,
		sessionId: body.sessionId,
		commandName: body.commandName,
		args: body.args,
	});
	if (!command) {
		return Response.json({ error: "Room or collaborator not found" }, { status: 404 });
	}
	return Response.json({ ok: true });
}
