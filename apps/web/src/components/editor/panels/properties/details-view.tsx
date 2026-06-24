"use client";

/**
 * Project-details view rendered when the user has nothing selected on
 * the timeline. Replaces the old "It's empty here" placeholder with
 * something actually useful — at-a-glance stats about the active
 * project so the inspector panel stays informative instead of going
 * dark.
 *
 * Sections (in display order):
 *  1. Header  — name (large), optional thumbnail, type/version chip
 *  2. Settings — duration, fps, resolution, background
 *  3. Activity — created, modified, project id
 *
 * Read paths are all derived from the live editor state via the
 * `useEditor` hooks, so anything that changes elsewhere (rename,
 * duration, etc.) reflects here without a manual refresh.
 */

import { useState } from "react";
import Image from "next/image";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
	Calendar03Icon,
	Copy01Icon,
	InformationCircleIcon,
	Refresh01Icon,
	Settings01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import { usePropertiesStore } from "./stores/properties-store";
import { formatDate } from "@/utils/date";
import { formatTimecode, mediaTimeToSeconds } from "artidor-wasm";
import { cn } from "@/utils/ui";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProjectDetailsView() {
	const editor = useEditor();
	// We only re-render on the fields we actually display so this stays
	// cheap. Selecting nothing on the timeline doesn't churn through the
	// rest of the editor's subscriptions.
	const activeProject = useEditor((e) => e.project.getActive());
	const setActiveTab = usePropertiesStore((s) => s.setActiveTab);
	const resetMediaSummarySize = usePropertiesStore(
		(s) => s.setMediaSummarySize,
	);

	if (!activeProject) {
		return (
			<div className="flex h-full items-center justify-center px-6 text-center">
				<p className="text-muted-foreground text-sm">No project loaded.</p>
			</div>
		);
	}

	const meta = activeProject.metadata;
	const settings = activeProject.settings;
	const fps = Math.round(settings.fps.numerator / settings.fps.denominator);
	const durationSeconds = mediaTimeToSeconds({
		time: Math.round(meta.duration),
	});
	const durationFormatted =
		meta.duration > 0
			? (formatTimecode({
					time: Math.round(meta.duration),
					format: durationSeconds >= 3600 ? "HH:MM:SS" : "MM:SS",
				}) ?? "0:00")
			: "0:00";

	const resolution = `${settings.canvasSize.width} × ${settings.canvasSize.height}`;
	const backgroundLabel = (() => {
		const bg = settings.background;
		if (bg.type === "color") return "Solid color";
		return `Blur · ${bg.blurIntensity.toFixed(1)}`;
	})();

	const onResetAll = () => {
		// The Reset-all button normally applies to the selected element.
		// With nothing selected it's still useful to revert any
		// inspector-level preferences (e.g. accidentally collapsed the
		// media card) back to defaults.
		resetMediaSummarySize("default");
		setActiveTab("video", "transform");
	};

	return (
		<div className="flex h-full w-full flex-col flex-1 min-h-0">
			<div className="border-b border-white/10 bg-linear-to-b from-white/[0.045] to-transparent px-3.5 py-3.5">
				<div className="flex items-center justify-between">
					<div className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/85">
						Details
					</div>
					<button
						type="button"
						onClick={onResetAll}
						className="rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-1 text-[0.65rem] text-white/[0.55] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
					>
						Reset all
					</button>
				</div>
			</div>

			<ScrollArea className="min-h-0 flex-1 scrollbar-hidden">
				{/* `min-h-full` (not `h-full`) lets the stack fill the panel
				   when there's room but grow past it — and scroll — when the
				   panel is short. Combined with sections that keep their
				   natural height (see <Section/>), this stops the cards from
				   squashing into each other on a small window. */}
				<div className="flex min-h-full flex-col gap-2 p-2.5">
					<ProjectHero
						name={meta.name}
						thumbnail={meta.thumbnail}
						onResetAll={onResetAll}
						onRegenerate={async () => {
							try {
								toast.loading("Regenerating thumbnail…", {
									id: "regen-thumbnail",
								});
								const manager = (
									editor as unknown as {
										project?: {
											updateThumbnailFromTimeline?: () => Promise<boolean>;
										};
									}
								).project;
								// Fall back to triggering the same exit-time
								// routine the manager already runs on save.
								const result = await manager?.updateThumbnailFromTimeline?.();
								if (result) {
									toast.success("Thumbnail regenerated", {
										id: "regen-thumbnail",
									});
								} else {
									toast.error("Could not regenerate thumbnail", {
										id: "regen-thumbnail",
									});
								}
							} catch (error) {
								toast.error("Failed to regenerate thumbnail", {
									id: "regen-thumbnail",
									description:
										error instanceof Error ? error.message : undefined,
								});
							}
						}}
					/>

					<Section icon={Settings01Icon} title="Project">
						<InfoRow label="Duration" value={durationFormatted} />
						<InfoRow
							label="Frame rate"
							value={
								<span className="inline-flex items-baseline gap-1">
									<span>{fps}</span>
									<span className="text-[0.65rem] text-white/40">fps</span>
								</span>
							}
						/>
						<InfoRow label="Resolution" value={resolution} />
						<InfoRow label="Background" value={backgroundLabel} />
					</Section>

					<Section icon={Calendar03Icon} title="Activity">
						<InfoRow
							label="Created"
							value={formatDate({ date: meta.createdAt })}
						/>
						<InfoRow
							label="Modified"
							value={formatDate({ date: meta.updatedAt })}
						/>
						<InfoRow
							label="Project ID"
							value={<ProjectIdChip id={meta.id} />}
						/>
					</Section>
				</div>
			</ScrollArea>
		</div>
	);
}

function ProjectHero({
	name,
	thumbnail,
	onResetAll,
	onRegenerate,
}: {
	name: string;
	thumbnail: string | undefined;
	onResetAll: () => void;
	onRegenerate: () => void | Promise<void>;
}) {
	return (
		<div className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5 shadow-inner shadow-white/[0.02]">
			{/* Thumbnail is a compact `h-20` (80px) strip — the user
			   just selected nothing on the timeline, so this is a
			   at-a-glance summary, not a hero shot. The thumbnail
			   is wide enough to recognise the first frame but small
			   enough that the data cards below still have room. */}
			<div className="group relative mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-md border border-white/10 bg-gradient-to-br from-white/[0.06] to-black/40 shadow-[0_4px_14px_rgba(0,0,0,0.2)]">
				{thumbnail ? (
					<Image
						src={thumbnail}
						alt={`${name} thumbnail`}
						fill
						sizes="240px"
						className="object-cover"
						unoptimized
					/>
				) : (
					<HugeiconsIcon
						icon={InformationCircleIcon}
						className="size-5 text-white/30"
					/>
				)}
				{/* Regenerate button overlays the thumbnail's bottom-right
				   corner — visible only on hover, so the hero stays clean. */}
				<button
					type="button"
					onClick={onRegenerate}
					aria-label="Regenerate thumbnail from first frame"
					title="Regenerate thumbnail from first frame"
					className="absolute bottom-1 right-1 grid size-5 place-items-center rounded border border-white/15 bg-black/55 text-white/75 backdrop-blur-sm opacity-0 transition-opacity hover:bg-black/80 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
				>
					<HugeiconsIcon icon={Refresh01Icon} className="size-2.5" />
				</button>
			</div>
			<div className="flex items-center justify-between gap-1.5">
				<div
					className="truncate text-[0.88rem] font-semibold text-white"
					title={name}
				>
					{name}
				</div>
				<button
					type="button"
					onClick={onResetAll}
					className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-0.5 text-[0.62rem] text-white/[0.55] transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
				>
					Reset all
				</button>
			</div>
			<div className="mt-1 flex items-center justify-center gap-1.5 text-[0.62rem] text-white/40">
				<span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-px uppercase tracking-[0.14em]">
					Project
				</span>
			</div>
			<button
				type="button"
				onClick={onResetAll}
				title="Reveal in the Projects page"
				className="mt-2 w-full rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[0.62rem] text-white/55 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
			>
				View full project info
			</button>
		</div>
	);
}

function Section({
	icon,
	title,
	children,
}: {
	icon: IconSvgElement;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-1 flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5 shadow-inner shadow-white/[0.015]">
			<header className="mb-1.5 flex shrink-0 items-center gap-1.5 border-b border-white/[0.05] pb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/40">
				<HugeiconsIcon icon={icon} className="size-3" />
				<span>{title}</span>
			</header>
			<dl className="flex flex-1 flex-col gap-1">{children}</dl>
		</section>
	);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3 py-0.5 text-[0.7rem]">
			<dt className="shrink-0 text-white/45">{label}</dt>
			<dd className="min-w-0 truncate text-right font-medium text-white/90">
				{value}
			</dd>
		</div>
	);
}

/**
 * Rounded monospace pill for the project id with a small copy button.
 * Copies the full id to the clipboard; the visible text is the short
 * prefix to keep the row tight.
 */
function ProjectIdChip({ id }: { id: string }) {
	const [copied, setCopied] = useState(false);
	const short = id.slice(0, 8);

	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(id);
			setCopied(true);
			toast.success("Project ID copied to clipboard");
			window.setTimeout(() => setCopied(false), 1200);
		} catch (err) {
			toast.error("Could not copy project ID", {
				description: err instanceof Error ? err.message : "Unknown error",
			});
		}
	};

	return (
		<span className="inline-flex items-center gap-1">
			<code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.7rem] text-white/85">
				{short}
			</code>
			<button
				type="button"
				onClick={onCopy}
				aria-label={copied ? "Copied project ID" : "Copy project ID"}
				title={copied ? "Copied" : "Copy full project ID"}
				className={cn(
					"grid size-5 place-items-center rounded border transition focus:outline-none",
					copied
						? "border-emerald-500/30 bg-emerald-400/[0.1] text-emerald-300"
						: "border-white/[0.08] bg-white/[0.04] text-white/55 hover:border-white/15 hover:bg-white/[0.08] hover:text-white",
				)}
			>
				<HugeiconsIcon icon={Copy01Icon} className="size-3" />
			</button>
		</span>
	);
}
