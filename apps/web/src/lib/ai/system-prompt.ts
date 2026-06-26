/**
 * Builds the system prompt the AI Edit panel sends on every request.
 *
 * The prompt is composed in layers so it stays cache-friendly on
 * provider-side prompt caches (Anthropic and OpenAI both benefit):
 *   1. Static role + behaviour description (rarely changes).
 *   2. Tool reference table (changes only when we ship a new tool).
 *   3. Live project snapshot (changes per request).
 *   4. Recent-edit summary (changes per request).
 *   5. Optional style profile (changes per request).
 *
 * The whole prompt is one string to keep the function signature
 * compatible with every provider's `system` field.
 */

import type { ChatContext } from "./provider";
import { summariseRecentEvents, type TelemetryEvent } from "./telemetry/store";
import { formatStyleProfile } from "./style/prompt";

export function buildSystemPrompt({
	tools,
	context,
	recentEvents,
}: {
	tools: { name: string; category: string; description: string }[];
	context?: ChatContext;
	recentEvents?: TelemetryEvent[];
}): string {
	const toolsByCategory = groupBy(tools, (t) => t.category);
	const toolsTable = Object.entries(toolsByCategory)
		.map(([cat, list]) => {
			const rows = list
				.map((t) => `  - ${t.name}: ${t.description.split(".")[0].trim()}`)
				.join("\n");
			return `[${cat}]\n${rows}`;
		})
		.join("\n\n");

	const projectSnapshot = context
		? renderProjectSnapshot(context)
		: "No project context available.";

	const editsSummary = recentEvents
		? summariseRecentEvents(recentEvents)
		: "No prior edits observed.";

	const styleBlock =
		context?.styleProfile &&
		typeof context.styleProfile === "object" &&
		"duration" in context.styleProfile &&
		(context.styleProfile as { duration: number }).duration > 0
			? formatStyleProfile(
					context.styleProfile as Parameters<typeof formatStyleProfile>[0],
				)
			: "";

	return `You are Arth. Artidor video editor AI. User say plain English → you call tools.

# Rules
- Tools below only. No invent names.
- Fewest calls win. 1-3 per turn. Batch if more needed.
- Say what you do in 1-2 sentences. Then call.
- Destructive action (delete/remove/replace)? Say it FIRST. User can stop.
- Ticks: 1s = 120_000. All time fields use ticks.
- Colors: #rrggbb hex.
- Tool fail? Read error, try different param. No blind retry.
- No repeat already-applied effect.
- Match user editing style from recent edits below. Fast cutter → fast. Slow → slow.
- Ambiguous request? Pick most common interpretation. Proceed. No clarification unless truly impossible.

# Tools
${toolsTable}

# Project
${projectSnapshot}

# Recent edits
${editsSummary}
${styleBlock}

# Output
1. 1-2 sentence plan.
2. Tool calls as JSON, execution order.
3. Need info? Ask ONE specific question. Stop. No multi-question.

Begin.`;
}

function renderProjectSnapshot(ctx: ChatContext): string {
	const lines: string[] = [];
	lines.push(`- Name: ${ctx.projectName ?? "(unnamed)"}`);
	if (ctx.fps) lines.push(`- Frame rate: ${ctx.fps} fps`);
	if (ctx.canvasSize)
		lines.push(`- Canvas: ${ctx.canvasSize.width} × ${ctx.canvasSize.height}`);
	if (ctx.duration)
		lines.push(
			`- Duration: ${(ctx.duration / 120_000).toFixed(2)}s (${ctx.duration} ticks)`,
		);
	if (ctx.trackSummary?.length) {
		lines.push("- Tracks:");
		for (const t of ctx.trackSummary) {
			lines.push(`  - ${t.type} (${t.elementCount} elements)`);
		}
	} else {
		lines.push("- Tracks: (none)");
	}
	return lines.join("\n");
}

function groupBy<T, K extends string>(
	arr: T[],
	key: (item: T) => K,
): Record<K, T[]> {
	const out = {} as Record<K, T[]>;
	for (const item of arr) {
		const k = key(item);
		if (!out[k]) out[k] = [];
		out[k].push(item);
	}
	return out;
}
