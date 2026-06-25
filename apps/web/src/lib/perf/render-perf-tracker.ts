// Render performance tracker for the preview loop. The preview render
// callback feeds each render's duration into a bounded ring buffer; the
// adaptive quality system and the loading overlay read aggregate metrics
// from it. The tracker is in-memory only — never persisted, never sent
// over the network.

const DEFAULT_BUFFER_SIZE = 30;

/**
 * Bounded ring buffer of recent render durations (ms). Older samples are
 * overwritten once the buffer is full, so the metrics reflect recent
 * history rather than the whole session. At 60 fps and size 30, the
 * window is ~0.5 s — enough to smooth out single-frame spikes while
 * still reacting to sustained slowdowns within half a second.
 */
export class RenderPerfTracker {
	private buffer: number[];
	private head = 0;
	private count = 0;
	private readonly capacity: number;

	constructor(capacity: number = DEFAULT_BUFFER_SIZE) {
		if (capacity <= 0) {
			throw new Error("RenderPerfTracker capacity must be positive");
		}
		this.capacity = capacity;
		this.buffer = new Array<number>(capacity);
	}

	/** Push a render duration (ms) into the ring buffer. O(1). */
	recordRender(durationMs: number): void {
		if (durationMs < 0 || !Number.isFinite(durationMs)) return;
		this.buffer[this.head] = durationMs;
		this.head = (this.head + 1) % this.capacity;
		if (this.count < this.capacity) this.count++;
	}

	/** Number of samples currently in the buffer. */
	get size(): number {
		return this.count;
	}

	/** Arithmetic mean of the buffer. Returns 0 when empty. */
	getAverageRenderMs(): number {
		if (this.count === 0) return 0;
		let sum = 0;
		for (let i = 0; i < this.count; i++) {
			const v = this.buffer[i];
			if (v !== undefined) sum += v;
		}
		return sum / this.count;
	}

	/**
	 * True when the average render time exceeds `frameBudgetMs` and at
	 * least `minSamples` samples have been collected. Used by the
	 * adaptive quality system to decide when to drop a tier.
	 */
	isStruggling(
		frameBudgetMs: number,
		minSamples = 8,
	): boolean {
		if (this.count < minSamples) return false;
		return this.getAverageRenderMs() > frameBudgetMs;
	}

	/**
	 * True when the average render time is comfortably below
	 * `frameBudgetMs` (default 70 % of it) and at least `minSamples`
	 * samples have been collected. The recovery threshold is lower than
	 * the struggle threshold to create hysteresis — the system must be
	 * *significantly* fast before it upgrades back, preventing
	 * oscillation near the boundary.
	 */
	isRecovered(
		frameBudgetMs: number,
		minSamples = 8,
		recoverFactor = 0.7,
	): boolean {
		if (this.count < minSamples) return false;
		return this.getAverageRenderMs() < frameBudgetMs * recoverFactor;
	}

	/** Reset the buffer (e.g. when the project changes). */
	reset(): void {
		this.head = 0;
		this.count = 0;
	}
}
