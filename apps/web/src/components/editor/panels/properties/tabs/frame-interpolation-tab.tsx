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
	SectionContent,
	SectionHeader,
	SectionTitle,
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

export function FrameInterpolationTab({
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
				<div className="flex flex-col gap-2 px-4 pb-3 pt-1">
					<p className="text-[0.7rem] leading-relaxed text-white/45">
						How in-between frames are synthesized when the source rate
						doesn&apos;t align with the retimed rate (e.g. 24→60 fps
						slow-motion).
					</p>

					<div className="flex flex-col gap-1.5">
						{METHODS.map((method) => {
							const usable = isUsable(method.id);
							const isCurrent = method.id === current;
							const isPending = method.id === pending;
							const Icon = method.icon;
							return (
								<button
									type="button"
									key={method.id}
									disabled={!usable}
									onClick={() => setMethod(method.id)}
									className={cn(
										"group relative flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-all",
										isCurrent
											? "border-cyan-400/40 bg-cyan-400/[0.06]"
											: "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
										!usable && "cursor-not-allowed opacity-40",
									)}
								>
									<div
										className={cn(
											"grid size-7 place-items-center rounded-md",
											isCurrent
												? "bg-cyan-400/15 text-cyan-300"
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
													className="size-3 text-cyan-300"
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

					{caps && (
						<div className="mt-2 flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
							<div className="size-1.5 rounded-full bg-emerald-400" />
							<span className="text-[0.66rem] text-white/50">
								Hardware: {caps.hardware.toUpperCase()}
								{caps.ai
									? " · AI ready"
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
