"use client";

import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import {
	ALL_CATEGORY,
	CategoryBar,
	filterByCategory,
} from "@/components/editor/panels/assets/views/category-bar";
import { useEditor } from "@/hooks/use-editor";
import type { ParamValues } from "@/lib/params";
import { buildGraphicElement } from "@/lib/timeline/element-utils";
import { useAssetsPanelStore } from "@/stores/assets-panel-store";

interface OverlayPreset {
	id: string;
	name: string;
	description: string;
	category: string;
	definitionId: string;
	params: Partial<ParamValues>;
	previewStyle: CSSProperties;
	accentStyle?: CSSProperties;
}

export const OVERLAY_CATEGORIES = [
	"Color Wash",
	"Frames",
	"Vignette",
	"Light",
	"Flash",
] as const;

const OVERLAY_PRESETS: OverlayPreset[] = [
	{
		id: "cool-blue-wash",
		name: "Cool Wash",
		description: "Transparent blue color wash for mood overlays.",
		category: "Color Wash",
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
		category: "Color Wash",
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
		id: "teal-magenta-wash",
		name: "Duotone Wash",
		description: "Teal-magenta duotone tint for a stylised look.",
		category: "Color Wash",
		definitionId: "rectangle",
		params: {
			fill: "rgba(45, 212, 191, 0.18)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background:
				"linear-gradient(135deg, rgba(45,212,191,0.6), rgba(217,70,239,0.4))",
		},
	},
	{
		id: "green-wash",
		name: "Forest Wash",
		description: "Transparent green tint for nature footage.",
		category: "Color Wash",
		definitionId: "rectangle",
		params: {
			fill: "rgba(34, 197, 94, 0.18)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background:
				"linear-gradient(135deg, rgba(34,197,94,0.55), rgba(21,94,117,0.3))",
		},
	},
	{
		id: "dark-cinema-wash",
		name: "Dark Wash",
		description: "Subtle black overlay for cinematic darkening.",
		category: "Color Wash",
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
		category: "Flash",
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
		id: "black-fade",
		name: "Black Fade",
		description: "Full black layer for fade-to-black transitions.",
		category: "Flash",
		definitionId: "rectangle",
		params: {
			fill: "rgba(0, 0, 0, 0.85)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background: "linear-gradient(135deg, rgba(0,0,0,0.95), rgba(0,0,0,0.55))",
		},
	},
	{
		id: "soft-vignette-ellipse",
		name: "Soft Vignette",
		description: "Large translucent ellipse for soft edge shading.",
		category: "Vignette",
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
		id: "heavy-vignette-ellipse",
		name: "Heavy Vignette",
		description: "Stronger ellipse vignette for dramatic edges.",
		category: "Vignette",
		definitionId: "ellipse",
		params: {
			fill: "rgba(0, 0, 0, 0.42)",
			strokeWidth: 0,
		},
		previewStyle: {
			background: "radial-gradient(circle, transparent 26%, rgba(0,0,0,0.9))",
		},
	},
	{
		id: "neon-frame",
		name: "Neon Frame",
		description: "Outline frame overlay for highlight moments.",
		category: "Frames",
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
		category: "Frames",
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
		id: "gold-frame",
		name: "Gold Frame",
		description: "Elegant gold outline overlay for premium looks.",
		category: "Frames",
		definitionId: "rectangle",
		params: {
			fill: "rgba(255, 255, 255, 0)",
			stroke: "rgba(232, 185, 35, 0.92)",
			strokeWidth: 14,
			strokeAlign: "inside",
			cornerRadius: 4,
		},
		previewStyle: {
			background: "rgba(20, 16, 6, 0.92)",
			boxShadow: "inset 0 0 0 6px rgba(232,185,35,0.8)",
		},
	},
	{
		id: "sun-orb",
		name: "Sun Orb",
		description: "Soft circular amber overlay element.",
		category: "Light",
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
	{
		id: "light-leak",
		name: "Light Leak",
		description: "Warm diagonal light-leak tint for analog vibes.",
		category: "Light",
		definitionId: "rectangle",
		params: {
			fill: "rgba(251, 113, 36, 0.22)",
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background:
				"linear-gradient(115deg, transparent 30%, rgba(251,146,60,0.85) 60%, rgba(244,63,94,0.5) 85%)",
		},
	},
	{
		id: "cool-glow-orb",
		name: "Cool Glow",
		description: "Soft circular cyan glow overlay element.",
		category: "Light",
		definitionId: "ellipse",
		params: {
			fill: "rgba(56, 189, 248, 0.3)",
			strokeWidth: 0,
		},
		previewStyle: {
			background:
				"radial-gradient(circle at 50% 45%, rgba(56,189,248,0.9), rgba(59,130,246,0.2) 58%, transparent 72%)",
		},
	},
];

export function OverlaysView() {
	const assetCardSize = useAssetsPanelStore((s) => s.assetCardSize);
	const [category, setCategory] = useState(ALL_CATEGORY);

	const filtered = useMemo(
		() =>
			filterByCategory({
				items: OVERLAY_PRESETS,
				category,
				getCategory: (preset) => preset.category,
			}),
		[category],
	);

	return (
		<PanelView title="Overlays">
			<div className="flex flex-col gap-3 pb-3">
				<p className="text-muted-foreground text-xs">
					Graphic overlays are timeline layers. Use Effects for processing a
					clip; use Overlays for visible tint, frame, and wash elements.
				</p>
				<CategoryBar
					categories={OVERLAY_CATEGORIES}
					value={category}
					onChange={setCategory}
				/>
				<div
					className="grid gap-2"
					style={{
						gridTemplateColumns: `repeat(auto-fill, minmax(${assetCardSize}px, 1fr))`,
					}}
				>
					{filtered.map((preset) => (
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
