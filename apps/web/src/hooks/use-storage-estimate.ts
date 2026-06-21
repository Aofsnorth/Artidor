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
	const units = ["B", "KB", "MB", "GB", "TB"] as const;
	let value = Math.max(0, bytes);
	let unitIndex = 0;

	while (value >= 1000 && unitIndex < units.length - 1) {
		value /= 1000;
		unitIndex++;
	}

	const maximumFractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1;
	return `${new Intl.NumberFormat(undefined, {
		maximumFractionDigits,
	}).format(value)} ${units[unitIndex]}`;
}
