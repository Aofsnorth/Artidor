/**
 * Element locking — prevents two collaborators from editing the same
 * timeline element simultaneously. POST to acquire/renew a lock,
 * DELETE to release.
 */

import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { tryLockElement, unlockElementStore } from "@/lib/collab/room-store";
import { getOptionalSession } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const postSchema = z.object({
	sessionId: z.string().min(1),
	elementId: z.string().min(1),
});

const deleteSchema = z.object({
	sessionId: z.string().min(1),
	elementId: z.string().min(1),
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

	let body: z.infer<typeof postSchema>;
	try {
		body = postSchema.parse(await request.json());
	} catch {
		return Response.json({ error: "Invalid request" }, { status: 400 });
	}

	const ok = await tryLockElement({
		roomId,
		sessionId: body.sessionId,
		elementId: body.elementId,
	});
	return Response.json({ ok });
}

export async function DELETE(
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

	let body: z.infer<typeof deleteSchema>;
	try {
		body = deleteSchema.parse(await request.json());
	} catch {
		return Response.json({ error: "Invalid request" }, { status: 400 });
	}

	await unlockElementStore({
		roomId,
		sessionId: body.sessionId,
		elementId: body.elementId,
	});
	return Response.json({ ok: true });
}
