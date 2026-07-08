import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { EditorCore } from "@/core";

/**
 * Editor subsystem identifiers. Used by {@link useEditor} to limit which
 * subsystems trigger re-renders.
 *
 * **Default behavior changed:** `useEditor(selector)` no longer subscribes
 * to `playback` by default. The `playback` subsystem fires every animation
 * frame during playback (60fps), which caused ~97 unnecessary
 * `getSnapshot()` calls per frame across the editor — the single biggest
 * source of editor-wide lag. Components that need per-frame playback state
 * (timecode display, playhead position, audio meters) must pass
 * `subsystems: ["playback"]` explicitly.
 */
export type EditorSubsystem =
	| "playback"
	| "timeline"
	| "scenes"
	| "project"
	| "media"
	| "renderer"
	| "selection"
	| "clipboard"
	| "diagnostics";

/**
 * The set of subsystems `useEditor(selector)` subscribes to by default
 * (when no `subsystems` argument is passed). `playback` is intentionally
 * excluded — it fires every frame during playback and most components
 * don't need per-frame updates. Components that DO need playback state
 * pass `["playback"]` (or `["playback", ...]`) explicitly.
 */
const DEFAULT_SUBSYSTEMS: EditorSubsystem[] = [
	"timeline",
	"scenes",
	"project",
	"media",
	"renderer",
	"selection",
	"clipboard",
	"diagnostics",
];

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
	selector: (editor: EditorCore) => T,
	subsystems: EditorSubsystem[],
): T;
export function useEditor<T>(
	selector?: (editor: EditorCore) => T,
	subsystems?: EditorSubsystem[],
): EditorCore | T {
	const editor = useMemo(() => EditorCore.getInstance(), []);
	const selectorRef = useRef(selector);
	selectorRef.current = selector;

	const snapshotCacheRef = useRef<unknown>(undefined);

	// Stable string key for the subsystems array. Without this, a caller
	// passing `["playback"]` as a literal would create a new array reference
	// every render, causing `subscribe` to change every render, which causes
	// `useSyncExternalStore` to tear down and re-create all subscriptions
	// every render — a significant performance regression. The sorted+joined
	// string is referentially stable across renders for the same set.
	const subsystemsKey = subsystems
		? subsystems.slice().sort().join(",")
		: "default";
	// biome-ignore lint/correctness/useExhaustiveDependencies: subsystemsKey is a stable string derived from subsystems; using subsystems directly would create a new array reference every render, defeating the memo.
	const effectiveSubsystems = useMemo<EditorSubsystem[]>(
		() => (subsystems ? subsystems.slice().sort() : DEFAULT_SUBSYSTEMS),
		[subsystemsKey],
	);

	const subscribe = useCallback(
		(onChange: () => void) => {
			const all: Record<
				EditorSubsystem,
				{ subscribe: (fn: () => void) => () => void }
			> = {
				playback: editor.playback,
				timeline: editor.timeline,
				scenes: editor.scenes,
				project: editor.project,
				media: editor.media,
				renderer: editor.renderer,
				selection: editor.selection,
				clipboard: editor.clipboard,
				diagnostics: editor.diagnostics,
			};
			const unsubscribers = effectiveSubsystems.map((s) =>
				all[s].subscribe(onChange),
			);
			return () => {
				for (const unsubscribe of unsubscribers) {
					unsubscribe();
				}
			};
		},
		[editor, effectiveSubsystems],
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
		selector ? subscribe : subscribeNone,
		getSnapshot,
		getSnapshot,
	) as EditorCore | T;
}
