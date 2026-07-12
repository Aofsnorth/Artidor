"use client";

import { lazy, Suspense, type ReactNode } from "react";
import { type Tab, useAssetsPanelStore } from "@/stores/assets-panel-store";
import { MediaView } from "./views/assets";
import { DockPlaceholder } from "@/components/editor/floating-window";
import { useEditorUIStore } from "@/stores/editor-ui-store";
import type { FloatablePanelId } from "@/stores/editor-ui-store";

// Lazy-load every asset sub-view except the default `MediaView`. These panels
// are only needed when the user clicks the corresponding tab or pops a panel
// out, so keeping them out of the editor's initial bundle removes a meaningful
// chunk of JS from first paint.
const AIEditView = lazy(() =>
	import("./views/ai-edit").then((m) => ({ default: m.AIEditView })),
);
const TextView = lazy(() =>
	import("./views/text").then((m) => ({ default: m.TextView })),
);
const StickersView = lazy(() =>
	import("./views/stickers").then((m) => ({ default: m.StickersView })),
);
const SoundsView = lazy(() =>
	import("./views/sounds").then((m) => ({ default: m.SoundsView })),
);
const EffectsView = lazy(() =>
	import("./views/effects").then((m) => ({ default: m.EffectsView })),
);
const TransitionsView = lazy(() =>
	import("./views/transitions").then((m) => ({ default: m.TransitionsView })),
);
const AdjustmentsView = lazy(() =>
	import("./views/adjustments").then((m) => ({ default: m.AdjustmentsView })),
);
const PluginsView = lazy(() =>
	import("./views/plugins").then((m) => ({ default: m.PluginsView })),
);
const FiltersView = lazy(() =>
	import("./views/filters").then((m) => ({ default: m.FiltersView })),
);
const OverlaysView = lazy(() =>
	import("./views/overlays").then((m) => ({ default: m.OverlaysView })),
);
const AnimationsView = lazy(() =>
	import("./views/animations").then((m) => ({ default: m.AnimationsView })),
);
const TemplatesView = lazy(() =>
	import("./views/templates-coming-soon").then((m) => ({
		default: m.TemplatesView,
	})),
);
const PresetsView = lazy(() =>
	import("./views/presets").then((m) => ({ default: m.PresetsView })),
);
const QuickToolsView = lazy(() =>
	import("./views/quick-tools").then((m) => ({ default: m.QuickToolsView })),
);
const ScriptingView = lazy(() =>
	import("./views/scripting").then((m) => ({ default: m.ScriptingView })),
);
const SettingsView = lazy(() =>
	import("./views/settings").then((m) => ({ default: m.SettingsView })),
);
const AdvancedView = lazy(() =>
	import("./views/advanced").then((m) => ({ default: m.AdvancedView })),
);
const Captions = lazy(() =>
	import("./views/captions").then((m) => ({ default: m.Captions })),
);

/** Generic placeholder used while a lazy asset tab chunk is loading. */
function LoadingView() {
	return (
		<div className="flex h-full items-center justify-center text-[11.5px] text-white/45">
			<div className="flex flex-col items-center gap-2">
				<div className="size-5 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
				<span>Loading…</span>
			</div>
		</div>
	);
}

/** Tiny inline placeholder so the AI panel doesn't flash an empty rectangle
    while its chunk is fetched. */
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
		sounds: (
			<Suspense fallback={<LoadingView />}>
				<SoundsView />
			</Suspense>
		),
		text: (
			<Suspense fallback={<LoadingView />}>
				<TextView />
			</Suspense>
		),
		elements: (
			<Suspense fallback={<LoadingView />}>
				<StickersView />
			</Suspense>
		),
		stickers: (
			<Suspense fallback={<LoadingView />}>
				<StickersView />
			</Suspense>
		),
		effects: maybePlaceholder(
			"effects",
			"Effects",
			<Suspense fallback={<LoadingView />}>
				<EffectsView />
			</Suspense>,
		),
		transitions: maybePlaceholder(
			"transitions",
			"Transitions",
			<Suspense fallback={<LoadingView />}>
				<TransitionsView />
			</Suspense>,
		),
		overlays: (
			<Suspense fallback={<LoadingView />}>
				<OverlaysView />
			</Suspense>
		),
		animations: (
			<Suspense fallback={<LoadingView />}>
				<AnimationsView />
			</Suspense>
		),
		templates: (
			<Suspense fallback={<LoadingView />}>
				<TemplatesView />
			</Suspense>
		),
		presets: (
			<Suspense fallback={<LoadingView />}>
				<PresetsView />
			</Suspense>
		),
		quicktools: (
			<Suspense fallback={<LoadingView />}>
				<QuickToolsView />
			</Suspense>
		),
		audio: (
			<Suspense fallback={<LoadingView />}>
				<SoundsView />
			</Suspense>
		),
		motion: (
			<Suspense fallback={<LoadingView />}>
				<AnimationsView />
			</Suspense>
		),
		plugins: maybePlaceholder(
			"plugins",
			"Plugins",
			<Suspense fallback={<LoadingView />}>
				<PluginsView />
			</Suspense>,
		),
		filters: (
			<Suspense fallback={<LoadingView />}>
				<FiltersView />
			</Suspense>
		),
		captions: (
			<Suspense fallback={<LoadingView />}>
				<Captions />
			</Suspense>
		),
		adjustment: maybePlaceholder(
			"adjust",
			"Adjustments",
			<Suspense fallback={<LoadingView />}>
				<AdjustmentsView />
			</Suspense>,
		),
		scripting: (
			<Suspense fallback={<LoadingView />}>
				<ScriptingView />
			</Suspense>
		),
		settings: (
			<Suspense fallback={<LoadingView />}>
				<SettingsView />
			</Suspense>
		),
		advanced: (
			<Suspense fallback={<LoadingView />}>
				<AdvancedView />
			</Suspense>
		),
	};

	return (
		<div className="panel glass-strong flex h-full overflow-hidden rounded-xl border border-white/10">
			<div className="flex-1 overflow-hidden">{viewMap[activeTab]}</div>
		</div>
	);
}
