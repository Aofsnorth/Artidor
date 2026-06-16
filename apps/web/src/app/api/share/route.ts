/**
 * POST /api/share — create a read-only project share.
 *
 * The owner's browser sends a name, an optional password, and an opaque
 * `payload` (JSON describing where a viewer loads the project from — the public
 * Drive folder id, project file id, and media manifest). We store it, hash the
 * password (scrypt) if present, and return the share id + a one-time manage
 * token the creator keeps to revoke it later. The server never inspects the
 * payload and never stores the raw password or manage token.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import {
	generateManageToken,
	generateShareId,
	hashManageToken,
	hashPassword,
} from "@/lib/share/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
	name: z.string().min(1).max(200),
	// Opaque JSON written by the owner; capped so a share row stays small.
	payload: z.string().min(1).max(200_000),
	password: z.string().min(1).max(200).optional(),
});

export async function POST(request: Request) {
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	const json = await request.json().catch(() => null);
	const parsed = createSchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}
	const { name, payload, password } = parsed.data;

	const id = generateShareId();
	const manageToken = generateManageToken();

	await db.insert(shares).values({
		id,
		name,
		payload,
		passwordHash: password ? hashPassword(password) : null,
		manageTokenHash: hashManageToken(manageToken),
	});

	return NextResponse.json({ shareId: id, manageToken });
}
