"use client";

import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import type { TextElement } from "@/lib/timeline";
import { NumberField } from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { useRef } from "react";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { ColorPicker } from "@/components/ui/color-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { uppercase } from "@/utils/string";
import { clamp, formatNumberForDisplay } from "@/utils/math";
import { useEditor } from "@/hooks/use-editor";
import { CORNER_RADIUS_MAX, CORNER_RADIUS_MIN } from "@/lib/text/background";
import {
	DEFAULT_TEXT_COLOR,
	MAX_FONT_SIZE,
	MIN_FONT_SIZE,
} from "@/lib/text/typography";
import { usePropertyDraft } from "../hooks/use-property-draft";
import { useKeyframedColorProperty } from "../hooks/use-keyframed-color-property";
import { useKeyframedNumberProperty } from "../hooks/use-keyframed-number-property";
import { useElementPlayhead } from "../hooks/use-element-playhead";
import { KeyframeToggle } from "../components/keyframe-toggle";
import { isPropertyAtDefault, parseNumericInput } from "./transform-tab";
import { resolveColorAtTime, resolveNumberAtTime } from "@/lib/animation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	MinusSignIcon,
	PlusSignIcon,
	TextFontIcon,
} from "@hugeicons/core-free-icons";
import { OcTextHeightIcon, OcTextWidthIcon } from "@/components/icons";
import { DEFAULTS } from "@/lib/timeline/defaults";
import {
	DEFAULT_TEXT_ANIMATOR,
	TEXT_ANIMATOR_PRESETS,
	TEXT_ANIMATOR_UNITS,
} from "@/lib/text/animator";
import { cn } from "@/utils/ui";

export function TextTab({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	return (
		<div className="flex flex-col">
			<ContentSection element={element} trackId={trackId} />
			<StyleSection element={element} trackId={trackId} />
			<AnimateSection element={element} trackId={trackId} />
			<TypographySection element={element} trackId={trackId} />
			<SpacingSection element={element} trackId={trackId} />
			<BackgroundSection element={element} trackId={trackId} />
			<EffectsSection element={element} trackId={trackId} />
		</div>
	);
}

function StyleSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();

	type StylePatch = Partial<
		Pick<
			TextElement,
			"textAlign" | "fontWeight" | "fontStyle" | "textDecoration"
		>
	>;
	const applyPatch = ({ patch }: { patch: StylePatch }) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, patch }],
		});
	};

	const alignments: Array<{ value: TextElement["textAlign"]; label: string }> =
		[
			{ value: "left", label: "Align left" },
			{ value: "center", label: "Align center" },
			{ value: "right", label: "Align right" },
		];
	const decorations: Array<{
		value: TextElement["textDecoration"];
		label: string;
	}> = [
		{ value: "none", label: "No decoration" },
		{ value: "underline", label: "Underline" },
		{ value: "line-through", label: "Strikethrough" },
	];

	const isBold = element.fontWeight === "bold";
	const isItalic = element.fontStyle === "italic";

	return (
		<Section collapsible defaultOpen sectionKey={`${element.id}:style`}>
			<SectionHeader>
				<SectionTitle>Style</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label="Alignment">
						<div className="grid w-full grid-cols-3 gap-1 rounded-md border border-white/10 bg-white/[0.03] p-0.5">
							{alignments.map((option) => {
								const active = element.textAlign === option.value;
								return (
									<button
										key={option.value}
										type="button"
										aria-label={option.label}
										aria-pressed={active}
										onClick={() =>
											applyPatch({ patch: { textAlign: option.value } })
										}
										className={cn(
											"flex h-6 items-center justify-center rounded text-[0.66rem] font-semibold transition",
											active
												? "bg-white/[0.12] text-white shadow-sm"
												: "text-white/55 hover:bg-white/[0.06] hover:text-white",
										)}
									>
										{option.value === "left" && "←"}
										{option.value === "center" && "↔"}
										{option.value === "right" && "→"}
									</button>
								);
							})}
						</div>
					</SectionField>
					<SectionField label="Emphasis">
						<div className="flex w-full items-center gap-1">
							<button
								type="button"
								aria-label="Bold"
								aria-pressed={isBold}
								onClick={() =>
									applyPatch({
										patch: { fontWeight: isBold ? "normal" : "bold" },
									})
								}
								className={cn(
									"h-7 w-9 rounded-md border text-[0.78rem] font-bold transition",
									isBold
										? "border-white/30 bg-white/[0.12] text-white"
										: "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.08] hover:text-white",
								)}
							>
								B
							</button>
							<button
								type="button"
								aria-label="Italic"
								aria-pressed={isItalic}
								onClick={() =>
									applyPatch({
										patch: { fontStyle: isItalic ? "normal" : "italic" },
									})
								}
								className={cn(
									"h-7 w-9 rounded-md border text-[0.78rem] italic transition",
									isItalic
										? "border-white/30 bg-white/[0.12] text-white"
										: "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.08] hover:text-white",
								)}
							>
								I
							</button>
						</div>
					</SectionField>
					<SectionField label="Decoration">
						<Select
							value={element.textDecoration}
							onValueChange={(value: string) => {
								if (
									value === "none" ||
									value === "underline" ||
									value === "line-through"
								) {
									applyPatch({ patch: { textDecoration: value } });
								}
							}}
						>
							<SelectTrigger className="h-7 w-full text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{decorations.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function AnimateSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const animator = element.textAnimator;
	const preset = animator?.preset ?? "none";

	const update = (patch: Partial<TextElement>) => {
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, patch }],
		});
	};

	const onPresetChange = (value: string) => {
		if (value === "none") {
			update({ textAnimator: undefined });
			return;
		}
		const match = TEXT_ANIMATOR_PRESETS.find(
			(option) => option.value === value,
		);
		if (!match) return;
		update({
			textAnimator: {
				...(animator ?? DEFAULT_TEXT_ANIMATOR),
				preset: match.value,
			},
		});
	};

	const onUnitChange = (value: string) => {
		if (!animator || (value !== "character" && value !== "word")) return;
		update({ textAnimator: { ...animator, unit: value } });
	};

	const onNumberChange = (key: "duration" | "stagger", min: number) => {
		return (event: React.ChangeEvent<HTMLInputElement>) => {
			if (!animator) return;
			const parsed = parseFloat(event.currentTarget.value);
			if (Number.isNaN(parsed)) return;
			update({ textAnimator: { ...animator, [key]: Math.max(min, parsed) } });
		};
	};

	return (
		<Section collapsible sectionKey={`${element.id}:animate`}>
			<SectionHeader>
				<SectionTitle>Animate</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label="Preset">
						<Select value={preset} onValueChange={onPresetChange}>
							<SelectTrigger className="h-7 w-full text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								{TEXT_ANIMATOR_PRESETS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</SectionField>
					{animator && (
						<>
							<SectionField label="Unit">
								<Select value={animator.unit} onValueChange={onUnitChange}>
									<SelectTrigger className="h-7 w-full text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{TEXT_ANIMATOR_UNITS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</SectionField>
							<div className="grid min-w-0 grid-cols-2 gap-2">
								<SectionField
									label={animator.preset === "wave" ? "Cycle" : "Speed"}
									className="min-w-0"
								>
									<NumberField
										value={formatNumberForDisplay({
											value: animator.duration,
											fractionDigits: 2,
										})}
										min={0.05}
										max={10}
										step={0.05}
										suffix="s"
										onChange={onNumberChange("duration", 0.05)}
									/>
								</SectionField>
								<SectionField label="Stagger" className="min-w-0">
									<NumberField
										value={formatNumberForDisplay({
											value: animator.stagger,
											fractionDigits: 2,
										})}
										min={0}
										max={2}
										step={0.01}
										suffix="s"
										onChange={onNumberChange("stagger", 0)}
									/>
								</SectionField>
							</div>
						</>
					)}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function ContentSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();

	const content = usePropertyDraft({
		displayValue: element.content,
		parse: (input) => input,
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { content: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	return (
		<Section collapsible sectionKey={`${element.id}:content`}>
			<SectionHeader>
				<SectionTitle>Content</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<Textarea
					placeholder="Name"
					value={content.displayValue}
					className="min-h-20"
					onFocus={content.onFocus}
					onChange={content.onChange}
					onBlur={content.onBlur}
				/>
			</SectionContent>
		</Section>
	);
}

function TypographySection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const resolvedTextColor = resolveColorAtTime({
		baseColor: element.color,
		animations: element.animations,
		propertyPath: "color",
		localTime,
	});

	const textColor = useKeyframedColorProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "color",
		localTime,
		isPlayheadWithinElementRange,
		resolvedColor: resolvedTextColor,
		buildBaseUpdates: ({ value }) => ({ color: value }),
	});

	const fontSize = usePropertyDraft({
		displayValue: element.fontSize.toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return clamp({
				value: Math.round(parsed),
				min: MIN_FONT_SIZE,
				max: MAX_FONT_SIZE,
			});
		},
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { fontSize: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	return (
		<Section collapsible sectionKey={`${element.id}:typography`}>
			<SectionHeader>
				<SectionTitle>Typography</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<SectionFields>
					<SectionField label="Font">
						<FontPicker
							defaultValue={element.fontFamily}
							onValueChange={(value) =>
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											patch: { fontFamily: value },
										},
									],
								})
							}
						/>
					</SectionField>
					<SectionField label="Size">
						<NumberField
							value={fontSize.displayValue}
							min={MIN_FONT_SIZE}
							max={MAX_FONT_SIZE}
							onFocus={fontSize.onFocus}
							onChange={fontSize.onChange}
							onBlur={fontSize.onBlur}
							onScrub={fontSize.scrubTo}
							onScrubEnd={fontSize.commitScrub}
							onReset={() =>
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											patch: {
												fontSize: DEFAULTS.text.element.fontSize,
											},
										},
									],
								})
							}
							isDefault={element.fontSize === DEFAULTS.text.element.fontSize}
							icon={<HugeiconsIcon icon={TextFontIcon} />}
						/>
					</SectionField>
					<SectionField
						label="Color"
						beforeLabel={
							<KeyframeToggle
								isActive={textColor.isKeyframedAtTime}
								isDisabled={!isPlayheadWithinElementRange}
								title="Toggle text color keyframe"
								onToggle={textColor.toggleKeyframe}
							/>
						}
					>
						<ColorPicker
							value={uppercase({
								string: resolvedTextColor.replace("#", ""),
							})}
							onChange={(color) => textColor.onChange({ color: `#${color}` })}
							onChangeEnd={textColor.onChangeEnd}
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function SpacingSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();

	const letterSpacing = usePropertyDraft({
		displayValue: Math.round(
			element.letterSpacing ?? DEFAULTS.text.letterSpacing,
		).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			return Number.isNaN(parsed) ? null : Math.round(parsed);
		},
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { letterSpacing: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	const lineHeight = usePropertyDraft({
		displayValue: formatNumberForDisplay({
			value: element.lineHeight ?? DEFAULTS.text.lineHeight,
			fractionDigits: 1,
		}),
		parse: (input) => {
			const parsed = parseFloat(input);
			return Number.isNaN(parsed)
				? null
				: Math.max(0.1, Math.round(parsed * 10) / 10);
		},
		onPreview: (value) =>
			editor.timeline.previewElements({
				updates: [
					{ trackId, elementId: element.id, updates: { lineHeight: value } },
				],
			}),
		onCommit: () => editor.timeline.commitPreview(),
	});

	return (
		<Section collapsible sectionKey={`${element.id}:spacing`}>
			<SectionHeader>
				<SectionTitle>Spacing</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex items-start gap-2">
					<SectionField label="Letter spacing" className="w-1/2">
						<NumberField
							value={letterSpacing.displayValue}
							onFocus={letterSpacing.onFocus}
							onChange={letterSpacing.onChange}
							onBlur={letterSpacing.onBlur}
							onScrub={letterSpacing.scrubTo}
							onScrubEnd={letterSpacing.commitScrub}
							onReset={() =>
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											patch: { letterSpacing: DEFAULTS.text.letterSpacing },
										},
									],
								})
							}
							isDefault={
								(element.letterSpacing ?? DEFAULTS.text.letterSpacing) ===
								DEFAULTS.text.letterSpacing
							}
							icon={<OcTextWidthIcon size={14} />}
						/>
					</SectionField>
					<SectionField label="Line height" className="w-1/2">
						<NumberField
							value={lineHeight.displayValue}
							onFocus={lineHeight.onFocus}
							onChange={lineHeight.onChange}
							onBlur={lineHeight.onBlur}
							onScrub={lineHeight.scrubTo}
							onScrubEnd={lineHeight.commitScrub}
							onReset={() =>
								editor.timeline.updateElements({
									updates: [
										{
											trackId,
											elementId: element.id,
											patch: { lineHeight: DEFAULTS.text.lineHeight },
										},
									],
								})
							}
							isDefault={
								(element.lineHeight ?? DEFAULTS.text.lineHeight) ===
								DEFAULTS.text.lineHeight
							}
							icon={<OcTextHeightIcon size={14} />}
						/>
					</SectionField>
				</div>
			</SectionContent>
		</Section>
	);
}

function BackgroundSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const lastSelectedColor = useRef(DEFAULT_TEXT_COLOR);
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const resolvedBgColor = resolveColorAtTime({
		baseColor: element.background.color,
		animations: element.animations,
		propertyPath: "background.color",
		localTime,
	});

	const bgColor = useKeyframedColorProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "background.color",
		localTime,
		isPlayheadWithinElementRange,
		resolvedColor: resolvedBgColor,
		buildBaseUpdates: ({ value }) => ({
			background: { ...element.background, color: value },
		}),
	});

	const bg = element.background;

	const resolvedPaddingX = resolveNumberAtTime({
		baseValue: bg.paddingX ?? DEFAULTS.text.background.paddingX,
		animations: element.animations,
		propertyPath: "background.paddingX",
		localTime,
	});
	const resolvedPaddingY = resolveNumberAtTime({
		baseValue: bg.paddingY ?? DEFAULTS.text.background.paddingY,
		animations: element.animations,
		propertyPath: "background.paddingY",
		localTime,
	});
	const resolvedOffsetX = resolveNumberAtTime({
		baseValue: bg.offsetX ?? DEFAULTS.text.background.offsetX,
		animations: element.animations,
		propertyPath: "background.offsetX",
		localTime,
	});
	const resolvedOffsetY = resolveNumberAtTime({
		baseValue: bg.offsetY ?? DEFAULTS.text.background.offsetY,
		animations: element.animations,
		propertyPath: "background.offsetY",
		localTime,
	});
	const resolvedCornerRadius = resolveNumberAtTime({
		baseValue: bg.cornerRadius ?? CORNER_RADIUS_MIN,
		animations: element.animations,
		propertyPath: "background.cornerRadius",
		localTime,
	});

	const paddingX = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "background.paddingX",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedPaddingX).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			return Number.isNaN(parsed) ? null : Math.max(0, Math.round(parsed));
		},
		valueAtPlayhead: resolvedPaddingX,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			background: { ...bg, paddingX: value },
		}),
	});

	const paddingY = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "background.paddingY",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedPaddingY).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			return Number.isNaN(parsed) ? null : Math.max(0, Math.round(parsed));
		},
		valueAtPlayhead: resolvedPaddingY,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			background: { ...bg, paddingY: value },
		}),
	});

	const offsetX = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "background.offsetX",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedOffsetX).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			return Number.isNaN(parsed) ? null : Math.round(parsed);
		},
		valueAtPlayhead: resolvedOffsetX,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			background: { ...bg, offsetX: value },
		}),
	});

	const offsetY = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "background.offsetY",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedOffsetY).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			return Number.isNaN(parsed) ? null : Math.round(parsed);
		},
		valueAtPlayhead: resolvedOffsetY,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			background: { ...bg, offsetY: value },
		}),
	});

	const cornerRadius = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "background.cornerRadius",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedCornerRadius).toString(),
		parse: (input) => {
			const parsed = parseFloat(input);
			if (Number.isNaN(parsed)) return null;
			return clamp({
				value: Math.round(parsed),
				min: CORNER_RADIUS_MIN,
				max: CORNER_RADIUS_MAX,
			});
		},
		valueAtPlayhead: resolvedCornerRadius,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			background: { ...bg, cornerRadius: value },
		}),
	});

	const toggleBackgroundEnabled = () => {
		const enabled = !element.background.enabled;
		const color =
			enabled && element.background.color === "transparent"
				? lastSelectedColor.current
				: element.background.color;
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						background: {
							...element.background,
							enabled,
							color,
						},
					},
				},
			],
		});
	};

	return (
		<Section
			collapsible
			defaultOpen={element.background.enabled}
			sectionKey={`${element.id}:background`}
		>
			<SectionHeader
				trailing={
					<Button
						variant="ghost"
						size="icon"
						onClick={(event) => {
							event.stopPropagation();
							toggleBackgroundEnabled();
						}}
					>
						<HugeiconsIcon
							icon={element.background.enabled ? MinusSignIcon : PlusSignIcon}
							strokeWidth={1}
						/>
					</Button>
				}
			>
				<SectionTitle>Background</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(
					!element.background.enabled && "pointer-events-none opacity-50",
				)}
			>
				<SectionFields>
					<SectionField
						label="Color"
						beforeLabel={
							<KeyframeToggle
								isActive={bgColor.isKeyframedAtTime}
								isDisabled={!isPlayheadWithinElementRange}
								title="Toggle background color keyframe"
								onToggle={bgColor.toggleKeyframe}
							/>
						}
					>
						<ColorPicker
							value={
								!element.background.enabled ||
								element.background.color === "transparent"
									? lastSelectedColor.current.replace("#", "")
									: resolvedBgColor.replace("#", "")
							}
							onChange={(color) => {
								const hexColor = `#${color}`;
								if (color !== "transparent") {
									lastSelectedColor.current = hexColor;
								}
								bgColor.onChange({ color: hexColor });
							}}
							onChangeEnd={bgColor.onChangeEnd}
						/>
					</SectionField>
					<div className="flex items-start gap-2">
						<SectionField
							label="Width"
							className="w-1/2"
							beforeLabel={
								<KeyframeToggle
									isActive={paddingX.isKeyframedAtTime}
									isDisabled={!isPlayheadWithinElementRange}
									title="Toggle background width keyframe"
									onToggle={paddingX.toggleKeyframe}
								/>
							}
						>
							<NumberField
								icon="W"
								value={paddingX.displayValue}
								min={0}
								onFocus={paddingX.onFocus}
								onChange={paddingX.onChange}
								onBlur={paddingX.onBlur}
								onScrub={paddingX.scrubTo}
								onScrubEnd={paddingX.commitScrub}
								onReset={() =>
									paddingX.commitValue({
										value: DEFAULTS.text.background.paddingX,
									})
								}
								isDefault={isPropertyAtDefault({
									hasAnimatedKeyframes: paddingX.hasAnimatedKeyframes,
									isPlayheadWithinElementRange,
									resolvedValue: resolvedPaddingX,
									staticValue: bg.paddingX ?? DEFAULTS.text.background.paddingX,
									defaultValue: DEFAULTS.text.background.paddingX,
								})}
							/>
						</SectionField>
						<SectionField
							label="Height"
							className="w-1/2"
							beforeLabel={
								<KeyframeToggle
									isActive={paddingY.isKeyframedAtTime}
									isDisabled={!isPlayheadWithinElementRange}
									title="Toggle background height keyframe"
									onToggle={paddingY.toggleKeyframe}
								/>
							}
						>
							<NumberField
								icon="H"
								value={paddingY.displayValue}
								min={0}
								onFocus={paddingY.onFocus}
								onChange={paddingY.onChange}
								onBlur={paddingY.onBlur}
								onScrub={paddingY.scrubTo}
								onScrubEnd={paddingY.commitScrub}
								onReset={() =>
									paddingY.commitValue({
										value: DEFAULTS.text.background.paddingY,
									})
								}
								isDefault={isPropertyAtDefault({
									hasAnimatedKeyframes: paddingY.hasAnimatedKeyframes,
									isPlayheadWithinElementRange,
									resolvedValue: resolvedPaddingY,
									staticValue: bg.paddingY ?? DEFAULTS.text.background.paddingY,
									defaultValue: DEFAULTS.text.background.paddingY,
								})}
							/>
						</SectionField>
					</div>
					<div className="flex items-start gap-2">
						<SectionField
							label="X-offset"
							className="w-1/2"
							beforeLabel={
								<KeyframeToggle
									isActive={offsetX.isKeyframedAtTime}
									isDisabled={!isPlayheadWithinElementRange}
									title="Toggle x-offset keyframe"
									onToggle={offsetX.toggleKeyframe}
								/>
							}
						>
							<NumberField
								icon="X"
								value={offsetX.displayValue}
								onFocus={offsetX.onFocus}
								onChange={offsetX.onChange}
								onBlur={offsetX.onBlur}
								onScrub={offsetX.scrubTo}
								onScrubEnd={offsetX.commitScrub}
								onReset={() =>
									offsetX.commitValue({
										value: DEFAULTS.text.background.offsetX,
									})
								}
								isDefault={isPropertyAtDefault({
									hasAnimatedKeyframes: offsetX.hasAnimatedKeyframes,
									isPlayheadWithinElementRange,
									resolvedValue: resolvedOffsetX,
									staticValue: bg.offsetX ?? DEFAULTS.text.background.offsetX,
									defaultValue: DEFAULTS.text.background.offsetX,
								})}
							/>
						</SectionField>
						<SectionField
							label="Y-offset"
							className="w-1/2"
							beforeLabel={
								<KeyframeToggle
									isActive={offsetY.isKeyframedAtTime}
									isDisabled={!isPlayheadWithinElementRange}
									title="Toggle y-offset keyframe"
									onToggle={offsetY.toggleKeyframe}
								/>
							}
						>
							<NumberField
								icon="Y"
								value={offsetY.displayValue}
								onFocus={offsetY.onFocus}
								onChange={offsetY.onChange}
								onBlur={offsetY.onBlur}
								onScrub={offsetY.scrubTo}
								onScrubEnd={offsetY.commitScrub}
								onReset={() =>
									offsetY.commitValue({
										value: DEFAULTS.text.background.offsetY,
									})
								}
								isDefault={isPropertyAtDefault({
									hasAnimatedKeyframes: offsetY.hasAnimatedKeyframes,
									isPlayheadWithinElementRange,
									resolvedValue: resolvedOffsetY,
									staticValue: bg.offsetY ?? DEFAULTS.text.background.offsetY,
									defaultValue: DEFAULTS.text.background.offsetY,
								})}
							/>
						</SectionField>
					</div>
					<SectionField
						label="Corner radius"
						beforeLabel={
							<KeyframeToggle
								isActive={cornerRadius.isKeyframedAtTime}
								isDisabled={!isPlayheadWithinElementRange}
								title="Toggle corner radius keyframe"
								onToggle={cornerRadius.toggleKeyframe}
							/>
						}
					>
						<NumberField
							icon="R"
							value={cornerRadius.displayValue}
							min={CORNER_RADIUS_MIN}
							max={CORNER_RADIUS_MAX}
							onFocus={cornerRadius.onFocus}
							onChange={cornerRadius.onChange}
							onBlur={cornerRadius.onBlur}
							onScrub={cornerRadius.scrubTo}
							onScrubEnd={cornerRadius.commitScrub}
							onReset={() =>
								cornerRadius.commitValue({ value: CORNER_RADIUS_MIN })
							}
							isDefault={isPropertyAtDefault({
								hasAnimatedKeyframes: cornerRadius.hasAnimatedKeyframes,
								isPlayheadWithinElementRange,
								resolvedValue: resolvedCornerRadius,
								staticValue: bg.cornerRadius ?? CORNER_RADIUS_MIN,
								defaultValue: CORNER_RADIUS_MIN,
							})}
						/>
					</SectionField>
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function EffectsSection({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const editor = useEditor();
	const stroke = element.stroke ?? {
		enabled: false,
		color: "#000000",
		width: 2,
	};
	const shadow = element.shadow ?? {
		enabled: false,
		color: "#000000",
		blur: 4,
		offsetX: 2,
		offsetY: 2,
	};

	return (
		<Section collapsible sectionKey={`${element.id}:effects`}>
			<SectionHeader>
				<SectionTitle>Effects</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Stroke</span>
							<Switch
								checked={stroke.enabled}
								onCheckedChange={(enabled) =>
									editor.timeline.updateElements({
										updates: [
											{
												trackId,
												elementId: element.id,
												patch: { stroke: { ...stroke, enabled } },
											},
										],
									})
								}
							/>
						</div>
						{stroke.enabled && (
							<div className="flex flex-col gap-2 pl-1">
								<div className="flex items-center gap-2">
									<ColorPicker
										value={uppercase({
											string: stroke.color.replace("#", ""),
										})}
										onChange={(color) =>
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														patch: {
															stroke: { ...stroke, color: `#${color}` },
														},
													},
												],
											})
										}
									/>
									<NumberField
										value={stroke.width.toString()}
										min={0}
										max={50}
										onChange={(event) => {
											const parsed = parseNumericInput({
												input: event.currentTarget.value,
											});
											if (parsed === null) return;
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														patch: { stroke: { ...stroke, width: parsed } },
													},
												],
											});
										}}
										className="w-20"
									/>
								</div>
							</div>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Shadow</span>
							<Switch
								checked={shadow.enabled}
								onCheckedChange={(enabled) =>
									editor.timeline.updateElements({
										updates: [
											{
												trackId,
												elementId: element.id,
												patch: { shadow: { ...shadow, enabled } },
											},
										],
									})
								}
							/>
						</div>
						{shadow.enabled && (
							<div className="flex flex-col gap-2 pl-1">
								<ColorPicker
									value={uppercase({ string: shadow.color.replace("#", "") })}
									onChange={(color) =>
										editor.timeline.updateElements({
											updates: [
												{
													trackId,
													elementId: element.id,
													patch: { shadow: { ...shadow, color: `#${color}` } },
												},
											],
										})
									}
								/>
								<div className="flex items-center gap-2">
									<NumberField
										value={shadow.blur.toString()}
										min={0}
										max={50}
										onChange={(event) => {
											const parsed = parseNumericInput({
												input: event.currentTarget.value,
											});
											if (parsed === null) return;
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														patch: { shadow: { ...shadow, blur: parsed } },
													},
												],
											});
										}}
									/>
									<NumberField
										value={shadow.offsetX.toString()}
										min={-50}
										max={50}
										onChange={(event) => {
											const parsed = parseNumericInput({
												input: event.currentTarget.value,
											});
											if (parsed === null) return;
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														patch: { shadow: { ...shadow, offsetX: parsed } },
													},
												],
											});
										}}
									/>
									<NumberField
										value={shadow.offsetY.toString()}
										min={-50}
										max={50}
										onChange={(event) => {
											const parsed = parseNumericInput({
												input: event.currentTarget.value,
											});
											if (parsed === null) return;
											editor.timeline.updateElements({
												updates: [
													{
														trackId,
														elementId: element.id,
														patch: { shadow: { ...shadow, offsetY: parsed } },
													},
												],
											});
										}}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</SectionContent>
		</Section>
	);
}
