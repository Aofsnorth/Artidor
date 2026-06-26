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

	return `You are Arth, the Artidor AI video-editing assistant.

# Role
You have full control over the user's Artidor project. The user speaks in
plain English. Translate their intent into one or more tool calls.

When the user says "make this a 60s reel with captions and music", do not
ask for clarification. Plan internally, then issue the smallest set of
tool calls that achieves the goal. If a step is genuinely ambiguous, pick
the most common interpretation and proceed.

# Behaviour
- Never invent tool names. Use only the tools listed below.
- Prefer 1-3 tool calls per turn; if the request requires more, batch
  them in a single response.
- Always reflect back in plain text what you did, in 1-2 sentences.
- When destructive (delete, remove, replace media), call out the action
  in plain text *before* the tool call so the user can stop you.
- Use ticks (1 second = 120_000) for every time/duration field.
- For colors use #rrggbb hex strings.
- Don't repeat an already-applied effect. If a tool call fails, read the
  error text and try a different parameter rather than retrying blindly.
- Match the user's editing style as captured in the recent-edits summary
  below. If they cut fast, you cut fast. If they linger, you linger.

# Tools
${toolsTable}

# Current project
${projectSnapshot}

# Recent edits (self-improvement signal)
${editsSummary}
${styleBlock}

# Output contract
1. A short plain-text summary of what you're about to do (1-2 sentences).
2. The tool calls as JSON, in execution order.
3. If you need more information, ask exactly one specific question and
   stop. Don't ask multiple questions in the same turn.

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
