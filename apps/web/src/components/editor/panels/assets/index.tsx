"use client";

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
import { TemplatesView } from "./views/templates";
import { QuickToolsView } from "./views/quick-tools";
import { FiltersView } from "./views/filters";
import { OverlaysView } from "./views/overlays";

export function AssetsPanel() {
	const { activeTab } = useAssetsPanelStore();

	const viewMap: Record<Tab, React.ReactNode> = {
		assets: <MediaView />,
		media: <MediaView />,
		sounds: <SoundsView />,
		text: <TextView />,
		elements: <StickersView />,
		stickers: <StickersView />,
		effects: <EffectsView />,
		transitions: <TransitionsView />,
		overlays: <OverlaysView />,
		animations: <AnimationsView />,
		templates: <TemplatesView />,
		quicktools: <QuickToolsView />,
		audio: <SoundsView />,
		motion: <AnimationsView />,
		plugins: <QuickToolsView />,
		filters: <FiltersView />,
		captions: <Captions />,
		adjustment: <AdjustmentsView />,
		settings: <SettingsView />,
	};

	return (
		<div className="panel glass-strong flex h-full overflow-hidden rounded-xl border border-white/10">
			<div className="flex-1 overflow-hidden">{viewMap[activeTab]}</div>
		</div>
	);
}
