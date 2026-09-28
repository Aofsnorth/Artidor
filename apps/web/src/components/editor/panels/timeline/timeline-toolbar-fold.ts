/**
 * Timeline toolbar fold thresholds — "Compatible with different screen sizes".
 *
 * The toolbar's available width is measured directly (not the window) so
 * panel resizes fold/unfold the secondary controls too. Tier 1 folds the
 * right-hand secondary groups (audio / view / insert / clipboard) into the
 * overflow menu; tier 2 additionally folds the left-hand selection & split
 * helpers.
 *
 * Thresholds track the measured content budget: unfolded content needs
 * ~1414px, tier-1 content ~1134px, tier-2 ~1014px. Whatever still exceeds
 * the available width scrolls horizontally in the toolbar ScrollArea.
 *
 * Width 0 means "not measured yet" and never folds, avoiding a flash of
 * folded chrome on first paint. Pure and exported for unit testing.
 */
export const TOOLBAR_FOLD_TIER1_PX = 1440;
export const TOOLBAR_FOLD_TIER2_PX = 1140;

export type ToolbarFoldTier = 0 | 1 | 2;

export function toolbarFoldTier(width: number): ToolbarFoldTier {
	if (width <= 0 || width >= TOOLBAR_FOLD_TIER1_PX) return 0;
	if (width < TOOLBAR_FOLD_TIER2_PX) return 2;
	return 1;
}
