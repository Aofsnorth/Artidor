"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
import { overlays as presetOverlays } from "@/lib/presets/overlays";
import type { OverlaySubcategory } from "@/lib/presets/types";
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
	"Texture",
	"Weather",
	"Particles",
	"Glitch",
	"Paper",
	"Neon",
	"Prismatic",
	"VHS",
] as const;

const OVERLAY_SUBCATEGORY_MAP: Partial<Record<OverlaySubcategory, string>> = {
	LightLeak: "Light",
	LensFlare: "Light",
	Halo: "Light",
	Vignette: "Vignette",
	Dust: "Texture",
	Scratch: "Texture",
	FilmGrain: "Texture",
	Halftone: "Texture",
	Snow: "Weather",
	Rain: "Weather",
	Fog: "Weather",
	Smoke: "Weather",
	Glitter: "Particles",
	Sparkle: "Particles",
	Bokeh: "Particles",
	Glitch: "Glitch",
	Paper: "Paper",
	Neon: "Neon",
	Prismatic: "Prismatic",
	Holographic: "Prismatic",
	VHS: "VHS",
};

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
	...[
		[
			"rose-wash",
			"Rose Wash",
			"Color Wash",
			"linear-gradient(135deg,rgba(244,63,94,0.58),rgba(168,85,247,0.26))",
		],
		[
			"violet-wash",
			"Violet Wash",
			"Color Wash",
			"linear-gradient(135deg,rgba(139,92,246,0.58),rgba(14,165,233,0.26))",
		],
		[
			"lime-wash",
			"Lime Wash",
			"Color Wash",
			"linear-gradient(135deg,rgba(132,204,22,0.52),rgba(20,184,166,0.26))",
		],
		[
			"midnight-wash",
			"Midnight Wash",
			"Color Wash",
			"linear-gradient(135deg,rgba(15,23,42,0.72),rgba(30,41,59,0.38))",
		],
		[
			"sunset-wash",
			"Sunset Wash",
			"Color Wash",
			"linear-gradient(135deg,rgba(251,113,133,0.5),rgba(251,191,36,0.3))",
		],
		[
			"thin-white-frame",
			"Thin White Frame",
			"Frames",
			"linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,#fff,rgba(255,255,255,0.15)) border-box",
		],
		[
			"cyan-frame",
			"Cyan Frame",
			"Frames",
			"linear-gradient(135deg,rgba(34,211,238,0.9),rgba(34,211,238,0.15))",
		],
		[
			"gold-frame-thin",
			"Gold Frame Thin",
			"Frames",
			"linear-gradient(135deg,rgba(251,191,36,0.9),rgba(180,83,9,0.24))",
		],
		[
			"film-frame",
			"Film Frame",
			"Frames",
			"repeating-linear-gradient(90deg,rgba(0,0,0,0.8) 0 8px,transparent 8px 18px),linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.02))",
		],
		[
			"safe-frame",
			"Safe Frame",
			"Frames",
			"linear-gradient(90deg,transparent 49%,rgba(255,255,255,0.5) 49% 51%,transparent 51%),linear-gradient(0deg,transparent 49%,rgba(255,255,255,0.5) 49% 51%,transparent 51%)",
		],
		[
			"soft-vignette",
			"Soft Vignette",
			"Vignette",
			"radial-gradient(circle,transparent 34%,rgba(0,0,0,0.55) 100%)",
		],
		[
			"hard-vignette",
			"Hard Vignette",
			"Vignette",
			"radial-gradient(circle,transparent 22%,rgba(0,0,0,0.78) 100%)",
		],
		[
			"white-vignette",
			"White Vignette",
			"Vignette",
			"radial-gradient(circle,transparent 34%,rgba(255,255,255,0.5) 100%)",
		],
		[
			"blue-vignette",
			"Blue Vignette",
			"Vignette",
			"radial-gradient(circle,transparent 28%,rgba(37,99,235,0.55) 100%)",
		],
		[
			"heart-vignette",
			"Heart Vignette",
			"Vignette",
			"radial-gradient(circle,transparent 30%,rgba(244,63,94,0.52) 100%)",
		],
		[
			"anamorphic-streak",
			"Anamorphic",
			"Light",
			"linear-gradient(90deg,transparent 0%,rgba(56,189,248,0.0) 30%,rgba(56,189,248,0.82) 50%,rgba(56,189,248,0.0) 70%,transparent 100%)",
		],
		[
			"prism-leak",
			"Prism Leak",
			"Light",
			"linear-gradient(120deg,transparent 10%,rgba(34,211,238,0.5),rgba(236,72,153,0.42),transparent 85%)",
		],
		[
			"gold-leak",
			"Gold Leak",
			"Light",
			"radial-gradient(circle at 12% 20%,rgba(251,191,36,0.9),transparent 45%),linear-gradient(135deg,transparent,rgba(245,158,11,0.25))",
		],
		[
			"moon-glow",
			"Moon Glow",
			"Light",
			"radial-gradient(circle at 64% 28%,rgba(226,232,240,0.85),rgba(148,163,184,0.22) 38%,transparent 58%)",
		],
		[
			"laser-sweep",
			"Laser Sweep",
			"Light",
			"linear-gradient(100deg,transparent 42%,rgba(34,197,94,0.75) 50%,transparent 58%)",
		],
		[
			"red-flash",
			"Red Flash",
			"Flash",
			"linear-gradient(135deg,rgba(239,68,68,0.75),rgba(127,29,29,0.18))",
		],
		[
			"blue-flash",
			"Blue Flash",
			"Flash",
			"linear-gradient(135deg,rgba(59,130,246,0.75),rgba(30,64,175,0.18))",
		],
		[
			"green-flash",
			"Green Flash",
			"Flash",
			"linear-gradient(135deg,rgba(34,197,94,0.75),rgba(20,83,45,0.18))",
		],
		[
			"strobe",
			"Strobe",
			"Flash",
			"repeating-linear-gradient(45deg,rgba(255,255,255,0.8) 0 8px,transparent 8px 16px)",
		],
		[
			"camera-bloom",
			"Camera Bloom",
			"Flash",
			"radial-gradient(circle,rgba(255,255,255,0.9),rgba(255,255,255,0.15) 58%,transparent 76%)",
		],
	].map(
		([id, name, category, background]) =>
			({
				id,
				name,
				description: `${name} overlay preset.`,
				category,
				definitionId: "rectangle",
				params: {
					fill: "rgba(255,255,255,0.18)",
					strokeWidth: 0,
					cornerRadius: 0,
				},
				previewStyle: { background },
			}) satisfies OverlayPreset,
	),
];

const genOverlays = Array.from({ length: 150 }).map((_, i): OverlayPreset => {
	const h = (i * 15) % 360;
	return {
		id: `gen-overlay-${i}`,
		name: `Wash ${i + 1}`,
		description: "Generated color wash.",
		category: "Color Wash",
		definitionId: "rectangle",
		params: {
			fill: `hsla(${h}, 70%, 50%, 0.15)`,
			strokeWidth: 0,
			cornerRadius: 0,
		},
		previewStyle: {
			background: `linear-gradient(135deg, hsla(${h}, 70%, 50%, 0.5), hsla(${(h + 40) % 360}, 70%, 50%, 0.3))`,
		},
	};
});

const presetOverlayPresets: OverlayPreset[] = presetOverlays.map((overlay) => ({
	id: overlay.id,
	name: overlay.name,
	description: overlay.description,
	category: OVERLAY_SUBCATEGORY_MAP[overlay.subcategory] ?? "Color Wash",
	definitionId: "rectangle",
	params: {
		fill: `rgba(255,255,255,${overlay.opacity * 0.3})`,
		strokeWidth: 0,
		cornerRadius: 0,
	},
	previewStyle: { background: overlay.css },
}));

OVERLAY_PRESETS.push(...genOverlays, ...presetOverlayPresets);

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

function getOverlayPhotoUrl(presetId: string): string {
	let hash = 0;
	for (let i = 0; i < presetId.length; i++) {
		hash = (hash << 5) - hash + presetId.charCodeAt(i);
		hash |= 0;
	}
	hash = Math.abs(hash);
	const categories = ["portrait", "landscape", "city", "nature", "abstract"];
	const category = categories[hash % categories.length];
	return `https://source.unsplash.com/300x300/?${category}&sig=${hash}`;
}

function OverlayPreview({ preset }: { preset: OverlayPreset }) {
	const photoUrl = getOverlayPhotoUrl(preset.id);
	return (
		<div className="relative size-full overflow-hidden rounded-sm p-2">
			<Image
				src={photoUrl}
				alt=""
				fill
				className="object-cover"
				sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
				loading="lazy"
			/>
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
