import {
	buildGraphicPreviewUrl,
	buildDefaultGraphicInstance,
	graphicsRegistry,
	registerDefaultGraphics,
} from "@/lib/graphics";
import type { ParamValues } from "@/lib/params";
import { buildStickerId, parseStickerId } from "../sticker-id";
import type {
	StickerBrowseResult,
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

const SHAPES_PROVIDER_ID = "shapes";

type ShapeGraphicPreset = {
	shapeKey: string;
	name: string;
	definitionId: string;
	params?: ParamValues;
};

const LEGACY_SHAPE_PRESETS: Record<string, ShapeGraphicPreset> = {
	square: { shapeKey: "square", name: "Square", definitionId: "rectangle" },
	circle: { shapeKey: "circle", name: "Circle", definitionId: "ellipse" },
	triangle: {
		shapeKey: "triangle",
		name: "Triangle",
		definitionId: "polygon",
		params: { sides: 3 },
	},
	hexagon: {
		shapeKey: "hexagon",
		name: "Hexagon",
		definitionId: "polygon",
		params: { sides: 6 },
	},
	diamond: {
		shapeKey: "diamond",
		name: "Diamond",
		definitionId: "polygon",
		params: { sides: 4 },
	},
	star: { shapeKey: "star", name: "Star", definitionId: "star" },
};

const CURATED_SHAPE_PRESETS: ShapeGraphicPreset[] = [
	{
		shapeKey: "rounded-card",
		name: "Rounded Card",
		definitionId: "rectangle",
		params: { fill: "#ffffff", cornerRadius: 18 },
	},
	{
		shapeKey: "outline-frame",
		name: "Outline Frame",
		definitionId: "rectangle",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#22d3ee",
			strokeWidth: 18,
			strokeAlign: "inside",
			cornerRadius: 10,
		},
	},
	{
		shapeKey: "circle-badge",
		name: "Circle Badge",
		definitionId: "ellipse",
		params: { fill: "#f97316" },
	},
	{
		shapeKey: "ring-badge",
		name: "Ring Badge",
		definitionId: "ellipse",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#a78bfa",
			strokeWidth: 28,
			strokeAlign: "inside",
		},
	},
	{
		shapeKey: "triangle",
		name: "Triangle",
		definitionId: "polygon",
		params: { sides: 3, fill: "#38bdf8" },
	},
	{
		shapeKey: "diamond",
		name: "Diamond",
		definitionId: "polygon",
		params: { sides: 4, fill: "#ec4899", cornerRadius: 8 },
	},
	{
		shapeKey: "hexagon",
		name: "Hexagon",
		definitionId: "polygon",
		params: { sides: 6, fill: "#84cc16", cornerRadius: 6 },
	},
	{
		shapeKey: "star-burst",
		name: "Star Burst",
		definitionId: "star",
		params: { fill: "#facc15", points: 12, depth: 58 },
	},
	{
		shapeKey: "sparkle",
		name: "Sparkle",
		definitionId: "star",
		params: {
			fill: "#ffffff",
			stroke: "#f0abfc",
			strokeWidth: 8,
			points: 4,
			depth: 28,
		},
	},
	{
		shapeKey: "pentagon",
		name: "Pentagon",
		definitionId: "polygon",
		params: { sides: 5, fill: "#60a5fa" },
	},
	{
		shapeKey: "octagon",
		name: "Octagon",
		definitionId: "polygon",
		params: { sides: 8, fill: "#f472b6", cornerRadius: 6 },
	},
	{
		shapeKey: "pill",
		name: "Pill",
		definitionId: "rectangle",
		params: { fill: "#ffffff", cornerRadius: 999 },
	},
	{
		shapeKey: "soft-square",
		name: "Soft Square",
		definitionId: "rectangle",
		params: { fill: "#34d399", cornerRadius: 10 },
	},
	{
		shapeKey: "bar",
		name: "Bar",
		definitionId: "rectangle",
		params: { fill: "#facc15", cornerRadius: 4 },
	},
	{
		shapeKey: "dot",
		name: "Dot",
		definitionId: "ellipse",
		params: { fill: "#f87171" },
	},
	{
		shapeKey: "line",
		name: "Line",
		definitionId: "line",
		params: { fill: "#ffffff", thickness: 36, rounded: true },
	},
	{
		shapeKey: "divider",
		name: "Divider",
		definitionId: "line",
		params: { fill: "#94a3b8", thickness: 14, rounded: false },
	},
	{
		shapeKey: "arrow",
		name: "Arrow",
		definitionId: "arrow",
		params: { fill: "#38bdf8", thickness: 70, headSize: 38 },
	},
	{
		shapeKey: "double-arrow",
		name: "Double Arrow",
		definitionId: "arrow",
		params: {
			fill: "#f472b6",
			thickness: 64,
			headSize: 30,
			doubleHeaded: true,
		},
	},
	{
		shapeKey: "chevron",
		name: "Chevron",
		definitionId: "chevron",
		params: { fill: "#a78bfa", thickness: 32 },
	},
	{
		shapeKey: "ring",
		name: "Ring",
		definitionId: "ring",
		params: { fill: "#22d3ee", thickness: 26 },
	},
	{
		shapeKey: "cross",
		name: "Plus",
		definitionId: "cross",
		params: { fill: "#34d399", thickness: 36, cornerRadius: 6 },
	},
	{
		shapeKey: "right-triangle",
		name: "Right Triangle",
		definitionId: "right-triangle",
		params: { fill: "#fb923c" },
	},
	{
		shapeKey: "heart",
		name: "Heart",
		definitionId: "heart",
		params: { fill: "#f43f5e" },
	},
	{
		shapeKey: "lightning",
		name: "Lightning",
		definitionId: "lightning",
		params: { fill: "#facc15" },
	},
	{
		shapeKey: "crescent",
		name: "Moon",
		definitionId: "crescent",
		params: { fill: "#fcd34d", phase: 55 },
	},
	{
		shapeKey: "speech-bubble",
		name: "Speech Bubble",
		definitionId: "speech-bubble",
		params: { fill: "#ffffff", cornerRadius: 28, tailSize: 40 },
	},
	// Polygons by side count
	{
		shapeKey: "polygon-pentagon",
		name: "Pentagon",
		definitionId: "polygon",
		params: { sides: 5, fill: "#60a5fa" },
	},
	{
		shapeKey: "polygon-hexagon",
		name: "Hexagon",
		definitionId: "polygon",
		params: { sides: 6, fill: "#22d3ee" },
	},
	{
		shapeKey: "polygon-heptagon",
		name: "Heptagon",
		definitionId: "polygon",
		params: { sides: 7, fill: "#34d399" },
	},
	{
		shapeKey: "polygon-octagon",
		name: "Octagon",
		definitionId: "polygon",
		params: { sides: 8, fill: "#a3e635" },
	},
	{
		shapeKey: "polygon-nonagon",
		name: "Nonagon",
		definitionId: "polygon",
		params: { sides: 9, fill: "#fbbf24" },
	},
	{
		shapeKey: "polygon-decagon",
		name: "Decagon",
		definitionId: "polygon",
		params: { sides: 10, fill: "#fb7185" },
	},
	{
		shapeKey: "polygon-rounded-hex",
		name: "Rounded Hexagon",
		definitionId: "polygon",
		params: { sides: 6, cornerRadius: 30, fill: "#818cf8" },
	},
	// Stars
	{
		shapeKey: "star-4",
		name: "4-Point Star",
		definitionId: "star",
		params: { points: 4, depth: 38, fill: "#fde047" },
	},
	{
		shapeKey: "star-5",
		name: "5-Point Star",
		definitionId: "star",
		params: { points: 5, depth: 45, fill: "#facc15" },
	},
	{
		shapeKey: "star-6",
		name: "6-Point Star",
		definitionId: "star",
		params: { points: 6, depth: 50, fill: "#fbbf24" },
	},
	{
		shapeKey: "star-8",
		name: "8-Point Star",
		definitionId: "star",
		params: { points: 8, depth: 55, fill: "#f59e0b" },
	},
	// Trapezoid / parallelogram
	{
		shapeKey: "trapezoid",
		name: "Trapezoid",
		definitionId: "trapezoid",
		params: { fill: "#38bdf8", topRatio: 55 },
	},
	{
		shapeKey: "parallelogram",
		name: "Parallelogram",
		definitionId: "parallelogram",
		params: { fill: "#a78bfa", slant: 25 },
	},
	{
		shapeKey: "rhombus",
		name: "Diamond",
		definitionId: "rhombus",
		params: { fill: "#f472b6" },
	},
	// Pie / arc
	{
		shapeKey: "pie",
		name: "Pie",
		definitionId: "pie",
		params: { fill: "#fb923c", sweep: 70 },
	},
	{
		shapeKey: "pacman",
		name: "Pac-Man",
		definitionId: "pie",
		params: { fill: "#facc15", sweep: 78, rotation: 30 },
	},
	{
		shapeKey: "arc",
		name: "Arc",
		definitionId: "arc",
		params: { fill: "#22d3ee", sweep: 55, thickness: 26 },
	},
	{
		shapeKey: "semicircle",
		name: "Semicircle",
		definitionId: "arc",
		params: { fill: "#60a5fa", sweep: 50, thickness: 100 },
	},
	{
		shapeKey: "gauge",
		name: "Gauge",
		definitionId: "arc",
		params: { fill: "#34d399", sweep: 70, thickness: 20, rotation: 215 },
	},
	// Symbols
	{
		shapeKey: "gear",
		name: "Gear",
		definitionId: "gear",
		params: { fill: "#94a3b8", teeth: 8, toothDepth: 25, hole: 35 },
	},
	{
		shapeKey: "gear-fine",
		name: "Cog",
		definitionId: "gear",
		params: { fill: "#cbd5e1", teeth: 12, toothDepth: 18, hole: 30 },
	},
	{
		shapeKey: "burst",
		name: "Burst",
		definitionId: "burst",
		params: { fill: "#facc15", points: 12, depth: 22 },
	},
	{
		shapeKey: "sale-seal",
		name: "Sale Seal",
		definitionId: "burst",
		params: { fill: "#ef4444", points: 16, depth: 16 },
	},
	{
		shapeKey: "flower",
		name: "Flower",
		definitionId: "flower",
		params: { fill: "#f472b6", petals: 6, petalDepth: 45 },
	},
	{
		shapeKey: "blob",
		name: "Blob",
		definitionId: "flower",
		params: { fill: "#a78bfa", petals: 7, petalDepth: 18 },
	},
	{
		shapeKey: "teardrop",
		name: "Teardrop",
		definitionId: "teardrop",
		params: { fill: "#38bdf8" },
	},
	{
		shapeKey: "pin",
		name: "Location Pin",
		definitionId: "pin",
		params: { fill: "#ef4444" },
	},
	{
		shapeKey: "shield",
		name: "Shield",
		definitionId: "shield",
		params: { fill: "#22c55e" },
	},
	{
		shapeKey: "cloud",
		name: "Cloud",
		definitionId: "cloud",
		params: { fill: "#e2e8f0" },
	},
	{
		shapeKey: "house",
		name: "Home",
		definitionId: "house",
		params: { fill: "#f59e0b", roofRatio: 40 },
	},
	{
		shapeKey: "squircle",
		name: "Squircle",
		definitionId: "squircle",
		params: { fill: "#818cf8", curvature: 40 },
	},
	// Outline variants (fill-less, bordered) showing customizable stroke
	{
		shapeKey: "circle-outline",
		name: "Circle Outline",
		definitionId: "ellipse",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#ffffff",
			strokeWidth: 12,
			strokeAlign: "inside",
		},
	},
	{
		shapeKey: "square-outline",
		name: "Square Outline",
		definitionId: "rectangle",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#ffffff",
			strokeWidth: 12,
			strokeAlign: "inside",
			cornerRadius: 6,
		},
	},
	{
		shapeKey: "star-outline",
		name: "Star Outline",
		definitionId: "star",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#facc15",
			strokeWidth: 10,
			strokeAlign: "inside",
			points: 5,
			depth: 45,
		},
	},
	{
		shapeKey: "heart-outline",
		name: "Heart Outline",
		definitionId: "heart",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#f43f5e",
			strokeWidth: 10,
			strokeAlign: "inside",
		},
	},
	{
		shapeKey: "triangle-outline",
		name: "Triangle Outline",
		definitionId: "polygon",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#38bdf8",
			strokeWidth: 12,
			strokeAlign: "inside",
			sides: 3,
		},
	},
	{
		shapeKey: "hexagon-outline",
		name: "Hexagon Outline",
		definitionId: "polygon",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#a3e635",
			strokeWidth: 12,
			strokeAlign: "inside",
			sides: 6,
		},
	},
	{
		shapeKey: "diamond-outline",
		name: "Diamond Outline",
		definitionId: "rhombus",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#f472b6",
			strokeWidth: 12,
			strokeAlign: "inside",
		},
	},
	{
		shapeKey: "shield-outline",
		name: "Shield Outline",
		definitionId: "shield",
		params: {
			fill: "rgba(255,255,255,0)",
			stroke: "#22c55e",
			strokeWidth: 10,
			strokeAlign: "inside",
		},
	},
];

function getShapePresets(): ShapeGraphicPreset[] {
	registerDefaultGraphics();
	const registryPresets = graphicsRegistry.getAll().map((definition) => ({
		shapeKey: definition.id,
		name: definition.name,
		definitionId: definition.id,
	}));
	const curatedKeys = new Set(
		CURATED_SHAPE_PRESETS.map((preset) => preset.shapeKey),
	);
	return [
		...CURATED_SHAPE_PRESETS,
		...registryPresets.filter((preset) => !curatedKeys.has(preset.shapeKey)),
	];
}

function getShapePreset({
	shapeKey,
}: {
	shapeKey: string;
}): ShapeGraphicPreset | null {
	return (
		getShapePresets().find((preset) => preset.shapeKey === shapeKey) ??
		LEGACY_SHAPE_PRESETS[shapeKey] ??
		null
	);
}

function getShapeParams({
	preset,
}: {
	preset: ShapeGraphicPreset;
}): ParamValues {
	return {
		...buildDefaultGraphicInstance({ definitionId: preset.definitionId })
			.params,
		...preset.params,
	};
}

export function parseShapeStickerId({
	stickerId,
}: {
	stickerId: string;
}): ShapeGraphicPreset | null {
	try {
		const { providerValue } = parseStickerId({ stickerId });
		return getShapePreset({ shapeKey: providerValue });
	} catch {
		return null;
	}
}

function buildShapeUrl({ shapeKey }: { shapeKey: string }): string {
	const preset = getShapePreset({ shapeKey });
	if (!preset) {
		return buildGraphicPreviewUrl({ definitionId: "rectangle" });
	}
	return buildGraphicPreviewUrl({
		definitionId: preset.definitionId,
		params: getShapeParams({ preset }),
	});
}

function toStickerItem({
	preset,
}: {
	preset: ShapeGraphicPreset;
}): StickerItem {
	return {
		id: buildStickerId({
			providerId: SHAPES_PROVIDER_ID,
			providerValue: preset.shapeKey,
		}),
		provider: SHAPES_PROVIDER_ID,
		name: preset.name,
		previewUrl: buildShapeUrl({ shapeKey: preset.shapeKey }),
		metadata: {
			definitionId: preset.definitionId,
			params: preset.params ?? {},
		},
	};
}

function filterShapesByQuery({
	query,
}: {
	query: string;
}): ShapeGraphicPreset[] {
	const normalizedQuery = query.trim().toLowerCase();
	const presets = getShapePresets();
	if (!normalizedQuery) {
		return presets;
	}

	return presets.filter((preset) => {
		const definition = graphicsRegistry.get(preset.definitionId);
		return (
			preset.name.toLowerCase().includes(normalizedQuery) ||
			definition.keywords.some((keyword) =>
				keyword.toLowerCase().includes(normalizedQuery),
			)
		);
	});
}

function paginateShapes({
	shapes,
	options,
}: {
	shapes: ShapeGraphicPreset[];
	options?: { page?: number; limit?: number };
}): { items: ShapeGraphicPreset[]; hasMore: boolean; total: number } {
	const page = Math.max(1, options?.page ?? 1);
	const limit = Math.max(1, options?.limit ?? getShapePresets().length);
	const startIndex = (page - 1) * limit;
	const endIndex = startIndex + limit;
	const pagedItems = shapes.slice(startIndex, endIndex);
	return {
		items: pagedItems,
		hasMore: endIndex < shapes.length,
		total: shapes.length,
	};
}

export const shapesProvider: StickerProvider = {
	id: SHAPES_PROVIDER_ID,
	async search({
		query,
		options,
	}: {
		query: string;
		options?: { limit?: number };
	}): Promise<StickerSearchResult> {
		const filteredShapes = filterShapesByQuery({ query });
		const paged = paginateShapes({
			shapes: filteredShapes,
			options: { page: 1, limit: options?.limit ?? getShapePresets().length },
		});
		return {
			items: paged.items.map((preset) => toStickerItem({ preset })),
			total: paged.total,
			hasMore: paged.hasMore,
		};
	},
	async browse({
		options,
	}: {
		options?: { page?: number; limit?: number };
	}): Promise<StickerBrowseResult> {
		const paged = paginateShapes({
			shapes: getShapePresets(),
			options,
		});
		return {
			sections: [
				{
					id: "all",
					items: paged.items.map((preset) => toStickerItem({ preset })),
					hasMore: paged.hasMore,
					layout: "grid",
				},
			],
		};
	},
	resolveUrl({
		stickerId,
	}: {
		stickerId: string;
		options?: { width?: number; height?: number };
	}): string {
		const preset = parseShapeStickerId({ stickerId });
		return buildShapeUrl({ shapeKey: preset?.shapeKey ?? "rectangle" });
	},
};
