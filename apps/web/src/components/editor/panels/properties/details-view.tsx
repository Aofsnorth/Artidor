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

/** Read-only project summary; Reset panel restores inspector preferences only. */
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
		// This resets inspector preferences, never project settings or media.
		resetMediaSummarySize("default");
		setActiveTab("video", "transform");
	};

	return (
		<div className="flex h-full w-full flex-col flex-1 min-h-0">
			<div className="border-b border-border px-3 py-3">
				<div className="flex items-center justify-between">
					<div className="text-xs font-semibold text-foreground">
						Details
					</div>
					<button
						type="button"
						onClick={onResetAll}
						className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						Reset panel
					</button>
				</div>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				{/* `min-h-full` (not `h-full`) lets the stack fill the panel
				   when there's room but grow past it — and scroll — when the
				   panel is short. Combined with sections that keep their
				   natural height (see <Section/>), this stops the cards from
				   squashing into each other on a small window. */}
				<div className="flex min-h-full flex-col gap-2 p-2.5">
					<ProjectHero
						name={meta.name}
						thumbnail={meta.thumbnail}

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
									<span className="text-xs text-muted-foreground">fps</span>
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

	onRegenerate,
}: {
	name: string;
	thumbnail: string | undefined;

	onRegenerate: () => void | Promise<void>;
}) {
	return (
		<div className="border-b border-border pb-3">
			{/* Thumbnail is a compact `h-20` (80px) strip — the user
			   just selected nothing on the timeline, so this is a
			   at-a-glance summary, not a hero shot. The thumbnail
			   is wide enough to recognise the first frame but small
			   enough that the data cards below still have room. */}
			<div className="group relative mb-3 flex h-20 w-full items-center justify-center overflow-hidden rounded-md bg-card">
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
			</div>
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
		<section className="flex shrink-0 flex-col border-b border-border py-3 last:border-b-0">
			<header className="mb-3 flex shrink-0 items-center gap-2 text-xs font-medium text-foreground">
				<HugeiconsIcon icon={icon} className="size-3" />
				<span>{title}</span>
			</header>
			<dl className="flex flex-1 flex-col gap-1">{children}</dl>
		</section>
	);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-3 py-1 text-xs">
			<dt className="shrink-0 text-muted-foreground">{label}</dt>
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
