import { BaseNode } from "./base-node";
import type { Effect, EffectPass } from "@/lib/effects/types";
import type { Mask } from "@/lib/masks/types";
import type { BlendMode, Transform } from "@/lib/rendering";
import type {
	MediaGraphicStyle,
	RetimeConfig,
	VisualElement,
} from "@/lib/timeline";
import type { ParentChainEntry } from "../parenting-resolve";

export interface VisualNodeParams {
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	retime?: RetimeConfig;
	transform: Transform;
	animations?: VisualElement["animations"];
	opacity: number;
	blendMode?: BlendMode;
	graphicStyle?: MediaGraphicStyle;
	effects?: Effect[];
	masks?: Mask[];
	/** Ancestor transform chain (closest-first) for layer parenting. */
	parentChain?: ParentChainEntry[];
}

export interface ResolvedVisualNodeState {
	localTime: number;
	transform: Transform;
	opacity: number;
	graphicStyle?: MediaGraphicStyle;
	effectPasses: EffectPass[][];
}

export interface ResolvedVisualSourceNodeState extends ResolvedVisualNodeState {
	source: CanvasImageSource;
	sourceWidth: number;
	sourceHeight: number;
}

export abstract class VisualNode<
	Params extends VisualNodeParams = VisualNodeParams,
	Resolved extends ResolvedVisualNodeState = ResolvedVisualNodeState,
> extends BaseNode<Params, Resolved> {}
