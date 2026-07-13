"use client";

import { useEffect, useRef, useState } from "react";
import { PREVIEW_ZOOM_PRESETS } from "@/lib/preview/zoom";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { RenameProjectDialog } from "./dialogs/rename-project-dialog";
import { DeleteProjectDialog } from "./dialogs/delete-project-dialog";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa6";
import { ExportButton } from "./export-button";
import { ShareButton } from "./share-button";
import { DEFAULT_LOGO_URL } from "@/lib/site/brand";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import {
	CommandIcon,
	Logout05Icon,
	ArrowDown01Icon,
	Settings01Icon,
	DashboardSquareSettingIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShortcutsDialog } from "./dialogs/shortcuts-dialog";
import { SavePresetDialog } from "./dialogs/save-preset-dialog";
import Image from "next/image";
import { cn } from "@/utils/ui";
import { useOpenDialogsStore } from "@/stores/open-dialogs-store";
import { useViewerStore } from "@/stores/viewer-store";
import { ViewIcon } from "@hugeicons/core-free-icons";
import {
	LAYOUT_PRESETS,
	usePanelStore,
	type LayoutPreset,
} from "@/stores/panel-store";

import { AdvancedViewersDropdown } from "./advanced-viewers-dropdown";
import { CloudStatusIndicator } from "./cloud-status-indicator";

export function EditorHeader() {
	const isViewer = useViewerStore((s) => s.isViewer);
	return (
		<header className="relative z-50 flex h-12 items-center justify-between gap-2 overflow-hidden bg-gradient-to-b from-[#111114] to-transparent px-4 transition-all">
			{/* Subtle top glow that fades into the body. No bottom border
			   (the header is the same color as the body, so the seam
			   disappears). The radial accent stays to give the bar a
			   little depth so it doesn't read as a flat strip. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 opacity-60"
				style={{
					background:
						"radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,255,0.035), transparent 70%)",
				}}
			/>
			{/* Hairline at the very top to lift the bar off the canvas.
			   Kept intentionally: it catches the light from the radial
			   accent above and avoids a hard pixel edge against the
			   window chrome. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
			/>

			{/* Left Corner Logo & Breadcrumbs */}
			<div className="relative flex min-w-0 items-center gap-3">
				{/* Logo at the absolute far-left corner */}
				<ProjectDropdown />

				{/* Identity Pod Capsule */}
				<div className="group flex h-7 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all hover:border-white/[0.16] hover:bg-white/[0.045]">
					<div className="hidden items-center gap-1.5 text-[0.65rem] font-mono text-white/40 md:flex select-none tracking-wider">
						<Link
							href="/projects"
							className="hover:text-white/90 transition-colors uppercase font-medium"
						>
							Projects
						</Link>
						<span className="text-white/20">/</span>
					</div>
					<EditableProjectName />
				</div>
			</div>

			{/* Center: Zoom Capsule — absolutely positioned at the header's
			   true centre (left-1/2 + -translate-x-1/2). `mx-auto` only
			   centres within the leftover space between the two side
			   sections, so an asymmetric left/right made the "Fit" control
			   drift off-centre; pulling it out of flex flow pins it to the
			   middle of the bar regardless of how wide either side grows.
			   Hidden on <lg where the left/right sections already saturate
			   the header. */}
			<div className="absolute left-1/2 top-1/2 hidden min-w-0 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.025] h-7 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_1px_2px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all hover:border-white/[0.16] hover:bg-white/[0.045] lg:flex">
				<HeaderZoomDropdown />
			</div>

			{/* Right: Segmented Action Hub — pushed to the right edge
			   with breathing room so the Export button doesn't sit
			   flush against the panel boundary. */}
			<nav className="relative ml-auto flex items-center gap-2.5 pr-1">
				{isViewer ? (
					// Read-only share: no cloud sync, no re-sharing, no export of
					// someone else's project. Surface the mode instead so the viewer
					// understands why edit affordances are gone.
					<span className="flex h-7 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-[0.72rem] font-medium text-white/70">
						<HugeiconsIcon icon={ViewIcon} className="size-3.5" />
						Read-only
					</span>
				) : (
					<>
						<CloudStatusIndicator />
						<LayoutPresetsDropdown />
						<AdvancedViewersDropdown />
						<SettingsButton />
						{/* Theme toggle removed — the editor is pinned to dark, so a
							light/dark switch did nothing visible here. */}

						<ShareButton />
						<div className="ml-1">
							<ExportButton />
						</div>
					</>
				)}
			</nav>
		</header>
	);
}

function HeaderZoomDropdown() {
	const [zoomLabel, setZoomLabel] = useState("Fit");

	useEffect(() => {
		const onChanged = (e: Event) => {
			const detail = (
				e as CustomEvent<{ zoomPercent: number; isAtFit: boolean }>
			).detail;
			if (!detail) return;
			setZoomLabel(detail.isAtFit ? "Fit" : `${detail.zoomPercent}%`);
		};
		window.addEventListener("oc:preview-zoom-changed", onChanged);
		return () =>
			window.removeEventListener("oc:preview-zoom-changed", onChanged);
	}, []);

	const setZoom = (detail: { percent?: number; fit?: boolean }) => {
		window.dispatchEvent(new CustomEvent("oc:set-preview-zoom", { detail }));
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex h-full items-center gap-1.5 rounded-full px-2 text-[0.68rem] font-medium text-white/70 transition hover:text-white focus:outline-none"
				>
					<span>{zoomLabel}</span>
					<HugeiconsIcon
						icon={ArrowDown01Icon}
						className="size-3 text-white/40"
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="center"
				className="z-100 w-28 bg-[#09090b]/90 border border-white/[0.08] backdrop-blur-md text-white/95"
			>
				<DropdownMenuItem
					onClick={() => setZoom({ fit: true })}
					className="hover:bg-white/[0.08] transition-colors focus:bg-white/[0.08] focus:text-white"
				>
					Fit
				</DropdownMenuItem>
				<DropdownMenuSeparator className="bg-white/10" />
				{PREVIEW_ZOOM_PRESETS.map((preset) => (
					<DropdownMenuItem
						key={preset}
						onClick={() => setZoom({ percent: preset })}
						className="hover:bg-white/[0.08] transition-colors focus:bg-white/[0.08] focus:text-white"
					>
						{preset}%
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function ProjectDropdown() {
	const [openDialog, setOpenDialog] = useState<
		"delete" | "rename" | "shortcuts" | null
	>(null);
	const [isExiting, setIsExiting] = useState(false);
	const router = useRouter();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	const handleExit = async () => {
		if (isExiting) return;
		setIsExiting(true);

		try {
			await editor.project.prepareExit();
			editor.project.closeProject();
		} catch (error) {
			console.error("Failed to prepare project exit:", error);
		} finally {
			editor.project.closeProject();
			router.push("/projects");
		}
	};

	const handleSaveProjectName = async (newName: string) => {
		if (
			activeProject &&
			newName.trim() &&
			newName !== activeProject.metadata.name
		) {
			try {
				await editor.project.renameProject({
					id: activeProject.metadata.id,
					name: newName.trim(),
				});
			} catch (error) {
				toast.error("Failed to rename project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setOpenDialog(null);
			}
		}
	};

	const handleDeleteProject = async () => {
		if (activeProject) {
			try {
				await editor.project.deleteProjects({
					ids: [activeProject.metadata.id],
				});
				router.push("/projects");
			} catch (error) {
				toast.error("Failed to delete project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setOpenDialog(null);
			}
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="relative size-10 shrink-0 cursor-pointer bg-[#0d0d0e] transition rounded-full [mask-image:radial-gradient(circle_at_center,black_45%,transparent_75%)] hover:scale-105 hover:ring-1 hover:ring-white/30 focus:outline-none flex items-center justify-center"
						aria-label="Artidor Logo"
					>
						<Image
							src={DEFAULT_LOGO_URL}
							alt="Project thumbnail"
							fill
							priority
							unoptimized
							className="object-cover mix-blend-screen"
						/>
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					className="z-100 w-44 bg-[#09090b]/90 border border-white/[0.08] backdrop-blur-md text-white/95 rounded-lg shadow-xl"
				>
					<DropdownMenuItem
						onClick={handleExit}
						disabled={isExiting}
						icon={<HugeiconsIcon icon={Logout05Icon} />}
						className="hover:bg-white/[0.08] transition-colors focus:bg-white/[0.08] focus:text-white rounded"
					>
						Exit project
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={() => setOpenDialog("shortcuts")}
						icon={<HugeiconsIcon icon={CommandIcon} />}
						className="hover:bg-white/[0.08] transition-colors focus:bg-white/[0.08] focus:text-white rounded"
					>
						Shortcuts
					</DropdownMenuItem>

					<DropdownMenuSeparator className="bg-white/10" />

					{SOCIAL_LINKS.discord && (
						<DropdownMenuItem
							asChild
							icon={<FaDiscord className="size-4!" />}
							className="hover:bg-white/[0.08] transition-colors focus:bg-white/[0.08] focus:text-white rounded"
						>
							<Link
								href={SOCIAL_LINKS.discord}
								target="_blank"
								rel="noopener noreferrer"
							>
								Discord
							</Link>
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<RenameProjectDialog
				isOpen={openDialog === "rename"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "rename" : null)}
				onConfirm={(newName) => handleSaveProjectName(newName)}
				projectName={activeProject?.metadata.name || ""}
			/>
			<DeleteProjectDialog
				isOpen={openDialog === "delete"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "delete" : null)}
				onConfirm={handleDeleteProject}
				projectNames={[activeProject?.metadata.name || ""]}
			/>
			<ShortcutsDialog
				isOpen={openDialog === "shortcuts"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "shortcuts" : null)}
			/>
			<SavePresetDialog />
		</>
	);
}

function EditableProjectName() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [isEditing, setIsEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const originalNameRef = useRef("");

	const projectName = activeProject?.metadata.name || "";

	const startEditing = () => {
		if (isEditing) return;
		originalNameRef.current = projectName;
		setIsEditing(true);

		requestAnimationFrame(() => {
			inputRef.current?.select();
		});
	};

	const saveEdit = async () => {
		if (!inputRef.current || !activeProject) return;
		const newName = inputRef.current.value.trim();
		setIsEditing(false);

		if (!newName) {
			inputRef.current.value = originalNameRef.current;
			return;
		}

		if (newName !== originalNameRef.current) {
			try {
				await editor.project.renameProject({
					id: activeProject.metadata.id,
					name: newName,
				});
			} catch (error) {
				toast.error("Failed to rename project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			}
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			inputRef.current?.blur();
		} else if (event.key === "Escape") {
			event.preventDefault();
			if (inputRef.current) {
				inputRef.current.value = originalNameRef.current;
				inputRef.current.setSelectionRange(0, 0);
			}
			setIsEditing(false);
			inputRef.current?.blur();
		}
	};

	return (
		<input
			ref={inputRef}
			type="text"
			defaultValue={projectName}
			readOnly={!isEditing}
			onClick={startEditing}
			onBlur={saveEdit}
			onKeyDown={handleKeyDown}
			style={{ fieldSizing: "content" }}
			className={cn(
				"h-7 min-w-0 max-w-[13rem] cursor-pointer rounded-md bg-transparent px-1.5 py-0.5 font-serif text-[0.85rem] font-medium text-white/90 outline-none hover:bg-white/[0.06] transition-all duration-200",
				isEditing &&
					"ring-1 ring-white/20 cursor-text hover:bg-transparent bg-black/20",
			)}
		/>
	);
}

function SettingsButton() {
	const setOpen = useOpenDialogsStore((s) => s.setOpen);
	return (
		<button
			type="button"
			className="grid size-8 cursor-pointer place-items-center rounded-md border border-white/[0.08] bg-white/[0.03] text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
			onClick={() => setOpen("settings", true)}
			title="Settings"
			aria-label="Open settings"
		>
			<HugeiconsIcon icon={Settings01Icon} className="size-4" />
		</button>
	);
}

function LayoutPresetPreview({ preset }: { preset: LayoutPreset }) {
	const { tools, preview, properties, mainContent } = preset.sizes;
	const totalTop = tools + preview + properties || 1;
	const toolsW = (tools / totalTop) * 100;
	const previewW = (preview / totalTop) * 100;
	const propertiesW = (properties / totalTop) * 100;

	return (
		<svg
			viewBox="0 0 100 60"
			className="shrink-0 rounded-[2px] border border-white/10 bg-zinc-900"
			width="28"
			height="18"
			aria-hidden="true"
		>
			<title>{preset.name}</title>
			<rect
				x="0"
				y="0"
				width={toolsW}
				height={mainContent}
				fill="rgba(255,255,255,0.12)"
			/>
			<rect
				x={toolsW}
				y="0"
				width={previewW}
				height={mainContent}
				fill="rgba(255,255,255,0.22)"
			/>
			<rect
				x={toolsW + previewW}
				y="0"
				width={propertiesW}
				height={mainContent}
				fill="rgba(255,255,255,0.12)"
			/>
			<rect
				x="0"
				y={mainContent}
				width="100"
				height={100 - mainContent}
				fill="rgba(255,255,255,0.08)"
			/>
		</svg>
	);
}

function LayoutPresetsDropdown() {
	const activePreset = usePanelStore((s) => s.activePreset);
	const setPreset = usePanelStore((s) => s.setPreset);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="grid size-8 cursor-pointer place-items-center rounded-md border border-white/[0.08] bg-white/[0.03] text-white/60 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
					title="Layout presets"
					aria-label="Switch layout preset"
				>
					<HugeiconsIcon icon={DashboardSquareSettingIcon} className="size-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{LAYOUT_PRESETS.map((preset) => (
					<DropdownMenuItem
						key={preset.id}
						onClick={() => setPreset(preset.id)}
						className={cn(
							"flex items-center gap-2.5",
							activePreset === preset.id && "bg-white/10 text-white",
						)}
					>
						<LayoutPresetPreview preset={preset} />
						<span className="flex-1 truncate text-sm">{preset.name}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
