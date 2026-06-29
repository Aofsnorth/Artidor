/**
 * Change the room's permission mode. Only the host can change the mode.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { setModeStore } from "@/lib/collab/room-store";
import { getOptionalSession } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
	sessionId: z.string().min(1),
	mode: z.enum(["view", "comment", "edit", "suggest"]),
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

	const ok = await setModeStore({
		roomId,
		sessionId: body.sessionId,
		mode: body.mode,
	});
	if (!ok) {
		return Response.json({ error: "Only the host can change the mode" }, { status: 403 });
	}
	return Response.json({ ok: true });
}
