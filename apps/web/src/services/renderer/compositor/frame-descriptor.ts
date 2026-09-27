import { drawCssBackground } from "@/lib/gradients";
import { masksRegistry } from "@/lib/masks";
import type { AnyBaseNode } from "../nodes/base-node";
import type { CanvasRenderer } from "../canvas-renderer";
import { createOffscreenCanvas } from "../canvas-utils";
import { getCachedRaster, paramValuesKey } from "./raster-cache";
import { BlurBackgroundNode } from "../nodes/blur-background-node";
import { ColorNode } from "../nodes/color-node";
import { EffectLayerNode } from "../nodes/effect-layer-node";
import {
	GraphicNode,
	type ResolvedGraphicNodeState,
} from "../nodes/graphic-node";
import { ImageNode } from "../nodes/image-node";
import { RootNode } from "../nodes/root-node";
import { StickerNode } from "../nodes/sticker-node";
import { renderTextToContext, TextNode } from "../nodes/text-node";
import { VideoNode } from "../nodes/video-node";
import type { ResolvedVisualSourceNodeState } from "../nodes/visual-node";
import type {
	FrameDescriptor,
	FrameItemDescriptor,
	LayerMaskDescriptor,
	QuadTransformDescriptor,
} from "./types";
import { DEFAULT_GRAPHIC_SOURCE_SIZE } from "@/lib/graphics";
import {
	getTransformPerspectiveScale,
	resolveBlendMode,
} from "@/lib/rendering";
import { orderMediaGraphicStyleLayers } from "./media-graphic-style";

export type TextureUploadDescriptor = {
	id: string;
	source: CanvasImageSource;
	width: number;
	height: number;
};

// ── Per-frame allocation pool ────────────────────────────────────────
// The render loop calls buildFrameDescriptor every frame (60fps). Each
// call previously allocated a new Map + array spread, causing GC churn.
// We reuse a single Map across frames — .clear() is O(n) but avoids
// allocation, and the Map is only accessed within one render pass at a
// time (preview has a renderingRef lock; export runs sequentially in
// the worker).
const pooledTextureMap = new Map<string, TextureUploadDescriptor>();

/**
 * Folds a per-source content version into a texture id.
 *
 * The compositor (`wasm-compositor.syncTextures`) skips a GPU upload when the
 * texture id AND the source object identity are both unchanged. Rasters that are
 * re-drawn in place (reused scratch canvases) keep their object identity, so a
 * stable id would silently freeze the layer on the GPU. Appending the version
 * forces exactly one upload per frame whose pixels changed — the same upload
 * count the old "allocate a fresh canvas every frame" code performed — while
 * the JS side stops allocating.
 *
 * Version 0 is the un-reused state and keeps the historical un-suffixed id, so
 * untouched layers are byte-identical to before.
 */
function versionedTextureId(baseId: string, version: number): string {
	return version === 0 ? baseId : `${baseId}#${version}`;
}

// ── Animated-text raster scratch pool ─────────────────────────────────
// Text with an active per-character animator changes pixels every frame, so it
// can never be served from the content-keyed raster LRU — every frame would be
// a miss that allocates a full-canvas (~8 MB at 1080p) OffscreenCanvas. Each
// animated text node instead reuses ONE scratch canvas, and its version is
// folded into the texture id so the compositor still re-uploads (see
// versionedTextureId).
//
// Cap: 8 nodes ≈ 64 MB of retained full-canvas rasters at 1080p. Evicting the
// least recently drawn node costs one reallocation when it next draws, so the
// cap degrades to today's behaviour rather than failing. The pool is swept
// whenever a build sees fewer live paths than it holds, so deleting text nodes
// releases their canvases instead of pinning them until eviction.
const MAX_ANIMATED_TEXT_SCRATCHES = 8;

type AnimatedTextScratch = {
	canvas: ReturnType<typeof createOffscreenCanvas>;
	width: number;
	height: number;
	version: number;
};

const animatedTextScratches = new Map<string, AnimatedTextScratch>();

/** Animated-text paths that drew in the current build (sweep bookkeeping). */
const liveAnimatedTextPaths = new Set<string>();

function getAnimatedTextScratch({
	path,
	width,
	height,
}: {
	path: string;
	width: number;
	height: number;
}): AnimatedTextScratch {
	const cached = animatedTextScratches.get(path);
	if (cached && cached.width === width && cached.height === height) {
		// Touch for LRU recency.
		animatedTextScratches.delete(path);
		animatedTextScratches.set(path, cached);
		return cached;
	}

	const scratch: AnimatedTextScratch = {
		canvas: createOffscreenCanvas({ width, height }),
		width,
		height,
		version: 0,
	};
	animatedTextScratches.set(path, scratch);
	if (animatedTextScratches.size > MAX_ANIMATED_TEXT_SCRATCHES) {
		const oldest = animatedTextScratches.keys().next().value;
		if (oldest !== undefined) animatedTextScratches.delete(oldest);
	}
	return scratch;
}

/** Assemble already-resolved nodes without yielding between layers. */
export function buildFrameDescriptor({
	node,
	renderer,
}: {
	node: AnyBaseNode;
	renderer: CanvasRenderer;
}): {
	frame: FrameDescriptor;
	textures: TextureUploadDescriptor[];
} {
	const items: FrameItemDescriptor[] = [];
	const textures = pooledTextureMap;
	textures.clear();
	// Scratch-canvas bookkeeping for this build (see getAnimatedTextScratch).
	liveAnimatedTextPaths.clear();

	collectNode({
		node,
		renderer,
		path: "root",
		items,
		textures,
	});

	// Release scratch canvases for animated text nodes that no longer drew this
	// frame (deleted layer, or one the playhead is currently outside of). The
	// path strings are index-based, so a stale entry would otherwise be handed
	// to an unrelated node later — and would pin a full-canvas raster. Bounded
	// by MAX_ANIMATED_TEXT_SCRATCHES, so this loop is at most 8 iterations.
	for (const stalePath of Array.from(animatedTextScratches.keys())) {
		if (!liveAnimatedTextPaths.has(stalePath)) {
			animatedTextScratches.delete(stalePath);
		}
	}

	// Copy values to an array for the compositor. The Map is cleared on
	// the next frame, so the array is the stable return value.
	const textureArray: TextureUploadDescriptor[] = [];
	for (const value of textures.values()) {
		textureArray.push(value);
	}

	return {
		frame: {
			width: renderer.width,
			height: renderer.height,
			clear: {
				color: [0, 0, 0, 1],
			},
			items,
		},
		textures: textureArray,
	};
}

// ── Blur background canvas cache ─────────────────────────────────────
// The blur background draws the backdrop source onto a full-canvas
// OffscreenCanvas every frame. The result is identical across frames when the
// source and dimensions don't change, so we cache it keyed by the *media id*
// + output size instead of the source object.
//
// Keying by the source object was the bug: video frames come from a
// round-robin CanvasSink pool of 12, so one logical backdrop retained up to 12
// full-canvas rasters (~8 MB each at 1080p) and re-blurred every time the pool
// rotated. One canvas per media id is the true working set.
//
// The cached canvas is redrawn every frame, so the compositor would skip the
// upload on the "unchanged source" path and freeze the blur. `version` bumps
// exactly when the backdrop source object changes (every video frame, never for
// a still image) and is folded into the texture id, which preserves the previous
// upload behaviour exactly while keeping one canvas per media.
//
// Cap: one full-canvas raster (~8 MB at 1080p, ~33 MB at 4K) per blurred media;
// a project realistically blurs one or two, and the LRU keeps a media switch from
// retaining every backdrop ever shown. Canvases hold no disposable resources, so
// eviction just drops the reference for GC.
const BLUR_BACKDROP_CACHE_MAX = 4;

type BlurBackdropEntry = {
	canvas: HTMLCanvasElement | OffscreenCanvas;
	width: number;
	height: number;
	/** Source object the cached pixels were drawn from. */
	source: CanvasImageSource | null;
	/** Bumped when `source` changes; folded into the texture id. */
	version: number;
};

const blurBackgroundCache = new Map<string, BlurBackdropEntry>();

function getBlurBackdrop({
	mediaId,
	source,
	width,
	height,
}: {
	mediaId: string;
	source: CanvasImageSource;
	width: number;
	height: number;
}): BlurBackdropEntry {
	const key = `${mediaId}:${width}x${height}`;
	const cached = blurBackgroundCache.get(key);
	if (cached && cached.width === width && cached.height === height) {
		// Touch for LRU recency.
		blurBackgroundCache.delete(key);
		blurBackgroundCache.set(key, cached);
		if (cached.source !== source) {
			cached.source = source;
			cached.version += 1;
		}
		return cached;
	}

	const entry: BlurBackdropEntry = {
		canvas: createOffscreenCanvas({ width, height }),
		width,
		height,
		source,
		version: 0,
	};
	blurBackgroundCache.set(key, entry);
	if (blurBackgroundCache.size > BLUR_BACKDROP_CACHE_MAX) {
		const oldest = blurBackgroundCache.keys().next().value;
		if (oldest !== undefined) blurBackgroundCache.delete(oldest);
	}
	return entry;
}

function collectNode({
	node,
	renderer,
	path,
	items,
	textures,
}: {
	node: AnyBaseNode;
	renderer: CanvasRenderer;
	path: string;
	items: FrameItemDescriptor[];
	textures: Map<string, TextureUploadDescriptor>;
}): void {
	if (node instanceof RootNode) {
		for (let index = 0; index < node.children.length; index++) {
			collectNode({
				node: node.children[index],
				renderer,
				path: `${path}:${index}`,
				items,
				textures,
			});
		}
		return;
	}

	if (node instanceof ColorNode) {
		const textureId = `${path}:color`;
		// A solid colour / gradient fill is fully determined by the colour
		// string + canvas dimensions, so cache the rasterised canvas by that
		// content key. Reusing the same canvas object across frames lets the
		// compositor's identity-based upload dedupe skip re-uploading it.
		const canvas = getCachedRaster({
			key: `color:${renderer.width}x${renderer.height}:${node.params.color}`,
			width: renderer.width,
			height: renderer.height,
			draw: (ctx) => {
				if (/gradient\(/i.test(node.params.color)) {
					drawCssBackground({
						ctx,
						width: renderer.width,
						height: renderer.height,
						css: node.params.color,
					});
				} else {
					ctx.fillStyle = node.params.color;
					ctx.fillRect(0, 0, renderer.width, renderer.height);
				}
			},
		});
		if (!canvas) return;
		textures.set(textureId, {
			id: textureId,
			source: canvas,
			width: renderer.width,
			height: renderer.height,
		});
		items.push({
			type: "layer",
			textureId,
			transform: fullCanvasTransform(renderer),
			opacity: 1,
			blendMode: "normal",
			effectPassGroups: [],
			mask: null,
		});
		return;
	}

	if (node instanceof EffectLayerNode) {
		if (!node.resolved || node.resolved.passes.length === 0) {
			return;
		}
		items.push({
			type: "sceneEffect",
			effectPassGroups: [node.resolved.passes],
		});
		return;
	}

	if (node instanceof BlurBackgroundNode) {
		if (!node.resolved) {
			return;
		}
		const { backdropSource, passes } = node.resolved;
		// Reuse the cached backdrop canvas for this media + size — avoids a
		// full-canvas OffscreenCanvas allocation per frame. The drawImage below
		// still runs every frame, and the version bump forces the re-upload.
		const backdrop = getBlurBackdrop({
			mediaId: node.params.mediaId,
			source: backdropSource.source,
			width: renderer.width,
			height: renderer.height,
		});
		const textureId = versionedTextureId(
			`${path}:blur-background`,
			backdrop.version,
		);
		const backdropCtx = backdrop.canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!backdropCtx) return;
		const coverScale = Math.max(
			renderer.width / backdropSource.width,
			renderer.height / backdropSource.height,
		);
		const scaledWidth = backdropSource.width * coverScale;
		const scaledHeight = backdropSource.height * coverScale;
		const offsetX = (renderer.width - scaledWidth) / 2;
		const offsetY = (renderer.height - scaledHeight) / 2;
		// Redraw onto the cached canvas — the drawImage is cheap (GPU-accelerated)
		// and ensures the canvas reflects the current video frame.
		backdropCtx.clearRect(0, 0, renderer.width, renderer.height);
		backdropCtx.drawImage(
			backdropSource.source,
			offsetX,
			offsetY,
			scaledWidth,
			scaledHeight,
		);
		textures.set(textureId, {
			id: textureId,
			source: backdrop.canvas,
			width: renderer.width,
			height: renderer.height,
		});
		items.push({
			type: "layer",
			textureId,
			transform: fullCanvasTransform(renderer),
			opacity: 1,
			blendMode: "normal",
			effectPassGroups: [passes],
			mask: null,
		});
		return;
	}

	if (
		node instanceof VideoNode ||
		node instanceof ImageNode ||
		node instanceof StickerNode ||
		node instanceof GraphicNode
	) {
		collectVisualSourceNode({
			node,
			renderer,
			path,
			items,
			textures,
		});
		return;
	}

	if (node instanceof TextNode) {
		collectTextNode({
			node,
			renderer,
			path,
			items,
			textures,
		});
	}
}

function collectVisualSourceNode({
	node,
	renderer,
	path,
	items,
	textures,
}: {
	node: VideoNode | ImageNode | StickerNode | GraphicNode;
	renderer: CanvasRenderer;
	path: string;
	items: FrameItemDescriptor[];
	textures: Map<string, TextureUploadDescriptor>;
}) {
	if (!node.resolved) {
		return;
	}

	const source =
		node instanceof GraphicNode
			? node.getSource({ resolvedParams: node.resolved.resolvedParams })
			: node.resolved.source;
	if (!source) {
		return;
	}

	const sourceWidth =
		node instanceof GraphicNode
			? DEFAULT_GRAPHIC_SOURCE_SIZE
			: (node.resolved as ResolvedVisualSourceNodeState).sourceWidth;
	const sourceHeight =
		node instanceof GraphicNode
			? DEFAULT_GRAPHIC_SOURCE_SIZE
			: (node.resolved as ResolvedVisualSourceNodeState).sourceHeight;

	// An animated graphic re-renders into a reused canvas (see GraphicNode), so
	// the source object identity alone no longer signals "pixels changed" — the
	// node's source version is folded into the texture id instead. A static
	// graphic keeps version 0, i.e. the historical un-suffixed id.
	const textureId =
		node instanceof GraphicNode
			? versionedTextureId(`${path}:source`, node.getSourceVersion())
			: `${path}:source`;
	textures.set(textureId, {
		id: textureId,
		source,
		width: sourceWidth,
		height: sourceHeight,
	});

	const transform = computeVisualTransform({
		renderer,
		resolved: node.resolved,
		sourceWidth,
		sourceHeight,
	});
	const { mask, strokeLayer: maskStrokeLayer } = buildMaskArtifacts({
		node,
		renderer,
		path,
		transform,
		textures,
	});
	const styleLayers = buildMediaGraphicStyleLayers({
		node,
		path,
		sourceWidth,
		sourceHeight,
		transform,
		textures,
	});
	const [beforeMediaLayers, afterMediaLayers] =
		orderMediaGraphicStyleLayers(styleLayers);
	// borderLayer is already ordered after stroke/fill above media.
	items.push(...beforeMediaLayers);

	items.push({
		type: "layer",
		textureId,
		transform,
		opacity: node.resolved.opacity,
		blendMode: resolveBlendMode(node.params.blendMode),
		effectPassGroups: node.resolved.effectPasses,
		mask,
	});
	items.push(...afterMediaLayers);
	if (maskStrokeLayer) {
		items.push(maskStrokeLayer);
	}
}

function buildMediaGraphicStyleLayers({
	node,
	path,
	sourceWidth,
	sourceHeight,
	transform,
	textures,
}: {
	node: GraphicNode | ImageNode | StickerNode | VideoNode;
	path: string;
	sourceWidth: number;
	sourceHeight: number;
	transform: QuadTransformDescriptor;
	textures: Map<string, TextureUploadDescriptor>;
}): {
	fillLayer: FrameItemDescriptor | null;
	shadowLayer: FrameItemDescriptor | null;
	strokeLayer: FrameItemDescriptor | null;
	borderLayer: FrameItemDescriptor | null;
} {
	const empty = {
		fillLayer: null,
		shadowLayer: null,
		strokeLayer: null,
		borderLayer: null,
	};
	if (node instanceof GraphicNode || node instanceof StickerNode) return empty;
	if (!node.resolved) return empty;
	const style = node.resolved.graphicStyle;
	if (!style) return empty;
	const hasFill = (style.fillOpacity ?? 0) > 0;
	const hasStroke = Boolean(style.stroke?.enabled && style.stroke.width > 0);
	const hasShadow = Boolean(style.shadow?.enabled);
	const hasBorder = Boolean(
		style.border?.enabled &&
			style.border.width > 0 &&
			(style.border.opacity ?? 0) > 0,
	);
	if (!hasFill && !hasStroke && !hasShadow && !hasBorder) return empty;

	const maxPadding = Math.ceil(
		Math.max(
			style.stroke?.width ?? 0,
			style.border?.width ?? 0,
			style.shadow?.blur ?? 0,
		) *
			2 +
			Math.abs(style.shadow?.offsetX ?? 0) +
			Math.abs(style.shadow?.offsetY ?? 0),
	);
	const makeCanvasLayer = ({
		id,
		padding,
		draw,
	}: {
		id: string;
		padding: number;
		draw: (
			ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
		) => void;
	}): FrameItemDescriptor | null => {
		const width = sourceWidth + padding * 2;
		const height = sourceHeight + padding * 2;
		const canvas = createOffscreenCanvas({ width, height });
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) return null;
		draw(ctx);
		const textureId = `${path}:${id}`;
		textures.set(textureId, { id: textureId, source: canvas, width, height });
		const scaleX = transform.width / Math.max(1, sourceWidth);
		const scaleY = transform.height / Math.max(1, sourceHeight);
		return {
			type: "layer",
			textureId,
			transform: {
				...transform,
				centerX: transform.centerX - padding * scaleX,
				centerY: transform.centerY - padding * scaleY,
				width: width * scaleX,
				height: height * scaleY,
			},
			opacity: 1,
			blendMode: "normal",
			effectPassGroups: [],
			mask: null,
		};
	};

	const shadowLayer =
		hasShadow && style.shadow
			? makeCanvasLayer({
					id: "media-shadow-style",
					padding: maxPadding,
					draw: (ctx) => {
						ctx.shadowColor = style.shadow?.color ?? "#000000";
						ctx.shadowBlur = style.shadow?.blur ?? 0;
						ctx.shadowOffsetX = style.shadow?.offsetX ?? 0;
						ctx.shadowOffsetY = style.shadow?.offsetY ?? 0;
						ctx.fillStyle = "rgba(0,0,0,1)";
						ctx.fillRect(maxPadding, maxPadding, sourceWidth, sourceHeight);
					},
				})
			: null;
	const fillLayer = hasFill
		? makeCanvasLayer({
				id: "media-fill-style",
				padding: 0,
				draw: (ctx) => {
					ctx.globalAlpha = Math.max(0, Math.min(1, style.fillOpacity ?? 0));
					ctx.fillStyle = style.fillColor ?? "#ffffff";
					ctx.fillRect(0, 0, sourceWidth, sourceHeight);
				},
			})
		: null;
	const strokeLayer =
		hasStroke && style.stroke
			? makeCanvasLayer({
					id: "media-stroke-style",
					padding: maxPadding,
					draw: (ctx) => {
						const stroke = style.stroke;
						if (!stroke) return;
						ctx.strokeStyle = stroke.color;
						ctx.lineWidth = stroke.width;
						ctx.strokeRect(
							maxPadding + stroke.width / 2,
							maxPadding + stroke.width / 2,
							Math.max(1, sourceWidth - stroke.width),
							Math.max(1, sourceHeight - stroke.width),
						);
					},
				})
			: null;
	const borderLayer =
		hasBorder && style.border
			? makeCanvasLayer({
					id: "media-border-style",
					padding: maxPadding,
					draw: (ctx) => {
						const border = style.border;
						if (!border) return;
						ctx.globalAlpha = Math.max(0, Math.min(1, border.opacity ?? 1));
						ctx.strokeStyle = border.color;
						ctx.lineWidth = border.width;
						ctx.strokeRect(
							maxPadding + border.width / 2,
							maxPadding + border.width / 2,
							Math.max(1, sourceWidth - border.width),
							Math.max(1, sourceHeight - border.width),
						);
					},
				})
			: null;
	return { fillLayer, shadowLayer, strokeLayer, borderLayer };
}

/**
 * Content key for a text layer's rasterised canvas. Captures every input
 * `renderTextToContext` bakes into the bitmap (style, resolved colours, resolved
 * background metrics, and the resolved — possibly animated/parented — transform),
 * so a cache hit means the pixels are guaranteed identical. Returns `null` for
 * text with an active per-character animator: that raster legitimately changes
 * every frame, so caching would only churn the LRU.
 */
function buildTextRasterKey({
	node,
	renderer,
}: {
	node: TextNode;
	renderer: CanvasRenderer;
}): string | null {
	const resolved = node.resolved;
	if (!resolved || node.params.textAnimator) {
		return null;
	}

	const m = resolved.measuredText;
	const t = resolved.transform;
	const bg = m.resolvedBackground;
	const background = node.params.background.enabled
		? `bg:${resolved.backgroundColor}:${bg.paddingX},${bg.paddingY},${bg.offsetX},${bg.offsetY},${bg.cornerRadius}`
		: "nobg";

	return [
		"text",
		`${renderer.width}x${renderer.height}`,
		node.params.textBaseline ?? "middle",
		node.params.textAlign,
		node.params.textDecoration ?? "none",
		`${node.params.canvasCenter.x},${node.params.canvasCenter.y}`,
		m.fontString,
		`${m.letterSpacing},${m.lineHeightPx}`,
		resolved.textColor,
		background,
		`tf:${t.position.x},${t.position.y},${t.scaleX},${t.scaleY},${t.rotate},${t.positionZ ?? 0}`,
		node.params.content,
	].join("|");
}

function collectTextNode({
	node,
	renderer,
	path,
	items,
	textures,
}: {
	node: TextNode;
	renderer: CanvasRenderer;
	path: string;
	items: FrameItemDescriptor[];
	textures: Map<string, TextureUploadDescriptor>;
}) {
	if (!node.resolved) {
		return;
	}

	// Static (non-animated) text re-rasterises to identical pixels every frame;
	// caching by content key lets the compositor's identity-based upload dedupe
	// skip both the re-raster and the GPU re-upload while the playhead moves.
	const cacheKey = buildTextRasterKey({ node, renderer });
	const draw = (
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	) => {
		renderTextToContext({ node, ctx });
	};

	let canvas: ReturnType<typeof createOffscreenCanvas> | null;
	let textureId: string;
	if (cacheKey) {
		canvas = getCachedRaster({
			key: cacheKey,
			width: renderer.width,
			height: renderer.height,
			draw,
		});
		textureId = `${path}:text`;
	} else {
		// Animated text: content genuinely differs every frame, so reuse one
		// scratch canvas per node (instead of allocating a full-canvas
		// OffscreenCanvas per frame) and bump its version so the compositor
		// re-uploads the new pixels.
		liveAnimatedTextPaths.add(path);
		const scratch = getAnimatedTextScratch({
			path,
			width: renderer.width,
			height: renderer.height,
		});
		canvas = scratch.canvas;
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			return;
		}
		// A reused scratch canvas must start empty, otherwise the previous
		// frame's glyphs would show through the new ones.
		ctx.clearRect(0, 0, renderer.width, renderer.height);
		draw(ctx);
		scratch.version += 1;
		textureId = versionedTextureId(`${path}:text`, scratch.version);
	}
	if (!canvas) {
		return;
	}

	textures.set(textureId, {
		id: textureId,
		source: canvas,
		width: renderer.width,
		height: renderer.height,
	});
	items.push({
		type: "layer",
		textureId,
		transform: fullCanvasTransform(renderer),
		opacity: node.resolved.opacity,
		blendMode: resolveBlendMode(node.params.blendMode),
		effectPassGroups: node.resolved.effectPasses,
		mask: null,
	});
}

function computeVisualTransform({
	renderer,
	resolved,
	sourceWidth,
	sourceHeight,
}: {
	renderer: CanvasRenderer;
	resolved: ResolvedVisualSourceNodeState | ResolvedGraphicNodeState;
	sourceWidth: number;
	sourceHeight: number;
}): QuadTransformDescriptor {
	// Contain scale is computed against the PROJECT canvas size, not the
	// preview's output size. The transform pipeline operates in canvas
	// coords so positions stay correct when the preview renderer is
	// downscaled for performance (canvas-renderer.render() then scales
	// these transforms down to the output buffer before blitting).
	const containScale = Math.min(
		renderer.canvasSize.width / sourceWidth,
		renderer.canvasSize.height / sourceHeight,
	);
	const perspectiveScale = getTransformPerspectiveScale({
		positionZ: resolved.transform.positionZ,
	});
	const scaledWidth =
		sourceWidth * containScale * resolved.transform.scaleX * perspectiveScale;
	const scaledHeight =
		sourceHeight * containScale * resolved.transform.scaleY * perspectiveScale;
	const absWidth = Math.abs(scaledWidth);
	const absHeight = Math.abs(scaledHeight);

	return {
		centerX:
			renderer.canvasSize.width / 2 +
			resolved.transform.position.x * perspectiveScale,
		centerY:
			renderer.canvasSize.height / 2 +
			resolved.transform.position.y * perspectiveScale,
		width: absWidth,
		height: absHeight,
		rotationDegrees: resolved.transform.rotate,
		flipX: scaledWidth < 0,
		flipY: scaledHeight < 0,
		skewXDegrees: resolved.transform.skewX,
		skewYDegrees: resolved.transform.skewY,
	};
}

function fullCanvasTransform(
	renderer: CanvasRenderer,
): QuadTransformDescriptor {
	// Backdrop fills the project canvas, not the output buffer. The
	// render() scale pass will scale this to the output buffer size.
	return {
		centerX: renderer.canvasSize.width / 2,
		centerY: renderer.canvasSize.height / 2,
		width: renderer.canvasSize.width,
		height: renderer.canvasSize.height,
		rotationDegrees: 0,
		flipX: false,
		flipY: false,
	};
}

function buildMaskArtifacts({
	node,
	renderer,
	path,
	transform,
	textures,
}: {
	node: VideoNode | ImageNode | StickerNode | GraphicNode;
	renderer: CanvasRenderer;
	path: string;
	transform: QuadTransformDescriptor;
	textures: Map<string, TextureUploadDescriptor>;
}): {
	mask: LayerMaskDescriptor | null;
	strokeLayer: FrameItemDescriptor | null;
} {
	const mask = node.params.masks?.[0];
	if (!mask) {
		return { mask: null, strokeLayer: null };
	}

	const definition = masksRegistry.get(mask.type);
	const canvasWidth = Math.round(transform.width);
	const canvasHeight = Math.round(transform.height);
	// The feathered renderer bypasses the filled-path branch, so the branch is
	// part of the key — otherwise switching strategies would reuse the other
	// branch's pixels.
	const usesFeatherRenderer =
		mask.params.feather > 0 && Boolean(definition.renderer.renderMask);
	// `inverted`, `strokeColor` and `strokeWidth` are deliberately NOT part of
	// the key: `inverted` is applied by the GPU at composite time and the stroke
	// params only reach the separate stroke raster below, so none of them can
	// change these pixels.
	const contentKey = [
		mask.type,
		paramValuesKey(mask.params),
		`${transform.centerX},${transform.centerY},${transform.width},${transform.height}`,
		`${transform.rotationDegrees},${transform.flipX},${transform.flipY},${transform.skewXDegrees},${transform.skewYDegrees}`,
		usesFeatherRenderer ? "feather" : "fill",
	].join("|");

	const elementMaskCanvas = getCachedRaster({
		key: `mask-el:${contentKey}:${canvasWidth}x${canvasHeight}`,
		width: canvasWidth,
		height: canvasHeight,
		draw: (ctx) => {
			ctx.clearRect(0, 0, transform.width, transform.height);
			if (usesFeatherRenderer) {
				definition.renderer.renderMask?.({
					resolvedParams: mask.params,
					ctx,
					width: canvasWidth,
					height: canvasHeight,
					feather: mask.params.feather,
				});
				return;
			}
			ctx.fillStyle = "white";
			ctx.fill(
				definition.renderer.buildPath({
					resolvedParams: mask.params,
					width: transform.width,
					height: transform.height,
				}),
			);
		},
	});
	if (!elementMaskCanvas) {
		return { mask: null, strokeLayer: null };
	}

	const fullMaskCanvas = getCachedRaster({
		key: `mask-full:${contentKey}:${renderer.width}x${renderer.height}`,
		width: renderer.width,
		height: renderer.height,
		draw: (ctx) => {
			ctx.clearRect(0, 0, renderer.width, renderer.height);
			drawTransformedCanvas({
				ctx,
				source: elementMaskCanvas,
				transform,
			});
		},
	});
	if (!fullMaskCanvas) {
		return { mask: null, strokeLayer: null };
	}

	const maskTextureId = `${path}:mask`;
	textures.set(maskTextureId, {
		id: maskTextureId,
		source: fullMaskCanvas,
		width: renderer.width,
		height: renderer.height,
	});

	let strokeLayer: FrameItemDescriptor | null = null;
	if (mask.params.strokeWidth > 0) {
		// Rebuilt every frame (cheap: Path2D math, no raster) because the cached
		// element mask above no longer re-runs the draw that used to produce it.
		const builtStrokePath = definition.renderer.buildStrokePath?.({
			resolvedParams: mask.params,
			width: transform.width,
			height: transform.height,
		});
		// The filled-path branch falls back to the mask's own outline; the feathered
		// branch only strokes a dedicated outline (it has nothing else to fall back to).
		const strokePath =
			builtStrokePath ??
			(usesFeatherRenderer
				? null
				: definition.renderer.buildPath({
						resolvedParams: mask.params,
						width: transform.width,
						height: transform.height,
					}));
		if (strokePath) {
			const strokeCanvas = getCachedRaster({
				key: `mask-stroke-el:${contentKey}:${canvasWidth}x${canvasHeight}`,
				width: canvasWidth,
				height: canvasHeight,
				draw: (ctx) => {
					ctx.clearRect(0, 0, transform.width, transform.height);
					ctx.strokeStyle = mask.params.strokeColor;
					ctx.lineWidth = mask.params.strokeWidth;
					ctx.stroke(strokePath);
				},
			});
			if (strokeCanvas) {
				const fullStrokeCanvas = getCachedRaster({
					key: `mask-stroke-full:${contentKey}:${renderer.width}x${renderer.height}`,
					width: renderer.width,
					height: renderer.height,
					draw: (ctx) => {
						ctx.clearRect(0, 0, renderer.width, renderer.height);
						drawTransformedCanvas({
							ctx,
							source: strokeCanvas,
							transform,
						});
					},
				});
				if (fullStrokeCanvas) {
					const strokeTextureId = `${path}:mask-stroke`;
					textures.set(strokeTextureId, {
						id: strokeTextureId,
						source: fullStrokeCanvas,
						width: renderer.width,
						height: renderer.height,
					});
					strokeLayer = {
						type: "layer",
						textureId: strokeTextureId,
						transform: fullCanvasTransform(renderer),
						opacity: 1,
						blendMode: "normal",
						effectPassGroups: [],
						mask: null,
					};
				}
			}
		}
	}

	return {
		mask: {
			textureId: maskTextureId,
			feather: usesFeatherRenderer ? 0 : mask.params.feather,
			inverted: mask.params.inverted,
		},
		strokeLayer,
	};
}

function drawTransformedCanvas({
	ctx,
	source,
	transform,
}: {
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	source: CanvasImageSource;
	transform: QuadTransformDescriptor;
}) {
	const x = transform.centerX - transform.width / 2;
	const y = transform.centerY - transform.height / 2;
	const flipX = transform.flipX ? -1 : 1;
	const flipY = transform.flipY ? -1 : 1;
	const skewX = transform.skewXDegrees ?? 0;
	const skewY = transform.skewYDegrees ?? 0;
	const requiresTransform =
		transform.rotationDegrees !== 0 ||
		flipX !== 1 ||
		flipY !== 1 ||
		skewX !== 0 ||
		skewY !== 0;

	ctx.save();
	if (requiresTransform) {
		ctx.translate(transform.centerX, transform.centerY);
		ctx.rotate((transform.rotationDegrees * Math.PI) / 180);
		// Skew: tan(deg) gives the shear factor. ctx.transform(a, b, c, d, e, f)
		// applies matrix [a c e; b d f; 0 0 1]. For skewX, b=tan(skewX); for
		// skewY, c=tan(skewY). Combined with scale via separate ctx.scale call.
		if (skewX !== 0 || skewY !== 0) {
			ctx.transform(
				1,
				Math.tan((skewX * Math.PI) / 180),
				Math.tan((skewY * Math.PI) / 180),
				1,
				0,
				0,
			);
		}
		ctx.scale(flipX, flipY);
		ctx.translate(-transform.centerX, -transform.centerY);
	}
	ctx.drawImage(source, x, y, transform.width, transform.height);
	ctx.restore();
}
