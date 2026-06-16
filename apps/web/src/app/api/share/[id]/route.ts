/**
 * GET    /api/share/[id] — public metadata (name + whether a password is set).
 *                          Never returns the payload; that's gated by /unlock.
 * DELETE /api/share/[id] — revoke, authorized by the creator's manage token.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { shares } from "@/lib/db/schema";
import { verifyManageToken } from "@/lib/share/secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const [row] = await db
		.select({ name: shares.name, passwordHash: shares.passwordHash })
		.from(shares)
		.where(eq(shares.id, id))
		.limit(1);

	if (!row) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}
	return NextResponse.json({
		name: row.name,
		needsPassword: Boolean(row.passwordHash),
	});
}

const deleteSchema = z.object({ manageToken: z.string().min(1).max(500) });

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const json = await request.json().catch(() => null);
	const parsed = deleteSchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const [row] = await db
		.select({ manageTokenHash: shares.manageTokenHash })
		.from(shares)
		.where(eq(shares.id, id))
		.limit(1);

	if (!row) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}
	if (!verifyManageToken(parsed.data.manageToken, row.manageTokenHash)) {
		return NextResponse.json({ error: "forbidden" }, { status: 403 });
	}

	await db.delete(shares).where(eq(shares.id, id));
	return NextResponse.json({ ok: true });
}
