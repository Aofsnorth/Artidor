"use client";

import { cn } from "@/utils/ui";
import { clamp } from "@/utils/math";
import {
	useEffect,
	useRef,
	useState,
	type ComponentProps,
} from "react";
import { useFocusLock } from "@/hooks/use-focus-lock";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowTurnBackwardIcon } from "@hugeicons/core-free-icons";

const DRAG_SENSITIVITIES = {
	default: 1,
	slow: 0.5,
} as const;

type DragSensitivity = "default" | "slow";

type ScrubRange = {
	from: number;
	to: number;
	pixelsPerUnit: number;
};

type ScrubClamp = {
	min?: number;
	max?: number;
};

export function clampNumberFieldScrubValue({
	value,
	min,
	max,
}: {
	value: number;
	min?: number;
	max?: number;
}): number {
	if (min != null && max != null) return clamp({ value, min, max });
	if (min != null) return Math.max(min, value);
	if (max != null) return Math.min(max, value);
	return value;
}

export function resolveNumberFieldDisplayValue({
	value,
	scrubValue,
}: {
	value: React.ComponentProps<"input">["value"];
	scrubValue: number | null;
}): React.ComponentProps<"input">["value"] {
	return scrubValue ?? value;
}

function getActiveRange({
	value,
	direction,
	ranges,
}: {
	value: number;
	direction: number;
	ranges: readonly ScrubRange[];
}): ScrubRange | undefined {
	return ranges.find((range) =>
		direction > 0
			? value >= range.from && value < range.to
			: value > range.from && value <= range.to,
	);
}

function scrubAcrossRanges({
	startValue,
	pixelDelta,
	ranges,
	min,
	max,
}: {
	startValue: number;
	pixelDelta: number;
	ranges: readonly ScrubRange[];
	min?: number;
	max?: number;
}): number {
	let currentValue = clampNumberFieldScrubValue({
		value: startValue,
		min,
		max,
	});
	let remainingPixels = pixelDelta;

	while (remainingPixels !== 0) {
		const direction = Math.sign(remainingPixels);

		const range = getActiveRange({ value: currentValue, direction, ranges });
		if (!range) break;

		const boundary = direction > 0 ? range.to : range.from;
		const pixelsToBoundary =
			Math.abs(boundary - currentValue) * range.pixelsPerUnit;

		if (Math.abs(remainingPixels) <= pixelsToBoundary) {
			currentValue += remainingPixels / range.pixelsPerUnit;
			break;
		}

		currentValue = boundary;
		remainingPixels -= direction * pixelsToBoundary;
	}

	return clampNumberFieldScrubValue({ value: currentValue, min, max });
}

interface NumberFieldProps
	extends Omit<ComponentProps<"input">, "size" | "type"> {
	icon?: React.ReactNode;
	suffix?: string;
	suffixClassName?: string;
	dragSensitivity?: DragSensitivity;
	scrubRanges?: readonly ScrubRange[];
	scrubClamp?: ScrubClamp;
	onScrub?: (value: number) => void;
	onScrubEnd?: () => void;
	allowExpressions?: boolean;
	onReset?: () => void;
	isDefault?: boolean;
}

function NumberField({
	className,
	icon,
	suffix,
	suffixClassName,
	disabled,
	dragSensitivity = "default",
	scrubRanges,
	scrubClamp,
	onScrub,
	onScrubEnd,
	value,
	allowExpressions = true,
	onKeyDown,
	onFocus,
	onBlur,
	onMouseDown,
	onReset,
	isDefault = false,
	ref,
	...props
}: NumberFieldProps & { ref?: React.Ref<HTMLInputElement> }) {
	const iconRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const bubbleRef = useRef<HTMLDivElement>(null);
	const startValueRef = useRef(0);
	const startXRef = useRef(0);
	const cumulativeDeltaRef = useRef(0);
	const lastPointerXRef = useRef(0);
	const [isInputFocused, setIsInputFocused] = useState(false);
	const [scrubPreview, setScrubPreview] = useState<{
		value: number;
		x: number;
		y: number;
	} | null>(null);

	useEffect(() => {
		return () => {
			setScrubPreview(null);
		};
	}, []);

	const { containerRef: wrapperRef } = useFocusLock<HTMLDivElement>({
		isActive: isInputFocused,
		onDismiss: () => inputRef.current?.blur(),
		cursor: "text",
		allowSelector: "input, textarea, [contenteditable]",
	});

	const handleIconPointerDown = (event: React.PointerEvent) => {
		if (!onScrub || disabled || event.button !== 0) return;
		const parsed = parseFloat(String(value ?? "0"));
		startValueRef.current = Number.isNaN(parsed) ? 0 : parsed;
		startXRef.current = event.clientX;
		lastPointerXRef.current = event.clientX;
		cumulativeDeltaRef.current = 0;
		document.body.style.cursor = "ew-resize";
		document.body.style.userSelect = "none";

		const handlePointerMove = (moveEvent: PointerEvent) => {
			lastPointerXRef.current = moveEvent.clientX;
			cumulativeDeltaRef.current = moveEvent.clientX - startXRef.current;
			const rawValue = scrubRanges
				? scrubAcrossRanges({
						startValue: startValueRef.current,
						pixelDelta: cumulativeDeltaRef.current,
						ranges: scrubRanges,
						min: scrubClamp?.min,
						max: scrubClamp?.max,
					})
				: startValueRef.current +
					cumulativeDeltaRef.current * DRAG_SENSITIVITIES[dragSensitivity];
			const newValue = clampNumberFieldScrubValue({
				value: rawValue,
				min: scrubClamp?.min,
				max: scrubClamp?.max,
			});
			setScrubPreview({
				value: newValue,
				x: moveEvent.clientX,
				y: moveEvent.clientY,
			});
			onScrub(newValue);
		};

		const handlePointerUp = () => {
			document.removeEventListener("pointermove", handlePointerMove);
			document.removeEventListener("pointerup", handlePointerUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			setScrubPreview(null);
			onScrubEnd?.();
		};

		document.addEventListener("pointermove", handlePointerMove);
		document.addEventListener("pointerup", handlePointerUp);
	};

	const canScrub = Boolean(icon && onScrub);

	const displayValue = resolveNumberFieldDisplayValue({
		value,
		scrubValue: scrubPreview?.value ?? null,
	});

	const inputNode = (
		<input
			type={allowExpressions ? "text" : "number"}
			inputMode={allowExpressions ? "decimal" : undefined}
			ref={inputRef}
			disabled={disabled}
			value={displayValue}
			className="text-sm leading-none bg-transparent outline-none min-w-0 flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			onMouseDown={(event) => {
				const inputElement = event.currentTarget;
				const shouldPreventNativeCaretPlacement =
					event.button === 0 && document.activeElement !== inputElement;
				if (shouldPreventNativeCaretPlacement) {
					event.preventDefault();
					inputElement.focus();
					inputElement.select();
				}
				onMouseDown?.(event);
			}}
			onFocus={(event) => {
				setIsInputFocused(true);
				event.currentTarget.select();
				onFocus?.(event);
			}}
			onKeyDown={(event) => {
				const shouldBlurInput = event.key === "Enter" || event.key === "Escape";
				if (shouldBlurInput) event.currentTarget.blur();
				onKeyDown?.(event);
			}}
			onBlur={(event) => {
				setIsInputFocused(false);
				onBlur?.(event);
			}}
			{...props}
		/>
	);

	return (
		<>
			<div
				ref={wrapperRef}
				className={cn(
					"border-border bg-accent flex h-7 w-full min-w-0 items-center rounded-md border text-sm outline-none cursor-text disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-within:border-primary focus-within:ring-0 focus-within:ring-primary/10 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
					disabled && "pointer-events-none cursor-not-allowed opacity-50",
					className,
				)}
			>
				{icon &&
					(canScrub ? (
						<button
							ref={iconRef}
							type="button"
							aria-label="Drag to adjust value"
							disabled={disabled}
							className="text-muted-foreground [&_svg]:size-3.5! shrink-0 select-none pl-2.5 text-sm leading-none cursor-ew-resize"
							onMouseDown={(event) => event.preventDefault()}
							onPointerDown={handleIconPointerDown}
						>
							{icon}
						</button>
					) : (
						<span className="text-muted-foreground [&_svg]:size-3.5! shrink-0 select-none pl-2.5 text-sm leading-none">
							{icon}
						</span>
					))}
				<span
					className={cn(
						"relative flex flex-1 min-w-0 items-center",
						icon ? "px-1.5" : "pl-2.5",
						onReset ? "pr-0" : "pr-2.5",
					)}
				>
					{inputNode}
					{suffix ? (
						<span
							className={cn(
								"pointer-events-none shrink-0 select-none pr-1 text-sm leading-none text-muted-foreground",
								suffixClassName,
							)}
							aria-hidden="true"
						>
							{suffix}
						</span>
					) : null}
				</span>
				{onReset && !isDefault && (
					<div className="shrink-0 pr-2 flex items-center">
						<Button
							variant="text"
							size="text"
							aria-label="Reset to default"
							onClick={onReset}
						>
							<HugeiconsIcon
								icon={ArrowTurnBackwardIcon}
								className="size-3.5!"
							/>
						</Button>
					</div>
				)}
			</div>
			{/* Floating value bubble that follows the cursor while the user drags
		    the scrub icon. Replaces the old pointer-locked drag (which hid
		    the cursor entirely) with a more discoverable on-screen affordance. */}
			{scrubPreview &&
				(typeof window === "undefined" ? null : (
					<div
						ref={bubbleRef}
						role="status"
						aria-live="polite"
						className="pointer-events-none fixed z-10000 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border border-white/[0.12] bg-[#09090b]/95 px-2.5 py-1 text-[0.74rem] font-mono text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur"
						style={{
							left: scrubPreview.x,
							top: scrubPreview.y,
						}}
					>
						{Number.isFinite(scrubPreview.value)
							? scrubPreview.value.toFixed(
									getFractionDigits({ value: scrubPreview.value }),
								)
							: "—"}
						{suffix ? (
							<span className="ml-1 text-white/50">{suffix}</span>
						) : null}
					</div>
				))}
		</>
	);
}

/**
 * Pick a sane fraction-digit count for the drag bubble based on the
 * current value's magnitude. Integers like 60 show no decimals; finer
 * values like 1.25 keep two. Mirrors the `formatNumberForDisplay`
 * helper used elsewhere so the bubble matches the input field.
 */
function getFractionDigits({ value }: { value: number }): number {
	const abs = Math.abs(value);
	if (abs >= 100) return 0;
	if (abs >= 10) return 1;
	if (abs >= 1) return 2;
	return 3;
}

export { NumberField };
