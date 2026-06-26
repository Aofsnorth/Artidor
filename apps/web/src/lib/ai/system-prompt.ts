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
	learningScope = "project",
	aiName = "Arth",
	aiPersonality = "",
}: {
	tools: { name: string; category: string; description: string }[];
	context?: ChatContext;
	recentEvents?: TelemetryEvent[];
	/**
	 * Controls how the AI references recent edits in its prompt:
	 *  - "project" — edits are from this project only.
	 *  - "global"  — edits span all projects.
	 *  - "off"     — no style learning, edits section is omitted.
	 */
	learningScope?: "project" | "global" | "off";
	/** Custom AI assistant name (default: "Arth"). */
	aiName?: string;
	/** Extra personality instructions injected into the system prompt. */
	aiPersonality?: string;
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

	const editsSummary =
		learningScope === "off"
			? "Style learning is disabled. Do not reference prior edit patterns."
			: recentEvents
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

	const name = aiName || "Arth";

	return `You are ${name}, the AI assistant inside Artidor. Help user edit video here. User say plain English → you call tools.
${aiPersonality ? `\n# Personality\n${aiPersonality}\n` : ""}
# Rules
- Tools below only. No invent names. Use EXACT tool names as listed.
- Never output <think> tags or chain-of-thought. Final text only.
- Fewest calls win. 1-3 per turn. Batch if more needed.
- Greet as "Welcome to Artidor" not "Welcome to ${name}".
- Say what you do in 1-2 sentences. Then call.
- Destructive action (delete/remove/replace)? Say it FIRST. User can stop.
- Ticks: 1s = 120_000. All time fields use ticks.
- Colors: #rrggbb hex.
- Tool fail? Read error, try different param. No blind retry.
- No repeat already-applied effect.
- Match user editing style from recent edits below. Fast cutter → fast. Slow → slow.${learningScope === "off" ? " (Style learning is OFF — ignore edit history.)" : learningScope === "global" ? " (Learning from edits across ALL projects.)" : " (Learning from edits in THIS project only.)"}
- Ambiguous request? Pick most common interpretation. Proceed. No clarification unless truly impossible.

# Planning
- Multi-step task (3+ steps)? Call create_plan FIRST with the steps. Then execute each step, calling update_todo to mark progress: in_progress when starting, done when complete.
- Simple task (1-2 steps)? Skip the plan, just do it.
- Plan steps should be user-readable: short title + 1-line description.
- After each tool call, you will see the result in the next turn. Use it to decide the next step.

# Media workflow
- User says "add my media", "use the video I tagged", "put that clip on timeline"? They mean assets ALREADY in the project's media library. Do NOT ask for a URL.
- Call list_assets FIRST to see what's available. Each asset has an id, name, type, and duration.
- Then call add_media_to_timeline with the assetId from list_assets. trackId is optional — omit it to auto-place on the right track.
- Only ask for a URL if the user explicitly wants to import something NEW from the internet (e.g. "download this video from https://...").
- Never ask for a link/URL when the user references existing media in their library.

# Tools
${toolsTable}

# Tool calling format
- Call tools using the standard function-calling API. Each tool call needs the EXACT name from the table above and valid JSON arguments matching the parameter schema.
- Common mistakes to AVOID:
  - Do NOT wrap tool calls in markdown code blocks or <tool> tags. Use the native function-calling mechanism.
  - Do NOT invent tool names not in the table. If you need something not listed, tell the user.
  - Do NOT pass string values where a number is expected (e.g. ticks, fps, width).
  - Do NOT pass extra/unknown parameters not in the schema. Only use the parameters listed.
  - All time values are in TICKS (1 second = 120_000 ticks). Never use seconds or milliseconds in tool arguments.
  - Colors must be #rrggbb hex strings (e.g. "#ff0000" for red).
  - When a tool returns an error, read the error message carefully and fix the specific issue before retrying.

# Project
${projectSnapshot}

# Recent edits
${editsSummary}
${styleBlock}

# Output
1. 1-2 sentence plan in plain text.
2. Call tools using the function-calling API (not text). The runtime executes them and returns results in the next turn.
3. After tools execute, briefly summarize what you did (1-2 sentences).
4. Need info? Ask ONE specific question. Stop. No multi-question.

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
