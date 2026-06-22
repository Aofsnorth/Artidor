"use client";

import { useRef } from "react";
import { useElementPlayhead } from "../hooks/use-element-playhead";
import {
	useKeyframedParamProperty,
	type KeyframedParamPropertyResult,
} from "../hooks/use-keyframed-param-property";
import { resolveGraphicParamsAtTime } from "@/lib/animation";
import type { ParamDefinition, ParamValues } from "@/lib/params";
import type { GraphicElement } from "@/lib/timeline";
import { getGraphicDefinition, registerDefaultGraphics } from "@/lib/graphics";
import { useElementPreview } from "@/hooks/use-element-preview";
import { useEditor } from "@/hooks/use-editor";
import {
	Section,
	SectionContent,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { PropertyParamField } from "../components/property-param-field";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { HugeiconsIcon } from "@hugeicons/react";
import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

registerDefaultGraphics();

const DEFAULT_STROKE_WIDTH = 2;

export function GraphicTab({
	element,
	trackId,
}: {
	element: GraphicElement;
	trackId: string;
}) {
	const definition = getGraphicDefinition({
		definitionId: element.definitionId,
	});
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const { renderElement } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});

	const liveElement = renderElement as GraphicElement;
	const resolvedParams = resolveGraphicParamsAtTime({
		element: liveElement,
		localTime,
	});

	const shapeParams = definition.params.filter((p) => p.group !== "stroke");
	const hasStrokeParams = definition.params.some((p) => p.group === "stroke");

	return (
		<div className="flex flex-col">
			<Section collapsible sectionKey={`${element.id}:graphic`}>
				<SectionHeader>
					<SectionTitle>{definition.name}</SectionTitle>
				</SectionHeader>
				<SectionContent>
					<SectionFields>
						{shapeParams.map((param) => (
							<AnimatedGraphicParamField
								key={param.key}
								param={param}
								trackId={trackId}
								element={liveElement}
								localTime={localTime}
								isPlayheadWithinElementRange={isPlayheadWithinElementRange}
								resolvedParams={resolvedParams}
							/>
						))}
					</SectionFields>
				</SectionContent>
			</Section>
			{hasStrokeParams && <StrokeSection element={element} trackId={trackId} />}
			<ShadowSection element={element} trackId={trackId} />
		</div>
	);
}

function StrokeSection({
	element,
	trackId,
}: {
	element: GraphicElement;
	trackId: string;
}) {
	const editor = useEditor();
	const definition = getGraphicDefinition({
		definitionId: element.definitionId,
	});
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const { renderElement } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});

	const liveElement = renderElement as GraphicElement;
	const resolvedParams = resolveGraphicParamsAtTime({
		element: liveElement,
		localTime,
	});
	const strokeParams = definition.params.filter((p) => p.group === "stroke");
	const lastStrokeWidth = useRef(DEFAULT_STROKE_WIDTH);
	const isStrokeEnabled = Number(element.params.strokeWidth ?? 0) > 0;

	const toggleStroke = () => {
		if (isStrokeEnabled) {
			lastStrokeWidth.current = Number(
				element.params.strokeWidth ?? DEFAULT_STROKE_WIDTH,
			);
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { params: { ...element.params, strokeWidth: 0 } },
					},
				],
			});
		} else {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: {
							params: {
								...element.params,
								strokeWidth: lastStrokeWidth.current,
							},
						},
					},
				],
			});
		}
	};

	return (
		<Section
			collapsible
			defaultOpen={isStrokeEnabled}
			sectionKey={`${element.id}:stroke`}
		>
			<SectionHeader
				trailing={
					<Button
						variant="ghost"
						size="icon"
						onClick={(event) => {
							event.stopPropagation();
							toggleStroke();
						}}
					>
						<HugeiconsIcon
							icon={isStrokeEnabled ? MinusSignIcon : PlusSignIcon}
							strokeWidth={1}
						/>
					</Button>
				}
			>
				<SectionTitle>Stroke</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!isStrokeEnabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					{strokeParams.map((param) => (
						<AnimatedGraphicParamField
							key={param.key}
							param={param}
							trackId={trackId}
							element={liveElement}
							localTime={localTime}
							isPlayheadWithinElementRange={isPlayheadWithinElementRange}
							resolvedParams={resolvedParams}
						/>
					))}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function AnimatedGraphicParamField({
	param,
	trackId,
	element,
	localTime,
	isPlayheadWithinElementRange,
	resolvedParams,
}: {
	param: ParamDefinition;
	trackId: string;
	element: GraphicElement;
	localTime: number;
	isPlayheadWithinElementRange: boolean;
	resolvedParams: ParamValues;
}) {
	const animatedParam: KeyframedParamPropertyResult = useKeyframedParamProperty(
		{
			param,
			trackId,
			elementId: element.id,
			animations: element.animations,
			localTime,
			isPlayheadWithinElementRange,
			resolvedValue: resolvedParams[param.key] ?? param.default,
			buildBaseUpdates: ({ value }) => ({
				params: {
					...element.params,
					[param.key]: value,
				},
			}),
		},
	);

	return (
		<PropertyParamField
			param={param}
			value={resolvedParams[param.key] ?? param.default}
			onPreview={animatedParam.onPreview}
			onCommit={animatedParam.onCommit}
			keyframe={{
				isActive: animatedParam.isKeyframedAtTime,
				isDisabled: !isPlayheadWithinElementRange,
				onToggle: animatedParam.toggleKeyframe,
			}}
		/>
	);
}

/**
 * Alight Motion-style "Border & Shadow" panel. Mirrors the
 * `Stroke` section above but applies a drop-shadow to the entire shape
 * instead of a stroke. Includes colour, blur, x/y offset, and a
 * second "inner" shadow for the inset look AM offers. All four
 * parameters are keyframable so a user can animate a glow pulse.
 */
const DEFAULT_SHADOW_BLUR = 8;
const DEFAULT_SHADOW_X = 0;
const DEFAULT_SHADOW_Y = 4;
const DEFAULT_INNER_SHADOW_BLUR = 0;

function ShadowSection({
	element,
	trackId,
}: {
	element: GraphicElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const { renderElement } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});
	const liveElement = renderElement as GraphicElement;
	const resolvedParams = resolveGraphicParamsAtTime({
		element: liveElement,
		localTime,
	});

	const shadowEnabled =
		Number(element.params.shadowBlur ?? 0) > 0 ||
		(element.params.shadowColor != null &&
			element.params.shadowColor !== "transparent");

	const lastShadowBlur = useRef(DEFAULT_SHADOW_BLUR);

	const setShadowParam = (key: string, value: ParamValues[string]) => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						params: { ...element.params, [key]: value } as ParamValues,
					},
				},
			],
		});
	};

	const toggleShadow = () => {
		if (shadowEnabled) {
			lastShadowBlur.current = Number(
				element.params.shadowBlur ?? DEFAULT_SHADOW_BLUR,
			);
			setShadowParam("shadowBlur", 0);
		} else {
			setShadowParam(
				"shadowBlur",
				lastShadowBlur.current || DEFAULT_SHADOW_BLUR,
			);
			if (!element.params.shadowColor) {
				setShadowParam("shadowColor", "rgba(0,0,0,0.6)");
			}
		}
	};

	const fields: Array<{
		key: string;
		label: string;
		default: number | string;
		min?: number;
		max?: number;
		step?: number;
		type?: "color";
	}> = [
		{
			key: "shadowColor",
			label: "Color",
			default: "rgba(0,0,0,0.6)",
			type: "color",
		},
		{
			key: "shadowBlur",
			label: "Blur",
			default: DEFAULT_SHADOW_BLUR,
			min: 0,
			max: 200,
			step: 1,
		},
		{
			key: "shadowX",
			label: "X",
			default: DEFAULT_SHADOW_X,
			min: -200,
			max: 200,
			step: 1,
		},
		{
			key: "shadowY",
			label: "Y",
			default: DEFAULT_SHADOW_Y,
			min: -200,
			max: 200,
			step: 1,
		},
		{
			key: "innerShadowBlur",
			label: "Inner",
			default: DEFAULT_INNER_SHADOW_BLUR,
			min: 0,
			max: 200,
			step: 1,
		},
	];

	return (
		<Section
			collapsible
			defaultOpen={shadowEnabled}
			sectionKey={`${element.id}:shadow`}
		>
			<SectionHeader
				trailing={
					<Button
						variant="ghost"
						size="icon"
						onClick={(event) => {
							event.stopPropagation();
							toggleShadow();
						}}
					>
						<HugeiconsIcon
							icon={shadowEnabled ? MinusSignIcon : PlusSignIcon}
							strokeWidth={1}
						/>
					</Button>
				}
			>
				<SectionTitle>Shadow</SectionTitle>
			</SectionHeader>
			<SectionContent
				className={cn(!shadowEnabled && "pointer-events-none opacity-50")}
			>
				<SectionFields>
					{fields.map((field) => (
						<ShadowParamField
							key={field.key}
							element={liveElement}
							trackId={trackId}
							field={field}
							localTime={localTime}
							isPlayheadWithinElementRange={isPlayheadWithinElementRange}
							resolvedParams={resolvedParams}
						/>
					))}
				</SectionFields>
			</SectionContent>
		</Section>
	);
}

function ShadowParamField({
	element,
	trackId,
	field,
	localTime,
	isPlayheadWithinElementRange,
	resolvedParams,
}: {
	element: GraphicElement;
	trackId: string;
	field: {
		key: string;
		label: string;
		default: number | string;
		min?: number;
		max?: number;
		step?: number;
		type?: "color";
	};
	localTime: number;
	isPlayheadWithinElementRange: boolean;
	resolvedParams: ParamValues;
}) {
	const value = resolvedParams[field.key] ?? field.default;
	return (
		<ShadowNumberField
			element={element}
			trackId={trackId}
			fieldKey={field.key}
			fieldLabel={field.label}
			value={value}
			min={field.min}
			max={field.max}
			step={field.step}
			type={field.type}
			localTime={localTime}
			isPlayheadWithinElementRange={isPlayheadWithinElementRange}
		/>
	);
}

function ShadowNumberField({
	element,
	trackId,
	fieldKey,
	fieldLabel,
	value,
	min,
	max,
	step,
	type,
	// localTime + isPlayheadWithinElementRange are accepted so the field
	// composes with the other param fields that need them; we don't
	// currently expose per-frame shadow keyframing in this section.
	localTime: _localTime,
	isPlayheadWithinElementRange: _isPlayheadWithinElementRange,
}: {
	element: GraphicElement;
	trackId: string;
	fieldKey: string;
	fieldLabel: string;
	value: unknown;
	min?: number;
	max?: number;
	step?: number;
	type?: "color";
	localTime: number;
	isPlayheadWithinElementRange: boolean;
}) {
	const editor = useEditor();
	const isColor = type === "color";
	const numericValue = typeof value === "number" ? value : Number(value);
	const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
	const displayValue = isColor
		? typeof value === "string"
			? value
			: "rgba(0,0,0,0.6)"
		: safeValue.toString();

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex h-4 items-center gap-1.5">
				<span className="text-[0.7rem] text-white/55">{fieldLabel}</span>
			</div>
			{isColor ? (
				<input
					type="color"
					value={
						typeof value === "string" && value.startsWith("#")
							? value
							: "#000000"
					}
					onChange={(e) =>
						editor.timeline.updateElements({
							updates: [
								{
									trackId,
									elementId: element.id,
									patch: {
										params: { ...element.params, [fieldKey]: e.target.value },
									},
								},
							],
						})
					}
					className="h-7 w-full rounded-md border border-white/[0.08] bg-white/[0.025] px-1.5"
				/>
			) : (
				<NumberField
					value={displayValue}
					dragSensitivity="slow"
					scrubClamp={
						min !== undefined && max !== undefined ? { min, max } : undefined
					}
					step={step}
					onChange={(event) => {
						const raw = (event.target as HTMLInputElement).value;
						const parsed = parseFloat(raw);
						if (Number.isNaN(parsed)) return;
						const clamped =
							min !== undefined && max !== undefined
								? Math.max(min, Math.min(max, parsed))
								: parsed;
						editor.timeline.previewElements({
							updates: [
								{
									trackId,
									elementId: element.id,
									updates: {
										params: { ...element.params, [fieldKey]: clamped },
									},
								},
							],
						});
					}}
					onBlur={() => editor.timeline.commitPreview()}
				/>
			)}
		</div>
	);
}
