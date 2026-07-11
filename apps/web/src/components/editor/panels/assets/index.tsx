"use client";

import { lazy, Suspense, type ReactNode } from "react";
import { type Tab, useAssetsPanelStore } from "@/stores/assets-panel-store";
import { Captions } from "./views/captions";
import { MediaView } from "./views/assets";
import { SettingsView } from "./views/settings";
import { SoundsView } from "./views/sounds";
import { StickersView } from "./views/stickers";
import { TextView } from "./views/text";
import { EffectsView } from "./views/effects";
import { TransitionsView } from "./views/transitions";
import { AdjustmentsView } from "./views/adjustments";
import { AnimationsView } from "./views/animations";
import { TemplatesView } from "./views/templates-coming-soon";
import { QuickToolsView } from "./views/quick-tools";
import { FiltersView } from "./views/filters";
import { OverlaysView } from "./views/overlays";
import { ScriptingView } from "./views/scripting";
import { PresetsView } from "./views/presets";
import { PluginsView } from "./views/plugins";
import { AdvancedView } from "./views/advanced";
import { DockPlaceholder } from "@/components/editor/floating-window";
import { useEditorUIStore } from "@/stores/editor-ui-store";
import type { FloatablePanelId } from "@/stores/editor-ui-store";

// The AI Edit view pulls in `motion/react` (~80KB) plus the heavy
// chat UI tree. Lazy-load it so the editor's initial mount doesn't
// pay the cost unless the user actually opens the AI tab.
const AIEditView = lazy(() =>
	import("./views/ai-edit").then((m) => ({ default: m.AIEditView })),
);

/** Tiny inline placeholder so the panel doesn't flash an empty
   rectangle while the AI chunk is fetched. */
function AIEditFallback() {
	return (
		<div className="flex h-full items-center justify-center text-[11.5px] text-white/45">
			<div className="flex flex-col items-center gap-2">
				<div className="size-5 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
				<span>Loading Arth…</span>
			</div>
		</div>
	);
}

export function AssetsPanel() {
	const { activeTab } = useAssetsPanelStore();
	const floatingPanels = useEditorUIStore((s) => s.floatingPanels);

	// Helper — if the requested sub-view is currently popped out into
	// its own window, render the DockPlaceholder instead of the view
	// (which would duplicate the content in two places). The tab stays
	// active so the user can dock it back from this very slot.
	const maybePlaceholder = (
		id: FloatablePanelId,
		title: string,
		view: ReactNode,
	): ReactNode =>
		floatingPanels[id] ? <DockPlaceholder id={id} title={title} /> : view;

	const viewMap: Record<Tab, ReactNode> = {
		ai: (
			<Suspense fallback={<AIEditFallback />}>
				<AIEditView />
			</Suspense>
		),
		assets: <MediaView />,
		media: <MediaView />,
		sounds: <SoundsView />,
		text: <TextView />,
		elements: <StickersView />,
		stickers: <StickersView />,
		effects: maybePlaceholder("effects", "Effects", <EffectsView />),
		transitions: maybePlaceholder(
			"transitions",
			"Transitions",
			<TransitionsView />,
		),
		overlays: <OverlaysView />,
		animations: <AnimationsView />,
		templates: <TemplatesView />,
		presets: <PresetsView />,
		quicktools: <QuickToolsView />,
		audio: <SoundsView />,
		motion: <AnimationsView />,
		plugins: maybePlaceholder("plugins", "Plugins", <PluginsView />),
		filters: <FiltersView />,
		captions: <Captions />,
		adjustment: maybePlaceholder("adjust", "Adjustments", <AdjustmentsView />),
		scripting: <ScriptingView />,
		settings: <SettingsView />,
		advanced: <AdvancedView />,
	};

	return (
		<div className="panel glass-strong flex h-full overflow-hidden rounded-xl border border-white/10">
			<div className="flex-1 overflow-hidden">{viewMap[activeTab]}</div>
		</div>
	);
}
