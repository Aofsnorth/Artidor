import { drawCssBackground } from "@/lib/gradients";
import { masksRegistry } from "@/lib/masks";
import type { AnyBaseNode } from "../nodes/base-node";
import type { CanvasRenderer } from "../canvas-renderer";
import { createOffscreenCanvas } from "../canvas-utils";
import { getCachedRaster } from "./raster-cache";
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
import { getTransformPerspectiveScale } from "@/lib/rendering";

export type TextureUploadDescriptor = {
	id: string;
	source: CanvasImageSource;
	width: number;
	height: number;
};

export async function buildFrameDescriptor({
	node,
	renderer,
}: {
	node: AnyBaseNode;
	renderer: CanvasRenderer;
}): Promise<{
	frame: FrameDescriptor;
	textures: TextureUploadDescriptor[];
}> {
	const items: FrameItemDescriptor[] = [];
	const textures = new Map<string, TextureUploadDescriptor>();

	await collectNode({
		node,
		renderer,
		path: "root",
		items,
		textures,
	});

	return {
		frame: {
			width: renderer.width,
			height: renderer.height,
			clear: {
				color: [0, 0, 0, 1],
			},
			items,
		},
		textures: [...textures.values()],
	};
}

async function collectNode({
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
}): Promise<void> {
	if (node instanceof RootNode) {
		for (let index = 0; index < node.children.length; index++) {
			await collectNode({
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
		const textureId = `${path}:blur-background`;
		const backdropCanvas = createOffscreenCanvas({
			width: renderer.width,
			height: renderer.height,
		});
		const backdropCtx = backdropCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!backdropCtx) return;
		const { backdropSource, passes } = node.resolved;
		const coverScale = Math.max(
			renderer.width / backdropSource.width,
			renderer.height / backdropSource.height,
		);
		const scaledWidth = backdropSource.width * coverScale;
		const scaledHeight = backdropSource.height * coverScale;
		const offsetX = (renderer.width - scaledWidth) / 2;
		const offsetY = (renderer.height - scaledHeight) / 2;
		backdropCtx.drawImage(
			backdropSource.source,
			offsetX,
			offsetY,
			scaledWidth,
			scaledHeight,
		);
		textures.set(textureId, {
			id: textureId,
			source: backdropCanvas,
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
		await collectVisualSourceNode({
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

async function collectVisualSourceNode({
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

	const textureId = `${path}:source`;
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
	const { mask, strokeLayer } = buildMaskArtifacts({
		node,
		renderer,
		path,
		transform,
		textures,
	});
	const mediaStyleLayer = buildMediaGraphicStyleLayer({
		node,
		path,
		sourceWidth,
		sourceHeight,
		transform,
		textures,
	});
	if (mediaStyleLayer) {
		items.push(mediaStyleLayer);
	}

	items.push({
		type: "layer",
		textureId,
		transform,
		opacity: node.resolved.opacity,
		blendMode: node.params.blendMode ?? "normal",
		effectPassGroups: node.resolved.effectPasses,
		mask,
	});
	if (strokeLayer) {
		items.push(strokeLayer);
	}
}

function buildMediaGraphicStyleLayer({
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
}): FrameItemDescriptor | null {
	if (node instanceof GraphicNode || node instanceof StickerNode) return null;
	const style = node.params.graphicStyle;
	if (!style) return null;
	const hasFill = (style.fillOpacity ?? 0) > 0;
	const hasStroke = Boolean(style.stroke?.enabled && style.stroke.width > 0);
	const hasShadow = Boolean(style.shadow?.enabled);
	if (!hasFill && !hasStroke && !hasShadow) return null;

	const padding = Math.ceil(
		Math.max(style.stroke?.width ?? 0, style.shadow?.blur ?? 0) * 2 +
			Math.abs(style.shadow?.offsetX ?? 0) +
			Math.abs(style.shadow?.offsetY ?? 0),
	);
	const width = sourceWidth + padding * 2;
	const height = sourceHeight + padding * 2;
	const canvas = createOffscreenCanvas({ width, height });
	const ctx = canvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (!ctx) return null;

	if (hasShadow && style.shadow) {
		ctx.save();
		ctx.shadowColor = style.shadow.color;
		ctx.shadowBlur = style.shadow.blur;
		ctx.shadowOffsetX = style.shadow.offsetX;
		ctx.shadowOffsetY = style.shadow.offsetY;
		ctx.fillStyle = "rgba(0,0,0,1)";
		ctx.fillRect(padding, padding, sourceWidth, sourceHeight);
		ctx.restore();
	}
	if (hasFill) {
		ctx.save();
		ctx.globalAlpha = Math.max(0, Math.min(1, style.fillOpacity ?? 0));
		ctx.fillStyle = style.fillColor ?? "#ffffff";
		ctx.fillRect(padding, padding, sourceWidth, sourceHeight);
		ctx.restore();
	}
	if (hasStroke && style.stroke) {
		ctx.strokeStyle = style.stroke.color;
		ctx.lineWidth = style.stroke.width;
		ctx.strokeRect(
			padding + style.stroke.width / 2,
			padding + style.stroke.width / 2,
			Math.max(1, sourceWidth - style.stroke.width),
			Math.max(1, sourceHeight - style.stroke.width),
		);
	}

	const textureId = `${path}:media-graphic-style`;
	textures.set(textureId, { id: textureId, source: canvas, width, height });
	const scaleX = transform.width / Math.max(1, sourceWidth);
	const scaleY = transform.height / Math.max(1, sourceHeight);
	const paddedTransform: QuadTransformDescriptor = {
		...transform,
		centerX: transform.centerX - padding * scaleX,
		centerY: transform.centerY - padding * scaleY,
		width: width * scaleX,
		height: height * scaleY,
	};
	return {
		type: "layer",
		textureId,
		transform: paddedTransform,
		opacity: 1,
		blendMode: "normal",
		effectPassGroups: [],
		mask: null,
	};
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

	const textureId = `${path}:text`;
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
	if (cacheKey) {
		canvas = getCachedRaster({
			key: cacheKey,
			width: renderer.width,
			height: renderer.height,
			draw,
		});
	} else {
		canvas = createOffscreenCanvas({
			width: renderer.width,
			height: renderer.height,
		});
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			return;
		}
		draw(ctx);
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
		blendMode: node.params.blendMode ?? "normal",
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
	const elementMaskCanvas = createOffscreenCanvas({
		width: Math.round(transform.width),
		height: Math.round(transform.height),
	});
	const elementMaskCtx = elementMaskCanvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (!elementMaskCtx) {
		return { mask: null, strokeLayer: null };
	}
	elementMaskCtx.clearRect(0, 0, transform.width, transform.height);

	let strokePath: Path2D | null = null;
	let feather = mask.params.feather;
	if (mask.params.feather > 0 && definition.renderer.renderMask) {
		definition.renderer.renderMask({
			resolvedParams: mask.params,
			ctx: elementMaskCtx,
			width: Math.round(transform.width),
			height: Math.round(transform.height),
			feather: mask.params.feather,
		});
		feather = 0;
		strokePath =
			definition.renderer.buildStrokePath?.({
				resolvedParams: mask.params,
				width: transform.width,
				height: transform.height,
			}) ?? null;
	} else {
		const path2d = definition.renderer.buildPath({
			resolvedParams: mask.params,
			width: transform.width,
			height: transform.height,
		});
		elementMaskCtx.fillStyle = "white";
		elementMaskCtx.fill(path2d);
		strokePath =
			definition.renderer.buildStrokePath?.({
				resolvedParams: mask.params,
				width: transform.width,
				height: transform.height,
			}) ?? path2d;
	}

	const fullMaskCanvas = createOffscreenCanvas({
		width: renderer.width,
		height: renderer.height,
	});
	const fullMaskCtx = fullMaskCanvas.getContext("2d") as
		| CanvasRenderingContext2D
		| OffscreenCanvasRenderingContext2D
		| null;
	if (!fullMaskCtx) {
		return { mask: null, strokeLayer: null };
	}
	drawTransformedCanvas({
		ctx: fullMaskCtx,
		source: elementMaskCanvas,
		transform,
	});

	const maskTextureId = `${path}:mask`;
	textures.set(maskTextureId, {
		id: maskTextureId,
		source: fullMaskCanvas,
		width: renderer.width,
		height: renderer.height,
	});

	let strokeLayer: FrameItemDescriptor | null = null;
	if (mask.params.strokeWidth > 0 && strokePath) {
		const strokeCanvas = createOffscreenCanvas({
			width: Math.round(transform.width),
			height: Math.round(transform.height),
		});
		const strokeCtx = strokeCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (strokeCtx) {
			strokeCtx.strokeStyle = mask.params.strokeColor;
			strokeCtx.lineWidth = mask.params.strokeWidth;
			strokeCtx.stroke(strokePath);

			const fullStrokeCanvas = createOffscreenCanvas({
				width: renderer.width,
				height: renderer.height,
			});
			const fullStrokeCtx = fullStrokeCanvas.getContext("2d") as
				| CanvasRenderingContext2D
				| OffscreenCanvasRenderingContext2D
				| null;
			if (fullStrokeCtx) {
				drawTransformedCanvas({
					ctx: fullStrokeCtx,
					source: strokeCanvas,
					transform,
				});
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

	return {
		mask: {
			textureId: maskTextureId,
			feather,
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
			ctx.transform(1, Math.tan((skewX * Math.PI) / 180), Math.tan((skewY * Math.PI) / 180), 1, 0, 0);
		}
		ctx.scale(flipX, flipY);
		ctx.translate(-transform.centerX, -transform.centerY);
	}
	ctx.drawImage(source, x, y, transform.width, transform.height);
	ctx.restore();
}
