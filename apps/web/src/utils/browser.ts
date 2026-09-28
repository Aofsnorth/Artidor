export function downloadBlob({
	blob,
	filename,
}: {
	blob: Blob;
	filename: string;
}): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

export function findScrollParent({
	element,
}: {
	element: HTMLElement;
}): HTMLElement | null {
	let parent = element.parentElement;
	while (parent) {
		const { overflow, overflowX } = window.getComputedStyle(parent);
		if (/auto|scroll/.test(overflow + overflowX)) return parent;
		parent = parent.parentElement;
	}
	return null;
}

const TYPABLE_INPUT_TYPES = [
	"text",
	"password",
	"email",
	"search",
	"url",
	"tel",
	"number",
	"date",
	"time",
	"datetime-local",
	"month",
	"week",
];

export function isTypableDOMElement({
	element,
}: {
	element: HTMLElement;
}): boolean {
	if (element.isContentEditable) return true;

	if (element.tagName === "INPUT") {
		const input = element as HTMLInputElement;
		if (input.disabled) return false;
		const type = (input.type || "text").toLowerCase();
		return TYPABLE_INPUT_TYPES.includes(type);
	}

	if (element.tagName === "TEXTAREA") {
		return !(element as HTMLTextAreaElement).disabled;
	}

	return false;
}

const ARROW_KEYS = ["arrowleft", "arrowright", "arrowup", "arrowdown"];

/**
 * Input types whose PRIMARY keyboard interaction is the arrow keys.
 *
 * These are not "typable" (no characters are inserted), so
 * {@link isTypableDOMElement} deliberately reports false for them — but the
 * editor's global keybinding listener binds bare `left`/`right` to
 * frame-stepping, so without this check the shortcut consumed every arrow
 * press and no inspector slider, checkbox or radio could be operated from
 * the keyboard.
 */
const ARROW_KEY_NATIVE_INPUT_TYPES = ["range", "checkbox", "radio"];

export function isArrowKeyNativeControl({
	element,
	key,
}: {
	element: HTMLElement;
	key: string;
}): boolean {
	if (!ARROW_KEYS.includes(key.toLowerCase())) return false;
	if (element.tagName !== "INPUT") return false;
	const input = element as HTMLInputElement;
	if (input.disabled) return false;
	return ARROW_KEY_NATIVE_INPUT_TYPES.includes(
		(input.type || "text").toLowerCase(),
	);
}
