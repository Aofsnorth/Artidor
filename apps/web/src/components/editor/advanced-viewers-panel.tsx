"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useElementSelection } from "@/hooks/timeline/element/use-element-selection";
import { useEditor } from "@/hooks/use-editor";
import { isVisualElement } from "@/lib/timeline/element-utils";
import { useUiOverlayStore } from "@/stores/ui-overlay-store";

function ViewerLoading() {
	return <p className="p-3 text-xs text-muted-foreground">Loading viewer…</p>;
}

const ScopesCard = dynamic(
	() => import("./panels/assets/views/components/scopes").then((m) => m.ScopesCard),
	{ ssr: false, loading: ViewerLoading },
);
const ColorWheelsTab = dynamic(
	() => import("./panels/properties/tabs/color-wheels-tab").then((m) => m.ColorWheelsTab),
	{ ssr: false, loading: ViewerLoading },
);
const ArtidorAdjustTab = dynamic(
	() => import("./panels/properties/tabs/davinci-adjust-tab").then((m) => m.DavinciAdjustTab),
	{ ssr: false, loading: ViewerLoading },
);

const VIEWERS = [
	{ id: "scopes", label: "Scopes" },
	{ id: "color-wheels", label: "Color Wheels" },
	{ id: "davinci-adjust", label: "Artidor Adjust" },
] as const;

function SelectedElementViewer({ viewer }: { viewer: "color-wheels" | "davinci-adjust" }) {
	const { selectedElements } = useElementSelection();
	const selected = useEditor(
		(editor) =>
			selectedElements.length === 1
				? editor.timeline.getElementsWithTracks({ elements: selectedElements }).at(0)
				: undefined,
		["timeline", "scenes", "selection"],
	);

	if (!selected || !isVisualElement(selected.element)) {
		return (
			<p className="p-4 text-sm leading-relaxed text-muted-foreground">
				Select a single visual element to use {viewer === "color-wheels" ? "Color Wheels" : "Artidor Adjust"}.
			</p>
		);
	}

	return viewer === "color-wheels" ? (
		<ColorWheelsTab key={selected.element.id} element={selected.element} trackId={selected.track.id} />
	) : (
		<ArtidorAdjustTab key={selected.element.id} element={selected.element} trackId={selected.track.id} />
	);
}

/** Inline viewers alongside Details. Only the selected tool is mounted. */
export function AdvancedViewersPanel() {
	const [activeViewer, setActiveViewer] = useState("scopes");
	const setOpen = useUiOverlayStore((state) => state.setAdvancedViewersOpen);
	const close = () => {
		setOpen(false);
		document.getElementById("advanced-viewers-toggle")?.focus();
	};

	return (
		<section
			id="advanced-viewers-panel"
			aria-labelledby="advanced-viewers-heading"
			className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground"
		>
			<header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
				<h2 id="advanced-viewers-heading" className="text-xs font-semibold">Advanced viewers</h2>
				<button
					type="button"
					onClick={close}
					aria-label="Close advanced viewers"
					className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none pointer-coarse:size-11"
				>
					<HugeiconsIcon icon={Cancel01Icon} className="size-4" aria-hidden="true" />
				</button>
			</header>
			<Tabs value={activeViewer} onValueChange={setActiveViewer} className="flex min-h-0 flex-1 flex-col">
				<TabsList aria-label="Advanced viewer tools" className="flex w-full shrink-0 flex-wrap gap-1 border-b border-border p-2">
					{VIEWERS.map((viewer) => (
						<TabsTrigger key={viewer.id} value={viewer.id} className="h-8 flex-1 px-2 text-xs pointer-coarse:min-h-11">
							{viewer.label}
						</TabsTrigger>
					))}
				</TabsList>
				{VIEWERS.map((viewer) => (
					<TabsContent key={viewer.id} value={viewer.id} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
						{activeViewer === viewer.id ? (
							viewer.id === "scopes" ? (
								<div className="p-3"><ScopesCard /></div>
							) : (
								<SelectedElementViewer viewer={viewer.id} />
							)
						) : null}
					</TabsContent>
				))}
			</Tabs>
		</section>
	);
}
