"use client";

/**
 * Command palette (Ctrl/Cmd+K) — fuzzy-search every editor action and run it.
 *
 * Data source is the live keybindings (useKeyboardShortcutsHelp), so each
 * item shows its current shortcut and respects rebinds. Selecting an item
 * fires it through invokeAction. While open it registers a keybindings
 * overlay so global single-key hotkeys are suppressed (the user is typing).
 */

import { useEffect } from "react";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useEditorUIStore } from "@/stores/editor-ui-store";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { useKeyboardShortcutsHelp } from "@/hooks/use-keyboard-shortcuts-help";
import { invokeAction } from "@/lib/actions";
import type { TActionWithOptionalArgs } from "@/lib/actions";

export function CommandPalette() {
	const open = useEditorUIStore((s) => s.commandPaletteOpen);
	const setOpen = useEditorUIStore((s) => s.setCommandPaletteOpen);
	const { openOverlay, closeOverlay } = useKeybindingsStore();
	const { shortcuts } = useKeyboardShortcutsHelp();

	// Suppress global single-key hotkeys while the palette has focus.
	useEffect(() => {
		if (!open) return;
		openOverlay("command-palette");
		return () => closeOverlay("command-palette");
	}, [open, openOverlay, closeOverlay]);

	const runAction = (action: TActionWithOptionalArgs) => {
		setOpen(false);
		// Defer so the dialog unmounts before the action runs (some actions
		// touch focus / the timeline that the dialog was trapping).
		requestAnimationFrame(() => invokeAction(action));
	};

	// Group items by category for a tidy list.
	const groups = new Map<string, typeof shortcuts>();
	for (const s of shortcuts) {
		const list = groups.get(s.category) ?? [];
		list.push(s);
		groups.set(s.category, list);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="overflow-hidden border-white/[0.08] bg-[#09090b]/95 p-0 text-white backdrop-blur-md sm:max-w-lg">
				<Command
					className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.62rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-white/35"
					loop
				>
					<Command.Input
						autoFocus
						placeholder="Search commands…"
						className="h-11 w-full border-b border-white/[0.08] bg-transparent px-4 text-sm text-white/90 outline-none placeholder:text-white/35"
					/>
					<Command.List className="max-h-80 overflow-y-auto p-1.5">
						<Command.Empty className="py-6 text-center text-[0.8rem] text-white/40">
							No commands found.
						</Command.Empty>
						{[...groups.entries()].map(([category, items]) => (
							<Command.Group key={category} heading={category}>
								{items.map((item) => (
									<Command.Item
										key={item.id}
										value={`${item.description} ${item.category} ${item.id}`}
										onSelect={() => runAction(item.action)}
										className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[0.82rem] text-white/80 data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-white"
									>
										<span>{item.description}</span>
										{item.keys.length > 0 ? (
											<span className="ml-3 shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.66rem] text-white/45">
												{item.keys[0]}
											</span>
										) : null}
									</Command.Item>
								))}
							</Command.Group>
						))}
					</Command.List>
				</Command>
			</DialogContent>
		</Dialog>
	);
}
