/**
 * Require-auth helper for API routes.
 *
 * Returns the session if authenticated, or a 401 Response if not.
 * Usage:
 *   const session = await requireAuth(request);
 *   if (session instanceof Response) return session; // 401
 *   // session is now the valid session object
 */

import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";

export async function requireAuth(_request: Request): Promise<Response> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session) {
		return Response.json(
			{ error: "unauthorized", message: "Authentication required" },
			{ status: 401 },
		);
	}
	return session as unknown as Response;
}

/**
 * Check auth and return session or null (no 401 response).
 * Useful when auth is optional but you want the session if available.
 */
export async function getOptionalSession() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	return session;
}
