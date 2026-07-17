import type { CanvasRenderTiming } from "@/services/renderer/canvas-renderer";

export type PreviewRenderAverages = CanvasRenderTiming & {
	samples: number;
};

export class PreviewRenderMetrics {
	private samples = 0;
	private resolveMs = 0;
	private descriptorMs = 0;
	private compositeMs = 0;
	private blitMs = 0;
	private totalMs = 0;

	constructor(private readonly sampleWindow = 30) {
		if (sampleWindow <= 0) {
			throw new Error("PreviewRenderMetrics sample window must be positive");
		}
	}

	record(timing: CanvasRenderTiming): PreviewRenderAverages | null {
		this.samples += 1;
		this.resolveMs += timing.resolveMs;
		this.descriptorMs += timing.descriptorMs;
		this.compositeMs += timing.compositeMs;
		this.blitMs += timing.blitMs;
		this.totalMs += timing.totalMs;
		if (this.samples < this.sampleWindow) return null;

		const divisor = this.samples;
		const averages = {
			resolveMs: this.resolveMs / divisor,
			descriptorMs: this.descriptorMs / divisor,
			compositeMs: this.compositeMs / divisor,
			blitMs: this.blitMs / divisor,
			totalMs: this.totalMs / divisor,
			samples: divisor,
		};
		this.reset();
		return averages;
	}

	reset(): void {
		this.samples = 0;
		this.resolveMs = 0;
		this.descriptorMs = 0;
		this.compositeMs = 0;
		this.blitMs = 0;
		this.totalMs = 0;
	}
}

export function publishPreviewRenderMeasure(
	averages: PreviewRenderAverages,
): void {
	if (typeof performance === "undefined") return;
	const name = "artidor.preview.render";
	performance.clearMeasures(name);
	performance.measure(name, {
		start: Math.max(0, performance.now() - averages.totalMs),
		duration: averages.totalMs,
		detail: averages,
	});
}
