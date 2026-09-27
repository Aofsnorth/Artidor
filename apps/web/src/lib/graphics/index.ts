import { buildDefaultParamValues } from "@/lib/registry";
import type { ParamValues } from "@/lib/params";
import { graphicsRegistry } from "./registry";
import {
	registerDefaultGraphics,
	GRAPHIC_ID_ALIASES,
	ellipseGraphicDefinition,
	polygonGraphicDefinition,
	rectangleGraphicDefinition,
	starGraphicDefinition,
} from "./definitions";
import {
	DEFAULT_GRAPHIC_SOURCE_SIZE,
	type GraphicInstance,
	type GraphicDefinition,
} from "./types";

/**
 * Preview data-URL cache. Keyed by the full param bag + size, so dragging a
 * parameter slider emits one entry per step; without a cap a long editing
 * session leaks a base64 PNG (~10-100 KB) per step for the life of the tab.
 * 200 entries covers far more distinct previews than a project ever shows while
 * bounding retention to a few MB. An evicted key simply re-renders to the byte
 * -identical data URL, so a cap can never change what the caller receives.
 */
const GRAPHIC_PREVIEW_URL_CACHE_MAX = 200;
const graphicPreviewUrlCache = new Map<string, string>();

const FALLBACK_CORNER_RADIUS_RATIO = 0.2;
const FALLBACK_FILL_OPACITY = 0.08;
const FALLBACK_MIN_FONT_SIZE = 12;
const FALLBACK_FONT_SIZE_RATIO = 0.15;

function buildFallbackPreviewUrl({
	name,
	size,
}: {
	name: string;
	size: number;
}): string {
	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
			<rect width="${size}" height="${size}" rx="${size * FALLBACK_CORNER_RADIUS_RATIO}" fill="white" fill-opacity="${FALLBACK_FILL_OPACITY}" />
			<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="${Math.max(FALLBACK_MIN_FONT_SIZE, size * FALLBACK_FONT_SIZE_RATIO)}" font-family="sans-serif">${name}</text>
		</svg>
	`;
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * `registerDefaultGraphics()` probes ~40 registry entries. `getGraphicDefinition`
 * runs once per graphic node per frame from the render loop, so the registration
 * is memoised per module instance. The registry is append-only (plugins only
 * register/unregister their own namespaced ids, nothing clears it), so this is
 * behaviourally identical to re-running the loop.
 */
let defaultGraphicsRegistered = false;

function ensureDefaultGraphicsRegistered(): void {
	if (defaultGraphicsRegistered) {
		return;
	}
	registerDefaultGraphics();
	defaultGraphicsRegistered = true;
}

export function getGraphicDefinition({
	definitionId,
}: {
	definitionId: string;
}): GraphicDefinition {
	ensureDefaultGraphicsRegistered();
	if (graphicsRegistry.has(definitionId)) {
		return graphicsRegistry.get(definitionId);
	}
	// Back-compat: a saved project may reference a graphic id that was removed
	// in the placeholder purge. Resolve via alias, else fall back to rectangle
	// so the render path never throws on an unknown id.
	const aliasId = GRAPHIC_ID_ALIASES[definitionId];
	if (aliasId && graphicsRegistry.has(aliasId)) {
		return graphicsRegistry.get(aliasId);
	}
	return rectangleGraphicDefinition;
}

export function buildDefaultGraphicInstance({
	definitionId,
}: {
	definitionId: string;
}): GraphicInstance {
	const definition = getGraphicDefinition({ definitionId });
	return {
		definitionId,
		params: buildDefaultParamValues(definition.params),
	};
}

export function resolveGraphicParams(
	definition: GraphicDefinition,
	params?: ParamValues,
): ParamValues {
	return {
		...buildDefaultParamValues(definition.params),
		...(params ?? {}),
	};
}

export function buildGraphicPreviewUrl({
	definitionId,
	params,
	size = DEFAULT_GRAPHIC_SOURCE_SIZE,
}: {
	definitionId: string;
	params?: ParamValues;
	size?: number;
}): string {
	const definition = getGraphicDefinition({ definitionId });
	const resolvedParams = resolveGraphicParams(definition, params);
	const cacheKey = JSON.stringify({ definitionId, resolvedParams, size });
	const cachedUrl = graphicPreviewUrlCache.get(cacheKey);
	if (cachedUrl) {
		// Touch for LRU recency.
		graphicPreviewUrlCache.delete(cacheKey);
		graphicPreviewUrlCache.set(cacheKey, cachedUrl);
		return cachedUrl;
	}

	if (typeof document === "undefined") {
		return buildFallbackPreviewUrl({ name: definition.name, size });
	}

	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return buildFallbackPreviewUrl({ name: definition.name, size });
	}

	definition.render({
		ctx,
		params: resolvedParams,
		width: size,
		height: size,
	});

	const previewUrl = canvas.toDataURL("image/png");
	graphicPreviewUrlCache.set(cacheKey, previewUrl);
	while (graphicPreviewUrlCache.size > GRAPHIC_PREVIEW_URL_CACHE_MAX) {
		// Evict the least recently used (first-inserted) entry.
		const oldest = graphicPreviewUrlCache.keys().next().value;
		if (oldest === undefined) break;
		graphicPreviewUrlCache.delete(oldest);
	}
	return previewUrl;
}

export {
	DEFAULT_GRAPHIC_SOURCE_SIZE,
	ellipseGraphicDefinition,
	graphicsRegistry,
	polygonGraphicDefinition,
	rectangleGraphicDefinition,
	registerDefaultGraphics,
	starGraphicDefinition,
};
export type {
	GraphicDefinition,
	GraphicInstance,
	GraphicRenderContext,
} from "./types";
