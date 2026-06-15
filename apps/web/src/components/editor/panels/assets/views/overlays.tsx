"use client";

import type { CSSProperties } from "react";
import { useCallback } from "react";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/hooks/use-editor";
import type { ParamValues } from "@/lib/params";
import { buildGraphicElement } from "@/lib/timeline/element-utils";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

interface OverlayPreset {
	id: string;
	name: string;
	description: string;
	definitionId: string;
	params: Partial<ParamValues>;
	previewStyle: CSSProperties;
	accentStyle?: CSSProperties;
}

const OVERLAY_PRESETS: OverlayPreset[] = [
	{
		id: "cool-blue-wash",
		name: "Cool Wash",
		description: "Transparent blue color wash for mood overlays.",
		definitionId: "rectangle",
		params: {
			fill: "rgba(56, 189, 248, 0.18)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background:
				"linear-gradient(135deg, rgba(56,189,248,0.55), rgba(30,64,175,0.3))",
		},
	},
	{
		id: "warm-amber-wash",
		name: "Warm Wash",
		description: "Transparent amber tint for golden-hour looks.",
		definitionId: "rectangle",
		params: {
			fill: "rgba(251, 146, 60, 0.2)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background:
				"linear-gradient(135deg, rgba(251,146,60,0.58), rgba(190,24,93,0.28))",
		},
	},
	{
		id: "dark-cinema-wash",
		name: "Dark Wash",
		description: "Subtle black overlay for cinematic darkening.",
		definitionId: "rectangle",
		params: {
			fill: "rgba(0, 0, 0, 0.28)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background:
				"linear-gradient(135deg, rgba(15,23,42,0.85), rgba(0,0,0,0.5))",
		},
	},
	{
		id: "white-flash",
		name: "White Flash",
		description: "Semi-transparent white flash layer.",
		definitionId: "rectangle",
		params: {
			fill: "rgba(255, 255, 255, 0.34)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background:
				"linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.22))",
		},
	},
	{
		id: "soft-vignette-ellipse",
		name: "Soft Vignette",
		description: "Large translucent ellipse for soft edge shading.",
		definitionId: "ellipse",
		params: {
			fill: "rgba(0, 0, 0, 0.2)",
			strokeWidth: 0,
		},
		previewStyle: {
			background: "radial-gradient(circle, transparent 34%, rgba(0,0,0,0.72))",
		},
	},
	{
		id: "neon-frame",
		name: "Neon Frame",
		description: "Outline frame overlay for highlight moments.",
		definitionId: "rectangle",
		params: {
			fill: "rgba(255, 255, 255, 0)",
			stroke: "rgba(34, 211, 238, 0.9)",
			strokeWidth: 16,
			strokeAlign: "inside",
			cornerRadius: 8,
		},
		previewStyle: {
			background: "rgba(8, 13, 20, 0.9)",
			boxShadow: "inset 0 0 0 7px rgba(34,211,238,0.74)",
		},
	},
	{
		id: "pink-frame",
		name: "Pink Frame",
		description: "Rounded creator-style outline overlay.",
		definitionId: "rectangle",
		params: {
			fill: "rgba(255, 255, 255, 0)",
			stroke: "rgba(244, 114, 182, 0.92)",
			strokeWidth: 18,
			strokeAlign: "inside",
			cornerRadius: 18,
		},
		previewStyle: {
			background: "rgba(23, 12, 24, 0.92)",
			boxShadow: "inset 0 0 0 7px rgba(244,114,182,0.78)",
		},
	},
	{
		id: "sun-orb",
		name: "Sun Orb",
		description: "Soft circular amber overlay element.",
		definitionId: "ellipse",
		params: {
			fill: "rgba(251, 191, 36, 0.32)",
			strokeWidth: 0,
		},
		previewStyle: {
			background:
				"radial-gradient(circle at 45% 42%, rgba(251,191,36,0.9), rgba(249,115,22,0.2) 58%, transparent 72%)",
		},
	},
];

export function OverlaysView() {
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	return (
		<PanelView title="Overlays">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					Graphic overlays are timeline layers. Use Effects for processing a
					clip; use Overlays for visible tint, frame, and wash elements.
				</p>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
					}}
				>
					{OVERLAY_PRESETS.map((preset) => (
						<OverlayItem key={preset.id} preset={preset} />
					))}
				</div>
			</div>
		</PanelView>
	);
}

function OverlayItem({ preset }: { preset: OverlayPreset }) {
	const editor = useEditor();

	const handleAddToTimeline = useCallback(
		({ currentTime }: { currentTime: number }) => {
			const element = buildGraphicElement({
				definitionId: preset.definitionId,
				name: preset.name,
				startTime: currentTime,
				params: preset.params,
			});

			editor.timeline.insertElement({
				placement: { mode: "auto" },
				element,
			});
		},
		[editor, preset],
	);

	return (
		<DraggableItem
			name={preset.name}
			preview={<OverlayPreview preset={preset} />}
			dragData={{
				id: preset.id,
				name: preset.name,
				type: "graphic",
				definitionId: preset.definitionId,
				params: preset.params,
			}}
			onAddToTimeline={handleAddToTimeline}
			aspectRatio={1}
			isRounded
			variant="card"
			containerClassName="w-full"
		/>
	);
}

function OverlayPreview({ preset }: { preset: OverlayPreset }) {
	return (
		<div className="relative size-full overflow-hidden rounded-sm bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.28),transparent_32%),linear-gradient(135deg,#111827,#030712)] p-2">
			<div className="absolute inset-2 rounded-md border border-white/[0.08]" />
			<div
				className="absolute inset-3 overflow-hidden rounded-md"
				style={preset.previewStyle}
			>
				{preset.accentStyle && (
					<div
						className="absolute inset-3 rounded-full"
						style={preset.accentStyle}
					/>
				)}
			</div>
			<div className="absolute bottom-1.5 left-1.5 rounded bg-black/[0.46] px-1.5 py-0.5 text-[0.5rem] font-semibold uppercase tracking-[0.14em] text-white/[0.62]">
				OVR
			</div>
		</div>
	);
}
