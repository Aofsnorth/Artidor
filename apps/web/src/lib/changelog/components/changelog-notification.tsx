"use client";

import { useState, useEffect } from "react";
import { getSortedReleases } from "../utils";
import type { Release } from "../utils";

const STORAGE_KEY = "last-seen-version";

/**
 * The changelog notification was a fixed bottom-left card that
 * announced the latest release (e.g. "Masks, animation & more —
 * v0.3.0"). We've moved release communication to the in-app
 * changelog page + the README; the floating card crowded the
 * workspace and competed with the page content.
 *
 * The component is preserved so existing imports keep working;
 * it just renders nothing. Remove the imports too if you want
 * to delete it entirely.
 */
export function ChangelogNotification() {
	const [, setRelease] = useState<Release | null>(null);

	useEffect(() => {
		const releases = getSortedReleases();
		const latest = releases[0];
		if (!latest) return;
		try {
			localStorage.setItem(STORAGE_KEY, latest.version);
		} catch {
			// ignore
		}
		setRelease(latest);
	}, []);

	return null;
}

// The render below is the original floating card. Kept for
// reference but not used by the component above. Strip it if
// the imports are removed too.
/*
return (
	<div className="fixed bottom-5 left-5 z-50 flex w-72 flex-col gap-3 rounded-xl border bg-card p-4 shadow-lg">
		<div className="flex items-start justify-between gap-2">
			<div className="flex flex-col gap-1">
				<span className="text-sm font-semibold leading-snug">
					{release.title}
				</span>
				<span className="text-xs text-muted-foreground">
					v{release.version}
				</span>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="-mr-1 -mt-1 shrink-0"
				onClick={() => setRelease(null)}
				aria-label="Dismiss"
			>
				<HugeiconsIcon icon={Cancel01Icon} className="size-4" />
			</Button>
		</div>

		{release.summary && (
			<p className="text-xs leading-relaxed text-muted-foreground">
				{release.summary}
			</p>
		)}

		<div className="flex justify-end">
			<Button asChild size="sm">
				<Link href="/changelog" onClick={() => setRelease(null)}>
					See full changelog
				</Link>
			</Button>
		</div>
	</div>
);
*/
