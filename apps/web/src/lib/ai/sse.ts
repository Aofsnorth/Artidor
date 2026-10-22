export function formatSseEvent(payload: object): string {
	return `data: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Split a raw SSE buffer into complete event blocks and the trailing
 * incomplete remainder. Normalizes CRLF line endings (servers commonly emit
 * `\r\n\r\n` between events) before splitting on the blank-line delimiter.
 */
export function splitSseBuffer(buffer: string): {
	events: string[];
	rest: string;
} {
	const normalized = buffer.replace(/\r\n/g, "\n");
	const parts = normalized.split("\n\n");
	const rest = parts.pop() ?? "";
	return { events: parts, rest };
}

/**
 * Extract the payload of one SSE event block. Multi-line `data:` fields are
 * joined with `\n` per the SSE spec; other fields (`event:`, `id:`, comments)
 * and blank lines are ignored. Returns null when the block has no data.
 */
export function parseSseEventBlock(block: string): string | null {
	const dataLines: string[] = [];
	for (const line of block.split("\n")) {
		if (!line.startsWith("data:")) continue;
		// A single optional space after the colon is part of the framing.
		dataLines.push(line.slice(5).replace(/^ /, ""));
	}
	return dataLines.length > 0 ? dataLines.join("\n") : null;
}
