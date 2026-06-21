/**
 * UI state for the timeline
 * For core logic, use EditorCore instead.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimelineStore {
	snappingEnabled: boolean;
	toggleSnapping: () => void;
	autoScrollEnabled: boolean;
	toggleAutoScroll: () => void;
	autoPlayWhileScrubbing: boolean;
	toggleAutoPlayWhileScrubbing: () => void;
	rippleEditingEnabled: boolean;
	toggleRippleEditing: () => void;
	expandedElementIds: Set<string>;
	toggleElementExpanded: (elementId: string) => void;
	// Redesign fields
	lockedTrackIds: Set<string>;
	toggleTrackLock: (trackId: string) => void;
	trackSliders: Record<string, number>;
	setTrackSlider: (trackId: string, value: number) => void;
	trackOpacity: Record<string, number>;
	setTrackOpacity: (trackId: string, value: number) => void;
	targetTrackIds: Set<string>;
	toggleTrackTarget: (trackId: string) => void;
	// Per-track height overrides. Keyed by track id. Missing entries fall
	// back to the default height for the track type (see TIMELINE_TRACK_HEIGHTS_PX).
	// Stored as raw pixel values so a user can shrink a track to almost
	// nothing and grow another to fill the editor.
	trackHeights: Record<string, number>;
	setTrackHeight: (trackId: string, heightPx: number) => void;
	resetTrackHeight: (trackId: string) => void;
}

export const useTimelineStore = create<TimelineStore>()(
	persist(
		(set) => ({
			snappingEnabled: true,

			toggleSnapping: () => {
				set((state) => ({ snappingEnabled: !state.snappingEnabled }));
			},

			autoScrollEnabled: true,

			toggleAutoScroll: () => {
				set((state) => ({
					autoScrollEnabled: !state.autoScrollEnabled,
				}));
			},

			autoPlayWhileScrubbing: false,

			toggleAutoPlayWhileScrubbing: () => {
				set((state) => ({
					autoPlayWhileScrubbing: !state.autoPlayWhileScrubbing,
				}));
			},

			rippleEditingEnabled: false,

			toggleRippleEditing: () => {
				set((state) => ({
					rippleEditingEnabled: !state.rippleEditingEnabled,
				}));
			},

			expandedElementIds: new Set<string>(),

			toggleElementExpanded: (elementId) => {
				set((state) => {
					const next = new Set(state.expandedElementIds);
					if (next.has(elementId)) {
						next.delete(elementId);
					} else {
						next.add(elementId);
					}
					return { expandedElementIds: next };
				});
			},

			// Redesign fields implementation
			lockedTrackIds: new Set<string>(),
			toggleTrackLock: (trackId) => {
				set((state) => {
					const next = new Set(state.lockedTrackIds);
					if (next.has(trackId)) {
						next.delete(trackId);
					} else {
						next.add(trackId);
					}
					return { lockedTrackIds: next };
				});
			},

			trackSliders: {},
			setTrackSlider: (trackId, value) => {
				set((state) => ({
					trackSliders: {
						...state.trackSliders,
						[trackId]: value,
					},
				}));
			},

			trackOpacity: {},
			setTrackOpacity: (trackId, value) => {
				set((state) => ({
					trackOpacity: {
						...state.trackOpacity,
						[trackId]: value,
					},
				}));
			},

			targetTrackIds: new Set<string>(),
			toggleTrackTarget: (trackId) => {
				set((state) => {
					const next = new Set(state.targetTrackIds);
					if (next.has(trackId)) {
						next.delete(trackId);
					} else {
						next.add(trackId);
					}
					return { targetTrackIds: next };
				});
			},

			// Track height overrides. We keep the state local-only (not in
			// `partialize`) on purpose: row heights are a "right now" layout
			// decision, not a per-project setting the user expects to
			// re-load later. Persisting them would also force a migration
			// every time a track is added or removed.
			trackHeights: {},
			setTrackHeight: (trackId, heightPx) => {
				set((state) => ({
					trackHeights: { ...state.trackHeights, [trackId]: heightPx },
				}));
			},
			resetTrackHeight: (trackId) => {
				set((state) => {
					const next = { ...state.trackHeights };
					delete next[trackId];
					return { trackHeights: next };
				});
			},
		}),
		{
			name: "timeline-store",
			partialize: (state) => ({
				snappingEnabled: state.snappingEnabled,
				rippleEditingEnabled: state.rippleEditingEnabled,
				autoPlayWhileScrubbing: state.autoPlayWhileScrubbing,
			}),
		},
	),
);
