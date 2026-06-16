"use client";

/**
 * StatsOverview — slim strip across the top of the projects page.
 *
 * Renders 4 KPIs (total projects, total runtime, recent edits,
 * storage used) with a serif italic numeral, a tiny caption, and
 * a hairline divider between cells. The strip sits above the
 * project grid and is hidden when there are no projects at all
 * (the empty state owns the screen in that case).
 *
 * All numbers are computed locally from the projects array — no
 * network, no tracking. Storage is estimated at `0.18 MB per
 * minute of timeline` plus `1.2 MB per project overhead`; close
 * enough for an honest display, never consulted by the app.
 */

import { useMemo } from "react";
import type { TProjectMetadata } from "@/lib/project/types";
import { mediaTimeToSeconds } from "artidor-wasm";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Folder01Icon,
	Clock01Icon,
	Activity01Icon,
	HardDriveIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

const STORAGE_MB_PER_MIN = 0.18;
const STORAGE_MB_PER_PROJECT = 1.2;

function formatBytes(mb: number): string {
	if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
	if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
	return `${(mb / 1024).toFixed(2)} GB`;
}

function formatTotalDuration({
	totalSeconds,
}: {
	totalSeconds: number;
}): string {
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function StatCell({
	icon: Icon,
	value,
	label,
}: {
	icon: typeof Folder01Icon;
	value: string;
	label: string;
}) {
	return (
		<div className="flex flex-col gap-1 px-5 py-2 first:pl-0 last:pr-0 md:border-r md:border-white/[0.06] last:border-r-0">
			<div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-white/45">
				<HugeiconsIcon icon={Icon} className="size-3" />
				{label}
			</div>
			<div className="font-serif text-2xl font-medium italic tracking-[-0.01em] text-white md:text-[1.65rem]">
				{value}
			</div>
		</div>
	);
}

export function StatsOverview({
	projects,
	className,
}: {
	projects: TProjectMetadata[];
	className?: string;
}) {
	const stats = useMemo(() => {
		let totalSeconds = 0;
		let recent = 0;
		let storageMb = 0;
		const now = Date.now();
		for (const p of projects) {
			if (typeof p.duration === "number") {
				totalSeconds += mediaTimeToSeconds({ time: Math.round(p.duration) });
			}
			const updated =
				p.updatedAt instanceof Date
					? p.updatedAt.getTime()
					: new Date(p.updatedAt).getTime();
			if (now - updated < RECENT_WINDOW_MS) recent += 1;
			const projectSeconds =
				typeof p.duration === "number"
					? mediaTimeToSeconds({ time: Math.round(p.duration) })
					: 0;
			storageMb +=
				(projectSeconds / 60) * STORAGE_MB_PER_MIN + STORAGE_MB_PER_PROJECT;
		}
		return {
			total: projects.length,
			totalSeconds,
			recent,
			storageMb,
		};
	}, [projects]);

	return (
		<section
			aria-label="Workspace stats"
			className={cn(
				"grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4 md:gap-x-0",
				"rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2 md:p-3",
				"backdrop-blur",
				className,
			)}
		>
			<StatCell
				icon={Folder01Icon}
				value={stats.total.toString()}
				label="Projects"
			/>
			<StatCell
				icon={Clock01Icon}
				value={formatTotalDuration({ totalSeconds: stats.totalSeconds })}
				label="Total runtime"
			/>
			<StatCell
				icon={Activity01Icon}
				value={stats.recent.toString()}
				label="Edits this week"
			/>
			<StatCell
				icon={HardDriveIcon}
				value={formatBytes(stats.storageMb)}
				label="Local storage"
			/>
		</section>
	);
}
