"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	ArrowReloadHorizontalIcon,
	FlashIcon,
	SparklesIcon,
	AtomIcon,
	Loading02Icon,
	CheckmarkCircle02Icon,
	AlertCircleIcon,
	ZapIcon,
	Time01Icon,
	Settings02Icon,
} from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { useElementPreview } from "@/hooks/use-element-preview";
import {
	getFrameInterpolationCapabilities,
	type FrameInterpolationCapabilities,
} from "@/lib/frame-interpolation";
import type { RetimableElement } from "@/lib/timeline";
import {
	Section,
	SectionHeader,
	SectionTitle,
	SectionContent,
} from "@/components/section";
import { cn } from "@/utils/ui";

const METHODS = [
	{
		id: "blend",
		name: "Frame Blending",
		hint: "Cross-dissolve. Every device. Free.",
		quality: 1,
		speed: 5,
		icon: FlashIcon,
	},
	{
		id: "optical-flow",
		name: "Optical Flow",
		hint: "Block matching. Warps motion vectors.",
		quality: 3,
		speed: 3,
		icon: ArrowReloadHorizontalIcon,
	},
	{
		id: "ai",
		name: "AI Interpolation",
		hint: "RIFE v4.9 neural net. Best quality.",
		quality: 5,
		speed: 1,
		icon: SparklesIcon,
	},
] as const;

type MethodId = (typeof METHODS)[number]["id"];

/**
 * One-tap quality presets. Each maps a user-visible label to the
 * interpolation method + the AI-capable flag it requires, so the
 * segmented control can show a per-device warning inline instead of
 * forcing the user to click a method and discover it's greyed out.
 *
 * Mappings:
 *   - Fast       → Frame Blending    (every device, real-time safe)
 *   - Balanced   → Optical Flow      (WebGL2+ — blocks artifacts better)
 *   - High Q.    → AI (RIFE v4.9)    (WebGPU only — best quality, slow)
 */
const QUALITY_PRESETS: Array<{
	id: "fast" | "balanced" | "high";
	label: string;
	hint: string;
	method: MethodId;
	icon: typeof FlashIcon;
}> = [
	{
		id: "fast",
		label: "Fast",
		hint: "Real-time. Every device.",
		method: "blend",
		icon: Time01Icon,
	},
	{
		id: "balanced",
		label: "Balanced",
		hint: "Block-matching flow. Needs WebGL2.",
		method: "optical-flow",
		icon: Settings02Icon,
	},
	{
		id: "high",
		label: "High Quality",
		hint: "RIFE v4.9 neural net. Needs WebGPU.",
		method: "ai",
		icon: SparklesIcon,
	},
];

/**
 * Map a frame-interpolation method back to the one-tap quality preset
 * that selects it. Used to highlight the matching quality chip when
 * the user picks a method directly.
 */
const METHOD_TO_QUALITY: Record<
	MethodId,
	(typeof QUALITY_PRESETS)[number]["id"]
> = {
	blend: "fast",
	"optical-flow": "balanced",
	ai: "high",
};

/**
 * Reusable block of frame-interpolation controls. Rendered as a
 * collapsible sub-section inside the Speed tab (replacing the
 * standalone tab) so all retime-related controls live in one place.
 */
export function FrameInterpolationSection({
	element,
	trackId,
}: {
	element: RetimableElement;
	trackId: string;
}) {
	const editor = useEditor();
	const { renderElement, commit } = useElementPreview({
		trackId,
		elementId: element.id,
		fallback: element,
	});
	const retime = (renderElement as RetimableElement).retime;
	const current = (retime?.interpolation as MethodId | undefined) ?? "blend";
	const [caps, setCaps] = useState<FrameInterpolationCapabilities | null>(null);
	const [pending, setPending] = useState<MethodId | null>(null);

	useEffect(() => {
		let cancelled = false;
		getFrameInterpolationCapabilities().then((c) => {
			if (!cancelled) setCaps(c);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const setMethod = (id: MethodId) => {
		setPending(id);
		const next = {
			...(retime ?? { rate: 1 }),
			interpolation: id,
		} as typeof retime;
		editor.timeline.updateElements({
			updates: [{ trackId, elementId: element.id, patch: { retime: next } }],
		});
		setTimeout(() => {
			commit();
			setPending(null);
		}, 0);
	};

	const isUsable = (id: MethodId): boolean => {
		if (!caps) return id === "blend";
		if (id === "blend") return true;
		if (id === "optical-flow") return caps.opticalFlow;
		return caps.ai;
	};

	const qualityUsable = (
		id: (typeof QUALITY_PRESETS)[number]["id"],
	): boolean => {
		const preset = QUALITY_PRESETS.find((p) => p.id === id);
		if (!preset) return false;
		return isUsable(preset.method);
	};

	return (
		<Section collapsible sectionKey={`${element.id}:frame-interpolation`}>
			<SectionHeader>
				<SectionTitle>
					<span className="inline-flex items-center gap-1.5">
						<HugeiconsIcon icon={AtomIcon} className="size-3.5" />
						Frame Interpolation
					</span>
				</SectionTitle>
			</SectionHeader>
			<SectionContent>
				<div className="flex flex-col gap-3 px-4 pb-3 pt-1">
					<p className="text-[0.7rem] leading-relaxed text-white/45">
						How in-between frames are synthesized when the source rate
						doesn&apos;t align with the retimed rate (e.g. 24→60 fps
						slow-motion).
					</p>

					{/* Quality preset chips — Fast / Balanced / High Quality.
					   Maps to a method under the hood, but the user sees a
					   single one-tap choice with an inline "needs WebGPU"
					   hint when the device can't run it. */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-white/45">
							<span>Quality</span>
							<span className="font-mono text-white/65">
								{QUALITY_PRESETS.find(
									(p) => p.id === METHOD_TO_QUALITY[current],
								)?.label ?? "—"}
							</span>
						</div>
						<div className="grid grid-cols-3 gap-1">
							{QUALITY_PRESETS.map((preset) => {
								const usable = qualityUsable(preset.id);
								const isCurrent = METHOD_TO_QUALITY[current] === preset.id;
								const Icon = preset.icon;
								return (
									<button
										key={preset.id}
										type="button"
										disabled={!usable}
										onClick={() => setMethod(preset.method)}
										title={
											usable
												? `${preset.label} — ${preset.hint}`
												: `${preset.label} — unavailable on this device`
										}
										className={cn(
											"group flex flex-col items-center gap-1 rounded-md border px-2 py-2 transition-all",
											isCurrent
												? "border-white/35 bg-white/[0.08] text-white"
												: "border-white/[0.08] bg-white/[0.02] text-white/55 hover:border-white/15 hover:bg-white/[0.04] hover:text-white/85",
											!usable && "cursor-not-allowed opacity-40",
										)}
									>
										<HugeiconsIcon icon={Icon} className="size-3.5" />
										<span className="text-[0.62rem] font-medium uppercase tracking-[0.08em]">
											{preset.label}
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Per-method override — power users can still pick the
					   specific interpolation algorithm when one-tap quality
					   isn't granular enough. */}
					<details className="group/advanced">
						<summary
							className={cn(
								"flex h-6 cursor-pointer items-center gap-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/45 outline-none transition-colors hover:text-white/70",
								"list-none [&::-webkit-details-marker]:hidden",
							)}
						>
							<HugeiconsIcon
								icon={ZapIcon}
								className="size-3 transition-transform group-open/advanced:rotate-90"
							/>
							Advanced — pick a specific method
						</summary>
						<div className="mt-2 flex flex-col gap-1.5">
							{METHODS.map((method) => {
								const usable = isUsable(method.id);
								const isCurrent = method.id === current;
								const isPending = method.id === pending;
								const Icon = method.icon;
								return (
									<button
										key={method.id}
										type="button"
										disabled={!usable}
										onClick={() => setMethod(method.id)}
										className={cn(
											"group relative flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all",
											isCurrent
												? "border-white/35 bg-white/[0.08]"
												: "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
											!usable && "cursor-not-allowed opacity-40",
										)}
									>
										<div
											className={cn(
												"grid size-7 place-items-center rounded-md",
												isCurrent
													? "bg-white/95 text-[#09090b]"
													: "bg-white/[0.05] text-white/60",
											)}
										>
											<HugeiconsIcon icon={Icon} className="size-3.5" />
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="text-[0.78rem] font-medium text-white/90">
													{method.name}
												</span>
												{isCurrent && (
													<HugeiconsIcon
														icon={CheckmarkCircle02Icon}
														className="size-3 text-white"
													/>
												)}
												{isPending && (
													<HugeiconsIcon
														icon={Loading02Icon}
														className="size-3 animate-spin text-white/40"
													/>
												)}
											</div>
											<div className="text-[0.68rem] leading-snug text-white/40">
												{method.hint}
											</div>
											<div className="mt-1.5 flex items-center gap-3">
												<QualityBar value={method.quality} label="Quality" />
												<QualityBar value={method.speed} label="Speed" invert />
											</div>
										</div>
										{!usable && (
											<HugeiconsIcon
												icon={AlertCircleIcon}
												className="size-3.5 shrink-0 text-white/30"
											/>
										)}
									</button>
								);
							})}
						</div>
					</details>

					{caps && (
						<div
							className={cn(
								"mt-2 flex items-center gap-2 rounded-md border px-2.5 py-1.5",
								caps.ai
									? "border-amber-300/20 bg-amber-400/[0.04]"
									: "border-white/[0.06] bg-white/[0.02]",
							)}
						>
							<div
								className={cn(
									"size-1.5 rounded-full",
									caps.ai
										? "bg-amber-300"
										: caps.opticalFlow
											? "bg-cyan-300"
											: "bg-emerald-400",
								)}
							/>
							<span className="text-[0.66rem] text-white/55">
								Hardware: {caps.hardware.toUpperCase()}
								{caps.ai
									? " · AI ready (heavy on weak GPUs)"
									: caps.opticalFlow
										? " · Optical flow ready"
										: " · Blend only"}
							</span>
						</div>
					)}
				</div>
			</SectionContent>
		</Section>
	);
}

/** Backwards-compat alias — older call sites still reference the
 *  `FrameInterpolationTab` name. New code should use
 *  `FrameInterpolationSection`. */
export const FrameInterpolationTab = FrameInterpolationSection;

function QualityBar({
	value,
	label,
	invert,
}: {
	value: number;
	label: string;
	invert?: boolean;
}) {
	const filled = invert ? 6 - value : value;
	return (
		<div className="flex items-center gap-1">
			<span className="text-[0.6rem] uppercase tracking-wider text-white/30">
				{label}
			</span>
			<div className="flex gap-0.5">
				{Array.from({ length: 5 }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static 5-element bar
						key={i}
						className={cn(
							"h-1.5 w-1.5 rounded-[1px]",
							i < filled
								? invert
									? "bg-emerald-400/70"
									: "bg-amber-400/70"
								: "bg-white/10",
						)}
					/>
				))}
			</div>
		</div>
	);
}
