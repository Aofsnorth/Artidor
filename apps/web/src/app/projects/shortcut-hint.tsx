"use client";

/**
 * ShortcutHint — a single keybinding badge. Renders the key in
 * a tiny rounded box with the description next to it. Used in
 * the page toolbar to teach users that keyboard shortcuts exist
 * without taking up much real estate.
 */

import type { ReactNode } from "react";

function Key({ children }: { children: ReactNode }) {
	return (
		<kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/15 bg-white/[0.06] px-1.5 font-mono text-[10.5px] font-medium text-white/85">
			{children}
		</kbd>
	);
}

export function ShortcutHint({
	label,
	keys,
}: {
	label: string;
	keys: ReactNode[];
}) {
	return (
		<div className="flex items-center gap-1.5 text-[11px] text-white/45">
			<div className="flex items-center gap-0.5">
				{keys.map((k) => (
					<Key key={String(k)}>{k}</Key>
				))}
			</div>
			<span>{label}</span>
		</div>
	);
}
