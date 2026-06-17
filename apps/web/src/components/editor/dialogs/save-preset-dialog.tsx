"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookmarkAdd02Icon } from "@hugeicons/core-free-icons";
import { useEditor } from "@/hooks/use-editor";
import { useSavePresetDialogStore } from "@/stores/save-preset-dialog-store";
import { usePresetsStore } from "@/stores/presets-store";
import { buildPresetFromElements, renderPresetThumbnail } from "@/lib/presets";

export function SavePresetDialog() {
	const editor = useEditor();
	const { isOpen, elements, defaultName, close } = useSavePresetDialogStore();
	const addPreset = usePresetsStore((s) => s.addPreset);
	const [name, setName] = useState(defaultName);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setName(defaultName);
		}
	}, [isOpen, defaultName]);

	const handleSave = async (event?: React.FormEvent) => {
		event?.preventDefault();
		if (isSaving || elements.length === 0) return;
		setIsSaving(true);
		try {
			const time = editor.playback.getCurrentTime();
			const thumbnail = await renderPresetThumbnail({ editor, time }).catch(
				() => null,
			);
			const preset = buildPresetFromElements({
				editor,
				elements,
				name,
				thumbnail,
			});
			if (!preset) {
				toast.error("Nothing to save as a preset.");
				return;
			}
			await addPreset(preset);
			toast.success(`Saved "${preset.name}" to presets`);
			close();
		} catch (error) {
			console.error("Failed to save preset:", error);
			toast.error("Failed to save preset");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<DialogContent
				className="overflow-hidden border-white/[0.06] bg-gradient-to-b from-[#0e0e10] to-[#08080a] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:max-w-[380px] p-0"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="relative px-5 pt-5 pb-3">
					<DialogHeader className="gap-3">
						<div className="flex items-center gap-3">
							<div className="relative grid size-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
								<HugeiconsIcon
									icon={BookmarkAdd02Icon}
									className="relative z-10 size-4 text-white/80"
								/>
							</div>
							<div className="flex flex-col gap-0.5">
								<DialogTitle className="text-[0.9rem] font-semibold tracking-tight text-white/95">
									Save to preset
								</DialogTitle>
								<DialogDescription className="text-[0.72rem] text-white/40">
									{elements.length > 1
										? `Save these ${elements.length} layers (with animation) for reuse`
										: "Save this layer (with style & animation) for reuse"}
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
				</div>

				<form onSubmit={handleSave} className="flex flex-col gap-4 px-5 pb-5">
					<div className="flex flex-col gap-1.5">
						<label
							htmlFor="save-preset-input"
							className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-white/35"
						>
							Preset name
						</label>
						<Input
							id="save-preset-input"
							type="text"
							value={name}
							maxLength={60}
							placeholder="My preset"
							autoFocus
							autoComplete="off"
							onChange={(event) => setName(event.target.value)}
							className="h-10 rounded-lg border-white/[0.06] bg-white/[0.03] px-3 text-sm text-white/90 placeholder:text-white/25"
						/>
					</div>

					<DialogFooter className="flex-row justify-end gap-2 pt-1 border-t-0 p-0">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={close}
							className="h-8 px-3 text-xs text-white/50 hover:text-white/80"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={isSaving}
							className="h-8 px-4 text-xs font-medium bg-white/95 text-[#09090b] hover:bg-white"
						>
							{isSaving ? "Saving…" : "Save preset"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
