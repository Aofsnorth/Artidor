"use client";

import { useEffect, useRef, useState } from "react";
import {
	formatTimecode,
	parseTimecode,
	snappedSeekTime,
	type FrameRate,
	type TimeCodeFormat,
} from "artidor-wasm";
import { cn } from "@/utils/ui";

/**
 * Guarded wrappers around the WASM timecode bindings. These calls run inside
 * event handlers (blur/keydown) where a thrown wasm trap — e.g. the "memory
 * access out of bounds" a corrupted GPU-state instance can produce — would
 * otherwise surface as a fatal page error and kill the editor. Degrading to
 * `undefined` (the same contract as a failed parse) keeps the UI alive.
 */
function safeFormatTimecode(args: {
	time: number;
	format?: TimeCodeFormat;
	rate?: FrameRate;
}): string {
	try {
		return formatTimecode(args) ?? "";
	} catch {
		return "";
	}
}

function safeParseTimecode(args: {
	timeCode: string;
	format?: TimeCodeFormat;
	rate?: FrameRate;
}): number | undefined {
	try {
		return parseTimecode(args);
	} catch {
		return undefined;
	}
}

function safeSnappedSeekTime(args: {
	time: number;
	duration: number;
	rate: FrameRate;
}): number | undefined {
	try {
		return snappedSeekTime(args);
	} catch {
		return undefined;
	}
}

interface EditableTimecodeProps {
	time: number;
	duration: number;
	format?: TimeCodeFormat;
	fps: FrameRate;
	onTimeChange?: ({ time }: { time: number }) => void;
	className?: string;
	disabled?: boolean;
}

export function EditableTimecode({
	time,
	duration,
	format = "HH:MM:SS:FF",
	fps,
	onTimeChange,
	className,
	disabled = false,
}: EditableTimecodeProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [hasError, setHasError] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const enterPressedRef = useRef(false);
	// The Rust formatTimecode binding only accepts i64 ticks. The `time` we
	// receive here is normally already rounded by the playback manager, but
	// rounding defensively avoids a runtime error if a caller hands us a
	// fractional value. All WASM calls here are guarded: a thrown error (bad
	// input, or a wasm trap) must degrade to the error-styled input, never
	// bubble up as a fatal page error from a blur handler.
	const formattedTime = safeFormatTimecode({
		time: Math.round(time),
		format,
		rate: fps,
	});

	const startEditing = () => {
		if (disabled) return;
		setIsEditing(true);
		setInputValue(formattedTime);
		setHasError(false);
		enterPressedRef.current = false;
	};

	const cancelEditing = () => {
		setIsEditing(false);
		setInputValue("");
		setHasError(false);
		enterPressedRef.current = false;
	};

	const applyEdit = () => {
		const parsedTime = safeParseTimecode({
			timeCode: inputValue,
			format,
			rate: fps,
		});

		if (parsedTime == null) {
			setHasError(true);
			return;
		}

		const clampedTime = duration
			? (safeSnappedSeekTime({ time: parsedTime, duration, rate: fps }) ??
				parsedTime)
			: parsedTime;

		onTimeChange?.({ time: clampedTime });
		setIsEditing(false);
		setInputValue("");
		setHasError(false);
		enterPressedRef.current = false;
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			enterPressedRef.current = true;
			applyEdit();
		} else if (event.key === "Escape") {
			event.preventDefault();
			cancelEditing();
		}
	};

	const handleInputChange = ({
		target,
	}: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(target.value);
		setHasError(false);
	};

	const handleBlur = () => {
		if (!enterPressedRef.current && isEditing) {
			applyEdit();
		}
	};

	const handleDisplayKeyDown = (
		event: React.KeyboardEvent<HTMLButtonElement>,
	) => {
		if (disabled) return;

		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			startEditing();
		}
	};

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				className={cn(
					"-mx-1 border border-transparent bg-transparent px-1 font-mono text-xs outline-none",
					"focus:bg-background focus:border-primary focus:rounded",
					"text-primary tabular-nums",
					hasError && "text-destructive focus:border-destructive",
					className,
				)}
				style={{ width: `${formattedTime.length + 1}ch` }}
				placeholder={formattedTime}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={startEditing}
			onKeyDown={handleDisplayKeyDown}
			disabled={disabled}
			className={cn(
				"text-primary cursor-pointer font-mono text-xs tabular-nums",
				"hover:bg-muted/50 -mx-1 px-1 hover:rounded",
				disabled && "cursor-default hover:bg-transparent",
				className,
			)}
			title={disabled ? undefined : "Click to edit time"}
		>
			{formattedTime}
		</button>
	);
}
