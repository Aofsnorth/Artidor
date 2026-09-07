"use client";

import { ChartHistogramIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { samplePreviewCanvas } from "@/stores/preview-canvas-scope";
import { cn } from "@/utils/ui";
import {
	analyzeScopeSample,
	getLuma,
	getParadeChannelBounds,
	getVectorscopePoint,
	type ScopeSampleData,
	type ScopeStatistics,
} from "./scope-analysis";

type ScopeMode = "waveform" | "vectorscope" | "parade";

interface ScopeOption {
	id: ScopeMode;
	labelKey: string;
	shortLabel: string;
}

interface ScopeReadout {
	label: string;
	value: string;
	color?: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
	{ id: "waveform", labelKey: "scopes.waveform", shortLabel: "WFM" },
	{ id: "vectorscope", labelKey: "scopes.vectorscope", shortLabel: "VEC" },
	{ id: "parade", labelKey: "scopes.parade", shortLabel: "RGB" },
];
const SAMPLE_RATE_FPS = 12;
const STATISTICS_RATE_FPS = 3;
const SCOPE_PADDING = 17;
const GRID_LEVELS = [0, 0.25, 0.5, 0.75, 1];
const RGB_CHANNELS = [
	{ channel: 0 as const, color: "248,113,113", label: "R" },
	{ channel: 1 as const, color: "74,222,128", label: "G" },
	{ channel: 2 as const, color: "96,165,250", label: "B" },
];
const VECTOR_TARGETS = [
	{
		blue: 0,
		color: "rgba(248,113,113,0.82)",
		green: 0,
		label: "R",
		red: 191,
	},
	{
		blue: 0,
		color: "rgba(250,204,21,0.78)",
		green: 191,
		label: "Yl",
		red: 191,
	},
	{
		blue: 0,
		color: "rgba(74,222,128,0.78)",
		green: 191,
		label: "G",
		red: 0,
	},
	{
		blue: 191,
		color: "rgba(45,212,191,0.78)",
		green: 191,
		label: "Cy",
		red: 0,
	},
	{
		blue: 191,
		color: "rgba(96,165,250,0.82)",
		green: 0,
		label: "B",
		red: 0,
	},
	{
		blue: 191,
		color: "rgba(232,121,249,0.78)",
		green: 0,
		label: "Mg",
		red: 191,
	},
];

/**
 * Renders one live preview scope at a time with contextual signal readouts.
 * Sampling stays at 12 fps while React statistics update at 3 fps.
 */
export function ScopesCard() {
	const { t } = useI18n();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const latestSampleRef = useRef<ScopeSampleData | null>(null);
	const [active, setActive] = useState<ScopeMode>("waveform");
	const [hasSignal, setHasSignal] = useState(false);
	const [statistics, setStatistics] = useState<ScopeStatistics | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const resize = () => resizeScopeCanvas(canvas);
		resize();
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		let animationFrame = 0;
		let lastSampleAt = 0;
		let lastStatisticsAt = 0;
		let lastSignalState = latestSampleRef.current !== null;

		const tick = (now: number) => {
			if (now - lastSampleAt >= 1000 / SAMPLE_RATE_FPS) {
				lastSampleAt = now;
				latestSampleRef.current = samplePreviewCanvas({ columns: 128 });

				const sample = latestSampleRef.current;
				if (sample) {
					drawActiveScope({ canvas, mode: active, sample });
					if (!lastSignalState) {
						lastSignalState = true;
						setHasSignal(true);
					}
					if (now - lastStatisticsAt >= 1000 / STATISTICS_RATE_FPS) {
						lastStatisticsAt = now;
						setStatistics(analyzeScopeSample(sample));
					}
				} else {
					drawEmptyScope({ canvas, mode: active });
					if (lastSignalState) {
						lastSignalState = false;
						setHasSignal(false);
						setStatistics(null);
					}
				}
			}
			animationFrame = window.requestAnimationFrame(tick);
		};

		animationFrame = window.requestAnimationFrame(tick);
		return () => window.cancelAnimationFrame(animationFrame);
	}, [active]);

	const readouts = getScopeReadouts({ active, statistics, t });
	const sourceLabel = statistics
		? `${statistics.sourceWidth} × ${statistics.sourceHeight}`
		: t("scopes.waitingShort");

	return (
		<section
			aria-label={t("scopes.monitorAria")}
			className="overflow-hidden rounded-xl border border-white/8 bg-[#070709]/75 shadow-inner shadow-white/2"
		>
			<div className="border-b border-white/8 bg-linear-to-b from-white/[0.035] to-transparent px-3 py-2.5">
				<div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
					<div className="min-w-0 flex-1 basis-32">
						<div className="flex items-center gap-2">
							<HugeiconsIcon
								icon={ChartHistogramIcon}
								className="size-3.5 shrink-0 text-white/65"
								aria-hidden="true"
							/>
							<h3 className="truncate text-xs font-semibold text-white/90">
								{t("scopes.monitorTitle")}
							</h3>
						</div>
						<p className="mt-1 truncate text-[0.66rem] text-white/42">
							{t("scopes.monitorDescription")}
						</p>
					</div>
				</div>
			</div>

			<div className="p-2.5">
				<ScopeToolbar active={active} onActiveChange={setActive} t={t} />

				<div className="relative mt-2.5 overflow-hidden rounded-lg border border-white/10 bg-[#030304] shadow-inner shadow-black/55">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-linear-to-r from-transparent via-white/16 to-transparent"
					/>
					<canvas
						ref={canvasRef}
						className="block aspect-5/3 w-full"
						aria-label={getScopeAriaLabel(active, t)}
					/>
					{hasSignal ? null : <ScopeEmptyState t={t} />}
					<div className="pointer-events-none absolute left-2 top-2 rounded border border-white/8 bg-black/55 px-1.5 py-0.5 font-mono text-[0.58rem] tracking-wide text-white/55 backdrop-blur-sm">
						{getScopeFormatLabel(active, t)}
					</div>
				</div>

				<ScopeReadouts readouts={readouts} />
				<ScopeFooter
					active={active}
					hasSignal={hasSignal}
					sourceLabel={sourceLabel}
					t={t}
				/>
			</div>
		</section>
	);
}

function ScopeToolbar({
	active,
	onActiveChange,
	t,
}: {
	active: ScopeMode;
	onActiveChange: (next: ScopeMode) => void;
	t: (key: string) => string;
}) {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<div className="scrollbar-hidden flex min-w-0 basis-36 flex-1 gap-0.5 overflow-x-auto rounded-lg border border-white/8 bg-black/35 p-0.5">
				{SCOPE_OPTIONS.map((option) => {
					const isActive = option.id === active;
					return (
						<button
							key={option.id}
							type="button"
							onClick={() => onActiveChange(option.id)}
							data-native-key-activation="true"
							aria-label={t(option.labelKey)}
							aria-pressed={isActive}
							title={t(option.labelKey)}
							className={cn(
								"flex h-8 min-w-0 flex-1 items-center justify-center rounded-md px-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 motion-reduce:transition-none pointer-coarse:min-h-11",
								isActive
									? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
									: "text-white/45 hover:bg-white/5 hover:text-white/75",
							)}
						>
							<span className="font-mono text-[0.61rem] tracking-[0.08em]">
								{option.shortLabel}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function ScopeEmptyState({ t }: { t: (key: string) => string }) {
	return (
		<div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
			<div className="max-w-52 rounded-lg border border-white/8 bg-[#09090b]/88 px-3 py-2.5 backdrop-blur-sm">
				<p className="text-xs font-medium text-white/72">
					{t("scopes.waitingTitle")}
				</p>
				<p className="mt-1 text-[0.66rem] leading-relaxed text-white/42">
					{t("scopes.waitingDescription")}
				</p>
			</div>
		</div>
	);
}

function ScopeReadouts({ readouts }: { readouts: ScopeReadout[] }) {
	return (
		<dl className="mt-2.5 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(3rem,100%),1fr))] overflow-hidden rounded-lg border border-white/8 bg-white/[0.018]">
			{readouts.map((readout, index) => (
				<div
					key={readout.label}
					className={cn(
						"min-w-0 px-2.5 py-2",
						index > 0 && "border-l border-white/6",
					)}
				>
					<dt className="truncate text-[0.58rem] uppercase tracking-widest text-white/32">
						{readout.label}
					</dt>
					<dd
						className="mt-0.5 truncate font-mono text-[0.72rem] tabular-nums text-white/80"
						style={readout.color ? { color: readout.color } : undefined}
					>
						{readout.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

function ScopeFooter({
	active,
	hasSignal,
	sourceLabel,
	t,
}: {
	active: ScopeMode;
	hasSignal: boolean;
	sourceLabel: string;
	t: (key: string) => string;
}) {
	return (
		<div className="mt-2.5 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 overflow-hidden border-t border-white/6 pt-2 text-[0.61rem] text-white/38">
			<div className="flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">
				<span className="truncate">{getScopeInterpretation(active, t)}</span>
				<span aria-hidden="true" className="h-3 w-px shrink-0 bg-white/8" />
				<span className="truncate font-mono tabular-nums">{sourceLabel}</span>
			</div>
			<span className="max-w-full truncate font-mono tabular-nums">
				{hasSignal ? t("scopes.sampleRate") : t("scopes.noSignal")}
			</span>
		</div>
	);
}

function getScopeReadouts({
	active,
	statistics,
	t,
}: {
	active: ScopeMode;
	statistics: ScopeStatistics | null;
	t: (key: string) => string;
}): ScopeReadout[] {
	if (active === "waveform") {
		return [
			{
				label: t("scopes.readout.low"),
				value: formatPercent(statistics?.lumaLow),
			},
			{
				label: t("scopes.readout.average"),
				value: formatPercent(statistics?.lumaAverage),
			},
			{
				label: t("scopes.readout.high"),
				value: formatPercent(statistics?.lumaHigh),
			},
			{
				label: t("scopes.readout.range"),
				value: formatPercent(
					statistics ? statistics.lumaHigh - statistics.lumaLow : undefined,
				),
			},
		];
	}

	if (active === "vectorscope") {
		return [
			{
				label: t("scopes.readout.saturation"),
				value: formatPercent(statistics?.chromaAverage),
			},
			{
				label: t("scopes.readout.peak"),
				value: formatPercent(statistics?.chromaPeak),
			},
			{
				label: t("scopes.readout.luma"),
				value: formatPercent(statistics?.lumaAverage),
			},
			{
				label: t("scopes.readout.samples"),
				value: statistics ? statistics.sampleCount.toLocaleString() : "--",
			},
		];
	}

	return [
		{
			label: t("scopes.legend.red"),
			value: formatChannel(statistics?.redAverage),
			color: "rgba(248,113,113,0.9)",
		},
		{
			label: t("scopes.legend.green"),
			value: formatChannel(statistics?.greenAverage),
			color: "rgba(74,222,128,0.9)",
		},
		{
			label: t("scopes.legend.blue"),
			value: formatChannel(statistics?.blueAverage),
			color: "rgba(96,165,250,0.95)",
		},
		{
			label: t("scopes.readout.luma"),
			value: formatPercent(statistics?.lumaAverage),
		},
	];
}

function formatPercent(value: number | undefined): string {
	return value === undefined ? "--" : `${Math.round(value)}%`;
}

function formatChannel(value: number | undefined): string {
	return value === undefined
		? "--"
		: String(Math.round(value)).padStart(3, "0");
}

function getScopeAriaLabel(
	active: ScopeMode,
	t: (key: string) => string,
): string {
	if (active === "waveform") return t("scopes.waveformAria");
	if (active === "vectorscope") return t("scopes.vectorscopeAria");
	return t("scopes.rgbParadeAria");
}

function getScopeFormatLabel(
	active: ScopeMode,
	t: (key: string) => string,
): string {
	if (active === "waveform") return t("scopes.label.waveform");
	if (active === "vectorscope") return t("scopes.label.vectorscope");
	return t("scopes.label.parade");
}

function getScopeInterpretation(
	active: ScopeMode,
	t: (key: string) => string,
): string {
	if (active === "waveform") return t("scopes.help.waveform");
	if (active === "vectorscope") return t("scopes.help.vectorscope");
	return t("scopes.help.parade");
}

function resizeScopeCanvas(canvas: HTMLCanvasElement): void {
	const bounds = canvas.getBoundingClientRect();
	const pixelRatio = window.devicePixelRatio || 1;
	const width = Math.max(1, Math.round(bounds.width * pixelRatio));
	const height = Math.max(1, Math.round(bounds.height * pixelRatio));
	if (canvas.width === width && canvas.height === height) return;
	canvas.width = width;
	canvas.height = height;
}

function drawActiveScope({
	canvas,
	mode,
	sample,
}: {
	canvas: HTMLCanvasElement;
	mode: ScopeMode;
	sample: ScopeSampleData;
}): void {
	if (canvas.width <= SCOPE_PADDING * 2 || canvas.height <= SCOPE_PADDING * 2) {
		const context = canvas.getContext("2d");
		if (context) clearScopeCanvas(context, canvas.width, canvas.height);
		return;
	}

	if (mode === "waveform") {
		drawWaveform({ canvas, sample });
		return;
	}
	if (mode === "vectorscope") {
		drawVectorscope({ canvas, sample });
		return;
	}
	drawParade({ canvas, sample });
}

function drawEmptyScope({
	canvas,
	mode,
}: {
	canvas: HTMLCanvasElement;
	mode: ScopeMode;
}): void {
	const context = canvas.getContext("2d");
	if (!context) return;
	clearScopeCanvas(context, canvas.width, canvas.height);
	if (canvas.width <= SCOPE_PADDING * 2 || canvas.height <= SCOPE_PADDING * 2) {
		return;
	}
	if (mode === "vectorscope") {
		drawVectorscopeGrid(context, canvas.width, canvas.height);
		return;
	}
	if (mode === "parade") {
		drawParadeGrid(context, canvas.width, canvas.height);
		return;
	}
	drawWaveformGrid(context, canvas.width, canvas.height);
}

function clearScopeCanvas(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
): void {
	context.globalAlpha = 1;
	context.globalCompositeOperation = "source-over";
	context.setLineDash([]);
	context.lineWidth = 1;
	context.textAlign = "left";
	context.textBaseline = "alphabetic";
	context.clearRect(0, 0, width, height);
	context.fillStyle = "#030304";
	context.fillRect(0, 0, width, height);
}

function drawWaveform({
	canvas,
	sample,
}: {
	canvas: HTMLCanvasElement;
	sample: ScopeSampleData;
}): void {
	const context = canvas.getContext("2d");
	if (!context) return;
	const { width, height } = canvas;
	clearScopeCanvas(context, width, height);
	drawWaveformGrid(context, width, height);

	const plotLeft = SCOPE_PADDING;
	const plotTop = SCOPE_PADDING;
	const plotWidth = width - SCOPE_PADDING * 2;
	const plotHeight = height - SCOPE_PADDING * 2;
	const bins = Math.max(48, Math.min(160, Math.round(plotHeight / 2)));
	const density = new Uint16Array(sample.columns * bins);
	let maximumDensity = 1;

	for (let row = 0; row < sample.rows; row += 1) {
		for (let column = 0; column < sample.columns; column += 1) {
			const dataIndex = (row * sample.columns + column) * 4;
			const luma = getLuma(
				sample.pixels[dataIndex] ?? 0,
				sample.pixels[dataIndex + 1] ?? 0,
				sample.pixels[dataIndex + 2] ?? 0,
			);
			const bin = Math.min(bins - 1, Math.floor(luma * bins));
			const densityIndex = column * bins + bin;
			density[densityIndex] += 1;
			maximumDensity = Math.max(maximumDensity, density[densityIndex]);
		}
	}

	const cellWidth = plotWidth / sample.columns;
	const cellHeight = plotHeight / bins;
	for (let column = 0; column < sample.columns; column += 1) {
		for (let bin = 0; bin < bins; bin += 1) {
			const count = density[column * bins + bin];
			if (count === 0) continue;
			const alpha = 0.08 + Math.sqrt(count / maximumDensity) * 0.78;
			context.fillStyle = `rgba(226,232,240,${alpha})`;
			context.fillRect(
				plotLeft + column * cellWidth,
				plotTop + plotHeight - (bin + 1) * cellHeight,
				Math.max(1, cellWidth + 0.35),
				Math.max(1, cellHeight + 0.35),
			);
		}
	}
}

function drawWaveformGrid(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
): void {
	const plotLeft = SCOPE_PADDING;
	const plotTop = SCOPE_PADDING;
	const plotWidth = width - SCOPE_PADDING * 2;
	const plotHeight = height - SCOPE_PADDING * 2;

	context.font = `${Math.max(9, Math.round(height * 0.035))}px ui-monospace, monospace`;
	context.textAlign = "left";
	context.textBaseline = "middle";
	for (const level of GRID_LEVELS) {
		const y = plotTop + (1 - level) * plotHeight;
		context.strokeStyle =
			level === 0.5 ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.065)";
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo(plotLeft, Math.round(y) + 0.5);
		context.lineTo(plotLeft + plotWidth, Math.round(y) + 0.5);
		context.stroke();
		context.fillStyle = "rgba(255,255,255,0.28)";
		context.fillText(String(Math.round(level * 100)), 3, y);
	}
	for (const position of [0.25, 0.5, 0.75]) {
		const x = plotLeft + position * plotWidth;
		context.strokeStyle = "rgba(255,255,255,0.035)";
		context.beginPath();
		context.moveTo(Math.round(x) + 0.5, plotTop);
		context.lineTo(Math.round(x) + 0.5, plotTop + plotHeight);
		context.stroke();
	}
}

function drawVectorscope({
	canvas,
	sample,
}: {
	canvas: HTMLCanvasElement;
	sample: ScopeSampleData;
}): void {
	const context = canvas.getContext("2d");
	if (!context) return;
	const { width, height } = canvas;
	clearScopeCanvas(context, width, height);
	const geometry = drawVectorscopeGrid(context, width, height);
	context.globalCompositeOperation = "lighter";

	for (let row = 0; row < sample.rows; row += 1) {
		for (let column = 0; column < sample.columns; column += 1) {
			const dataIndex = (row * sample.columns + column) * 4;
			const red = sample.pixels[dataIndex] ?? 0;
			const green = sample.pixels[dataIndex + 1] ?? 0;
			const blue = sample.pixels[dataIndex + 2] ?? 0;
			const point = getVectorscopePoint({
				red,
				green,
				blue,
				centerX: geometry.centerX,
				centerY: geometry.centerY,
				radius: geometry.radius,
			});
			const maximum = Math.max(red, green, blue);
			const minimum = Math.min(red, green, blue);
			const saturation = maximum === 0 ? 0 : (maximum - minimum) / maximum;
			context.fillStyle = `rgba(${red},${green},${blue},${0.12 + saturation * 0.18})`;
			context.fillRect(point.x - 0.75, point.y - 0.75, 1.5, 1.5);
		}
	}
	context.globalCompositeOperation = "source-over";
}

function drawVectorscopeGrid(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
) {
	const centerX = width / 2;
	const centerY = height / 2;
	const radius = Math.min(width, height) * 0.39;
	context.strokeStyle = "rgba(255,255,255,0.08)";
	context.lineWidth = 1;
	for (const scale of [0.25, 0.5, 0.75, 1]) {
		context.beginPath();
		context.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
		context.stroke();
	}
	context.beginPath();
	context.moveTo(centerX - radius, centerY + 0.5);
	context.lineTo(centerX + radius, centerY + 0.5);
	context.moveTo(centerX + 0.5, centerY - radius);
	context.lineTo(centerX + 0.5, centerY + radius);
	context.stroke();

	const skinAngle = (-123 * Math.PI) / 180;
	context.strokeStyle = "rgba(251,191,36,0.22)";
	context.setLineDash([4, 4]);
	context.beginPath();
	context.moveTo(centerX, centerY);
	context.lineTo(
		centerX + Math.cos(skinAngle) * radius,
		centerY + Math.sin(skinAngle) * radius,
	);
	context.stroke();
	context.setLineDash([]);

	context.font = `${Math.max(9, Math.round(height * 0.037))}px ui-monospace, monospace`;
	context.textAlign = "center";
	context.textBaseline = "middle";
	for (const target of VECTOR_TARGETS) {
		const point = getVectorscopePoint({
			blue: target.blue,
			centerX,
			centerY,
			green: target.green,
			radius,
			red: target.red,
		});
		const offsetX = point.x - centerX;
		const offsetY = point.y - centerY;
		const targetDistance = Math.hypot(offsetX, offsetY);
		const labelScale = (radius * 0.96) / targetDistance;
		context.strokeStyle = target.color;
		context.strokeRect(point.x - 3, point.y - 3, 6, 6);
		context.fillStyle = target.color;
		context.fillText(
			target.label,
			centerX + offsetX * labelScale,
			centerY + offsetY * labelScale,
		);
	}

	return { centerX, centerY, radius };
}

function drawParade({
	canvas,
	sample,
}: {
	canvas: HTMLCanvasElement;
	sample: ScopeSampleData;
}): void {
	const context = canvas.getContext("2d");
	if (!context) return;
	const { width, height } = canvas;
	clearScopeCanvas(context, width, height);
	drawParadeGrid(context, width, height);

	const plotLeft = SCOPE_PADDING;
	const plotTop = SCOPE_PADDING;
	const plotWidth = width - SCOPE_PADDING * 2;
	const plotHeight = height - SCOPE_PADDING * 2;
	const gap = Math.max(4, width * 0.012);
	const bins = Math.max(48, Math.min(160, Math.round(plotHeight / 2)));

	for (const channelDefinition of RGB_CHANNELS) {
		const bounds = getParadeChannelBounds({
			channel: channelDefinition.channel,
			left: plotLeft,
			width: plotWidth,
			gap,
		});
		const density = new Uint16Array(sample.columns * bins);
		let maximumDensity = 1;
		for (let row = 0; row < sample.rows; row += 1) {
			for (let column = 0; column < sample.columns; column += 1) {
				const dataIndex =
					(row * sample.columns + column) * 4 + channelDefinition.channel;
				const value = (sample.pixels[dataIndex] ?? 0) / 255;
				const bin = Math.min(bins - 1, Math.floor(value * bins));
				const densityIndex = column * bins + bin;
				density[densityIndex] += 1;
				maximumDensity = Math.max(maximumDensity, density[densityIndex]);
			}
		}

		const cellWidth = bounds.width / sample.columns;
		const cellHeight = plotHeight / bins;
		for (let column = 0; column < sample.columns; column += 1) {
			for (let bin = 0; bin < bins; bin += 1) {
				const count = density[column * bins + bin];
				if (count === 0) continue;
				const alpha = 0.08 + Math.sqrt(count / maximumDensity) * 0.74;
				context.fillStyle = `rgba(${channelDefinition.color},${alpha})`;
				context.fillRect(
					bounds.left + column * cellWidth,
					plotTop + plotHeight - (bin + 1) * cellHeight,
					Math.max(1, cellWidth + 0.25),
					Math.max(1, cellHeight + 0.25),
				);
			}
		}
	}
}

function drawParadeGrid(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
): void {
	const plotLeft = SCOPE_PADDING;
	const plotTop = SCOPE_PADDING;
	const plotWidth = width - SCOPE_PADDING * 2;
	const plotHeight = height - SCOPE_PADDING * 2;
	const gap = Math.max(4, width * 0.012);

	context.font = `${Math.max(9, Math.round(height * 0.035))}px ui-monospace, monospace`;
	context.textAlign = "left";
	context.textBaseline = "middle";
	for (const level of GRID_LEVELS) {
		const y = plotTop + (1 - level) * plotHeight;
		context.strokeStyle =
			level === 0.5 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)";
		context.beginPath();
		context.moveTo(plotLeft, Math.round(y) + 0.5);
		context.lineTo(plotLeft + plotWidth, Math.round(y) + 0.5);
		context.stroke();
		context.fillStyle = "rgba(255,255,255,0.25)";
		context.fillText(String(Math.round(level * 100)), 3, y);
	}

	context.textAlign = "center";
	context.textBaseline = "top";
	for (const channelDefinition of RGB_CHANNELS) {
		const bounds = getParadeChannelBounds({
			channel: channelDefinition.channel,
			left: plotLeft,
			width: plotWidth,
			gap,
		});
		context.fillStyle = `rgb(${channelDefinition.color})`;
		context.fillText(
			channelDefinition.label,
			bounds.left + bounds.width / 2,
			2,
		);
		if (channelDefinition.channel > 0) {
			context.strokeStyle = "rgba(255,255,255,0.08)";
			context.beginPath();
			context.moveTo(bounds.left - gap / 2, plotTop);
			context.lineTo(bounds.left - gap / 2, plotTop + plotHeight);
			context.stroke();
		}
	}
}
