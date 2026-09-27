import { createOffscreenCanvas } from "../canvas-utils";
import { paramValuesKey } from "../compositor/raster-cache";
import {
	DEFAULT_GRAPHIC_SOURCE_SIZE,
	getGraphicDefinition,
	registerDefaultGraphics,
} from "@/lib/graphics";
import type { ParamValues } from "@/lib/params";
import {
	VisualNode,
	type ResolvedVisualNodeState,
	type VisualNodeParams,
} from "./visual-node";

export interface GraphicNodeParams extends VisualNodeParams {
	definitionId: string;
	params: ParamValues;
}

export interface ResolvedGraphicNodeState extends ResolvedVisualNodeState {
	resolvedParams: ParamValues;
}

/**
 * `registerDefaultGraphics()` probes ~40 registry entries, and it used to run in
 * every `GraphicNode` constructor (once per node per scene rebuild) as well as
 * in `getGraphicDefinition` on every `getSource()` call (once per graphic node
 * per frame). The graphics registry is append-only — nothing clears or resets it
 * (plugins only register/unregister their own namespaced ids) — so one
 * registration per module instance is equivalent to one per call.
 */
let defaultGraphicsRegistered = false;

function ensureDefaultGraphicsRegistered(): void {
	if (defaultGraphicsRegistered) {
		return;
	}
	registerDefaultGraphics();
	defaultGraphicsRegistered = true;
}

export class GraphicNode extends VisualNode<
	GraphicNodeParams,
	ResolvedGraphicNodeState
> {
	private cachedKey: string | null = null;
	private cachedSource: OffscreenCanvas | HTMLCanvasElement | null = null;
	/**
	 * Bumped every time `getSource()` re-renders into `cachedSource`.
	 *
	 * The canvas is now reused instead of reallocated, so its object identity no
	 * longer changes when the pixels change — and the compositor dedupes texture
	 * uploads by (texture id, source identity). `frame-descriptor` therefore
	 * appends this version to the texture id, which forces exactly one re-upload
	 * per changed frame: the same upload count the old allocate-a-fresh-canvas
	 * code produced, without a fresh 512x512 canvas per frame.
	 */
	private sourceVersion = 0;

	constructor(params: GraphicNodeParams) {
		super(params);
		ensureDefaultGraphicsRegistered();
	}

	/**
	 * Monotonic count of renders into the cached source canvas. The frame
	 * descriptor embeds it in the texture id so a reused canvas is never
	 * mistaken for unchanged content by the compositor's upload dedupe.
	 */
	getSourceVersion(): number {
		return this.sourceVersion;
	}

	getSource({
		resolvedParams,
	}: {
		resolvedParams: ParamValues;
	}): OffscreenCanvas | HTMLCanvasElement | null {
		const definition = getGraphicDefinition({
			definitionId: this.params.definitionId,
		});
		// Cheap content key: `JSON.stringify` re-escaped every param on every
		// frame, and an animated graphic changes params 60x/second.
		const cacheKey = `${this.params.definitionId}|${paramValuesKey(resolvedParams)}`;
		if (this.cachedSource && this.cachedKey === cacheKey) {
			return this.cachedSource;
		}

		// Reuse the existing canvas: an animated graphic used to allocate a new
		// 512x512 backing store per frame, which is ~1 MB of GPU-visible churn
		// per node per frame. The version bump above keeps the compositor
		// re-uploading, so the pixels on the GPU still track the params.
		const canvas =
			this.cachedSource ??
			createOffscreenCanvas({
				width: DEFAULT_GRAPHIC_SOURCE_SIZE,
				height: DEFAULT_GRAPHIC_SOURCE_SIZE,
			});
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			return null;
		}
		// Wipe first: a reused canvas must not keep pixels from the previous
		// param set (a smaller shape would otherwise show the old one's tail).
		ctx.clearRect(
			0,
			0,
			DEFAULT_GRAPHIC_SOURCE_SIZE,
			DEFAULT_GRAPHIC_SOURCE_SIZE,
		);

		definition.render({
			ctx,
			params: resolvedParams,
			width: DEFAULT_GRAPHIC_SOURCE_SIZE,
			height: DEFAULT_GRAPHIC_SOURCE_SIZE,
		});

		this.cachedKey = cacheKey;
		this.cachedSource = canvas;
		this.sourceVersion += 1;
		return canvas;
	}
}
