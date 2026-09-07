/**
 * Create a collaboration room. The host provides a project name, a
 * permission mode, and their nickname. Returns the room ID, join URL,
 * and the host's session ID.
 */

import { z } from "zod";
import { checkRateLimit, checkCreateResourceRateLimit } from "@/lib/rate-limit";
import { createRoomStore } from "@/lib/collab/room-store";
import { buildJoinUrl } from "@/lib/collab/client";
import type { CreateRoomResult } from "@/lib/collab/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getOriginFromRequest(request: Request): string | undefined {
	const host =
		request.headers.get("x-forwarded-host") ?? request.headers.get("host");
	const proto = request.headers.get("x-forwarded-proto") ?? "http";
	if (host) {
		return `${proto}://${host}`;
	}
	return undefined;
}

const bodySchema = z.object({
	projectName: z.string().min(1).max(200),
	mode: z.enum(["view", "comment", "edit", "suggest"]).default("edit"),
	nickname: z.string().min(1).max(50),
});

export async function POST(request: Request) {
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return Response.json({ error: "Too many requests" }, { status: 429 });
	}

	// Stricter cap on room creation — 10/hour per IP. Prevents resource
	// exhaustion abuse while staying anonymous (local-first design).
	const { limited: createLimited } = await checkCreateResourceRateLimit({
		request,
	});
	if (createLimited) {
		return Response.json(
			{ error: "Too many rooms created. Please wait before creating another." },
			{ status: 429 },
		);
	}

	let body: z.infer<typeof bodySchema>;
	try {
		body = bodySchema.parse(await request.json());
	} catch (err) {
		return Response.json(
			{ error: err instanceof Error ? err.message : "Invalid request" },
			{ status: 400 },
		);
	}

	const roomId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
	const { sessionId } = await createRoomStore({
		roomId,
		mode: body.mode,
		projectName: body.projectName,
		nickname: body.nickname,
	});

	const origin = getOriginFromRequest(request);
	const result: CreateRoomResult = {
		roomId,
		joinUrl: buildJoinUrl(roomId, origin),
		sessionId,
	};
	return Response.json(result);
}
