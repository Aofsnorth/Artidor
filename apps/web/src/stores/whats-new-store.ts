import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getLatestWhatsNewId } from "@/lib/whats-new/feed";

interface WhatsNewStore {
	/** Id of the newest entry the user has acknowledged. */
	lastSeenId: string | null;
	/** Whether the expanded card is showing (session-only). */
	isOpen: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
	/** True when the newest entry hasn't been seen yet. */
	hasUnseen: () => boolean;
	/** Mark the newest entry as seen. */
	markSeen: () => void;
}

export const useWhatsNewStore = create<WhatsNewStore>()(
	persist(
		(set, get) => ({
			lastSeenId: null,
			isOpen: false,
			open: () => set({ isOpen: true }),
			close: () => {
				set({ isOpen: false, lastSeenId: getLatestWhatsNewId() });
			},
			toggle: () => {
				const next = !get().isOpen;
				set(
					next
						? { isOpen: true }
						: { isOpen: false, lastSeenId: getLatestWhatsNewId() },
				);
			},
			hasUnseen: () => {
				const latest = getLatestWhatsNewId();
				return latest !== null && latest !== get().lastSeenId;
			},
			markSeen: () => set({ lastSeenId: getLatestWhatsNewId() }),
		}),
		{
			name: "whats-new",
			// Only the seen marker is persisted; open state is per-session.
			partialize: (state) => ({ lastSeenId: state.lastSeenId }),
		},
	),
);
