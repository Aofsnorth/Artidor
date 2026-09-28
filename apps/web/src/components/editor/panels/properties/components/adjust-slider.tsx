"use client";

import { cn } from "@/utils/ui";
import {
	ArrowTurnBackwardIcon,
	Copy01Icon,
	ClipboardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface AdjustPreset {
	label: string;
	value: number;
}

interface AdjustSliderProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	/** Point the fill is measured from (bipolar centre by default). */
	neutral?: number;
	/** Optional semantic track background (CSS background value). */
	gradient?: string;
	format?: (value: number) => string;
	/** Fired while dragging (preview); pair with `onCommit` on release. */
	onChange: (value: number) => void;
	onCommit: () => void;
	onReset: () => void;
	/** Copy this adjustment's value to the adjust clipboard. */
	onCopy?: () => void;
	/** Paste a previously copied adjustment value onto this control. */
	onPaste?: () => void;
	isDefault?: boolean;
	/** Adds −/+ nudge buttons for fine stepping. */
	stepper?: boolean;
	/** Adds one-click preset chips under the track. */
	presets?: readonly AdjustPreset[];
	/** Whether the paste button has anything to paste. */
	hasCopiedValue?: boolean;
	testId?: string;
}

function percentOf({
	value,
	min,
	max,
}: {
	value: number;
	min: number;
	max: number;
}): number {
	if (max === min) return 0;
	return ((value - min) / (max - min)) * 100;
}

/**
 * Visual slider row for inspector adjust panels: label + live readout +
 * reset, a real draggable track (native range input, so keyboard and
 * screen-reader support come for free) and optional stepper / preset
 * affordances so not every control is the same bare scrub field.
 *
 * Writes are split preview (`onChange`) / commit (`onCommit`) so a drag
 * produces a single undo entry instead of one per pointer tick.
 */
export function AdjustSlider({
	label,
	value,
	min,
	max,
	step = 1,
	neutral,
	gradient,
	format,
	onChange,
	onCommit,
	onReset,
	onCopy,
	onPaste,
	isDefault = false,
	stepper = false,
	presets,
	hasCopiedValue = false,
	testId,
}: AdjustSliderProps) {
	const neutralPoint = neutral ?? (min < 0 ? 0 : min);
	const valuePct = percentOf({ value, min, max });
	const neutralPct = percentOf({ value: neutralPoint, min, max });
	const fillLeft = Math.min(valuePct, neutralPct);
	const fillWidth = Math.abs(valuePct - neutralPct);
	const readout = format ? format(value) : `${Math.round(value)}`;

	const nudge = (direction: number) => {
		const next = Math.min(max, Math.max(min, value + direction * step));
		onChange(next);
		onCommit();
	};

	const applyPreset = (presetValue: number) => {
		onChange(presetValue);
		onCommit();
	};

	return (
		<div className="flex flex-col gap-1.5" data-testid={testId}>
			<div className="flex items-center justify-between gap-2">
				<span className="truncate text-xs text-muted-foreground">{label}</span>
				<div className="flex shrink-0 items-center gap-1">
					{stepper && (
						<button
							type="button"
							aria-label={`Decrease ${label}`}
							disabled={value <= min}
							onClick={() => nudge(-1)}
							className="text-muted-foreground hover:text-foreground rounded px-1 text-xs leading-none disabled:opacity-40"
						>
							−
						</button>
					)}
					<span
						className={cn(
							"font-mono text-[0.7rem] tabular-nums",
							isDefault ? "text-muted-foreground" : "text-foreground",
						)}
					>
						{readout}
					</span>
					{stepper && (
						<button
							type="button"
							aria-label={`Increase ${label}`}
							disabled={value >= max}
							onClick={() => nudge(1)}
							className="text-muted-foreground hover:text-foreground rounded px-1 text-xs leading-none disabled:opacity-40"
						>
							+
						</button>
					)}
					{onCopy && (
						<button
							type="button"
							aria-label={`Copy ${label} value`}
							title="Copy value"
							onClick={onCopy}
							className="text-muted-foreground hover:text-foreground rounded p-0.5"
						>
							<HugeiconsIcon icon={Copy01Icon} className="size-3!" />
						</button>
					)}
					{onPaste && (
						<button
							type="button"
							aria-label={`Paste value onto ${label}`}
							title="Paste value"
							disabled={!hasCopiedValue}
							onClick={onPaste}
							className="text-muted-foreground hover:text-foreground rounded p-0.5 disabled:opacity-35"
						>
							<HugeiconsIcon icon={ClipboardIcon} className="size-3!" />
						</button>
					)}
					{!isDefault && (
						<button
							type="button"
							aria-label={`Reset ${label}`}
							onClick={onReset}
							className="text-muted-foreground hover:text-foreground rounded p-0.5"
						>
							<HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-3!" />
						</button>
					)}
				</div>
			</div>
			<div className="relative h-4">
				<div
					aria-hidden="true"
					className="border-border/60 pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border bg-white/[0.06]"
					style={gradient ? { background: gradient } : undefined}
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/45"
					style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
				/>
				{min < 0 && neutralPoint > min && (
					<div
						aria-hidden="true"
						className="pointer-events-none absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-white/30"
						style={{ left: `${neutralPct}%` }}
					/>
				)}
				<input
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					aria-label={label}
					onChange={(event) => onChange(Number.parseFloat(event.target.value))}
					// Commit once per gesture: pointer release, arrow-key release
					// or blur. A range input fires `change` on every tick, so
					// without this each pixel of drag would land in history.
					onPointerUp={onCommit}
					onKeyUp={onCommit}
					onBlur={onCommit}
					className="absolute inset-0 h-4 w-full cursor-pointer appearance-none bg-transparent
						[&::-webkit-slider-thumb]:appearance-none
						[&::-webkit-slider-thumb]:size-3
						[&::-webkit-slider-thumb]:rounded-full
						[&::-webkit-slider-thumb]:bg-white
						[&::-webkit-slider-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.55),0_0_6px_rgba(255,255,255,0.35)]
						[&::-moz-range-thumb]:size-3
						[&::-moz-range-thumb]:rounded-full
						[&::-moz-range-thumb]:bg-white
						[&::-moz-range-thumb]:border-0
						[&::-moz-range-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.55),0_0_6px_rgba(255,255,255,0.35)]
						focus:outline-none"
				/>
			</div>
			{presets && presets.length > 0 && (
				<div className="flex items-center gap-1">
					{presets.map((preset) => {
						const isActive = Math.abs(value - preset.value) < step / 2;
						return (
							<button
								key={preset.label}
								type="button"
								onClick={() => applyPreset(preset.value)}
								className={cn(
									"rounded-md border px-1.5 py-0.5 text-[0.62rem] transition",
									isActive
										? "border-white/25 bg-white/15 text-foreground"
										: "border-white/8 bg-white/3 text-muted-foreground hover:border-white/15 hover:text-foreground",
								)}
							>
								{preset.label}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
