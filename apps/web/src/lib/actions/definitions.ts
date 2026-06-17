import type { KeybindingConfig, ShortcutKey } from "@/lib/actions/keybinding";
import type { TActionWithOptionalArgs } from "./types";

export type TActionCategory =
	| "playback"
	| "navigation"
	| "editing"
	| "selection"
	| "history"
	| "timeline"
	| "controls"
	| "assets";

export interface TActionBaseDefinition {
	description: string;
	category: TActionCategory;
	args?: Record<string, unknown>;
}

export interface TActionDefinition extends TActionBaseDefinition {
	defaultShortcuts?: readonly ShortcutKey[];
}

export const ACTIONS = {
	"toggle-play": {
		description: "Play/Pause",
		category: "playback",
	},
	"stop-playback": {
		description: "Stop playback",
		category: "playback",
	},
	"seek-forward": {
		description: "Seek forward 1 second",
		category: "playback",
		args: { seconds: "number" },
	},
	"seek-backward": {
		description: "Seek backward 1 second",
		category: "playback",
		args: { seconds: "number" },
	},
	"frame-step-forward": {
		description: "Frame step forward",
		category: "navigation",
	},
	"frame-step-backward": {
		description: "Frame step backward",
		category: "navigation",
	},
	"jump-forward": {
		description: "Jump forward 5 seconds",
		category: "navigation",
		args: { seconds: "number" },
	},
	"jump-backward": {
		description: "Jump backward 5 seconds",
		category: "navigation",
		args: { seconds: "number" },
	},
	"goto-start": {
		description: "Go to timeline start",
		category: "navigation",
	},
	"goto-end": {
		description: "Go to timeline end",
		category: "navigation",
	},
	split: {
		description: "Split elements at playhead",
		category: "editing",
	},
	"split-left": {
		description: "Split and remove left",
		category: "editing",
	},
	"split-right": {
		description: "Split and remove right",
		category: "editing",
	},
	"delete-selected": {
		description: "Delete selected elements",
		category: "editing",
	},
	"copy-selected": {
		description: "Copy selected elements",
		category: "editing",
	},
	"paste-copied": {
		description: "Paste elements at playhead",
		category: "editing",
	},
	"copy-style": {
		description: "Copy style from selected element",
		category: "editing",
	},
	"paste-style": {
		description: "Paste style onto selected elements",
		category: "editing",
	},
	"toggle-snapping": {
		description: "Toggle snapping",
		category: "editing",
	},
	"toggle-ripple-editing": {
		description: "Toggle ripple editing",
		category: "editing",
	},
	"toggle-source-audio": {
		description: "Extract or recover source audio",
		category: "editing",
	},
	"select-all": {
		description: "Select all elements",
		category: "selection",
	},
	"cancel-interaction": {
		description: "Cancel current interaction",
		category: "controls",
	},
	"deselect-all": {
		description: "Deselect all elements",
		category: "selection",
	},
	"duplicate-selected": {
		description: "Duplicate selected element",
		category: "selection",
	},
	"toggle-elements-muted-selected": {
		description: "Mute/unmute selected elements",
		category: "selection",
	},
	"toggle-elements-visibility-selected": {
		description: "Show/hide selected elements",
		category: "selection",
	},
	"toggle-bookmark": {
		description: "Toggle bookmark at playhead",
		category: "timeline",
	},
	"toggle-element-bookmark": {
		description: "Toggle bookmark on selected element",
		category: "timeline",
	},
	undo: {
		description: "Undo",
		category: "history",
	},
	redo: {
		description: "Redo",
		category: "history",
	},
	"remove-media-asset": {
		description: "Remove media asset",
		category: "assets",
		args: { projectId: "string", assetId: "string" },
	},
	"remove-media-assets": {
		description: "Remove media assets",
		category: "assets",
		args: { projectId: "string", assetIds: "string[]" },
	},
	"group-selected": {
		description: "Group selected elements",
		category: "editing",
	},
	"ungroup-selected": {
		description: "Ungroup selected elements",
		category: "editing",
	},
	"link-parent": {
		description: "Link selected element to a parent (opens picker)",
		category: "editing",
	},
	"unlink-parent": {
		description: "Unlink selected element from its parent",
		category: "editing",
	},
	"link-selected-elements": {
		description: "Link selected elements (child to parent)",
		category: "editing",
	},
	"add-bookmark": {
		description: "Add bookmark at playhead",
		category: "timeline",
	},
	"add-beat-markers": {
		description: "Detect beats on selected audio and place markers",
		category: "timeline",
	},
	"toggle-favorite": {
		description: "Mark/unmark selected element as favorite for reuse",
		category: "editing",
	},
	"color-match": {
		description: "Copy color grade from another clip to selected",
		category: "editing",
	},
	"auto-color": {
		description: "Apply automatic color correction to selected",
		category: "editing",
	},
	"smart-trim": {
		description: "Auto-trim silence from selected audio clip",
		category: "editing",
	},
	"reverse-clip": {
		description: "Reverse selected video clip",
		category: "editing",
	},
	"stabilize-clip": {
		description: "Apply video stabilization to selected video",
		category: "editing",
	},
	"auto-reframe": {
		description: "Auto reframe selected video to current canvas",
		category: "editing",
	},
	"freeze-frame": {
		description: "Insert freeze frame from playhead position",
		category: "editing",
	},
	"add-camera": {
		description: "Add 3D camera layer at playhead",
		category: "editing",
	},
	"add-null-layer": {
		description: "Add null/parent layer at playhead",
		category: "editing",
	},
	"insert-camera": {
		description: "Insert a 3D camera at playhead",
		category: "editing",
	},
	"fit-to-screen": {
		description: "Fit preview to screen",
		category: "controls",
	},
	"toggle-headers": {
		description: "Toggle editor headers/footers visibility",
		category: "controls",
	},
	"open-teleprompter": {
		description: "Open teleprompter",
		category: "controls",
	},
	"open-templates": {
		description: "Open templates browser",
		category: "controls",
	},
	"open-command-palette": {
		description: "Open command palette",
		category: "controls",
	},
	"toggle-focus-mode": {
		description: "Toggle focus mode (hide editor chrome)",
		category: "controls",
	},
	"set-in": {
		description: "Trim selected clip in-point to playhead",
		category: "editing",
	},
	"set-out": {
		description: "Trim selected clip out-point to playhead",
		category: "editing",
	},
	"nudge-left": {
		description: "Nudge selected clip one frame left",
		category: "editing",
	},
	"nudge-right": {
		description: "Nudge selected clip one frame right",
		category: "editing",
	},
	"ease-keyframes": {
		description: "Easy Ease selected keyframes (smooth in/out)",
		category: "editing",
	},
} as const satisfies Record<string, TActionBaseDefinition>;

export type TAction = keyof typeof ACTIONS;

const ACTION_DEFAULT_SHORTCUTS = {
	"toggle-play": ["space", "k"],
	"seek-forward": ["l"],
	"seek-backward": ["j"],
	"frame-step-forward": ["right"],
	"frame-step-backward": ["left"],
	"jump-forward": ["shift+right"],
	"jump-backward": ["shift+left"],
	"goto-start": ["home", "enter"],
	"goto-end": ["end"],
	split: ["s"],
	"split-left": ["q"],
	"split-right": ["w"],
	"delete-selected": ["backspace", "delete"],
	"copy-selected": ["ctrl+c"],
	"paste-copied": ["ctrl+v"],
	"copy-style": ["ctrl+shift+c"],
	"paste-style": ["ctrl+shift+v"],
	"toggle-snapping": ["n"],
	"select-all": ["ctrl+a"],
	"cancel-interaction": ["escape"],
	"duplicate-selected": ["ctrl+d"],
	undo: ["ctrl+z"],
	redo: ["ctrl+shift+z", "ctrl+y"],
	"group-selected": ["ctrl+g"],
	"ungroup-selected": ["ctrl+shift+g"],
	"add-bookmark": ["m"],
	"toggle-bookmark": ["ctrl+m"],
	"toggle-element-bookmark": ["shift+m"],
	"reverse-clip": ["ctrl+r"],
	"open-teleprompter": ["ctrl+t"],
	"fit-to-screen": ["f"],
	"open-command-palette": ["ctrl+k"],
	"toggle-focus-mode": ["shift+f"],
	"set-in": ["i"],
	"set-out": ["o"],
	"nudge-left": ["alt+left"],
	"nudge-right": ["alt+right"],
	"ease-keyframes": ["f9"],
} as const satisfies Partial<
	Record<TActionWithOptionalArgs, readonly ShortcutKey[]>
>;

const ACTION_DEFAULT_SHORTCUTS_BY_ACTION: Partial<
	Record<TAction, readonly ShortcutKey[]>
> = ACTION_DEFAULT_SHORTCUTS;

export function getActionDefinition({
	action,
}: {
	action: TAction;
}): TActionDefinition {
	return {
		...ACTIONS[action],
		defaultShortcuts: ACTION_DEFAULT_SHORTCUTS_BY_ACTION[action],
	};
}

export function getDefaultShortcuts(): KeybindingConfig {
	const shortcuts: KeybindingConfig = {};

	for (const [action, defaultShortcuts] of Object.entries(
		ACTION_DEFAULT_SHORTCUTS,
	) as Array<[TActionWithOptionalArgs, readonly ShortcutKey[]]>) {
		for (const shortcut of defaultShortcuts) {
			shortcuts[shortcut] = action;
		}
	}

	return shortcuts;
}
