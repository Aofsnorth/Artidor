import { Command, type CommandResult } from "@/lib/commands/base-command";
import type { SceneTracks, TimelineElement } from "@/lib/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";
import { isRetimableElement } from "@/lib/timeline";
import { splitAnimationsAtTime } from "@/lib/animation";
import { getSourceSpanAtClipTime, splitRetimeAtClipTime } from "@/lib/retime";
import { ticksPerFrame } from "@/lib/timeline/frame-step";
import { roundToFrame, type FrameRate } from "artidor-wasm";

/** Minimum split half-width: a side must hold at least one full frame. */
function isSplitTooSmall({
	splitTime,
	elementStart,
	elementEnd,
	fps,
}: {
	splitTime: number;
	elementStart: number;
	elementEnd: number;
	fps: FrameRate;
}): boolean {
	const perFrame = ticksPerFrame({ fps });
	if (perFrame === null) {
		// The frame rate has no exact tick-grid representation, so the
		// one-frame minimum cannot be verified. Reject the cut explicitly
		// instead of guessing with a float frame size.
		return true;
	}
	const left = splitTime - elementStart;
	const right = elementEnd - splitTime;
	return left < perFrame || right < perFrame;
}

export class SplitElementsCommand extends Command {
	private savedState: SceneTracks | null = null;
	private rightSideElements: { trackId: string; elementId: string }[] = [];
	private readonly elements: { trackId: string; elementId: string }[];
	private readonly splitTime: number;
	private readonly retainSide: "both" | "left" | "right";

	constructor({
		elements,
		splitTime,
		retainSide = "both",
	}: {
		elements: { trackId: string; elementId: string }[];
		splitTime: number;
		retainSide?: "both" | "left" | "right";
	}) {
		super();
		this.elements = elements;
		this.splitTime = splitTime;
		this.retainSide = retainSide;
	}

	getRightSideElements(): { trackId: string; elementId: string }[] {
		return this.rightSideElements;
	}

	execute(): CommandResult | undefined {
		const editor = EditorCore.getInstance();
		this.savedState = editor.scenes.getActiveScene().tracks;
		this.rightSideElements = [];

		// Keyboard "S" passes the playhead time and the AI executor passes raw
		// times; snap the split point onto the frame grid so both resulting
		// halves stay frame-aligned (the drag/resize tool paths already snap).
		const fps = editor.project.getActiveOrNull()?.settings.fps;
		const rawSplitTime = this.splitTime;
		const splitTime = fps
			? (roundToFrame({ time: rawSplitTime, rate: fps }) ?? rawSplitTime)
			: rawSplitTime;

		const splitTrack = <
			TTrack extends { id: string; elements: TimelineElement[] },
		>(
			track: TTrack,
		): TTrack => {
			const elementsToSplit = this.elements.filter(
				(target) => target.trackId === track.id,
			);

			if (elementsToSplit.length === 0) {
				return track;
			}

			const elements = track.elements.flatMap((element) => {
				const shouldSplit = elementsToSplit.some(
					(target) => target.elementId === element.id,
				);

				if (!shouldSplit) {
					return [element];
				}

				const effectiveStart = element.startTime;
				const effectiveEnd = element.startTime + element.duration;

				if (splitTime <= effectiveStart || splitTime >= effectiveEnd) {
					return [element];
				}

				// A split that would leave either half shorter than one frame is a
				// no-op for that element (keep the original) — otherwise a sub-frame
				// split produced invisible zero-length clips.
				if (
					fps &&
					isSplitTooSmall({
						splitTime,
						elementStart: effectiveStart,
						elementEnd: effectiveEnd,
						fps,
					})
				) {
					return [element];
				}

				const relativeTime = splitTime - element.startTime;
				const leftVisibleDuration = relativeTime;
				const rightVisibleDuration = element.duration - relativeTime;
				const retimeRef = isRetimableElement(element)
					? element.retime
					: undefined;
				const leftSourceSpan = getSourceSpanAtClipTime({
					clipTime: leftVisibleDuration,
					retime: retimeRef,
				});
				const totalSourceSpan = getSourceSpanAtClipTime({
					clipTime: element.duration,
					retime: retimeRef,
				});
				const rightSourceSpan = totalSourceSpan - leftSourceSpan;
				const { leftAnimations, rightAnimations } = splitAnimationsAtTime({
					animations: element.animations,
					splitTime: relativeTime,
					shouldIncludeSplitBoundary: true,
				});

				// Curve (speed-ramp) retimes need a real slice: the right half must
				// continue the ramp from the cut-point rate, not replay the curve
				// from time 0. Constant-rate retimes are duration-invariant and can
				// be carried as-is.
				const splitRetime =
					retimeRef !== undefined
						? splitRetimeAtClipTime({
								splitClipTime: relativeTime,
								retime: { ...retimeRef, duration: element.duration },
							})
						: undefined;
				const leftRetime = splitRetime?.left;
				const rightRetime = splitRetime?.right;

				if (this.retainSide === "left") {
					return [
						{
							...element,
							duration: leftVisibleDuration,
							trimEnd: element.trimEnd + rightSourceSpan,
							name: `${element.name} (left)`,
							animations: leftAnimations,
							...(leftRetime !== undefined ? { retime: leftRetime } : {}),
						},
					];
				}

				if (this.retainSide === "right") {
					const newId = generateUUID();
					this.rightSideElements.push({
						trackId: track.id,
						elementId: newId,
					});
					return [
						{
							...element,
							id: newId,
							startTime: splitTime,
							duration: rightVisibleDuration,
							trimStart: element.trimStart + leftSourceSpan,
							name: `${element.name} (right)`,
							animations: rightAnimations,
							...(rightRetime !== undefined ? { retime: rightRetime } : {}),
						},
					];
				}

				// "both" - split into two pieces
				const secondElementId = generateUUID();
				this.rightSideElements.push({
					trackId: track.id,
					elementId: secondElementId,
				});

				return [
					{
						...element,
						duration: leftVisibleDuration,
						trimEnd: element.trimEnd + rightSourceSpan,
						name: `${element.name} (left)`,
						animations: leftAnimations,
						...(leftRetime !== undefined ? { retime: leftRetime } : {}),
					},
					{
						...element,
						id: secondElementId,
						startTime: splitTime,
						duration: rightVisibleDuration,
						trimStart: element.trimStart + leftSourceSpan,
						name: `${element.name} (right)`,
						animations: rightAnimations,
						...(rightRetime !== undefined ? { retime: rightRetime } : {}),
					},
				];
			});

			return { ...track, elements } as TTrack;
		};

		const updatedTracks: SceneTracks = {
			...this.savedState,
			overlay: this.savedState.overlay.map((track) => splitTrack(track)),
			main: splitTrack(this.savedState.main),
			overlayAfter: this.savedState.overlayAfter.map((track) =>
				splitTrack(track),
			),
			audio: this.savedState.audio.map((track) => splitTrack(track)),
		};

		editor.timeline.updateTracks(updatedTracks);

		if (this.rightSideElements.length > 0) {
			return {
				select: this.rightSideElements,
			};
		}
		return undefined;
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
