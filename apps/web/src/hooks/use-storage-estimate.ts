"use client";

import { useEffect, useState } from "react";

interface StorageEstimate {
	usedBytes: number;
	totalBytes: number;
	freeBytes: number;
}

export function useStorageEstimate(): StorageEstimate | null {
	const [estimate, setEstimate] = useState<StorageEstimate | null>(null);

	useEffect(() => {
		let cancelled = false;

		const read = async () => {
			if (!navigator.storage?.estimate) return;
			try {
				const { usage, quota } = await navigator.storage.estimate();
				if (cancelled || usage == null || quota == null) return;
				setEstimate({
					usedBytes: usage,
					totalBytes: quota,
					freeBytes: Math.max(0, quota - usage),
				});
			} catch {
				// Storage API unavailable (e.g. private browsing) — keep null.
			}
		};

		read();
		const interval = setInterval(read, 30_000);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	return estimate;
}

export function formatStorageSize(bytes: number): string {
	const gb = bytes / 1_000_000_000;
	if (gb >= 1000) {
		const tb = gb / 1000;
		return `${tb >= 10 ? Math.round(tb) : tb.toFixed(1)} TB`;
	}
	if (gb >= 1) {
		return `${Math.round(gb)} GB`;
	}
	return `${Math.max(1, Math.round(gb * 1000))} MB`;
}
