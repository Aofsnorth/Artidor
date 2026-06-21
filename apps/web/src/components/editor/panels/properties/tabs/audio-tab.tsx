import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/lib/timeline/audio-constants";
import { isSourceAudioSeparated } from "@/lib/timeline/audio-separation";
import { DEFAULTS } from "@/lib/timeline/defaults";
import {
	clamp,
	formatNumberForDisplay,
	getFractionDigitsForStep,
	isNearlyEqual,
	snapToStep,
} from "@/utils/math";
import type { AudioElement, VideoElement } from "@/lib/timeline";
import { resolveNumberAtTime } from "@/lib/animation";
import { useEditor } from "@/hooks/use-editor";
import { useElementPlayhead } from "../hooks/use-element-playhead";
import { useKeyframedNumberProperty } from "../hooks/use-keyframed-number-property";
import { usePropertyDraft } from "../hooks/use-property-draft";
import { KeyframeToggle } from "../components/keyframe-toggle";
import { HugeiconsIcon } from "@hugeicons/react";
import { VolumeHighIcon, MusicNote03Icon } from "@hugeicons/core-free-icons";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";

const VOLUME_STEP = 0.1;
const VOLUME_FRACTION_DIGITS = getFractionDigitsForStep({ step: VOLUME_STEP });

/**
 * Variant selector for the Audio tab.
 *
 * - "video": shown when a video element is selected. Includes a banner
 *   with the "Recover audio" affordance for separated source audio.
 * - "audio-element": shown when a standalone audio element is selected.
 *   The volume / pan / fade controls are identical, but the source
 *   separation UI is omitted (no source video to detach from). The
 *   section is relabelled so the two inspectors look different at a
 *   glance instead of duplicating each other.
 */
export type AudioTabVariant = "video" | "audio-element";

export function AudioTab({
	element,
	trackId,
	variant = "video",
}: {
	element: AudioElement | VideoElement;
	trackId: string;
	variant?: AudioTabVariant;
}) {
	const [isHelperHidden, setIsHelperHidden] = useState(false);
	const editor = useEditor();
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});

	// VOLUME PROPERTY
	const resolvedVolume = resolveNumberAtTime({
		baseValue: element.volume ?? DEFAULTS.element.volume,
		animations: element.animations,
		propertyPath: "volume",
		localTime,
	});
	const volume = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "volume",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: formatNumberForDisplay({
			value: resolvedVolume,
			fractionDigits: VOLUME_FRACTION_DIGITS,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) {
				return null;
			}

			return clamp({
				value: snapToStep({ value: parsed, step: VOLUME_STEP }),
				min: VOLUME_DB_MIN,
				max: VOLUME_DB_MAX,
			});
		},
		valueAtPlayhead: resolvedVolume,
		step: VOLUME_STEP,
		buildBaseUpdates: ({ value }) => ({
			volume: value,
		}),
	});
	const isVolumeDefault =
		volume.hasAnimatedKeyframes && isPlayheadWithinElementRange
			? isNearlyEqual({
					leftValue: resolvedVolume,
					rightValue: DEFAULTS.element.volume,
				})
			: (element.volume ?? DEFAULTS.element.volume) === DEFAULTS.element.volume;

	// PAN PROPERTY
	const resolvedPan = resolveNumberAtTime({
		baseValue: element.pan ?? 0,
		animations: element.animations,
		propertyPath: "pan",
		localTime,
	});
	const pan = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "pan",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: formatNumberForDisplay({
			value: resolvedPan,
			fractionDigits: 0,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) {
				return null;
			}

			return clamp({
				value: snapToStep({ value: parsed, step: 1 }),
				min: -100,
				max: 100,
			});
		},
		valueAtPlayhead: resolvedPan,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			pan: value,
		}),
	});
	const isPanDefault =
		pan.hasAnimatedKeyframes && isPlayheadWithinElementRange
			? isNearlyEqual({
					leftValue: resolvedPan,
					rightValue: 0,
				})
			: (element.pan ?? 0) === 0;

	// FADE IN PROPERTY (Static, non-keyframed)
	const resolvedFadeIn = element.fadeInDuration ?? 0;
	const fadeIn = usePropertyDraft({
		displayValue: formatNumberForDisplay({
			value: resolvedFadeIn,
			fractionDigits: 1,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) {
				return null;
			}

			return clamp({
				value: snapToStep({ value: parsed, step: 0.1 }),
				min: 0,
				max: 10,
			});
		},
		onPreview: (value) => {
			editor.timeline.previewElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { fadeInDuration: value },
					},
				],
			});
		},
		onCommit: () => editor.timeline.commitPreview(),
	});

	// FADE OUT PROPERTY (Static, non-keyframed)
	const resolvedFadeOut = element.fadeOutDuration ?? 0;
	const fadeOut = usePropertyDraft({
		displayValue: formatNumberForDisplay({
			value: resolvedFadeOut,
			fractionDigits: 1,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) {
				return null;
			}

			return clamp({
				value: snapToStep({ value: parsed, step: 0.1 }),
				min: 0,
				max: 10,
			});
		},
		onPreview: (value) => {
			editor.timeline.previewElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						updates: { fadeOutDuration: value },
					},
				],
			});
		},
		onCommit: () => editor.timeline.commitPreview(),
	});

	const isSeparated =
		variant === "video" &&
		element.type === "video" &&
		isSourceAudioSeparated({ element });

	return (
		<div className="flex flex-col gap-3 px-3.5 py-3">
			{isSeparated && (
				<div className="rounded-md border border-white/[0.08] bg-white/[0.03] p-3">
					<p className="text-xs text-white/80">Audio has been separated.</p>
					<Button
						className="mt-3"
						size="sm"
						variant="secondary"
						onClick={() =>
							editor.timeline.toggleSourceAudioSeparation({
								trackId,
								elementId: element.id,
							})
						}
					>
						Recover audio
					</Button>
				</div>
			)}
			{variant === "audio-element" && !isHelperHidden && (
				<div className="relative rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 pr-7 text-[0.7rem] leading-relaxed text-white/60">
					Audio for this clip. Volume, pan, and fade are local; the source video
					(if any) is unchanged.
					<button
						type="button"
						className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded text-white/40 transition hover:bg-white/10 hover:text-white/80"
						onClick={() => setIsHelperHidden(true)}
						aria-label="Dismiss helper"
					>
						×
					</button>
				</div>
			)}
			<Section
				collapsible
				defaultOpen
				sectionKey={`${element.id}:audio:${variant}`}
				className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035] shadow-inner shadow-white/[0.02]"
			>
				<SectionHeader className="h-10 px-3">
					<SectionTitle className="flex items-center gap-2 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white/80">
						<HugeiconsIcon icon={MusicNote03Icon} size={14} />
						{variant === "audio-element" ? "Audio Track" : "Audio"}
					</SectionTitle>
				</SectionHeader>
				<SectionContent className="px-3 pb-3 pt-0">
					<SectionFields className="gap-4">
						<SectionField
							label="Volume"
							beforeLabel={
								<KeyframeToggle
									isActive={volume.isKeyframedAtTime}
									isDisabled={!isPlayheadWithinElementRange}
									title="Toggle volume keyframe"
									onToggle={volume.toggleKeyframe}
								/>
							}
						>
							<NumberField
								icon={<HugeiconsIcon icon={VolumeHighIcon} />}
								value={volume.displayValue}
								onFocus={volume.onFocus}
								onChange={volume.onChange}
								onBlur={volume.onBlur}
								dragSensitivity="slow"
								scrubClamp={{ min: VOLUME_DB_MIN, max: VOLUME_DB_MAX }}
								onScrub={volume.scrubTo}
								onScrubEnd={volume.commitScrub}
								onReset={() =>
									volume.commitValue({
										value: DEFAULTS.element.volume,
									})
								}
								isDefault={isVolumeDefault}
								suffix="dB"
							/>
						</SectionField>

						<div className="h-px bg-white/[0.06]" />

						<SectionField
							label="Stereo Pan"
							beforeLabel={
								<KeyframeToggle
									isActive={pan.isKeyframedAtTime}
									isDisabled={!isPlayheadWithinElementRange}
									title="Toggle pan keyframe"
									onToggle={pan.toggleKeyframe}
								/>
							}
						>
							<NumberField
								icon={<HugeiconsIcon icon={MusicNote03Icon} />}
								value={pan.displayValue}
								onFocus={pan.onFocus}
								onChange={pan.onChange}
								onBlur={pan.onBlur}
								dragSensitivity="slow"
								scrubClamp={{ min: -100, max: 100 }}
								onScrub={pan.scrubTo}
								onScrubEnd={pan.commitScrub}
								onReset={() =>
									pan.commitValue({
										value: 0,
									})
								}
								isDefault={isPanDefault}
							/>
						</SectionField>

						<div className="h-px bg-white/[0.06]" />

						{/* Stack the fade pair vertically on narrow panels so the
						    trailing field doesn't get its number clipped. The
						    parent inspector scrolls vertically; the previous
						    `flex gap-2` here forced both fields into a single
						    row, which pushed the second field's `NumberField`
						    out of the visible width and truncated the digit. */}
						<div className="grid grid-cols-2 gap-2 min-[420px]:flex min-[420px]:gap-2">
							<SectionField label="Fade In" className="min-w-0 flex-1">
								<NumberField
									icon={<span className="text-[10px]">In</span>}
									value={fadeIn.displayValue}
									onFocus={fadeIn.onFocus}
									onChange={fadeIn.onChange}
									onBlur={fadeIn.onBlur}
									dragSensitivity="slow"
									scrubClamp={{ min: 0, max: 10 }}
									onScrub={fadeIn.scrubTo}
									onScrubEnd={fadeIn.commitScrub}
									onReset={() => {
										editor.timeline.updateElements({
											updates: [
												{
													trackId,
													elementId: element.id,
													patch: { fadeInDuration: 0 },
												},
											],
										});
									}}
									isDefault={resolvedFadeIn === 0}
									suffix="s"
									className="px-1"
								/>
							</SectionField>
							<SectionField label="Fade Out" className="min-w-0 flex-1">
								<NumberField
									icon={<span className="text-[10px]">Out</span>}
									value={fadeOut.displayValue}
									onFocus={fadeOut.onFocus}
									onChange={fadeOut.onChange}
									onBlur={fadeOut.onBlur}
									dragSensitivity="slow"
									scrubClamp={{ min: 0, max: 10 }}
									onScrub={fadeOut.scrubTo}
									onScrubEnd={fadeOut.commitScrub}
									onReset={() => {
										editor.timeline.updateElements({
											updates: [
												{
													trackId,
													elementId: element.id,
													patch: { fadeOutDuration: 0 },
												},
											],
										});
									}}
									isDefault={resolvedFadeOut === 0}
									suffix="s"
									className="px-1"
								/>
							</SectionField>
						</div>
					</SectionFields>
				</SectionContent>
			</Section>
		</div>
	);
}
