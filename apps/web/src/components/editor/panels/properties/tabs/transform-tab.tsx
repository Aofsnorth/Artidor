import { NumberField } from "@/components/ui/number-field";
import { useEditor } from "@/hooks/use-editor";
import { clamp, isNearlyEqual } from "@/utils/math";
import type { VisualElement } from "@/lib/timeline";
import {
	Section,
	SectionContent,
	SectionField,
	SectionFields,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowExpandIcon,
	Link05Icon,
	RotateClockwiseIcon,
} from "@hugeicons/core-free-icons";
import {
	getGroupKeyframesAtTime,
	hasGroupKeyframeAtTime,
	resolveTransformAtTime,
} from "@/lib/animation";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { resolvePivot } from "@/lib/rendering";
import { useElementPlayhead } from "../hooks/use-element-playhead";
import { KeyframeToggle } from "../components/keyframe-toggle";
import { useKeyframedNumberProperty } from "../hooks/use-keyframed-number-property";
import { usePropertiesStore } from "../stores/properties-store";
import { BlendingTab } from "./blending-tab";

export function parseNumericInput({ input }: { input: string }): number | null {
	const parsed = parseFloat(input);
	return Number.isNaN(parsed) ? null : parsed;
}

export function isPropertyAtDefault({
	hasAnimatedKeyframes,
	isPlayheadWithinElementRange,
	resolvedValue,
	staticValue,
	defaultValue,
}: {
	hasAnimatedKeyframes: boolean;
	isPlayheadWithinElementRange: boolean;
	resolvedValue: number;
	staticValue: number;
	defaultValue: number;
}): boolean {
	if (hasAnimatedKeyframes && isPlayheadWithinElementRange) {
		return isNearlyEqual({
			leftValue: resolvedValue,
			rightValue: defaultValue,
		});
	}

	return staticValue === defaultValue;
}

export function TransformTab({
	element,
	trackId,
}: {
	element: VisualElement;
	trackId: string;
}) {
	const editor = useEditor();
	const isScaleLocked = usePropertiesStore((s) => s.isTransformScaleLocked);
	const setTransformScaleLocked = usePropertiesStore(
		(s) => s.setTransformScaleLocked,
	);
	const { localTime, isPlayheadWithinElementRange } = useElementPlayhead({
		startTime: element.startTime,
		duration: element.duration,
	});
	const resolvedTransform = resolveTransformAtTime({
		baseTransform: element.transform,
		animations: element.animations,
		localTime,
	});

	const positionX = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.positionX",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.position.x).toString(),
		parse: (input) => parseNumericInput({ input }),
		valueAtPlayhead: resolvedTransform.position.x,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				position: { ...element.transform.position, x: value },
			},
		}),
	});

	const positionY = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.positionY",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.position.y).toString(),
		parse: (input) => parseNumericInput({ input }),
		valueAtPlayhead: resolvedTransform.position.y,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				position: { ...element.transform.position, y: value },
			},
		}),
	});

	const positionZ = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.positionZ",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.positionZ ?? 0).toString(),
		parse: (input) => parseNumericInput({ input }),
		valueAtPlayhead: resolvedTransform.positionZ ?? 0,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				positionZ: value,
			},
		}),
	});

	const parseScale = (input: string) => {
		const parsed = parseNumericInput({ input });
		if (parsed === null) return null;
		return parsed / 100;
	};

	const scaleX = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.scaleX",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.scaleX * 100).toString(),
		parse: parseScale,
		valueAtPlayhead: resolvedTransform.scaleX,
		step: 0.01,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				scaleX: value,
				...(isScaleLocked ? { scaleY: value } : {}),
			},
		}),
		buildAdditionalKeyframes: isScaleLocked
			? ({ value }) => [{ propertyPath: "transform.scaleY", value }]
			: undefined,
	});

	const scaleY = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.scaleY",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.scaleY * 100).toString(),
		parse: parseScale,
		valueAtPlayhead: resolvedTransform.scaleY,
		step: 0.01,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				scaleY: value,
				...(isScaleLocked ? { scaleX: value } : {}),
			},
		}),
		buildAdditionalKeyframes: isScaleLocked
			? ({ value }) => [{ propertyPath: "transform.scaleX", value }]
			: undefined,
	});

	const scaleFieldPropsX = {
		value: scaleX.displayValue,
		onFocus: scaleX.onFocus,
		onChange: scaleX.onChange,
		onBlur: scaleX.onBlur,
		dragSensitivity: "slow" as const,
		onScrub: scaleX.scrubTo,
		onScrubEnd: scaleX.commitScrub,
		onReset: () =>
			scaleX.commitValue({ value: DEFAULTS.element.transform.scaleX }),
		isDefault: isPropertyAtDefault({
			hasAnimatedKeyframes: scaleX.hasAnimatedKeyframes,
			isPlayheadWithinElementRange,
			resolvedValue: resolvedTransform.scaleX,
			staticValue: element.transform.scaleX,
			defaultValue: DEFAULTS.element.transform.scaleX,
		}),
	};

	const scaleFieldPropsY = {
		value: scaleY.displayValue,
		onFocus: scaleY.onFocus,
		onChange: scaleY.onChange,
		onBlur: scaleY.onBlur,
		dragSensitivity: "slow" as const,
		onScrub: scaleY.scrubTo,
		onScrubEnd: scaleY.commitScrub,
		onReset: () =>
			scaleY.commitValue({ value: DEFAULTS.element.transform.scaleY }),
		isDefault: isPropertyAtDefault({
			hasAnimatedKeyframes: scaleY.hasAnimatedKeyframes,
			isPlayheadWithinElementRange,
			resolvedValue: resolvedTransform.scaleY,
			staticValue: element.transform.scaleY,
			defaultValue: DEFAULTS.element.transform.scaleY,
		}),
	};

	const rotation = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.rotate",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.rotate).toString(),
		parse: (input) => {
			const parsed = parseNumericInput({ input });
			if (parsed === null) return null;
			return clamp({ value: parsed, min: -360, max: 360 });
		},
		valueAtPlayhead: resolvedTransform.rotate,
		step: 1,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				rotate: value,
			},
		}),
	});

	const skewX = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.skewX",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.skewX ?? 0).toString(),
		parse: (input) => {
			const parsed = parseNumericInput({ input });
			if (parsed === null) return null;
			return clamp({ value: parsed, min: -89, max: 89 });
		},
		valueAtPlayhead: resolvedTransform.skewX ?? 0,
		step: 0.1,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				skewX: value,
			},
		}),
	});

	const skewY = useKeyframedNumberProperty({
		trackId,
		elementId: element.id,
		animations: element.animations,
		propertyPath: "transform.skewY",
		localTime,
		isPlayheadWithinElementRange,
		displayValue: Math.round(resolvedTransform.skewY ?? 0).toString(),
		parse: (input) => {
			const parsed = parseNumericInput({ input });
			if (parsed === null) return null;
			return clamp({ value: parsed, min: -89, max: 89 });
		},
		valueAtPlayhead: resolvedTransform.skewY ?? 0,
		step: 0.1,
		buildBaseUpdates: ({ value }) => ({
			transform: {
				...element.transform,
				skewY: value,
			},
		}),
	});

	const hasPositionKeyframe = hasGroupKeyframeAtTime({
		animations: element.animations,
		group: "transform.position",
		time: localTime,
	});

	const togglePositionKeyframe = () => {
		if (!isPlayheadWithinElementRange) return;
		const existing = getGroupKeyframesAtTime({
			animations: element.animations,
			group: "transform.position",
			time: localTime,
		});
		if (existing.length > 0) {
			editor.timeline.removeKeyframes({
				keyframes: existing.map((ref) => ({
					trackId,
					elementId: element.id,
					...ref,
				})),
			});
			return;
		}
		editor.timeline.upsertKeyframes({
			keyframes: [
				{
					trackId,
					elementId: element.id,
					propertyPath: "transform.positionX",
					time: localTime,
					value: resolvedTransform.position.x,
				},
				{
					trackId,
					elementId: element.id,
					propertyPath: "transform.positionY",
					time: localTime,
					value: resolvedTransform.position.y,
				},
				{
					trackId,
					elementId: element.id,
					propertyPath: "transform.positionZ",
					time: localTime,
					value: resolvedTransform.positionZ ?? 0,
				},
			],
		});
	};

	const hasScaleKeyframe = hasGroupKeyframeAtTime({
		animations: element.animations,
		group: "transform.scale",
		time: localTime,
	});

	const toggleScaleKeyframe = () => {
		if (!isPlayheadWithinElementRange) return;
		const existing = getGroupKeyframesAtTime({
			animations: element.animations,
			group: "transform.scale",
			time: localTime,
		});
		if (existing.length > 0) {
			editor.timeline.removeKeyframes({
				keyframes: existing.map((ref) => ({
					trackId,
					elementId: element.id,
					...ref,
				})),
			});
			return;
		}
		editor.timeline.upsertKeyframes({
			keyframes: [
				{
					trackId,
					elementId: element.id,
					propertyPath: "transform.scaleX",
					time: localTime,
					value: resolvedTransform.scaleX,
				},
				{
					trackId,
					elementId: element.id,
					propertyPath: "transform.scaleY",
					time: localTime,
					value: resolvedTransform.scaleY,
				},
			],
		});
	};

	const scaleLockButton = (
		<Button
			type="button"
			variant={isScaleLocked ? "secondary" : "ghost"}
			size="icon"
			aria-pressed={isScaleLocked}
			onClick={() => setTransformScaleLocked(!isScaleLocked)}
		>
			<HugeiconsIcon icon={Link05Icon} />
		</Button>
	);

	const handleFlipHorizontal = () => {
		const newScaleX = -resolvedTransform.scaleX;
		scaleX.commitValue({ value: newScaleX });
	};

	const handleFlipVertical = () => {
		const newScaleY = -resolvedTransform.scaleY;
		scaleY.commitValue({ value: newScaleY });
	};

	const handlePivotCommit = ({ x, y }: { x: number; y: number }) => {
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: {
						transform: {
							...element.transform,
							pivot: { x, y },
						},
					},
				},
			],
		});
	};

	const handleResetAll = () => {
		const resetTransform = {
			scaleX: DEFAULTS.element.transform.scaleX,
			scaleY: DEFAULTS.element.transform.scaleY,
			position: {
				x: DEFAULTS.element.transform.position.x,
				y: DEFAULTS.element.transform.position.y,
			},
			positionZ: DEFAULTS.element.transform.positionZ ?? 0,
			rotate: DEFAULTS.element.transform.rotate,
			pivot: { x: 0.5, y: 0.5 },
			skewX: 0,
			skewY: 0,
		};
		editor.timeline.updateElements({
			updates: [
				{
					trackId,
					elementId: element.id,
					patch: { transform: resetTransform },
				},
			],
		});
	};

	return (
		<div className="flex flex-col gap-3 px-3.5 py-3">
			<Section
				collapsible
				defaultOpen
				sectionKey={`${element.id}:transform`}
				showBottomBorder={false}
				className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035] shadow-inner shadow-white/[0.02]"
			>
				<SectionHeader
					className="h-10 px-3"
					trailing={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleResetAll}
							className="h-7 rounded-md px-2 text-xs text-white/45 hover:bg-white/[0.06] hover:text-white"
						>
							Reset
						</Button>
					}
				>
					<SectionTitle className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-white/80">
						Transform
					</SectionTitle>
				</SectionHeader>
				<SectionContent className="px-3 pb-3 pt-0">
					<SectionFields className="gap-4">
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
								<span>Position</span>
								<KeyframeToggle
									isActive={hasPositionKeyframe}
									isDisabled={!isPlayheadWithinElementRange}
									title="Toggle position keyframe"
									onToggle={togglePositionKeyframe}
								/>
							</div>
							<div className="grid grid-cols-3 gap-2">
								<SectionField label="X" className="min-w-0">
									<NumberField
										icon="X"
										className="h-8 bg-white/[0.045]"
										value={positionX.displayValue}
										onFocus={positionX.onFocus}
										onChange={positionX.onChange}
										onBlur={positionX.onBlur}
										onScrub={positionX.scrubTo}
										onScrubEnd={positionX.commitScrub}
										onReset={() =>
											positionX.commitValue({
												value: DEFAULTS.element.transform.position.x,
											})
										}
										isDefault={isPropertyAtDefault({
											hasAnimatedKeyframes: positionX.hasAnimatedKeyframes,
											isPlayheadWithinElementRange,
											resolvedValue: resolvedTransform.position.x,
											staticValue: element.transform.position.x,
											defaultValue: DEFAULTS.element.transform.position.x,
										})}
									/>
								</SectionField>
								<SectionField label="Y" className="min-w-0">
									<NumberField
										icon="Y"
										className="h-8 bg-white/[0.045]"
										value={positionY.displayValue}
										onFocus={positionY.onFocus}
										onChange={positionY.onChange}
										onBlur={positionY.onBlur}
										onScrub={positionY.scrubTo}
										onScrubEnd={positionY.commitScrub}
										onReset={() =>
											positionY.commitValue({
												value: DEFAULTS.element.transform.position.y,
											})
										}
										isDefault={isPropertyAtDefault({
											hasAnimatedKeyframes: positionY.hasAnimatedKeyframes,
											isPlayheadWithinElementRange,
											resolvedValue: resolvedTransform.position.y,
											staticValue: element.transform.position.y,
											defaultValue: DEFAULTS.element.transform.position.y,
										})}
									/>
								</SectionField>
								<SectionField label="Z" className="min-w-0">
									<NumberField
										icon="Z"
										className="h-8 bg-white/[0.045]"
										value={positionZ.displayValue}
										onFocus={positionZ.onFocus}
										onChange={positionZ.onChange}
										onBlur={positionZ.onBlur}
										onScrub={positionZ.scrubTo}
										onScrubEnd={positionZ.commitScrub}
										onReset={() =>
											positionZ.commitValue({
												value: DEFAULTS.element.transform.positionZ ?? 0,
											})
										}
										isDefault={isPropertyAtDefault({
											hasAnimatedKeyframes: positionZ.hasAnimatedKeyframes,
											isPlayheadWithinElementRange,
											resolvedValue: resolvedTransform.positionZ ?? 0,
											staticValue: element.transform.positionZ ?? 0,
											defaultValue: DEFAULTS.element.transform.positionZ ?? 0,
										})}
									/>
								</SectionField>
							</div>
						</div>

						<div className="h-px bg-white/[0.06]" />

						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
								<span>Scale</span>
								{scaleLockButton}
							</div>
							{isScaleLocked ? (
								<SectionField
									label="Scale"
									className="min-w-0"
									beforeLabel={
										<KeyframeToggle
											isActive={hasScaleKeyframe}
											isDisabled={!isPlayheadWithinElementRange}
											title="Toggle scale keyframe"
											onToggle={toggleScaleKeyframe}
										/>
									}
								>
									<NumberField
										icon={<HugeiconsIcon icon={ArrowExpandIcon} />}
										className="h-8 bg-white/[0.045]"
										{...scaleFieldPropsX}
									/>
								</SectionField>
							) : (
								<div className="grid grid-cols-2 gap-2">
									<SectionField
										label="Width"
										className="min-w-0"
										beforeLabel={
											<KeyframeToggle
												isActive={scaleX.isKeyframedAtTime}
												isDisabled={!isPlayheadWithinElementRange}
												title="Toggle width scale keyframe"
												onToggle={scaleX.toggleKeyframe}
											/>
										}
									>
										<NumberField
											icon="W"
											className="h-8 bg-white/[0.045]"
											{...scaleFieldPropsX}
										/>
									</SectionField>
									<SectionField
										label="Height"
										className="min-w-0"
										beforeLabel={
											<KeyframeToggle
												isActive={scaleY.isKeyframedAtTime}
												isDisabled={!isPlayheadWithinElementRange}
												title="Toggle height scale keyframe"
												onToggle={scaleY.toggleKeyframe}
											/>
										}
									>
										<NumberField
											icon="H"
											className="h-8 bg-white/[0.045]"
											{...scaleFieldPropsY}
										/>
									</SectionField>
								</div>
							)}
						</div>

						<div className="h-px bg-white/[0.06]" />

						<div className="flex flex-col gap-2">
							<div className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
								Rotation &amp; Flip
							</div>
							<div className="flex items-end gap-2">
								<SectionField label="Rotation" className="min-w-0 flex-1">
									<NumberField
										icon={<HugeiconsIcon icon={RotateClockwiseIcon} />}
										className="h-8 bg-white/[0.045]"
										value={rotation.displayValue}
										onFocus={rotation.onFocus}
										onChange={rotation.onChange}
										onBlur={rotation.onBlur}
										dragSensitivity="slow"
										onScrub={rotation.scrubTo}
										onScrubEnd={rotation.commitScrub}
									/>
								</SectionField>
								<SectionField label="Flip" className="flex-none">
									<div className="flex h-8 items-center gap-1">
										<Button
											type="button"
											variant="outline"
											size="icon"
											title="Flip Horizontal"
											onClick={handleFlipHorizontal}
											className="h-8 w-8 border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.08]"
										>
											<svg
												aria-hidden="true"
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="size-4"
											>
												<line
													x1="12"
													y1="2"
													x2="12"
													y2="22"
													strokeDasharray="3 3"
												/>
												<polygon
													points="9,5 9,19 2,12"
													fill="currentColor"
													fillOpacity="0.2"
												/>
												<polygon
													points="15,5 15,19 22,12"
													fill="currentColor"
													fillOpacity="0.2"
												/>
											</svg>
										</Button>
										<Button
											type="button"
											variant="outline"
											size="icon"
											title="Flip Vertical"
											onClick={handleFlipVertical}
											className="h-8 w-8 border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.08]"
										>
											<svg
												aria-hidden="true"
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="size-4"
											>
												<line
													x1="2"
													y1="12"
													x2="22"
													y2="12"
													strokeDasharray="3 3"
												/>
												<polygon
													points="5,9 19,9 12,2"
													fill="currentColor"
													fillOpacity="0.2"
												/>
												<polygon
													points="5,15 19,15 12,22"
													fill="currentColor"
													fillOpacity="0.2"
												/>
											</svg>
										</Button>
									</div>
								</SectionField>
							</div>
						</div>

						<div className="h-px bg-white/[0.06]" />

						<div className="flex flex-col gap-2">
							<div className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
								Skew (Nyerong)
							</div>
							<div className="grid grid-cols-2 gap-2">
								<SectionField label="X" className="min-w-0">
									<NumberField
										icon="X"
										className="h-8 bg-white/[0.045]"
										value={skewX.displayValue}
										onFocus={skewX.onFocus}
										onChange={skewX.onChange}
										onBlur={skewX.onBlur}
										dragSensitivity="slow"
										onScrub={skewX.scrubTo}
										onScrubEnd={skewX.commitScrub}
										onReset={() => skewX.commitValue({ value: 0 })}
										isDefault={isPropertyAtDefault({
											hasAnimatedKeyframes: skewX.hasAnimatedKeyframes,
											isPlayheadWithinElementRange,
											resolvedValue: resolvedTransform.skewX ?? 0,
											staticValue: element.transform.skewX ?? 0,
											defaultValue: 0,
										})}
									/>
								</SectionField>
								<SectionField label="Y" className="min-w-0">
									<NumberField
										icon="Y"
										className="h-8 bg-white/[0.045]"
										value={skewY.displayValue}
										onFocus={skewY.onFocus}
										onChange={skewY.onChange}
										onBlur={skewY.onBlur}
										dragSensitivity="slow"
										onScrub={skewY.scrubTo}
										onScrubEnd={skewY.commitScrub}
										onReset={() => skewY.commitValue({ value: 0 })}
										isDefault={isPropertyAtDefault({
											hasAnimatedKeyframes: skewY.hasAnimatedKeyframes,
											isPlayheadWithinElementRange,
											resolvedValue: resolvedTransform.skewY ?? 0,
											staticValue: element.transform.skewY ?? 0,
											defaultValue: 0,
										})}
									/>
								</SectionField>
							</div>
						</div>

						<div className="h-px bg-white/[0.06]" />

						<PivotSection
							element={element}
							toggleGroupId={trackId}
							onCommit={handlePivotCommit}
						/>
					</SectionFields>
				</SectionContent>
			</Section>
			<div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
				<BlendingTab element={element} trackId={trackId} />
			</div>
		</div>
	);
}

function PivotSection({
	element,
	toggleGroupId: _toggleGroupId,
	onCommit,
}: {
	element: VisualElement;
	toggleGroupId: string;
	onCommit: ({ x, y }: { x: number; y: number }) => void;
}) {
	const pivot = resolvePivot({ transform: element.transform });
	const formatPct = ({ value }: { value: number }) =>
		`${Math.round(value * 100)}%`;
	const clamp01 = ({ value }: { value: number }) =>
		Math.max(0, Math.min(1, value));

	return (
		<div className="flex flex-col gap-2">
			<div className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
				Pivot
			</div>
			<div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
				<NumberField
					className="h-8 bg-white/[0.045]"
					icon="X"
					suffix="%"
					value={(pivot.x * 100).toFixed(0)}
					onChange={(event) => {
						const parsed = Number.parseFloat(event.currentTarget.value);
						if (Number.isNaN(parsed)) return;
						onCommit({ x: clamp01({ value: parsed / 100 }), y: pivot.y });
					}}
				/>
				<NumberField
					className="h-8 bg-white/[0.045]"
					icon="Y"
					suffix="%"
					value={(pivot.y * 100).toFixed(0)}
					onChange={(event) => {
						const parsed = Number.parseFloat(event.currentTarget.value);
						if (Number.isNaN(parsed)) return;
						onCommit({ x: pivot.x, y: clamp01({ value: parsed / 100 }) });
					}}
				/>
				<div className="flex items-center gap-0.5">
					<button
						type="button"
						onClick={() => onCommit({ x: 0, y: 0 })}
						className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] text-[0.72rem] text-white/55 hover:bg-white/[0.08] hover:text-white"
						title="Top-left"
					>
						↖
					</button>
					<button
						type="button"
						onClick={() => onCommit({ x: 0.5, y: 0.5 })}
						className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] text-[0.72rem] text-white/55 hover:bg-white/[0.08] hover:text-white"
						title="Center"
					>
						⊕
					</button>
					<button
						type="button"
						onClick={() => onCommit({ x: 1, y: 1 })}
						className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] text-[0.72rem] text-white/55 hover:bg-white/[0.08] hover:text-white"
						title="Bottom-right"
					>
						↘
					</button>
				</div>
			</div>
			<p className="text-[0.6rem] text-white/40">
				Rotation &amp; scale pivot ({formatPct({ value: pivot.x })},{" "}
				{formatPct({ value: pivot.y })}).
			</p>
		</div>
	);
}
