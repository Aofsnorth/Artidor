"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	type KeyboardShortcut,
	useKeyboardShortcutsHelp,
} from "@/hooks/use-keyboard-shortcuts-help";
import { useKeybindingsStore } from "@/stores/keybindings-store";
import { getDefaultShortcuts } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Editable keyboard-shortcuts list. Auto-generates the full action catalog from
 * the keybindings store (so it stays in sync — "complete docs"), lets the user
 * record a new binding per action with conflict detection, reset a single
 * action, or reset everything. Shared by the header dialog and the Settings
 * tab so there's one implementation of the recording flow.
 */
export function ShortcutsEditor() {
	const [recordingShortcut, setRecordingShortcut] =
		useState<KeyboardShortcut | null>(null);
	const [query, setQuery] = useState("");

	const {
		updateKeybinding,
		removeKeybinding,
		getKeybindingString,
		validateKeybinding,
		getKeybindingsForAction,
		setIsRecording,
		resetToDefaults,
		isRecording,
	} = useKeybindingsStore();

	const { shortcuts } = useKeyboardShortcutsHelp();

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return shortcuts;
		return shortcuts.filter(
			(s) =>
				s.description.toLowerCase().includes(q) ||
				s.category.toLowerCase().includes(q) ||
				s.keys.some((k) => k.toLowerCase().includes(q)),
		);
	}, [shortcuts, query]);

	const categories = Array.from(new Set(filtered.map((s) => s.category)));

	useEffect(() => {
		if (!isRecording || !recordingShortcut) return;

		// Safety: never leave the UI stuck in "recording" if the user wanders off.
		const timeout = window.setTimeout(() => {
			setRecordingShortcut(null);
			setIsRecording(false);
			toast.info("Shortcut recording cancelled (timed out)");
		}, 8000);

		const handleKeyDown = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (e.key === "Escape") {
				setRecordingShortcut(null);
				setIsRecording(false);
				return;
			}

			// Ignore lone modifier presses — wait for a real combo.
			if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

			const keyString = getKeybindingString(e);
			if (!keyString) {
				// e.g. a bare Shift+letter inside a text field, or an unsupported key
				toast.error("That key can't be used as a shortcut. Try another.");
				return;
			}

			const conflict = validateKeybinding(keyString, recordingShortcut.action);
			if (conflict) {
				toast.error(
					`"${keyString}" is already used by "${conflict.existingAction}"`,
				);
				setRecordingShortcut(null);
				setIsRecording(false);
				return;
			}

			const oldKeys = getKeybindingsForAction(recordingShortcut.action);
			for (const key of oldKeys) removeKeybinding(key);
			updateKeybinding(keyString, recordingShortcut.action);
			toast.success(`Shortcut set to "${keyString}"`);

			setIsRecording(false);
			setRecordingShortcut(null);
		};

		const handleClickOutside = () => {
			setRecordingShortcut(null);
			setIsRecording(false);
		};

		document.addEventListener("keydown", handleKeyDown, true);
		document.addEventListener("click", handleClickOutside);

		return () => {
			window.clearTimeout(timeout);
			document.removeEventListener("keydown", handleKeyDown, true);
			document.removeEventListener("click", handleClickOutside);
		};
	}, [
		recordingShortcut,
		getKeybindingString,
		updateKeybinding,
		removeKeybinding,
		validateKeybinding,
		getKeybindingsForAction,
		setIsRecording,
		isRecording,
	]);

	const startRecording = (shortcut: KeyboardShortcut) => {
		setRecordingShortcut(shortcut);
		setIsRecording(true);
	};

	const resetOne = (shortcut: KeyboardShortcut) => {
		try {
			const defaults = getDefaultShortcuts();
			const defaultKeys = (
				Object.keys(defaults) as Array<keyof typeof defaults>
			).filter((k) => defaults[k] === shortcut.action);
			if (defaultKeys.length === 0) {
				toast.info("This action has no default shortcut.");
				return;
			}
			// Drop current bindings for this action, restore the defaults.
			for (const key of getKeybindingsForAction(shortcut.action)) {
				removeKeybinding(key);
			}
			for (const key of defaultKeys) {
				const conflict = validateKeybinding(key, shortcut.action);
				if (conflict) {
					removeKeybinding(key);
				}
				updateKeybinding(key, shortcut.action);
			}
			toast.success("Shortcut reset to default");
		} catch {
			toast.error("Could not reset this shortcut");
		}
	};

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<Input
				placeholder="Search shortcuts…"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
			<div className="scrollbar-thin flex min-h-0 grow flex-col gap-6 overflow-y-auto pr-1">
				{categories.length === 0 && (
					<p className="text-muted-foreground py-8 text-center text-sm">
						No shortcuts match "{query}".
					</p>
				)}
				{categories.map((category) => (
					<div key={category} className="flex flex-col gap-1">
						<h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
							{category}
						</h3>
						<div className="flex flex-col">
							{filtered
								.filter((s) => s.category === category)
								.map((shortcut) => (
									<ShortcutRow
										key={shortcut.action}
										shortcut={shortcut}
										isRecording={shortcut.action === recordingShortcut?.action}
										onStartRecording={() => startRecording(shortcut)}
										onReset={() => resetOne(shortcut)}
									/>
								))}
						</div>
					</div>
				))}
			</div>
			<div className="flex justify-end border-t border-white/[0.06] pt-3">
				<Button variant="destructive" size="sm" onClick={resetToDefaults}>
					Reset all to default
				</Button>
			</div>
		</div>
	);
}

function ShortcutRow({
	shortcut,
	isRecording,
	onStartRecording,
	onReset,
}: {
	shortcut: KeyboardShortcut;
	isRecording: boolean;
	onStartRecording: () => void;
	onReset: () => void;
}) {
	const displayKeys = shortcut.keys.filter((key) => {
		if (key.includes("Cmd") && shortcut.keys.includes(key.replace("Cmd", "Ctrl")))
			return false;
		return true;
	});

	return (
		<div className="group flex items-center justify-between gap-3 rounded-md px-1 py-1.5 hover:bg-white/[0.03]">
			<span className="text-sm">{shortcut.description}</span>
			<div className="flex items-center gap-2">
				{isRecording ? (
					<span className="text-primary animate-pulse text-xs">
						Press keys… (Esc to cancel)
					</span>
				) : (
					displayKeys.map((key, index) => (
						<span key={key} className="flex items-center gap-1">
							{index > 0 && (
								<span className="text-muted-foreground text-xs">or</span>
							)}
							{key.split("+").map((part) => (
								<kbd
									key={`${key}-${part}`}
									className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10.5px] text-white/70"
								>
									{part}
								</kbd>
							))}
						</span>
					))
				)}
				<Button
					variant="ghost"
					size="sm"
					className="h-6 px-2 text-[11px]"
					onClick={(e) => {
						e.stopPropagation();
						onStartRecording();
					}}
				>
					Edit
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 px-2 text-[11px] opacity-0 transition group-hover:opacity-100"
					onClick={(e) => {
						e.stopPropagation();
						onReset();
					}}
				>
					Reset
				</Button>
			</div>
		</div>
	);
}
