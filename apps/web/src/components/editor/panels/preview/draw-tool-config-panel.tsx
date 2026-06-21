"use client";

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ColorPickerIcon,
	PencilEdit01Icon,
	PenToolIcon,
	ArrowTurnBackwardIcon,
	Undo02Icon,
} from "@hugeicons/core-free-icons";
import { useToolModeStore } from "@/stores/tool-mode-store";
import { useVectorDraw } from "@/hooks/use-vector-draw";
import { useEditor } from "@/hooks/use-editor";
import { cn } from "@/utils/ui";
import {
	DEFAULT_PALETTE,
	useColorPaletteStore,
} from "@/stores/color-palette-store";

const PRESET_STROKE_WIDTHS = [1, 2, 4, 6, 10, 16, 24];

const PRESET_OPACITIES = [0.25, 0.5, 0.75, 1];

const BRUSH_STYLES = [
	{ value: "solid", label: "Solid" },
	{ value: "dashed", label: "Dashed" },
	{ value: "dotted", label: "Dotted" },
] as const;

const STROKE_ALIGNS = [
	{ value: "inside", label: "In" },
	{ value: "center", label: "Center" },
	{ value: "outside", label: "Out" },
] as const;

const STROKE_TAPERS = [
	{ value: "none", label: "Flat" },
	{ value: "in", label: "Taper in" },
	{ value: "out", label: "Taper out" },
] as const;

/**
 * Floating config panel that appears next to the canvas whenever the
 * freehand or vector tool is active. Lets the user pick the stroke
 * colour, width, fill, and closed-state without having to dig into
 * the inspector for the committed shape. Doubles as a quick primer
 * for the keyboard shortcuts (Enter / Esc / Backspace) used by the
 * pen-style vector tool.
 */
export function DrawToolConfigPanel() {
	const toolMode = useToolModeStore((s) => s.toolMode);
	const drawConfig = useToolModeStore((s) => s.drawConfig);
	const setDrawConfig = useToolModeStore((s) => s.setDrawConfig);
	const setToolMode = useToolModeStore((s) => s.setToolMode);
	const [colorOpen, setColorOpen] = useState(false);
	const [fillOpen, setFillOpen] = useState(false);
	void colorOpen;
	void fillOpen;
	const colorInputRef = useRef<HTMLInputElement>(null);
	const fillInputRef = useRef<HTMLInputElement>(null);
	const editor = useEditor();
	const recentColors = useColorPaletteStore((s) => s.recentColors);
	const addRecentColor = useColorPaletteStore((s) => s.addRecentColor);

	// We only need the vector interaction state when the vector tool
	// is active, but hooks must run unconditionally. The hook itself
	// is a no-op when the tool mode isn't `vector`.
	const vectorInteraction = useVectorDraw();
	const { isOpen: vectorIsOpen, anchors: vectorAnchors } = vectorInteraction;

	// Auto-collapse the panel when the user leaves the draw tools.
	useEffect(() => {
		if (toolMode !== "draw" && toolMode !== "vector") {
			setColorOpen(false);
			setFillOpen(false);
		}
	}, [toolMode]);

	if (toolMode !== "draw" && toolMode !== "vector") return null;

	const isVector = toolMode === "vector";

	// Undo the most recent freehand / vector commit. Wrapped in a
	// defensive try/catch — CommandManager.undo() can throw if the
	// history stack is empty or the last entry wasn't a draw commit,
	// in which case we silently no-op rather than crashing the panel.
	const handleUndo = () => {
		try {
			editor.command.undo();
		} catch {
			// Nothing to undo — fall through.
		}
	};

	return (
		<div
			className="flex w-full flex-col gap-2 p-3.5 text-white"
			role="dialog"
			aria-label={`${isVector ? "Vector" : "Freehand"} tool settings`}
		>
			<header className="flex items-center justify-between">
				<div className="flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/80">
					<HugeiconsIcon
						icon={isVector ? PenToolIcon : PencilEdit01Icon}
						className="size-3 text-white/70"
					/>
					{isVector ? "Vector" : "Freehand"}
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={handleUndo}
						className="grid size-6 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
						aria-label="Undo last stroke"
						title="Undo last stroke (Ctrl/Cmd+Z)"
					>
						<HugeiconsIcon icon={Undo02Icon} className="size-3" />
					</button>
					<button
						type="button"
						className="grid size-6 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
						onClick={() => setToolMode("select")}
						aria-label="Exit tool"
						title="Exit tool (Esc)"
					>
						×
					</button>
				</div>
			</header>

			{/* Stroke colour + swatches */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
					<span>Stroke</span>
					<button
						type="button"
						className="flex items-center gap-1 rounded px-1 py-0.5 text-white/55 transition hover:bg-white/[0.08] hover:text-white"
						onClick={() => {
							colorInputRef.current?.click();
						}}
					>
						<HugeiconsIcon icon={ColorPickerIcon} className="size-3" />
						Custom
					</button>
					<input
						ref={colorInputRef}
						type="color"
						value={drawConfig.stroke}
						className="sr-only"
						onChange={(e) => setDrawConfig({ stroke: e.target.value })}
						onBlur={(e) => addRecentColor(e.target.value)}
					/>
				</div>
				<div className="grid grid-cols-8 gap-1">
					{DEFAULT_PALETTE.map((color) => (
						<button
							key={color}
							type="button"
							className={cn(
								"aspect-square rounded-full border transition",
								drawConfig.stroke.toLowerCase() === color.toLowerCase()
									? "border-white shadow-[0_0_0_1.5px_rgba(255,255,255,0.45)]"
									: "border-white/15 hover:border-white/45",
							)}
							style={{ background: color }}
							aria-label={`Set stroke to ${color}`}
							onClick={() => setDrawConfig({ stroke: color })}
						/>
					))}
				</div>
				{recentColors.length > 0 && (
					<div className="flex flex-col gap-1">
						<span className="text-[0.56rem] uppercase tracking-[0.16em] text-white/30">
							Recent
						</span>
						<div className="grid grid-cols-8 gap-1">
							{recentColors.map((color) => (
								<button
									key={color}
									type="button"
									className={cn(
										"aspect-square rounded-full border transition",
										drawConfig.stroke.toLowerCase() === color.toLowerCase()
											? "border-white shadow-[0_0_0_1.5px_rgba(255,255,255,0.45)]"
											: "border-white/15 hover:border-white/45",
									)}
									style={{ background: color }}
									aria-label={`Set stroke to ${color}`}
									onClick={() => setDrawConfig({ stroke: color })}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Stroke width presets */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
					<span>Width</span>
					<span className="font-mono text-white/70">
						{drawConfig.strokeWidth}px
					</span>
				</div>
				<div className="grid grid-cols-7 gap-1">
					{PRESET_STROKE_WIDTHS.map((w) => (
						<button
							key={w}
							type="button"
							className={cn(
								"flex aspect-square items-center justify-center rounded-md border transition",
								drawConfig.strokeWidth === w
									? "border-white/40 bg-white/15 text-white"
									: "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white",
							)}
							onClick={() => setDrawConfig({ strokeWidth: w })}
							aria-label={`Set stroke width to ${w}`}
						>
							<span
								className="block rounded-full bg-current"
								style={{ width: Math.min(w, 10), height: Math.min(w, 10) }}
							/>
						</button>
					))}
				</div>
			</div>

			{/* Brush style / alignment / taper — these map 1:1 to the
			    renderer's strokeDash / strokeAlign / strokeTaper params, so the
			    committed stroke honours them. */}
			<SegmentedRow
				label="Brush"
				options={BRUSH_STYLES}
				value={drawConfig.strokeDash}
				onChange={(v) => setDrawConfig({ strokeDash: v })}
			/>
			<SegmentedRow
				label="Align"
				options={STROKE_ALIGNS}
				value={drawConfig.strokeAlign}
				onChange={(v) => setDrawConfig({ strokeAlign: v })}
			/>
			<SegmentedRow
				label="Taper"
				options={STROKE_TAPERS}
				value={drawConfig.strokeTaper}
				onChange={(v) => setDrawConfig({ strokeTaper: v })}
			/>

			{/* Opacity presets + slider. Brush opacity multiplies the
			   committed `strokeOpacity` param so the live preview matches
			   the final rendered element. */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
					<span>Opacity</span>
					<span className="font-mono text-white/70">
						{Math.round(drawConfig.opacity * 100)}%
					</span>
				</div>
				<input
					type="range"
					min={0}
					max={1}
					step={0.05}
					value={drawConfig.opacity}
					onChange={(e) => setDrawConfig({ opacity: Number(e.target.value) })}
					aria-label="Brush opacity"
					className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-white"
					style={{
						background: `linear-gradient(to right, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.85) ${drawConfig.opacity * 100}%, rgba(255,255,255,0.08) ${drawConfig.opacity * 100}%, rgba(255,255,255,0.08) 100%)`,
					}}
				/>
				<div className="grid grid-cols-4 gap-1">
					{PRESET_OPACITIES.map((o) => (
						<button
							key={o}
							type="button"
							className={cn(
								"flex h-6 items-center justify-center rounded-md border text-[0.62rem] font-medium transition",
								Math.abs(drawConfig.opacity - o) < 0.01
									? "border-white/40 bg-white/15 text-white"
									: "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white",
							)}
							onClick={() => setDrawConfig({ opacity: o })}
							aria-label={`Set opacity to ${Math.round(o * 100)}%`}
						>
							{Math.round(o * 100)}%
						</button>
					))}
				</div>
			</div>

			{/* Closed toggle */}
			<label className="flex items-center justify-between gap-2 text-[0.7rem] text-white/70">
				<span>Closed path</span>
				<button
					type="button"
					role="switch"
					aria-checked={drawConfig.closed}
					onClick={() => setDrawConfig({ closed: !drawConfig.closed })}
					className={cn(
						"relative h-4 w-7 rounded-full transition",
						drawConfig.closed ? "bg-white/60" : "bg-white/[0.08]",
					)}
				>
					<span
						className={cn(
							"absolute top-0.5 size-3 rounded-full bg-white transition-all",
							drawConfig.closed ? "left-3.5" : "left-0.5",
						)}
					/>
				</button>
			</label>

			{/* Fill colour row (only used when closed=true) */}
			<button
				type="button"
				className="flex items-center justify-between gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1.5 text-[0.68rem] text-white/75 transition hover:border-white/15 hover:bg-white/[0.05]"
				onClick={() => {
					if (drawConfig.fill === "transparent") {
						fillInputRef.current?.click();
					} else {
						setDrawConfig({ fill: "transparent" });
					}
				}}
			>
				<span className="flex items-center gap-1.5">
					<span
						aria-hidden
						className="size-3.5 rounded-sm border border-white/20"
						style={{
							background:
								drawConfig.fill === "transparent"
									? "repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 2px, transparent 2px 4px)"
									: drawConfig.fill,
						}}
					/>
					Fill
				</span>
				<span className="text-white/45">
					{drawConfig.fill === "transparent" ? "None" : drawConfig.fill}
				</span>
				<input
					ref={fillInputRef}
					type="color"
					className="sr-only"
					value={
						drawConfig.fill === "transparent" ? "#ffffff" : drawConfig.fill
					}
					onChange={(e) => setDrawConfig({ fill: e.target.value })}
				/>
			</button>

			{/* Alight Motion-style vector action row — only visible when
			    there are enough anchors to do something. Mirrors the
			    "Close Contour" / "Delete Point" affordances in AM's
			    vector tool. */}
			{isVector && vectorIsOpen && vectorAnchors.length >= 2 && (
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 text-[0.68rem] font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
						onClick={() =>
							vectorInteraction.handleKeyDown(
								new KeyboardEvent("keydown", { key: "Enter" }),
							)
						}
						title="Finish open path (Enter)"
					>
						Close path
					</button>
					<button
						type="button"
						className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/[0.025] text-white/70 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-200 disabled:opacity-40"
						onClick={() =>
							vectorInteraction.handleKeyDown(
								new KeyboardEvent("keydown", { key: "Backspace" }),
							)
						}
						disabled={vectorAnchors.length === 0}
						title="Delete last point (Backspace)"
						aria-label="Delete last vector anchor"
					>
						<HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-3.5" />
					</button>
					<button
						type="button"
						className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/[0.025] text-white/55 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
						onClick={() => vectorInteraction.reset()}
						title="Cancel (Esc)"
						aria-label="Cancel vector drawing"
					>
						×
					</button>
				</div>
			)}

			{isVector && (
				<p className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[0.62rem] leading-snug text-white/45">
					Click to add anchors · click the first to close · Enter to finish ·
					Esc to cancel · Backspace to remove the last anchor.
				</p>
			)}
			{!isVector && (
				<p className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[0.62rem] leading-snug text-white/45">
					Drag on the canvas to draw a freehand stroke. Release to insert.
				</p>
			)}
		</div>
	);
}

function SegmentedRow<T extends string>({
	label,
	options,
	value,
	onChange,
}: {
	label: string;
	options: ReadonlyArray<{ value: T; label: string }>;
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
				{label}
			</span>
			<div className="flex gap-1">
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						className={cn(
							"flex h-6 flex-1 items-center justify-center rounded-md border text-[0.6rem] font-medium transition",
							value === option.value
								? "border-white/40 bg-white/15 text-white"
								: "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white",
						)}
						onClick={() => onChange(option.value)}
						aria-pressed={value === option.value}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}
