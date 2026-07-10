export function formatSseEvent(payload: object): string {
	return `data: ${JSON.stringify(payload)}\n\n`;
}
