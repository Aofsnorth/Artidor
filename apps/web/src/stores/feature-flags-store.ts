"use client";

/**
 * Feature-flags store — modularity v1. The full roadmap vision is "built-in
 * features are plugins you can unload"; ahead of the plugin system this gives
 * users a real, persisted way to disable built-in tabs they don't use, which
 * then disappear from the tab bar.
 *
 * Only the tabs that are meaningful to turn off are listed here; everything
 * not in this map is always visible. AI stays additionally server-gated
 * regardless of this flag (the /api/ai/chat route 404s when disabled).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Tab keys that can be toggled off by the user. */
export const TOGGLEABLE_FEATURES = [
	"ai",
	"captions",
	"transitions",
	"effects",
	"audio",
	"motion",
	"adjustment",
	"scripting",
] as const;

export type ToggleableFeature = (typeof TOGGLEABLE_FEATURES)[number];

/** Human labels for the settings UI. */
export const FEATURE_LABELS: Record<ToggleableFeature, string> = {
	ai: "AI Edit",
	captions: "Captions",
	transitions: "Transitions",
	effects: "Effects",
	audio: "Audio",
	motion: "Motion",
	adjustment: "Adjustments",
	scripting: "Scripting",
};

interface FeatureFlagsStore {
	/** Map of feature → enabled. A missing entry means enabled (default on). */
	enabled: Partial<Record<ToggleableFeature, boolean>>;
	isEnabled: (feature: ToggleableFeature) => boolean;
	setEnabled: (feature: ToggleableFeature, value: boolean) => void;
	toggle: (feature: ToggleableFeature) => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsStore>()(
	persist(
		(set, get) => ({
			enabled: {},
			isEnabled: (feature) => get().enabled[feature] !== false,
			setEnabled: (feature, value) =>
				set((s) => ({ enabled: { ...s.enabled, [feature]: value } })),
			toggle: (feature) =>
				set((s) => ({
					enabled: {
						...s.enabled,
						[feature]: s.enabled[feature] === false,
					},
				})),
		}),
		{ name: "feature-flags" },
	),
);

/** True when a tab key is hidden by a disabled feature flag. */
export function isFeatureDisabled(
	tabKey: string,
	enabled: Partial<Record<ToggleableFeature, boolean>>,
): boolean {
	return (
		(TOGGLEABLE_FEATURES as readonly string[]).includes(tabKey) &&
		enabled[tabKey as ToggleableFeature] === false
	);
}
