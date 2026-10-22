type CancelFn = () => void;

const cancellers = new Set<CancelFn>();

export function registerCanceller({ fn }: { fn: CancelFn }): () => void {
	cancellers.add(fn);

	return () => {
		cancellers.delete(fn);
	};
}

export function cancelInteraction(): boolean {
	if (cancellers.size === 0) return false;

	const activeCancellers = Array.from(cancellers);

	for (const cancel of activeCancellers) {
		// Remove before invoking so a canceller that registers a new handler
		// during cleanup isn't wiped out by the final clear. One throwing
		// canceller must not prevent the rest from running.
		cancellers.delete(cancel);
		try {
			cancel();
		} catch (err) {
			console.error("Interaction canceller threw:", err);
		}
	}
	cancellers.clear();

	return true;
}
