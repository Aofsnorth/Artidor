import { useEffect, useRef } from "react";
import { invokeAction } from "@/lib/actions";
import { useEditor } from "@/hooks/use-editor";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { isTypableDOMElement } from "@/utils/browser";
import { useTimelineStore } from "@/stores/timeline-store";

/**
 * a composable that hooks to the caller component's
 * lifecycle and hooks to the keyboard events to fire
 * the appropriate actions based on keybindings
 */
export function useKeybindingsListener() {
	const editor = useEditor();
	const {
		keybindings,
		getKeybindingString,
		overlayDepth,
		isLoadingProject,
		isRecording,
	} = useKeybindingsStore();
	const toggleAutoScroll = useTimelineStore((s) => s.toggleAutoScroll);

	// Track the most recent space press for the double-space shortcut.
	// Two presses within 350ms toggle the timeline's auto-scroll-to-playhead
	// feature, mirroring the convention used in most NLEs.
	const lastSpaceAtRef = useRef<number>(0);
	const doubleSpaceAnnouncedRef = useRef<boolean>(false);

	useEffect(() => {
		const eventOptions: AddEventListenerOptions = { capture: true };
		const handleKeyDown = (ev: KeyboardEvent) => {
			const normalizedKey = (ev.key ?? "").toLowerCase();

			if (overlayDepth > 0 || isLoadingProject || isRecording) {
				return;
			}

			const binding = getKeybindingString(ev);
			const activeElement = document.activeElement;
			const isTextInput =
				activeElement instanceof HTMLElement &&
				isTypableDOMElement({ element: activeElement });
			const boundAction = binding ? keybindings[binding] : undefined;

			if (normalizedKey === "escape" && isTextInput) {
				activeElement.blur();
				return;
			}

			if (!binding) return;
			if (!boundAction) return;

			// Space (toggle-play) and K should work even when focus is on
			// non-text elements like buttons, selects, or Radix UI triggers.
			// Only block on genuine text entry fields (contentEditable, text
			// inputs, textareas) where space would insert a character.
			const isGenuineTextEntry =
				isTextInput &&
				(activeElement instanceof HTMLTextAreaElement ||
					activeElement.isContentEditable ||
					(activeElement instanceof HTMLInputElement &&
						[
							"text",
							"password",
							"email",
							"search",
							"url",
							"tel",
							"number",
						].includes(activeElement.type)));

			if (isGenuineTextEntry) return;

			// Double-space toggles the timeline's auto-scroll-to-playhead
			// (mirrors the convention in most NLEs and editing
			// extensions). We only fire it when the first space would
			// have toggled play, so the user doesn't get surprising
			// scroll toggles when typing or hitting space inside a menu.
			if (normalizedKey === "space" && boundAction === "toggle-play") {
				const now = ev.timeStamp;
				const delta = now - lastSpaceAtRef.current;
				lastSpaceAtRef.current = now;
				if (delta > 0 && delta < 350 && !doubleSpaceAnnouncedRef.current) {
					doubleSpaceAnnouncedRef.current = true;
					// Reset the gate after the short window so a third
					// press re-arms the next double.
					setTimeout(() => {
						doubleSpaceAnnouncedRef.current = false;
					}, 400);
					toggleAutoScroll();
					ev.preventDefault();
					ev.stopImmediatePropagation();
					return;
				}
			}

			// Space and K are special: if focus is on a generic button (track
			// header, track-add, sidebar controls, etc.) the browser will
			// synthesise a click event before our handler runs, which means
			// the user's "play" intent gets hijacked into toggling whatever
			// button is focused (e.g. renaming the track). We blur the
			// button first so the keybinding takes over, then re-prevent
			// default + stop immediate propagation to stop the synthesised
			// click from reaching the button. We also actively re-focus
			// the document body so the keydown chain doesn't bounce back
			// into another click on a different focusable ancestor.
			const isPlayShortcut = boundAction === "toggle-play";
			const isFocusOnButton =
				activeElement instanceof HTMLButtonElement ||
				(activeElement instanceof HTMLElement &&
					activeElement.getAttribute("role") === "button");
			if (isPlayShortcut && isFocusOnButton && document.activeElement) {
				(document.activeElement as HTMLElement).blur();
				document.body.focus();
			}

			if (boundAction === "paste-copied") {
				if (!editor.clipboard.hasEntry()) return;
				ev.preventDefault();
				invokeAction("paste-copied", undefined, "keypress");
				return;
			}

			if (boundAction === "paste-style") {
				if (!editor.clipboard.hasStyleEntry()) return;
				ev.preventDefault();
				invokeAction("paste-style", undefined, "keypress");
				return;
			}

			ev.preventDefault();

			switch (boundAction) {
				case "seek-forward":
					invokeAction("seek-forward", { seconds: 1 }, "keypress");
					break;
				case "seek-backward":
					invokeAction("seek-backward", { seconds: 1 }, "keypress");
					break;
				case "jump-forward":
					invokeAction("jump-forward", { seconds: 5 }, "keypress");
					break;
				case "jump-backward":
					invokeAction("jump-backward", { seconds: 5 }, "keypress");
					break;
				default:
					invokeAction(boundAction, undefined, "keypress");
			}
		};

		document.addEventListener("keydown", handleKeyDown, eventOptions);

		return () => {
			document.removeEventListener("keydown", handleKeyDown, eventOptions);
		};
	}, [
		keybindings,
		getKeybindingString,
		overlayDepth,
		isLoadingProject,
		isRecording,
		editor,
		toggleAutoScroll,
	]);
}
