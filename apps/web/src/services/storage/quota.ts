import { formatNumberForDisplay } from "@/utils/math";

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export const STORAGE_HEADROOM_RESERVE_BYTES = 50 * 1024 * 1024;

export interface StorageQuotaStatus {
	quotaBytes: number | null;
	usageBytes: number | null;
	headroomBytes: number | null;
	availableBytes: number | null;
}

export interface StorageCapacityCheckResult {
	canStore: boolean;
	reason: "enough-space" | "insufficient-space" | "estimate-unavailable";
	availableBytes: number | null;
}

function normalizeByteValue({ value }: { value: unknown }): number | null {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		return null;
	}

	return value;
}

export function formatStorageBytes({ bytes }: { bytes: number }): string {
	if (!Number.isFinite(bytes) || bytes <= 0) {
		return "0 B";
	}

	let value = bytes;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
	return `${formatNumberForDisplay({ value, fractionDigits: precision })} ${BYTE_UNITS[unitIndex]}`;
}

export async function readStorageQuotaStatus(): Promise<StorageQuotaStatus> {
	if (
		typeof navigator === "undefined" ||
		!navigator.storage ||
		typeof navigator.storage.estimate !== "function"
	) {
		return {
			quotaBytes: null,
			usageBytes: null,
			headroomBytes: null,
			availableBytes: null,
		};
	}

	// Ask for persistent storage so the browser hands us the full quota
	// instead of a best-effort (often tiny) eviction-prone budget. Fire and
	// forget — a rejection just leaves us on best-effort, which still works.
	if (typeof navigator.storage.persist === "function") {
		navigator.storage.persisted?.().then((already) => {
			if (!already) navigator.storage.persist?.().catch(() => {});
		});
	}

	const estimate = await navigator.storage.estimate();
	const quotaBytes = normalizeByteValue({ value: estimate.quota });
	const usageBytes = normalizeByteValue({ value: estimate.usage });

	if (quotaBytes === null || usageBytes === null) {
		return {
			quotaBytes,
			usageBytes,
			headroomBytes: null,
			availableBytes: null,
		};
	}

	const headroomBytes = Math.max(quotaBytes - usageBytes, 0);
	const availableBytes = Math.max(
		headroomBytes - STORAGE_HEADROOM_RESERVE_BYTES,
		0,
	);

	return {
		quotaBytes,
		usageBytes,
		headroomBytes,
		availableBytes,
	};
}

export function evaluateStorageCapacity({
	requiredBytes,
	quotaStatus,
}: {
	requiredBytes: number;
	quotaStatus: StorageQuotaStatus;
}): StorageCapacityCheckResult {
	// Gate the hard block on REAL headroom (quota − usage), not the
	// reserve-discounted `availableBytes`. The 50 MB reserve is a soft
	// cushion for the warning copy only — blocking on it rejected files
	// that would actually save fine (the save path already rolls back on a
	// genuine QuotaExceededError). `availableBytes` is still surfaced so the
	// toast can warn when a file eats into the reserve.
	if (quotaStatus.headroomBytes === null) {
		return {
			canStore: true,
			reason: "estimate-unavailable",
			availableBytes: quotaStatus.availableBytes,
		};
	}

	if (requiredBytes > quotaStatus.headroomBytes) {
		return {
			canStore: false,
			reason: "insufficient-space",
			availableBytes: quotaStatus.availableBytes,
		};
	}

	return {
		canStore: true,
		reason: "enough-space",
		availableBytes: quotaStatus.availableBytes,
	};
}

export class StorageQuotaExceededError extends Error {
	requiredBytes: number;

	constructor({ requiredBytes }: { requiredBytes: number }) {
		super(
			`Not enough browser storage to save a ${formatStorageBytes({ bytes: requiredBytes })} file.`,
		);

		this.name = "StorageQuotaExceededError";
		this.requiredBytes = requiredBytes;
	}
}

export function isStorageQuotaExceededError({
	error,
}: {
	error: unknown;
}): boolean {
	if (error instanceof StorageQuotaExceededError) {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	return (
		error.name === "QuotaExceededError" ||
		error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
		error.message.toLowerCase().includes("quota")
	);
}
