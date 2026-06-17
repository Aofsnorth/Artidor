"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
	Copy01Icon,
	InformationCircleIcon,
	Time01Icon,
	Link01Icon,
	Layers01Icon,
	Bookmark01Icon,
	MagicWand05Icon,
	PlayIcon,
	ViewIcon,
	ViewOffSlashIcon,
	VolumeHighIcon,
	VolumeMuteIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import type { EditorCore } from "@/core";
import { getElementDisplayName } from "@/lib/timeline";
import type { MediaAsset } from "@/lib/media/types";
import type {
	AudioElement,
	TimelineElement,
	VideoElement,
} from "@/lib/timeline";
import { mediaTimeToSeconds } from "artidor-wasm";
import { cn } from "@/utils/ui";

interface ElementTabProps {
	element: TimelineElement;
	trackId: string;
	trackName: string;
	mediaAssets: MediaAsset[];
}

type SummaryItem = {
	icon: typeof InformationCircleIcon;
	label: string;
	value: string;
	mono?: boolean;
	copyable?: string;
};

type ToggleItem = {
	icon: typeof ViewIcon;
	label: string;
	isOn: boolean;
	onToggle: () => void;
};

/**
 * Read-only (mostly) summary of the element itself: identity, source, track,
 * timeline position, and structural relationships. This tab is intentionally
 * distinct from "Transform" (which is about animation/transform values) and
 * from the asset/media-side views in other tabs — it answers "what is this
 * element?" rather than "how is it drawn?".
 */
export function ElementTab({
	element,
	trackId,
	trackName,
	mediaAssets,
}: ElementTabProps) {
	const editor = useEditor();
	const mediaId = "mediaId" in element ? element.mediaId : undefined;
	const media = mediaAssets.find((asset) => asset.id === mediaId);

	const summaryItems: SummaryItem[] = [
		{ icon: InformationCircleIcon, label: "Type", value: element.type },
		{
			icon: Copy01Icon,
			label: "ID",
			value: element.id,
			mono: true,
			copyable: element.id,
		},
		{ icon: Layers01Icon, label: "Track", value: trackName },
		{
			icon: Time01Icon,
			label: "Start",
			value: formatTimelineTime({ ticks: element.startTime }),
		},
		{
			icon: Time01Icon,
			label: "Duration",
			value: formatTimelineTime({ ticks: element.duration }),
		},
	];

	if ("sourceDuration" in element && element.sourceDuration) {
		summaryItems.push({
			icon: Time01Icon,
			label: "Source length",
			value: formatTimelineTime({ ticks: element.sourceDuration }),
		});
	}
	if (element.trimStart > 0 || element.trimEnd > 0) {
		summaryItems.push({
			icon: Time01Icon,
			label: "Trim",
			value: `${formatTimelineTime({ ticks: element.trimStart })} → ${formatTimelineTime({ ticks: element.trimEnd })}`,
		});
	}

	const animationCount = countAnimations({ element });
	const effectCount = countEffects({ element });
	const bookmarkCount = element.bookmarks?.length ?? 0;
	const parentCount = "parentId" in element && element.parentId ? 1 : 0;

	const relationshipItems: SummaryItem[] = [
		{
			icon: Link01Icon,
			label: "Parent",
			value: "parentId" in element && element.parentId
				? "Linked"
				: "None",
		},
		{
			icon: Layers01Icon,
			label: "Group",
			value: element.groupId ? element.groupId : "None",
			mono: Boolean(element.groupId),
		},
		{
			icon: Bookmark01Icon,
			label: "Bookmarks",
			value: String(bookmarkCount),
		},
		{
			icon: MagicWand05Icon,
			label: "Effects",
			value: String(effectCount),
		},
		{
			icon: PlayIcon,
			label: "Animations",
			value: String(animationCount),
		},
	];

	const toggleItems: ToggleItem[] = [];
	if ("hidden" in element && element.hidden !== undefined) {
		const isHidden = Boolean(element.hidden);
		toggleItems.push({
			icon: isHidden ? ViewOffSlashIcon : ViewIcon,
			label: isHidden ? "Hidden" : "Visible",
			isOn: !isHidden,
			onToggle: () => toggleHidden({ editor, element, trackId }),
		});
	}
	if (isAudioishElement(element) && hasVolumeProperty(element)) {
		const isMuted = isElementMuted(element);
		toggleItems.push({
			icon: isMuted ? VolumeMuteIcon : VolumeHighIcon,
			label: isMuted ? "Muted" : "Audible",
			isOn: !isMuted,
			onToggle: () => toggleMuted({ editor, element, trackId }),
		});
	}

	return (
		<div className="flex flex-col gap-4 p-3.5">
			<section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
				<header className="mb-2 flex items-center gap-2">
					<HugeiconsIcon
						icon={InformationCircleIcon}
						size={14}
						className="text-white/55"
					/>
					<h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/80">
						Identity
					</h3>
				</header>
				<p className="mb-2 text-xs text-white/45">
					{getElementDisplayName({ element, mediaName: media?.name })}
				</p>
				<dl className="flex flex-col gap-1.5">
					{summaryItems.map((item) => (
						<SummaryRow key={item.label} item={item} />
					))}
				</dl>
			</section>

			{media && (
				<section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
					<header className="mb-2 flex items-center gap-2">
						<HugeiconsIcon
							icon={InformationCircleIcon}
							size={14}
							className="text-white/55"
						/>
						<h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/80">
							Source media
						</h3>
					</header>
					<dl className="flex flex-col gap-1.5">
						<SummaryRow
							item={{
								icon: InformationCircleIcon,
								label: "Name",
								value: media.name,
							}}
						/>
						<SummaryRow
							item={{
								icon: InformationCircleIcon,
								label: "Kind",
								value: media.type,
							}}
						/>
						<SummaryRow
							item={{
								icon: Copy01Icon,
								label: "Media ID",
								value: media.id,
								mono: true,
								copyable: media.id,
							}}
						/>
					</dl>
				</section>
			)}

			<section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
				<header className="mb-2 flex items-center gap-2">
					<HugeiconsIcon
						icon={Layers01Icon}
						size={14}
						className="text-white/55"
					/>
					<h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/80">
						Relationships
					</h3>
				</header>
				<dl className="flex flex-col gap-1.5">
					{relationshipItems.map((item) => (
						<SummaryRow key={item.label} item={item} />
					))}
				</dl>
				{(parentCount > 0 || bookmarkCount > 0) && (
					<p className="mt-3 text-[0.66rem] leading-relaxed text-white/40">
						Use the Link tab to manage parenting, or jump to Animation to
						edit bookmarks.
					</p>
				)}
			</section>

			{toggleItems.length > 0 && (
				<section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
					<header className="mb-2 flex items-center gap-2">
						<HugeiconsIcon
							icon={ViewIcon}
							size={14}
							className="text-white/55"
						/>
						<h3 className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/80">
							State
						</h3>
					</header>
					<div className="flex flex-col gap-1.5">
						{toggleItems.map((item) => (
							<StateRow key={item.label} item={item} />
						))}
					</div>
				</section>
			)}
		</div>
	);
}

function SummaryRow({ item }: { item: SummaryItem }) {
	return (
		<div className="flex items-center justify-between gap-2 text-xs">
			<dt className="flex shrink-0 items-center gap-1.5 text-white/45">
				<HugeiconsIcon icon={item.icon} size={11} className="opacity-70" />
				<span>{item.label}</span>
			</dt>
			<dd className="flex min-w-0 items-center gap-1.5">
				<span
					className={cn(
						"truncate text-right text-white/85",
						item.mono && "font-mono text-[0.7rem]",
					)}
					title={item.value}
				>
					{item.value}
				</span>
				{item.copyable && <CopyButton value={item.copyable} />}
			</dd>
		</div>
	);
}

function StateRow({ item }: { item: ToggleItem }) {
	return (
		<button
			type="button"
			className="flex items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-xs text-white/80 transition hover:border-white/[0.16] hover:bg-white/[0.05]"
			onClick={item.onToggle}
		>
			<span className="flex items-center gap-1.5">
				<HugeiconsIcon icon={item.icon} size={12} className="opacity-70" />
				{item.label}
			</span>
			<span
				className={cn(
					"rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider",
					item.isOn
						? "bg-emerald-400/15 text-emerald-200"
						: "bg-white/10 text-white/50",
				)}
			>
				{item.isOn ? "On" : "Off"}
			</span>
		</button>
	);
}

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			aria-label={`Copy ${value}`}
			className="grid size-5 shrink-0 place-items-center rounded border border-white/[0.08] bg-white/[0.04] text-white/55 transition hover:border-white/[0.2] hover:bg-white/[0.08] hover:text-white"
			onClick={() => {
				if (typeof navigator === "undefined" || !navigator.clipboard) return;
				navigator.clipboard.writeText(value).then(
					() => {
						setCopied(true);
						toast.success("Copied to clipboard");
						setTimeout(() => setCopied(false), 1200);
					},
					() => {
						toast.error("Couldn't copy to clipboard");
					},
				);
			}}
		>
			<HugeiconsIcon
				icon={Copy01Icon}
				size={10}
				className={cn(copied && "text-emerald-300")}
			/>
		</button>
	);
}

function formatTimelineTime({ ticks }: { ticks: number }): string {
	const seconds = mediaTimeToSeconds({ time: ticks });
	if (seconds < 1) {
		// sub-second precision
		return `${(seconds * 1000).toFixed(0)} ms`;
	}
	const totalSeconds = Math.round(seconds);
	const minutes = Math.floor(totalSeconds / 60);
	const secs = totalSeconds % 60;
	if (minutes === 0) {
		return `${secs}s`;
	}
	return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}

function countAnimations({ element }: { element: TimelineElement }): number {
	const animations = (element as { animations?: unknown }).animations;
	if (!animations) return 0;
	if (Array.isArray(animations)) return animations.length;
	if (typeof animations === "object" && animations !== null) {
		return Object.keys(animations).length;
	}
	return 0;
}

function countEffects({ element }: { element: TimelineElement }): number {
	const effects = (element as { effects?: unknown }).effects;
	if (Array.isArray(effects)) return effects.length;
	return 0;
}

function isAudioishElement(
	element: TimelineElement,
): element is AudioElement | VideoElement {
	return element.type === "audio" || element.type === "video";
}

function hasVolumeProperty(
	element: AudioElement | VideoElement,
): element is AudioElement | (VideoElement & { volume?: number }) {
	return true;
}

function isElementMuted(element: AudioElement | VideoElement): boolean {
	if (element.type === "audio") {
		return Boolean(element.muted);
	}
	// Video: muted is per-clip, not the source audio
	return Boolean(element.muted);
}

function toggleHidden({
	editor,
	element,
	trackId,
}: {
	editor: EditorCore;
	element: TimelineElement;
	trackId: string;
}) {
	const current = "hidden" in element ? Boolean(element.hidden) : false;
	editor.timeline.updateElements({
		updates: [
			{
				trackId,
				elementId: element.id,
				patch: { hidden: !current },
			},
		],
	});
}

function toggleMuted({
	editor,
	element,
	trackId,
}: {
	editor: EditorCore;
	element: AudioElement | VideoElement;
	trackId: string;
}) {
	editor.timeline.updateElements({
		updates: [
			{
				trackId,
				elementId: element.id,
				patch: { muted: !isElementMuted(element) },
			},
		],
	});
}
