/**
 * POST /api/feedback
 *
 * Stores user feedback (message + optional rating/category).
 * Auth-gated: only authenticated users can submit feedback.
 * Rate-limited: 5 submissions per hour per IP to prevent spam.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { webEnv } from "@/lib/env/web";
import { clientIpOf } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = new Redis({
	url: webEnv.UPSTASH_REDIS_REST_URL,
	token: webEnv.UPSTASH_REDIS_REST_TOKEN,
});

const feedbackRateLimit = new Ratelimit({
	redis,
	limiter: Ratelimit.slidingWindow(5, "1 h"),
	prefix: "feedback-rate-limit",
});

const bodySchema = z.object({
	message: z.string().min(1, "Message is required").max(5000),
	rating: z.number().int().min(1).max(5).optional(),
	category: z
		.enum(["bug", "feature", "praise", "other"])
		.optional(),
});

export async function POST(request: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session) {
		return NextResponse.json({ error: "unauthorized" }, { status: 401 });
	}

	const { success } = await feedbackRateLimit.limit(clientIpOf(request));
	if (!success) {
		return NextResponse.json(
			{ error: "rate_limited", message: "Too many feedback submissions. Try again later." },
			{ status: 429 },
		);
	}

	let body: z.infer<typeof bodySchema>;
	try {
		const json = (await request.json()) as unknown;
		body = bodySchema.parse(json);
	} catch (err) {
		return NextResponse.json(
			{ error: "invalid_body", message: err instanceof Error ? err.message : "Invalid JSON" },
			{ status: 400 },
		);
	}

	try {
		await db.insert(feedback).values({
			id: crypto.randomUUID(),
			userId: session.user.id,
			email: session.user.email,
			message: body.message,
			rating: body.rating ?? null,
			category: body.category ?? null,
		});

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json(
			{ error: "db_error", message: "Failed to store feedback" },
			{ status: 500 },
		);
	}
}
