import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { EditorCore } from "@/core";

function isShallowEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	// Empty/null short-circuit — both empty `null`/`undefined`
	// compare as equal regardless of path below.
	if (a == null || b == null) return false;
	// Array fast-path: identical lengths + per-index `Object.is`
	// is the common case for selectors that return `getAssets()`
	// or `bookmarks` arrays.
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((item, i) => Object.is(item, b[i]));
	}
	// Object path: shallow key-by-key comparison. Catches the
	// most common case of `editor.scenes.getActiveSceneOrNull()`
	// returning a fresh `Scene` object reference every call but
	// with the same primitive fields. We avoid `Object.keys` on
	// either side to keep allocations low.
	if (typeof a === "object" && typeof b === "object") {
		const aKeys = Object.keys(a as Record<string, unknown>);
		const bKeys = Object.keys(b as Record<string, unknown>);
		if (aKeys.length !== bKeys.length) return false;
		for (const key of aKeys) {
			if (
				!Object.is(
					(a as Record<string, unknown>)[key],
					(b as Record<string, unknown>)[key],
				)
			) {
				return false;
			}
		}
		return true;
	}
	return false;
}

const subscribeNone = () => () => {};

export function useEditor(): EditorCore;
export function useEditor<T>(selector: (editor: EditorCore) => T): T;
export function useEditor<T>(
	selector?: (editor: EditorCore) => T,
): EditorCore | T {
	const editor = useMemo(() => EditorCore.getInstance(), []);
	const selectorRef = useRef(selector);
	selectorRef.current = selector;

	const snapshotCacheRef = useRef<unknown>(undefined);

	const subscribeAll = useCallback(
		(onChange: () => void) => {
			const unsubscribers = [
				editor.playback.subscribe(onChange),
				editor.timeline.subscribe(onChange),
				editor.scenes.subscribe(onChange),
				editor.project.subscribe(onChange),
				editor.media.subscribe(onChange),
				editor.renderer.subscribe(onChange),
				editor.selection.subscribe(onChange),
				editor.clipboard.subscribe(onChange),
				editor.diagnostics.subscribe(onChange),
			];
			return () => {
				unsubscribers.forEach((unsubscribe) => {
					unsubscribe();
				});
			};
		},
		[editor],
	);

	const getSnapshot = useCallback(() => {
		const next = selectorRef.current ? selectorRef.current(editor) : editor;
		if (isShallowEqual(snapshotCacheRef.current, next)) {
			return snapshotCacheRef.current;
		}
		snapshotCacheRef.current = next;
		return next;
	}, [editor]);

	return useSyncExternalStore(
		selector ? subscribeAll : subscribeNone,
		getSnapshot,
		getSnapshot,
	) as EditorCore | T;
}
