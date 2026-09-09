/**
 * Collaboration store — React-facing state for the multiplayer editing
 * feature. Holds the room state, the local collaborator's identity, and the
 * connection status.
 *
 * The store is the UI mirror; the CollaborationManager owns the
 * transport (SSE + POST) and applies remote commands to the editor.
 *
 * Session data is ephemeral by design: only the nickname persists. Rejoining
 * a room always goes through a fresh join so stale session capabilities can
 * never be reused after the server pruned them.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { browserStorage } from "@/stores/browser-storage";
import type {
	CollabMode,
	Collaborator,
	CollabCursor,
	ElementLock,
	CollabComment,
	CollabSuggestion,
	RoomState,
} from "@/lib/collab/types";

export type CollabStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error";

interface CollabState {
	/** Current connection status. */
	status: CollabStatus;
	/** The room ID, or null when not in a session. */
	roomId: string | null;
	/** The join URL to share with collaborators. */
	joinUrl: string | null;
	/** The local collaborator's session ID. */
	sessionId: string | null;
	/** The local collaborator's nickname. */
	nickname: string | null;
	/** The local collaborator's assigned color. */
	color: string | null;
	/** Whether the local user is the room host. */
	isHost: boolean;
	/** The room's permission mode. */
	mode: CollabMode;
	/** The host's local project id — joiners navigate to it in the editor. */
	hostProjectId: string | null;
	/** The host's project name, for labeling the guest's local placeholder. */
	hostProjectName: string | null;
	/** All collaborators in the room (including local). */
	collaborators: Collaborator[];
	/** All remote cursors (excluding local — local cursor is sent, not displayed). */
	cursors: CollabCursor[];
	/** Active element locks. */
	locks: ElementLock[];
	/** Comments on the timeline. */
	comments: CollabComment[];
	/** Pending suggestions (in suggest mode). */
	suggestions: CollabSuggestion[];
	/** Error message if status is "error". */
	error: string | null;

	/* mutations */
	setStatus: (status: CollabStatus) => void;
	setRoom: (result: {
		roomId: string;
		joinUrl: string;
		sessionId: string;
		nickname: string;
		color: string;
		isHost: boolean;
		mode: CollabMode;
		hostProjectId: string | null;
	}) => void;
	updateRoomState: (state: RoomState) => void;
	setMode: (mode: CollabMode) => void;
	setError: (error: string | null) => void;
	disconnect: () => void;
}

export const useCollabStore = create<CollabState>()(
	persist(
		(set) => ({
			status: "disconnected",
			roomId: null,
			joinUrl: null,
			sessionId: null,
			nickname: null,
			color: null,
			isHost: false,
			mode: "view",
			hostProjectId: null,
			hostProjectName: null,
			collaborators: [],
			cursors: [],
			locks: [],
			comments: [],
			suggestions: [],
			error: null,

			setStatus: (status) => set({ status }),

			setRoom: (result) =>
				set({
					roomId: result.roomId,
					joinUrl: result.joinUrl,
					sessionId: result.sessionId,
					nickname: result.nickname,
					color: result.color,
					isHost: result.isHost,
					mode: result.mode,
					hostProjectId: result.hostProjectId,
					hostProjectName: null,
					status: "connected",
					error: null,
				}),

			updateRoomState: (state) =>
				set({
					collaborators: state.collaborators,
					cursors: state.cursors,
					locks: state.locks,
					comments: state.comments,
					suggestions: state.suggestions,
					mode: state.mode,
					hostProjectId: state.projectId ?? null,
					hostProjectName: state.projectName ?? null,
				}),

			setMode: (mode) => set({ mode }),

			setError: (error) => set({ error, status: "error" }),

			disconnect: () =>
				set({
					status: "disconnected",
					roomId: null,
					joinUrl: null,
					sessionId: null,
					nickname: null,
					color: null,
					isHost: false,
					mode: "view",
					hostProjectId: null,
					hostProjectName: null,
					collaborators: [],
					cursors: [],
					locks: [],
					comments: [],
					suggestions: [],
					error: null,
				}),
		}),
		{
			name: "artidor-collab",
			storage: browserStorage,
			// Only persist the nickname so the user doesn't re-enter it each time.
			// Room state is ephemeral — reconnecting always re-joins fresh.
			partialize: (state) => ({ nickname: state.nickname }),
		},
	),
);
