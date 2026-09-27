import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { EditorCore } from "@/core";
import { isShallowEqual } from "@/lib/perf/editor-snapshot-equality";

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
 *
 * **The default set is deliberately broad.** ~284 of the ~295 `useEditor(`
 * call sites rely on it and never pass `subsystems`, so narrowing it would
 * silently freeze state in any call site that reads a subsystem through a
 * helper the reader cannot see. It is exported frozen so a caller can
 * compose narrower subscriptions without mutating shared state, e.g.
 * `useEditor(selector, [...DEFAULT_EDITOR_SUBSYSTEMS, "playback"])`.
 */
export const DEFAULT_EDITOR_SUBSYSTEMS: readonly EditorSubsystem[] =
	Object.freeze([
		"timeline",
		"scenes",
		"project",
		"media",
		"renderer",
		"selection",
		"clipboard",
		"diagnostics",
	] as const satisfies EditorSubsystem[]);

const subscribeNone = () => () => {};

/**
 * @param selector Narrowing function run against the editor core. A selector
 * that returns a fresh object/array every call still avoids re-renders:
 * snapshots are compared with {@link isShallowEqual} before React is told
 * anything changed.
 * @param subsystems Opt-in narrowing. Defaults to
 * {@link DEFAULT_EDITOR_SUBSYSTEMS} (everything except `playback`). Pass an
 * explicit list ONLY when the component provably reads nothing else — the
 * selector runs on every notify of every listed subsystem, so a broader list
 * is the safe default and a narrower one is the performance win.
 */
export function useEditor(): EditorCore;
export function useEditor<T>(selector: (editor: EditorCore) => T): T;
export function useEditor<T>(
	selector: (editor: EditorCore) => T,
	subsystems: readonly EditorSubsystem[],
): T;
export function useEditor<T>(
	selector?: (editor: EditorCore) => T,
	subsystems?: readonly EditorSubsystem[],
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
	const effectiveSubsystems = useMemo<readonly EditorSubsystem[]>(
		() => (subsystems ? subsystems.slice().sort() : DEFAULT_EDITOR_SUBSYSTEMS),
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
