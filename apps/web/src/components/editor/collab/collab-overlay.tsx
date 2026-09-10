/**
 * Collaboration overlay — renders remote collaborator cursors on top of
 * the timeline and a presence bar showing who's connected.
 *
 * The cursors are positioned absolutely within the timeline scroll
 * content area. Each cursor shows the collaborator's color and nickname
 * label. The presence bar shows colored avatar dots for each connected
 * collaborator.
 */

"use client";

import { useCollabStore } from "@/stores/collab-store";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";

/** Remote cursor rendered on the timeline. */
function RemoteCursor({
	nickname,
	color,
	x,
	y,
}: {
	nickname: string;
	color: string;
	x: number;
	y: number;
}) {
	return (
		<div
			className="pointer-events-none absolute z-50 transition-transform duration-75 ease-out"
			style={{
				left: x,
				top: y,
				transform: "translate(-2px, -2px)",
			}}
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				role="img"
				aria-label={`${nickname} cursor`}
			>
				<path
					d="M3 2L17 8L10 11L7 17L3 2Z"
					fill={color}
					stroke="white"
					strokeWidth="1"
					strokeLinejoin="round"
				/>
			</svg>
			<span
				className="absolute left-4 top-4 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm"
				style={{ backgroundColor: color }}
			>
				{nickname}
			</span>
		</div>
	);
}

/** Presence bar — shows colored dots for each connected collaborator. */
export function CollabPresenceBar() {
	// useShallow: the whole-store subscription re-rendered on EVERY collab
	// change (cursor moves at pointer rate, lock toggles). Now only the
	// three fields this bar reads can trigger a render.
	const collaborators = useCollabStore((s) => s.collaborators);
	const sessionId = useCollabStore((s) => s.sessionId);
	const status = useCollabStore((s) => s.status);

	const others = useMemo(
		() => collaborators.filter((c) => c.id !== sessionId),
		[collaborators, sessionId],
	);

	if (status !== "connected" || others.length === 0) return null;

	return (
		<div className="flex items-center gap-1">
			{others.map((c) => (
				<div
					key={c.id}
					className="group relative flex items-center"
					title={`${c.nickname}${c.isHost ? " (host)" : ""}`}
				>
					<div
						className="flex size-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
						style={{ backgroundColor: c.color }}
					>
						{c.nickname.charAt(0).toUpperCase()}
					</div>
					{/* Tooltip on hover */}
					<span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
						{c.nickname}
					</span>
				</div>
			))}
		</div>
	);
}

/**
 * Session banner — states honestly what the session does and does not do.
 * The current protocol is presence + edit notifications: remote edits are NOT
 * applied to any participant's timeline. Guests in view/comment/suggest modes
 * are read-only; the host's own project is never shared or overwritten.
 */
export function CollabSessionBanner() {
	// Single-field selector (stable identity): text-only banner — cursor
	// moves and lock toggles must not re-render it.
	const status = useCollabStore((s) => s.status);
	if (status !== "connected") return null;

	return (
		<div className="flex items-center gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-[10px] text-amber-200/90">
			<span aria-hidden>⚠</span>
			<p>
				Live presence session — edits stay in each participant's own project;
				remote edits are not synced (notification-only protocol).
			</p>
		</div>
	);
}

/** Cursor overlay — renders all remote cursors. Place inside the timeline content area. */
export function CollabCursorOverlay() {
	// Primitive + single-array selectors (stable identities): cursor
	// positions update at pointer rate, collaborator list changes rarely.
	// A whole-store destructure re-rendered this overlay on every lock /
	// comment / suggestion change too.
	const cursors = useCollabStore((s) => s.cursors);
	const sessionId = useCollabStore((s) => s.sessionId);
	const status = useCollabStore((s) => s.status);
	const collaborators = useCollabStore((s) => s.collaborators);

	const remoteCursors = useMemo(
		() => cursors.filter((c) => c.collaboratorId !== sessionId),
		[cursors, sessionId],
	);

	if (status !== "connected" || remoteCursors.length === 0) return null;

	// Map collaborator IDs to nicknames + colors.
	const collabMap = new Map(
		collaborators.map((c) => [c.id, { nickname: c.nickname, color: c.color }]),
	);

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{remoteCursors.map((cursor) => {
				const info = collabMap.get(cursor.collaboratorId);
				if (!info) return null;
				return (
					<RemoteCursor
						key={cursor.collaboratorId}
						nickname={info.nickname}
						color={info.color}
						x={cursor.x}
						y={cursor.y}
					/>
				);
			})}
		</div>
	);
}

/** Lock indicator — shows a colored border on elements locked by others. */
export function ElementLockIndicator({ elementId }: { elementId: string }) {
	// Single-field selectors (stable identities): per-clip component, mounted
	// on every timeline element — a whole-store destructure re-rendered ALL
	// clips on every cursor move / presence change.
	const locks = useCollabStore((s) => s.locks);
	const collaborators = useCollabStore((s) => s.collaborators);
	const sessionId = useCollabStore((s) => s.sessionId);

	const lockHolder = useMemo(() => {
		const lock = locks.find((l) => l.elementId === elementId);
		if (!lock || lock.lockedBy === sessionId) return null;
		const holder = collaborators.find((c) => c.id === lock.lockedBy);
		if (!holder) return null;
		return { nickname: holder.nickname, color: holder.color };
	}, [locks, collaborators, sessionId, elementId]);

	if (!lockHolder) return null;

	return (
		<div
			className="pointer-events-none absolute inset-0 rounded border-2"
			style={{ borderColor: lockHolder.color }}
		>
			<span
				className="absolute -top-4 left-0 whitespace-nowrap rounded px-1 py-0.5 text-[8px] font-medium text-white"
				style={{ backgroundColor: lockHolder.color }}
			>
				{lockHolder.nickname} editing
			</span>
		</div>
	);
}
