"use client";

/**
 * StatsOverview — slim strip across the top of the projects page.
 *
 * Renders 4 KPIs (total projects, detected system/OS, recent edits,
 * storage used) with a serif italic numeral, a tiny caption, and a
 * hairline divider between cells. The strip sits above the project
 * grid and is hidden when there are no projects at all (the empty
 * state owns the screen in that case).
 *
 * All numbers are computed locally from the projects array — no
 * network, no tracking. The system cell is read from the browser
 * (navigator) on the client. Storage comes from the browser Storage
 * Estimate API — no hardcoded quota or fake MB-per-project math.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { TProjectMetadata } from "@/lib/project/types";
import {
	formatStorageSize,
	useStorageEstimate,
} from "@/hooks/use-storage-estimate";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Folder01Icon,
	Activity01Icon,
	HardDriveIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/utils/ui";

/**
 * Best-effort OS label from the browser. Order matters: Android and
 * ChromeOS both report "Linux", and iOS/iPadOS report "Mac"-like
 * strings, so the more specific checks run first. Runs client-side
 * only (returns "—" during SSR / before mount).
 */
function detectOS(): string {
	if (typeof navigator === "undefined") return "—";
	const ua = navigator.userAgent || "";
	const platform =
		(navigator as Navigator & { userAgentData?: { platform?: string } })
			.userAgentData?.platform ?? "";
	const hay = `${platform} ${ua}`;
	if (/android/i.test(hay)) return "Android";
	if (/iphone|ipad|ipod/i.test(hay)) return "iOS";
	// iPadOS 13+ masquerades as desktop "Macintosh" but exposes touch points.
	if (/mac/i.test(hay) && navigator.maxTouchPoints > 1) return "iPadOS";
	if (/win/i.test(hay)) return "Windows";
	if (/mac/i.test(hay)) return "macOS";
	if (/cros/i.test(hay)) return "ChromeOS";
	if (/linux/i.test(hay)) return "Linux";
	return "Unknown";
}

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function StatCell({
	icon,
	value,
	label,
}: {
	icon: ReactNode;
	value: string;
	label: string;
}) {
	return (
		<div className="flex flex-col gap-1 px-5 py-2 first:pl-0 last:pr-0 md:border-r md:border-white/[0.06] last:border-r-0">
			<div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-white/45">
				{icon}
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
	// Detected on the client after mount to avoid an SSR/hydration mismatch.
	const [os, setOs] = useState("—");
	useEffect(() => {
		setOs(detectOS());
	}, []);

	const storage = useStorageEstimate();
	const stats = useMemo(() => {
		let recent = 0;
		const now = Date.now();
		for (const p of projects) {
			const updated =
				p.updatedAt instanceof Date
					? p.updatedAt.getTime()
					: new Date(p.updatedAt).getTime();
			if (now - updated < RECENT_WINDOW_MS) recent += 1;
		}
		return {
			total: projects.length,
			recent,
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
				icon={<HugeiconsIcon icon={Folder01Icon} className="size-3" />}
				value={stats.total.toString()}
				label="Projects"
			/>
			<StatCell
				icon={
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="size-3"
						role="img"
						aria-label="System"
					>
						<title>System</title>
						<rect x="2" y="3" width="20" height="14" rx="2" />
						<path d="M8 21h8" />
						<path d="M12 17v4" />
					</svg>
				}
				value={os}
				label="System"
			/>
			<StatCell
				icon={<HugeiconsIcon icon={Activity01Icon} className="size-3" />}
				value={stats.recent.toString()}
				label="Edits this week"
			/>
			<StatCell
				icon={<HugeiconsIcon icon={HardDriveIcon} className="size-3" />}
				value={storage ? formatStorageSize(storage.usedBytes) : "—"}
				label="Local storage"
			/>
		</section>
	);
}
