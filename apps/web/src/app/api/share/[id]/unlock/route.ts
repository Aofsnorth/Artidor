/**
 * POST /api/share/[id]/unlock — exchange the (optional) password for the
 * share payload. The password is verified server-side (scrypt, constant-time)
 * and the endpoint is rate-limited to blunt brute-force attempts. Only on
 * success is the opaque payload (Drive load info) returned.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyPassword } from "@/lib/share/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unlockSchema = z.object({ password: z.string().max(200).optional() });

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return NextResponse.json({ error: "Too many requests" }, { status: 429 });
	}

	const { id } = await params;
	const json = await request.json().catch(() => ({}));
	const parsed = unlockSchema.safeParse(json ?? {});
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const [row] = await db
		.select({ payload: shares.payload, passwordHash: shares.passwordHash })
		.from(shares)
		.where(eq(shares.id, id))
		.limit(1);

	if (!row) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}

	if (row.passwordHash) {
		const password = parsed.data.password ?? "";
		if (!password || !verifyPassword(password, row.passwordHash)) {
			return NextResponse.json({ error: "invalid_password" }, { status: 401 });
		}
	}

	return NextResponse.json({ payload: row.payload });
}
