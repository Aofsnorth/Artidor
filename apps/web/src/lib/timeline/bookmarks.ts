import type { Bookmark } from "@/lib/timeline";
import type { FrameRate } from "opencut-wasm";
import { roundToFrame } from "opencut-wasm";

function bookmarkTimeEqual({
	bookmarkTime,
	frameTime,
}: {
	bookmarkTime: number;
	frameTime: number;
}): boolean {
	return bookmarkTime === frameTime;
}

export function findBookmarkIndex({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): number {
	return bookmarks.findIndex((bookmark) =>
		bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

export function isBookmarkAtTime({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): boolean {
	return bookmarks.some((bookmark) =>
		bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

export function toggleBookmarkInArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): Bookmark[] {
	const bookmarkIndex = findBookmarkIndex({ bookmarks, frameTime });

	if (bookmarkIndex !== -1) {
		return bookmarks.filter((_, index) => index !== bookmarkIndex);
	}

	const newBookmarks = [...bookmarks, { time: frameTime }];
	return newBookmarks.slice().sort((a, b) => a.time - b.time);
}

export function removeBookmarkFromArray({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): Bookmark[] {
	return bookmarks.filter(
		(bookmark) =>
			!bookmarkTimeEqual({ bookmarkTime: bookmark.time, frameTime }),
	);
}

export function updateBookmarkInArray({
	bookmarks,
	frameTime,
	updates,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
	updates: Partial<Omit<Bookmark, "time">>;
}): Bookmark[] {
	const index = findBookmarkIndex({ bookmarks, frameTime });
	if (index === -1) {
		return bookmarks;
	}

	const updated = { ...bookmarks[index], ...updates };
	const result = [...bookmarks];
	result[index] = updated;
	return result;
}

export function moveBookmarkInArray({
	bookmarks,
	fromTime,
	toTime,
}: {
	bookmarks: Bookmark[];
	fromTime: number;
	toTime: number;
}): Bookmark[] {
	const index = findBookmarkIndex({ bookmarks, frameTime: fromTime });
	if (index === -1) {
		return bookmarks;
	}

	const updated = { ...bookmarks[index], time: toTime };
	const result = [...bookmarks];
	result[index] = updated;
	return result.slice().sort((a, b) => a.time - b.time);
}

export function getFrameTime({
	time,
	fps,
}: {
	time: number;
	fps: FrameRate;
}): number {
	return roundToFrame({ time, rate: fps }) ?? time;
}

export function getBookmarkAtTime({
	bookmarks,
	frameTime,
}: {
	bookmarks: Bookmark[];
	frameTime: number;
}): Bookmark | null {
	const index = findBookmarkIndex({ bookmarks, frameTime });
	return index === -1 ? null : bookmarks[index];
}

export function getBookmarksActiveAtTime({
	bookmarks,
	time,
}: {
	bookmarks: Bookmark[];
	time: number;
}): Bookmark[] {
	return bookmarks.filter((bookmark) => {
		const start = bookmark.time;
		const end =
			bookmark.duration != null && bookmark.duration > 0
				? start + bookmark.duration
				: start;
		return time >= start && time <= end;
	});
}

/**
 * Returns the time of the closest bookmark strictly *after* `time`. When the
 * playhead is sitting on a bookmark, the result skips that same bookmark so
 * repeated "next" presses walk through the timeline.
 */
export function getNextBookmarkTime({
	bookmarks,
	time,
}: {
	bookmarks: Bookmark[];
	time: number;
}): number | null {
	const sorted = [...bookmarks].sort((a, b) => a.time - b.time);
	for (const bookmark of sorted) {
		if (bookmark.time > time + 0.0001) return bookmark.time;
	}
	return null;
}

/**
 * Returns the time of the closest bookmark strictly *before* `time`. When the
 * playhead is sitting on a bookmark, the result skips that same bookmark so
 * repeated "previous" presses walk through the timeline.
 */
export function getPreviousBookmarkTime({
	bookmarks,
	time,
}: {
	bookmarks: Bookmark[];
	time: number;
}): number | null {
	const sorted = [...bookmarks].sort((a, b) => a.time - b.time);
	let result: number | null = null;
	for (const bookmark of sorted) {
		if (bookmark.time < time - 0.0001) result = bookmark.time;
		else break;
	}
	return result;
}

/**
 * Closest bookmark strictly before `time` AND within the last `windowTicks` of
 * the playhead. Returns null if no bookmark is inside the window.
 */
export function getPreviousBookmarkTimeWithin({
	bookmarks,
	time,
	windowTicks,
}: {
	bookmarks: Bookmark[];
	time: number;
	windowTicks: number;
}): number | null {
	const sorted = [...bookmarks].sort((a, b) => a.time - b.time);
	let result: number | null = null;
	for (const bookmark of sorted) {
		if (bookmark.time >= time) break;
		if (time - bookmark.time > windowTicks) continue;
		result = bookmark.time;
	}
	return result;
}

/**
 * Closest bookmark strictly after `time` AND within `windowTicks` ahead of the
 * playhead. Returns null if no bookmark is inside the window.
 */
export function getNextBookmarkTimeWithin({
	bookmarks,
	time,
	windowTicks,
}: {
	bookmarks: Bookmark[];
	time: number;
	windowTicks: number;
}): number | null {
	const sorted = [...bookmarks].sort((a, b) => a.time - b.time);
	for (const bookmark of sorted) {
		if (bookmark.time <= time) continue;
		if (bookmark.time - time > windowTicks) break;
		return bookmark.time;
	}
	return null;
}
