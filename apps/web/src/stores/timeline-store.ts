/**
 * UI state for the timeline
 * For core logic, use EditorCore instead.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimelineStore {
	snappingEnabled: boolean;
	toggleSnapping: () => void;
	rippleEditingEnabled: boolean;
	toggleRippleEditing: () => void;
	expandedElementIds: Set<string>;
	toggleElementExpanded: (elementId: string) => void;
	// Redesign fields
	lockedTrackIds: Set<string>;
	toggleTrackLock: (trackId: string) => void;
	trackSliders: Record<string, number>;
	setTrackSlider: (trackId: string, value: number) => void;
	targetTrackIds: Set<string>;
	toggleTrackTarget: (trackId: string) => void;
}

export const useTimelineStore = create<TimelineStore>()(
	persist(
		(set) => ({
			snappingEnabled: true,

			toggleSnapping: () => {
				set((state) => ({ snappingEnabled: !state.snappingEnabled }));
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
		}),
		{
			name: "timeline-store",
			partialize: (state) => ({
				snappingEnabled: state.snappingEnabled,
				rippleEditingEnabled: state.rippleEditingEnabled,
			}),
		},
	),
);
