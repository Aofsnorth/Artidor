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
import { VolumeHighIcon } from "@hugeicons/core-free-icons";
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
	const sectionTitle = variant === "audio-element" ? "Audio Track" : "Audio";

	return (
		<>
			{isSeparated && (
				<div className="mx-4 mt-4 rounded-md border bg-muted/30 p-3">
					<p className="text-sm">Audio has been separated.</p>
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
			{variant === "audio-element" && (
				<div className="mx-4 mt-4 rounded-md border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-[0.7rem] leading-relaxed text-white/55">
					This is the audio track that plays back in the timeline. Volume, pan,
					and fade are local to this clip; it has no underlying video source to
					detach from.
				</div>
			)}
			<div className="pt-2" />
			<Section collapsible sectionKey={`${element.id}:audio:${variant}`}>
				<SectionHeader>
					<SectionTitle>{sectionTitle}</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
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
								icon="Pan"
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

						<div className="flex flex-col gap-2">
							<SectionField label="Fade In">
								<NumberField
									icon="In"
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
								/>
							</SectionField>
							<SectionField label="Fade Out">
								<NumberField
									icon="Out"
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
								/>
							</SectionField>
						</div>
					</SectionFields>
				</SectionContent>
			</Section>
		</>
	);
}
