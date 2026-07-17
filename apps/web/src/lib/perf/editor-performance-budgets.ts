import { PREVIEW_FRAME_CACHE_BUDGET_BYTES } from "./preview-frame-cache";

export const EDITOR_PERFORMANCE_BUDGETS = {
	timelineCommitMsP95: 8,
	dragFrameMsP95: 16.7,
	mainThreadSliceMs: 8,
	exportInitialBytes: 0,
	beatAnalysisMsMedian: 2_000,
	transcriptionDuplicateLoadingCards: 1,
	imageExportSuccessRate: 1,
	filmstripCacheBytes: 64 * 1024 * 1024,
	previewFrameCacheBytes: PREVIEW_FRAME_CACHE_BUDGET_BYTES,
	previewRenderFrameMsP95: 16.7,
} as const;

export type EditorPerformanceMetric = keyof typeof EDITOR_PERFORMANCE_BUDGETS;

export function assertWithinBudget({
	metric,
	value,
}: {
	metric: EditorPerformanceMetric;
	value: number;
}) {
	const budget = EDITOR_PERFORMANCE_BUDGETS[metric];
	if (value > budget) {
		throw new Error(`${metric} over budget: ${value} > ${budget}`);
	}
}
