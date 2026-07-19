import {
	detectDeviceTier,
	resolvePreviewScale,
	type PreviewQuality,
} from "./preview-quality";

type PreviewTier = Exclude<PreviewQuality, "auto">;

const TIER_ORDER: PreviewTier[] = ["ultra", "low", "medium", "high"];
const SLOW_SAMPLE_LIMIT = 3;
const FAST_SAMPLE_LIMIT = 90;
const SLOW_FACTOR = 1.1;
const FAST_FACTOR = 0.55;

export class PreviewQualityGovernor {
	private tier: PreviewTier | null = null;
	private slowSamples = 0;
	private fastSamples = 0;
	private tierChanged = false;

	resolve({
		quality,
		isPlaying,
		gpuDegraded = false,
		avgRenderMs,
		frameBudgetMs,
		deviceTier = detectDeviceTier({ gpuDegraded }),
	}: {
		quality: PreviewQuality;
		isPlaying: boolean;
		gpuDegraded?: boolean;
		avgRenderMs?: number;
		frameBudgetMs?: number;
		deviceTier?: PreviewTier;
	}): number {
		this.tierChanged = false;
		if (quality !== "auto") {
			this.reset();
			return resolvePreviewScale({ quality, isPlaying, gpuDegraded });
		}

		const baseIndex = TIER_ORDER.indexOf(deviceTier);
		const currentIndex = this.tier ? TIER_ORDER.indexOf(this.tier) : baseIndex;
		this.tier = TIER_ORDER[Math.min(baseIndex, Math.max(0, currentIndex))];

		if (
			!isPlaying ||
			avgRenderMs === undefined ||
			frameBudgetMs === undefined
		) {
			this.slowSamples = 0;
			this.fastSamples = 0;
			return resolvePreviewScale({
				quality: isPlaying ? this.tier : deviceTier,
				isPlaying,
				gpuDegraded,
			});
		}

		if (avgRenderMs > frameBudgetMs * SLOW_FACTOR) {
			this.slowSamples += 1;
			this.fastSamples = 0;
		} else if (avgRenderMs < frameBudgetMs * FAST_FACTOR) {
			this.fastSamples += 1;
			this.slowSamples = 0;
		} else {
			this.slowSamples = 0;
			this.fastSamples = 0;
		}

		let tierIndex = TIER_ORDER.indexOf(this.tier);
		if (this.slowSamples >= SLOW_SAMPLE_LIMIT && tierIndex > 0) {
			tierIndex -= 1;
			this.tier = TIER_ORDER[tierIndex];
			this.slowSamples = 0;
			this.tierChanged = true;
		} else if (this.fastSamples >= FAST_SAMPLE_LIMIT && tierIndex < baseIndex) {
			tierIndex += 1;
			this.tier = TIER_ORDER[tierIndex];
			this.fastSamples = 0;
			this.tierChanged = true;
		}

		return resolvePreviewScale({
			quality: this.tier,
			isPlaying: true,
			gpuDegraded,
		});
	}

	consumeTierChange(): boolean {
		const changed = this.tierChanged;
		this.tierChanged = false;
		return changed;
	}

	reset(): void {
		this.tier = null;
		this.slowSamples = 0;
		this.fastSamples = 0;
		this.tierChanged = false;
	}
}
