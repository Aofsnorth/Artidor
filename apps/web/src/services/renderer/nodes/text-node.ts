import { BaseNode } from "./base-node";
import type { TextElement } from "@/lib/timeline";
import type { EffectPass } from "@/lib/effects/types";
import { getTransformPerspectiveScale, type Transform } from "@/lib/rendering";
import { CORNER_RADIUS_MAX, CORNER_RADIUS_MIN } from "@/lib/text/background";
import {
	drawTextDecoration,
	getTextBackgroundRect,
	setCanvasLetterSpacing,
} from "@/lib/text/layout";
import type { MeasuredTextElement } from "@/lib/text/measure-element";
import {
	computeTextUnitAnimation,
	splitTextLineUnits,
} from "@/lib/text/animator";
import { TICKS_PER_SECOND } from "@/lib/wasm";
import { clamp } from "@/utils/math";

export type TextNodeParams = TextElement & {
	canvasCenter: { x: number; y: number };
	canvasHeight: number;
	textBaseline?: CanvasTextBaseline;
};

export interface ResolvedTextNodeState {
	transform: Transform;
	opacity: number;
	textColor: string;
	backgroundColor: string;
	effectPasses: EffectPass[][];
	measuredText: MeasuredTextElement;
	/** Element-local time (ticks), used to drive per-character animators. */
	localTime: number;
}

export class TextNode extends BaseNode<TextNodeParams, ResolvedTextNodeState> {}

export function renderTextToContext({
	node,
	ctx,
}: {
	node: TextNode;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): void {
	const resolved = node.resolved;
	if (!resolved) {
		return;
	}

	const perspectiveScale = getTransformPerspectiveScale({
		positionZ: resolved.transform.positionZ,
	});
	const x =
		resolved.transform.position.x * perspectiveScale +
		node.params.canvasCenter.x;
	const y =
		resolved.transform.position.y * perspectiveScale +
		node.params.canvasCenter.y;
	const baseline = node.params.textBaseline ?? "middle";
	const {
		scaledFontSize,
		fontString,
		letterSpacing,
		lineHeightPx,
		lines,
		lineMetrics,
		block,
		fontSizeRatio,
		resolvedBackground,
	} = resolved.measuredText;
	const lineCount = lines.length;
	const resolvedBackgroundWithColor = {
		...resolvedBackground,
		color: resolved.backgroundColor,
	};

	ctx.save();
	ctx.translate(x, y);
	ctx.scale(
		resolved.transform.scaleX * perspectiveScale,
		resolved.transform.scaleY * perspectiveScale,
	);
	if (resolved.transform.rotate) {
		ctx.rotate((resolved.transform.rotate * Math.PI) / 180);
	}

	ctx.font = fontString;
	ctx.textAlign = node.params.textAlign;
	ctx.textBaseline = baseline;
	ctx.fillStyle = resolved.textColor;
	setCanvasLetterSpacing({ ctx, letterSpacingPx: letterSpacing });

	if (
		node.params.background.enabled &&
		node.params.background.color &&
		node.params.background.color !== "transparent" &&
		lineCount > 0
	) {
		const backgroundRect = getTextBackgroundRect({
			textAlign: node.params.textAlign,
			block,
			background: resolvedBackgroundWithColor,
			fontSizeRatio,
		});
		if (backgroundRect) {
			const p =
				clamp({
					value: resolvedBackgroundWithColor.cornerRadius,
					min: CORNER_RADIUS_MIN,
					max: CORNER_RADIUS_MAX,
				}) / 100;
			const radius =
				(Math.min(backgroundRect.width, backgroundRect.height) / 2) * p;
			ctx.fillStyle = resolvedBackgroundWithColor.color;
			ctx.beginPath();
			ctx.roundRect(
				backgroundRect.left,
				backgroundRect.top,
				backgroundRect.width,
				backgroundRect.height,
				radius,
			);
			ctx.fill();
			ctx.fillStyle = resolved.textColor;
		}
	}

	const animator = node.params.textAnimator;

	if (animator) {
		const localTimeSeconds = resolved.localTime / TICKS_PER_SECOND;
		let unitIndex = 0;
		for (let index = 0; index < lineCount; index++) {
			const lineY = index * lineHeightPx - block.visualCenterOffset;
			unitIndex = drawAnimatedTextLine({
				ctx,
				line: lines[index],
				lineY,
				textAlign: node.params.textAlign,
				animator,
				unitIndexStart: unitIndex,
				localTimeSeconds,
				scaledFontSize,
			});
			// Decorations don't animate per-unit; draw them statically per line.
			drawTextDecoration({
				ctx,
				textDecoration: node.params.textDecoration ?? "none",
				lineWidth: lineMetrics[index].width,
				lineY,
				metrics: lineMetrics[index],
				scaledFontSize,
				textAlign: node.params.textAlign,
			});
		}
	} else {
		for (let index = 0; index < lineCount; index++) {
			const lineY = index * lineHeightPx - block.visualCenterOffset;
			ctx.fillText(lines[index], 0, lineY);
			drawTextDecoration({
				ctx,
				textDecoration: node.params.textDecoration ?? "none",
				lineWidth: lineMetrics[index].width,
				lineY,
				metrics: lineMetrics[index],
				scaledFontSize,
				textAlign: node.params.textAlign,
			});
		}
	}

	ctx.restore();
}

/**
 * Draws one line of text unit-by-unit (character or word), applying the
 * animator's per-unit transform/opacity. The context's font, fill style and
 * letter spacing are expected to already be set. Returns the next global unit
 * index so the caller can continue the stagger across subsequent lines.
 */
function drawAnimatedTextLine({
	ctx,
	line,
	lineY,
	textAlign,
	animator,
	unitIndexStart,
	localTimeSeconds,
	scaledFontSize,
}: {
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	line: string;
	lineY: number;
	textAlign: CanvasTextAlign;
	animator: NonNullable<TextElement["textAnimator"]>;
	unitIndexStart: number;
	localTimeSeconds: number;
	scaledFontSize: number;
}): number {
	const units = splitTextLineUnits({ line, unit: animator.unit });
	if (units.length === 0) {
		return unitIndexStart;
	}

	const widths = units.map((unit) => ctx.measureText(unit).width);
	const totalWidth = widths.reduce((sum, width) => sum + width, 0);

	let startX = 0;
	if (textAlign === "center") {
		startX = -totalWidth / 2;
	} else if (textAlign === "right") {
		startX = -totalWidth;
	}

	const previousAlign = ctx.textAlign;
	ctx.textAlign = "left";

	let cursorX = startX;
	let unitIndex = unitIndexStart;
	for (let i = 0; i < units.length; i++) {
		const width = widths[i];
		const state = computeTextUnitAnimation({
			animator,
			unitIndex,
			localTimeSeconds,
		});

		if (state.opacity > 0.001) {
			const centerX = cursorX + width / 2;
			ctx.save();
			ctx.globalAlpha = state.opacity;
			ctx.translate(
				centerX + state.offsetX * scaledFontSize,
				lineY + state.offsetY * scaledFontSize,
			);
			if (state.rotate !== 0) {
				ctx.rotate((state.rotate * Math.PI) / 180);
			}
			if (state.scale !== 1) {
				ctx.scale(state.scale, state.scale);
			}
			// Draw anchored at the unit's own centre (textAlign is "left").
			ctx.fillText(units[i], -width / 2, 0);
			ctx.restore();
		}

		cursorX += width;
		unitIndex += 1;
	}

	ctx.textAlign = previousAlign;
	return unitIndex;
}
