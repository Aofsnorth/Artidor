import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PreviewQuality } from "@/lib/perf/preview-quality";

/**
 * Application-wide settings, persisted to localStorage. Keeps the
 * shape small and flat — no nested objects, no computed values.
 */
interface SettingsState {
	/** Skip the "type DELETE to confirm" gate in the delete-project dialog. */
	skipDeleteConfirm: boolean;
	setSkipDeleteConfirm: (value: boolean) => void;

	/** Default project frame rate. Persisted so new projects use the same value. */
	defaultFps: number;
	setDefaultFps: (fps: number) => void;

	/**
	 * When false (default), the popout buttons on editor panels are hidden
	 * so they don't interfere with the workflow. When true, hover-revealed
	 * popout buttons appear on each detachable panel (assets, preview,
	 * properties, timeline) allowing the panel to be popped out into a
	 * separate browser window.
	 */
	enablePopoutPanels: boolean;
	setEnablePopoutPanels: (value: boolean) => void;

	/**
	 * Preview render quality. Scales the preview's render resolution (and
	 * video decode) down to keep playback smooth on low-end machines.
	 * "auto" picks a tier from device hints. Export is never affected.
	 */
	previewQuality: PreviewQuality;
	setPreviewQuality: (value: PreviewQuality) => void;

	/**
	 * Show the realtime editor FPS badge (bottom-left). Measures UI/render
	 * loop smoothness only — never project/video FPS. When false, the badge
	 * unmounts and its rAF loop stops, so there's zero measurement overhead.
	 */
	showFpsMonitor: boolean;
	setShowFpsMonitor: (value: boolean) => void;

	/**
	 * When true, drag preview ghosts show a detailed, opaque preview with
	 * element name and track color. When false (default), ghosts are
	 * transparent outlines for a lighter visual.
	 */
	hdDragPreview: boolean;
	setHdDragPreview: (value: boolean) => void;

	/**
	 * AI assistant persona configuration. The name is shown in the
	 * chat header and used in the system prompt. The personality is
	 * injected into the system prompt as additional instructions.
	 * When empty, defaults to "Arth" with no extra personality.
	 */
	aiName: string;
	setAiName: (value: string) => void;
	aiPersonality: string;
	setAiPersonality: (value: string) => void;

	/**
	 * Co-edit mode: when true, the editor chrome stays interactive while
	 * the AI is in takeover mode. The aurora border still shows, but the
	 * user can click/drag/edit alongside the AI instead of being locked
	 * out. When false (default), the editor is locked during takeover.
	 */
	aiCoEditMode: boolean;
	setAiCoEditMode: (value: boolean) => void;

	/**
	 * AI takeover permission mode.
	 *  - "normal" (default): the AI must ask for the user's approval before
	 *    executing editor-modifying tools. The permission dialog/inline card
	 *    is shown once per session.
	 *  - "bypass": the AI skips the permission dialog entirely and executes
	 *    all modifying tools (including destructive ones like delete) without
	 *    asking. Intended for power users who trust the AI and want
	 *    uninterrupted autonomous operation. The aurora overlay still shows
	 *    so the user can see the AI is active and can revoke at any time.
	 */
	aiPermissionMode: "normal" | "bypass";
	setAiPermissionMode: (value: "normal" | "bypass") => void;
}

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			skipDeleteConfirm: false,
			setSkipDeleteConfirm: (value) => set({ skipDeleteConfirm: value }),

			defaultFps: 30,
			setDefaultFps: (fps) => set({ defaultFps: fps }),

			enablePopoutPanels: false,
			setEnablePopoutPanels: (value) => set({ enablePopoutPanels: value }),

			previewQuality: "auto",
			setPreviewQuality: (value) => set({ previewQuality: value }),

			showFpsMonitor: true,
			setShowFpsMonitor: (value) => set({ showFpsMonitor: value }),

			hdDragPreview: false,
			setHdDragPreview: (value) => set({ hdDragPreview: value }),

			aiName: "Arth",
			setAiName: (value) => set({ aiName: value || "Arth" }),
			aiPersonality: "",
			setAiPersonality: (value) => set({ aiPersonality: value }),

			aiCoEditMode: false,
			setAiCoEditMode: (value) => set({ aiCoEditMode: value }),

			aiPermissionMode: "normal",
			setAiPermissionMode: (value) => set({ aiPermissionMode: value }),
		}),
		{
			name: "app-settings",
		},
	),
);
