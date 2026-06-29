import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
	const { limited } = await checkRateLimit({ request });
	if (limited) {
		return new Response("Too many requests", { status: 429 });
	}
	return new Response("OK", { status: 200 });
}
