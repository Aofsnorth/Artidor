"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface StorageEstimate {
	usedBytes: number;
	totalBytes: number;
	freeBytes: number;
}

export function useStorageEstimate(): StorageEstimate & { refresh: () => void } {
	const [estimate, setEstimate] = useState<StorageEstimate>({
		usedBytes: 0,
		totalBytes: 0,
		freeBytes: 0,
	});
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const cancelledRef = useRef(false);

	const read = useCallback(async () => {
		if (!navigator.storage?.estimate) return;
		try {
			const { usage, quota } = await navigator.storage.estimate();
			if (cancelledRef.current || usage == null || quota == null) return;
			setEstimate({
				usedBytes: usage,
				totalBytes: quota,
				freeBytes: Math.max(0, quota - usage),
			});
		} catch {
			// Storage API unavailable (e.g. private browsing).
		}
	}, []);

	useEffect(() => {
		cancelledRef.current = false;
		read();

		const startInterval = () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			intervalRef.current = setInterval(read, 120_000);
		};

		const stopInterval = () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};

		const handleVisibility = () => {
			if (document.visibilityState === "hidden") {
				stopInterval();
			} else {
				read();
				startInterval();
			}
		};

		startInterval();
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			cancelledRef.current = true;
			stopInterval();
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [read]);

	return { ...estimate, refresh: read };
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
