import { useEffect } from "react";
import { invokeAction } from "@/lib/actions";
import { useEditor } from "@/hooks/use-editor";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { isTypableDOMElement } from "@/utils/browser";

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
	]);
}
