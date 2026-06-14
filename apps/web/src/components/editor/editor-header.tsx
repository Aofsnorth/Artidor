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
import { ThemeToggle } from "../theme-toggle";
import { DEFAULT_LOGO_URL } from "@/lib/site/brand";
import { SOCIAL_LINKS } from "@/lib/site/social";
import { toast } from "sonner";
import { useEditor } from "@/hooks/use-editor";
import {
	CommandIcon,
	Logout05Icon,
	ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShortcutsDialog } from "./dialogs/shortcuts-dialog";
import Image from "next/image";
import { cn } from "@/utils/ui";

export function EditorHeader() {
	return (
		<header className="z-50 flex h-[3.25rem] items-center justify-between bg-[#08080a]/40 backdrop-blur-2xl px-4 shadow-[0_8px_30px_rgba(0,0,0,0.55),inset_0_1.5px_0_rgba(255,255,255,0.05)] transition-all">
			{/* Left Corner Logo & Breadcrumbs (Style 1 capsules but logo standalone on absolute left) */}
			<div className="flex min-w-0 items-center gap-3">
				{/* Logo at the absolute far-left corner */}
				<ProjectDropdown />

				{/* Identity Pod Capsule */}
				<div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.015] px-3.5 py-1 shadow-[inset_0_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
					<div className="hidden items-center gap-1.5 text-[0.62rem] font-mono text-white/40 md:flex select-none tracking-wider">
						<Link
							href="/projects"
							className="hover:text-white/80 transition-colors uppercase font-bold"
						>
							Projects
						</Link>
						<span className="text-white/20">/</span>
					</div>
					<EditableProjectName />
				</div>
			</div>

			{/* Center: Zoom Capsule (Style 1 Capsule) */}
			<div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#0c0c0e]/35 p-1 px-2.5 shadow-[inset_0_1px_rgba(255,255,255,0.03),0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:border-white/15 hover:bg-[#0c0c0e]/50 lg:flex">
				<HeaderZoomDropdown />
			</div>

			{/* Right: Segmented Action Hub (Style 1 Capsules) */}
			<nav className="flex items-center gap-2.5">
				{/* Utilities Capsule */}
				<div className="flex items-center rounded-full border border-white/[0.06] bg-white/[0.015] p-0.5 shadow-[inset_0_1px_rgba(255,255,255,0.02)] backdrop-blur-md">
					<ThemeToggle
						className="size-7 rounded-full text-white/60 hover:bg-white/[0.05] hover:text-white transition-all duration-200"
						iconClassName="!size-3.5"
					/>
				</div>

				<ShareButton />
				<ExportButton />
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
					className="flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.68rem] font-semibold text-white/80 transition hover:bg-white/[0.08] hover:text-white focus:outline-none"
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
						className="relative size-9 shrink-0 cursor-pointer bg-[#0d0d0e] transition rounded-full [mask-image:radial-gradient(circle_at_center,black_45%,transparent_75%)] hover:scale-105 hover:ring-1 hover:ring-white/30 focus:outline-none flex items-center justify-center"
					>
						<Image
							src={DEFAULT_LOGO_URL}
							alt="Project thumbnail"
							fill
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
