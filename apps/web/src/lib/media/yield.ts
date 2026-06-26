/**
 * Yield to the event loop (macrotask) so pending UI events — clicks,
 * animation frames, revoke buttons — can be processed.
 *
 * The media processing pipeline (audio decoding, interleaving, WAV
 * encoding, beat detection) contains several tight loops that process
 * millions of samples. Without yielding, these block the main thread
 * for seconds, freezing the editor and making interactive elements
 * unclickable.
 *
 * Usage: call `await yieldToEventLoop()` inside a long-running loop
 * every N iterations to keep the UI responsive.
 */
export function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Default number of iterations between event-loop yields. Tuned so
 * each chunk takes <16ms (one frame) on typical hardware, keeping the
 * UI smooth without excessive yield overhead.
 */
export const DEFAULT_YIELD_INTERVAL = 4096;
