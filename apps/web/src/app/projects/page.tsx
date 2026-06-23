"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { EditorCore } from "@/core";
import { MigrationDialog } from "@/components/editor/dialogs/migration-dialog";
import { StoragePersistenceDialog } from "@/components/editor/dialogs/storage-persistence-dialog";
import { storageService } from "@/services/storage/service";
import { MobileGate } from "@/components/editor/mobile-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useEditor } from "@/hooks/use-editor";
import { ImportDriveButton } from "@/components/import-drive-button";
import { DriveAccountButton } from "@/components/drive-account-button";
import { useProjectsStore } from "./store";
import { GeneratedThumbnail } from "./generated-thumbnail";
import { ShortcutHint } from "./shortcut-hint";
import { StatsOverview } from "./stats-overview";
import { TemplatesRow, type ProjectTemplate } from "./templates-row";
import { useProjectsKeyboardShortcuts } from "./use-keyboard-shortcuts";
import type {
	TProject,
	TProjectMetadata,
	TProjectSortKey,
	TProjectSortOption,
} from "@/lib/project/types";
import { parseDriveUrl } from "@/lib/drive/parse";
import {
	getGoogleAccessToken,
	getGoogleClientId,
	initiateGoogleOAuth,
	createDriveFolder,
	saveProjectToDrive,
} from "@/lib/drive/api";
import { formatTimecode, mediaTimeToSeconds } from "artidor-wasm";
import { formatDate } from "@/utils/date";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	Calendar04Icon,
	GridViewIcon,
	LeftToRightListDashIcon,
	PlusSignIcon,
	Search01Icon,
	Video01Icon,
	MoreHorizontalIcon,
	Delete02Icon,
	Copy02Icon,
	Edit03Icon,
	ArrowDown02Icon,
	InformationCircleIcon,
	LayoutGridIcon,
	Settings01Icon,
	FileExportIcon,
	StarIcon,
	GoogleIcon,
} from "@hugeicons/core-free-icons";
import { Label } from "@/components/ui/label";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteProjectDialog } from "@/components/editor/dialogs/delete-project-dialog";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ProjectInfoDialog } from "@/components/editor/dialogs/project-info-dialog";
import { RenameProjectDialog } from "@/components/editor/dialogs/rename-project-dialog";
import { cn } from "@/utils/ui";
import { PageTransition } from "@/components/page-transition";
import { lazy, Suspense } from "react";
import { useOpenDialogsStore } from "@/stores/open-dialogs-store";
import {
	importProject,
	collectMediaRefs,
	type ImportedMediaRef,
} from "@/lib/project/file";
import { savePreset } from "@/lib/presets/storage";
import type { UserPreset } from "@/lib/presets/types";
import { generateUUID } from "@/utils/id";
import { MissingMediaDialog } from "@/components/editor/dialogs/missing-media-dialog";
import { ExportVideoDialog } from "@/components/editor/dialogs/export-video-dialog";
import { ExportProjectDialog } from "@/components/editor/dialogs/export-project-dialog";
import { processMediaAssets } from "@/lib/media/processing";

const SettingsDialog = lazy(() =>
	import("@/components/editor/dialogs/settings-dialog").then((m) => ({
		default: m.SettingsDialog,
	})),
);
const formatProjectDuration = ({
	duration,
}: {
	duration: number | undefined;
}): string | null => {
	if (duration === undefined) {
		return null;
	}

	const durationSeconds = mediaTimeToSeconds({ time: Math.round(duration) });
	const format = durationSeconds >= 3600 ? "HH:MM:SS" : "MM:SS";
	return formatTimecode({ time: Math.round(duration), format }) ?? "";
};

const VIEW_MODE_OPTIONS = [
	{ mode: "grid" as const, icon: GridViewIcon, label: "Grid view" },
	{ mode: "list" as const, icon: LeftToRightListDashIcon, label: "List view" },
];

export default function ProjectsPage() {
	const { searchQuery, sortKey, sortOrder, viewMode } = useProjectsStore();
	const editor = useEditor();
	const router = useRouter();
	const sortOption: TProjectSortOption = `${sortKey}-${sortOrder}`;

	const isLoading = useEditor((e) => e.project.getIsLoading());
	const isInitialized = useEditor((e) => e.project.getIsInitialized());
	const projectsToDisplay = useEditor((e) =>
		e.project.getFilteredAndSortedProjects({ searchQuery, sortOption }),
	);
	const allProjects = useEditor((e) => e.project.getSavedProjects());
	const syncState = useEditor((e) => e.project.getDriveSyncState());

	useEffect(() => {
		if (!editor.project.getIsInitialized()) {
			editor.project.loadAllProjects();
		}
	}, [editor.project]);

	// Stable callback handlers for the keyboard-shortcuts layer.
	// Wrapped in useCallback so the listener below doesn't tear
	// down on every render.
	const createNewProject = useCallback(async () => {
		const projectId = await editor.project.createNewProject({
			name: "New project",
		});
		router.push(`/editor/${projectId}`);
	}, [editor.project, router]);
	const openProject = useCallback(
		(id: string) => {
			router.push(`/editor/${id}`);
		},
		[router],
	);
	const focusProject = useCallback((id: string) => {
		// Scroll the matching card into view so the user can see
		// which project their arrow keys just landed on.
		const el = document.querySelector<HTMLElement>(
			`[data-project-card-id="${id}"]`,
		);
		if (el) {
			el.scrollIntoView({ block: "nearest", behavior: "smooth" });
			el.focus({ preventScroll: true });
		}
	}, []);

	useProjectsKeyboardShortcuts({
		projectIds: projectsToDisplay.map((p) => p.id),
		handlers: {
			onCreateNew: () => {
				void createNewProject();
			},
			onFocusProject: focusProject,
			onOpenProject: openProject,
		},
	});

	// Listen for URL query parameters to auto-load drive folder links
	useEffect(() => {
		if (!isInitialized) return;

		const params = new URLSearchParams(window.location.search);
		const importDrive =
			params.get("import_drive") || params.get("drive_folder");
		if (!importDrive) return;

		const parsed = parseDriveUrl({ url: importDrive });
		const folderId = parsed?.kind === "folder" ? parsed.id : importDrive;

		if (!folderId) return;

		const runImport = async () => {
			// Clear query params so it doesn't trigger again on reload
			window.history.replaceState({}, document.title, window.location.pathname);

			const token = getGoogleAccessToken();
			if (!token) {
				toast.error("Google Drive authentication required", {
					description:
						"Please click 'Import' at the top right, configure your Client ID if needed, and Sign In with Google.",
					duration: 10000,
				});
				return;
			}

			try {
				const projectId = await editor.project.syncProjectFromDrive(folderId);
				router.push(`/editor/${projectId}`);
			} catch (err) {
				toast.error("Google Drive sync failed", {
					description:
						err instanceof Error ? err.message : "Could not import the folder.",
				});
			}
		};

		void runImport();
	}, [editor.project, isInitialized, router]);

	return (
		<MobileGate>
			<PageTransition>
				{/* `h-screen overflow-hidden` pins the page to a single
			   viewport so the header + toolbar + content always
			   fit. The content area is `flex-1 min-h-0` so it can
			   shrink and own the remaining height without pushing
			   the document taller. If a sub-region (the project
			   grid) needs its own scroll, it gets its own
			   `overflow-auto` — the page chrome itself never
			   scrolls. The Covenant artwork (gothic cathedral +
			   figure) sits in its own absolutely-positioned layer
			   behind everything, scaled up slightly + blurred so
			   the dark detail shows through but doesn't compete
			   with the foreground cards. A dark gradient overlay
			   layers on top to keep the chrome (white text on
			   glass cards) legible. */}
				<div className="relative flex h-screen flex-col overflow-hidden">
					{/* Background layer — rendered sharp at native quality (no blur,
				   no upscale) so the artwork stays crisp. Negative z-index so
				   the page chrome renders on top. */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 -z-20"
						style={{
							backgroundImage: "url(/wallpaper/projects-covenant.webp)",
							backgroundRepeat: "no-repeat",
							backgroundSize: "cover",
							backgroundPosition: "center",
						}}
					/>
					{/* Dreamy atmospheric overlay — three soft radial
				   glows (cool indigo, warm amber, soft pink) that
				   bloom across the artwork, evoking the "liminal
				   dream" aesthetic. Plus a vignette at the edges
				   so the centre pops. */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 -z-10"
						style={{
							background: [
								// Soft colour blooms
								"radial-gradient(ellipse 50% 40% at 30% 20%, rgba(120, 140, 220, 0.18), transparent 70%)",
								"radial-gradient(ellipse 40% 50% at 70% 60%, rgba(220, 180, 200, 0.15), transparent 70%)",
								"radial-gradient(ellipse 60% 50% at 50% 90%, rgba(200, 160, 100, 0.13), transparent 70%)",
								// Edge vignette for cinematic depth
								"radial-gradient(ellipse at center, transparent 50%, rgba(8, 8, 10, 0.45) 100%)",
								// Top-to-bottom legibility wash
								"linear-gradient(180deg, rgba(8, 8, 10, 0.35) 0%, rgba(8, 8, 10, 0.10) 35%, rgba(8, 8, 10, 0.20) 70%, rgba(8, 8, 10, 0.50) 100%)",
							].join(", "),
						}}
					/>
					{/* Full-screen asset sync progress overlay */}
					{syncState.status === "syncing-assets" && (
						<div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
							<div className="flex flex-col items-center gap-4 max-w-sm w-full px-6 text-center">
								<div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
								<h2 className="text-lg font-semibold text-white tracking-wide">
									Syncing Google Drive Folder
								</h2>
								<p className="text-xs text-white/55 min-h-8 truncate w-full">
									{syncState.message}
								</p>
								<div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2 relative">
									<div
										className="bg-white h-full transition-all duration-300 rounded-full"
										style={{ width: `${syncState.progress}%` }}
									/>
								</div>
								<span className="text-xs font-mono text-white/40">
									{syncState.progress}% complete
								</span>
							</div>
						</div>
					)}
					<MigrationDialog />
					<StoragePersistenceDialog />
					<ProjectsHeader />
					<ProjectsToolbar projectIds={projectsToDisplay.map((p) => p.id)} />
					<main className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-3 overflow-hidden px-4 pt-2 pb-4">
						{isLoading || !isInitialized ? (
							<ProjectsSkeleton />
						) : projectsToDisplay.length === 0 ? (
							/* The empty state is centered in the available area.
						   `flex-1` spacers above and below split the leftover
						   vertical space so the card sits exactly in the
						   visual centre of the viewport, regardless of
						   viewport height. `overflow-auto` is a safety net. */
							<div className="flex flex-1 min-h-0 flex-col items-center overflow-auto pb-2">
								<div className="flex-1" />
								<EmptyState onCreateNew={createNewProject} />
								<div className="flex-1" />
							</div>
						) : (
							<>
								{/* Workspace overview — only when there are projects
							   to summarise. The empty state owns the screen
							   otherwise, no need for stats on a blank page. */}
								<StatsOverview projects={allProjects} />
								{/* `flex-1 min-h-0 overflow-auto` lets the grid take
							   whatever vertical space is left and scroll
							   internally if a project count overflows the
							   viewport. The page chrome (header, toolbar,
							   stats) stays locked at the top; only the cards
							   themselves scroll when there are too many to
							   fit. */}
								<div
									className={
										"flex-1 min-h-0 overflow-auto " +
										(viewMode === "grid"
											? "xs:grid-cols-2 grid grid-cols-1 gap-4 content-start sm:grid-cols-3 lg:grid-cols-4 px-4"
											: "flex flex-col gap-2")
									}
								>
									{projectsToDisplay.map((project) => (
										<ProjectItem
											key={project.id}
											project={project}
											allProjectIds={projectsToDisplay.map((p) => p.id)}
										/>
									))}
								</div>
							</>
						)}
					</main>
				</div>

				{/* Settings button — fixed bottom-right corner */}
				<ProjectsSettingsButton />

				<Suspense fallback={null}>
					<ProjectsSettingsDialog />
				</Suspense>
			</PageTransition>
		</MobileGate>
	);
}

function ProjectsSettingsDialog() {
	const isSettingsOpen = useOpenDialogsStore((s) => s.open.settings ?? false);
	const setOpen = useOpenDialogsStore((s) => s.setOpen);

	return (
		<SettingsDialog
			isOpen={isSettingsOpen}
			onOpenChange={(open) => setOpen("settings", open)}
		/>
	);
}

function ProjectsSettingsButton() {
	const setOpen = useOpenDialogsStore((s) => s.setOpen);

	return (
		<button
			type="button"
			className="fixed bottom-5 right-5 z-50 grid size-10 cursor-pointer place-items-center rounded-full border border-white/[0.10] bg-white/[0.06] text-white/50 shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.12] hover:text-white hover:shadow-xl"
			onClick={() => setOpen("settings", true)}
			title="Settings"
			aria-label="Open settings"
		>
			<HugeiconsIcon icon={Settings01Icon} className="size-4.5" />
		</button>
	);
}

function ProjectsHeader() {
	const { viewMode, isHydrated, setViewMode } = useProjectsStore();

	return (
		<header className="sticky top-0 z-20 relative">
			{/* Glassmorphism backdrop for the header. The bottom edge fades
					   into transparent so the header feels weightless against the
					   artwork underneath, instead of leaving a hard seam. The
					   backdrop is kept short with a softer mid-falloff so the
					   blur reads through more before trailing into the seam. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 -bottom-6 -z-10 border-b border-white/[0.06] bg-[#09090b]/55 shadow-[0_24px_78px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
				style={{
					maskImage:
						"linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.85) 70%, transparent 100%)",
					WebkitMaskImage:
						"linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.85) 70%, transparent 100%)",
				}}
			/>
			{/* A second, brighter glass pass on top so the controls read
				   crisp against the artwork below. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-white/[0.045] via-white/[0.02] to-transparent"
			/>
			{/* The header content spans the full viewport so the left
				   controls (breadcrumb + view toggle) pin to the left
				   corner and the right cluster (search, actions, new
				   project) pin to the right corner, regardless of how
				   wide the screen is. The main grid below keeps the
				   narrower `max-w-7xl` rail so the project cards still
				   read as a contained gallery. */}
			<div className="flex w-full flex-col gap-2 px-4 sm:px-6 lg:px-8">
				<div className="flex min-h-16 items-center justify-between gap-3 py-3">
					<div className="flex min-w-0 items-center justify-start gap-3 lg:gap-5">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink asChild>
										<Link href="/" className="text-sm sm:text-base">
											Home
										</Link>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage className="text-sm sm:text-base font-medium text-foreground">
										Projects
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>

						<div className="hidden h-9 items-center rounded-full border border-white/[0.08] bg-white/[0.035] p-1 shadow-inner shadow-white/[0.02] backdrop-blur-sm md:flex">
							{VIEW_MODE_OPTIONS.map(({ mode, icon, label }) => (
								<Button
									key={mode}
									variant="ghost"
									size="icon"
									className={cn(
										"size-7 rounded-full text-white/50 hover:bg-white/[0.08] hover:text-white",
										isHydrated &&
											viewMode === mode &&
											"!bg-white !text-black shadow-sm",
									)}
									onClick={() => setViewMode({ viewMode: mode })}
									aria-label={label}
									aria-pressed={isHydrated && viewMode === mode}
								>
									<HugeiconsIcon icon={icon} className="size-4" />
								</Button>
							))}
						</div>
					</div>

					<div className="flex min-w-0 items-center justify-end gap-2 lg:gap-2.5">
						<SearchBar className="hidden w-[220px] xl:block" />
						<div className="hidden items-center gap-3 text-nowrap 2xl:flex">
							<ShortcutHint label="Search" keys={["/"]} />
							<ShortcutHint label="New" keys={["N"]} />
						</div>
						<div className="hidden h-5 w-px bg-white/[0.08] xl:block" />
						<TemplatesButton />
						<ImportDriveButton />
						<NewProjectButton />
						<DriveAccountButton />
					</div>
				</div>
				<SearchBar className="block md:hidden mb-4" />
			</div>
		</header>
	);
}

const SORT_LABELS: Record<TProjectSortKey, string> = {
	createdAt: "Created",
	updatedAt: "Modified",
	name: "Name",
	duration: "Duration",
};

function ProjectsToolbar({ projectIds }: { projectIds: string[] }) {
	const {
		selectedProjectIds,
		sortKey,
		sortOrder,
		setSortOrder,
		setSelectedProjects,
		clearSelectedProjects,
		viewMode,
		setViewMode,
	} = useProjectsStore();

	const selectedProjectCount = selectedProjectIds.length;
	const isAllSelected =
		projectIds.length > 0 && selectedProjectCount === projectIds.length;
	const hasSomeSelected =
		selectedProjectCount > 0 && selectedProjectCount < projectIds.length;

	const handleSelectAll = ({ checked }: { checked: boolean }) => {
		if (checked) {
			setSelectedProjects({ projectIds });
			return;
		}
		clearSelectedProjects();
	};

	return (
		<div className="sticky top-16 z-10 flex items-center justify-between px-6 h-14 pt-2 mt-1 transition-all">
			<div className="flex items-center gap-2 bg-background/30 backdrop-blur-xl border border-white/5 rounded-full px-2 py-1 shadow-sm">
				<Label
					className="flex items-center gap-3 cursor-pointer px-2"
					htmlFor="select-all-projects"
				>
					<Checkbox
						className="size-5"
						id="select-all-projects"
						checked={
							isAllSelected ? true : hasSomeSelected ? "indeterminate" : false
						}
						onCheckedChange={(checked) =>
							handleSelectAll({ checked: checked === true })
						}
					/>
					<span className="text-muted-foreground hidden md:block">
						Select all
					</span>
				</Label>

				<div className="h-4 w-px bg-border/50" />

				<SortDropdown>
					<Button variant="text" className="text-muted-foreground pl-2">
						{SORT_LABELS[sortKey]}
					</Button>
				</SortDropdown>
				<Button
					variant="text"
					className="text-muted-foreground"
					onClick={() =>
						setSortOrder({
							sortOrder: sortOrder === "asc" ? "desc" : "asc",
						})
					}
					onKeyDown={(event) => {
						if (event.key === "Enter" || event.key === " ") {
							setSortOrder({
								sortOrder: sortOrder === "asc" ? "desc" : "asc",
							});
						}
					}}
					aria-label={`Sort ${sortOrder === "asc" ? "ascending" : "descending"}`}
				>
					<HugeiconsIcon
						icon={ArrowDown02Icon}
						className={sortOrder === "asc" ? "rotate-180" : ""}
					/>
				</Button>

				<div className="h-4 w-px bg-border/50 block md:hidden" />

				<div className="flex md:hidden items-center gap-4">
					{VIEW_MODE_OPTIONS.map(({ mode, icon, label }) => (
						<Button
							key={mode}
							variant="text"
							onClick={() => setViewMode({ viewMode: mode })}
							aria-label={label}
						>
							<HugeiconsIcon
								icon={icon}
								className={cn(
									viewMode === mode ? "text-primary" : "text-muted-foreground",
								)}
							/>
						</Button>
					))}
				</div>
			</div>
			{selectedProjectCount > 0 ? <ProjectActions /> : null}
		</div>
	);
}

function SearchBar({
	className,
	collapsed,
}: {
	className?: string;
	collapsed?: boolean;
}) {
	const { searchQuery, setSearchQuery } = useProjectsStore();

	return (
		<>
			{collapsed ? (
				<div className="block md:hidden">
					<Button
						size="icon"
						variant="outline"
						className="size-10.5 rounded-full"
					>
						<HugeiconsIcon icon={Search01Icon} />
					</Button>
				</div>
			) : (
				<div className={cn("relative", className)}>
					<HugeiconsIcon
						icon={Search01Icon}
						className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
						aria-hidden="true"
					/>
					<Input
						id="projects-search-input"
						placeholder="Search..."
						value={searchQuery}
						onChange={(event) => setSearchQuery({ query: event.target.value })}
						size="lg"
						className="pl-9"
					/>
				</div>
			)}
		</>
	);
}

const PROJECT_ACTIONS = [
	{
		id: "duplicate",
		label: "Duplicate",
		icon: Copy02Icon,
		variant: "outline" as const,
	},
	{
		id: "delete",
		label: "Delete",
		icon: Delete02Icon,
		variant: "destructive-foreground" as const,
	},
] as const;

async function deleteProjects({
	editor,
	ids,
}: {
	editor: EditorCore;
	ids: string[];
}) {
	await editor.project.deleteProjects({ ids });
}

async function duplicateProjects({
	editor,
	ids,
}: {
	editor: EditorCore;
	ids: string[];
}) {
	await editor.project.duplicateProjects({ ids });
}

async function renameProject({
	editor,
	id,
	name,
}: {
	editor: EditorCore;
	id: string;
	name: string;
}) {
	await editor.project.renameProject({ id, name });
}

function buildProjectPreset({
	project,
	name = project.metadata.name,
	category = "Project",
	description = "",
}: {
	project: TProject;
	name?: string;
	category?: string;
	description?: string;
}): UserPreset {
	const items = project.scenes.flatMap((scene) =>
		[scene.tracks.main, ...scene.tracks.overlay, ...scene.tracks.audio].flatMap(
			(track) =>
				track.elements.map((element) => {
					const { id: _id, ...elementWithoutId } = element;
					return {
						trackType: track.type,
						sourceTrackKey: track.id,
						relativeStartTime: element.startTime,
						element: elementWithoutId,
					};
				}),
		),
	);
	return {
		id: generateUUID(),
		name: name.trim() || "Untitled preset",
		kind: "project",
		category: category.trim() || "Project",
		description: description.trim(),
		thumbnail: project.metadata.thumbnail ?? null,
		duration: project.metadata.duration,
		createdAt: Date.now(),
		items,
	};
}

function ProjectActions() {
	const editor = useEditor();
	const { selectedProjectIds, clearSelectedProjects } = useProjectsStore();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const savedProjects = editor.project.getSavedProjects();
	const selectedProjectNames = savedProjects
		.filter((project) => selectedProjectIds.includes(project.id))
		.map((project) => project.name);

	const handleDuplicate = async () => {
		await duplicateProjects({ editor, ids: selectedProjectIds });
		clearSelectedProjects();
	};

	const handleDeleteClick = () => {
		setIsDeleteDialogOpen(true);
	};

	const handleDeleteConfirm = async () => {
		await deleteProjects({ editor, ids: selectedProjectIds });
		clearSelectedProjects();
		setIsDeleteDialogOpen(false);
	};

	const actionHandlers: Record<string, () => void> = {
		duplicate: handleDuplicate,
		delete: handleDeleteClick,
	};

	return (
		<>
			<div className="flex items-center gap-2.5 px-3 bg-background/30 backdrop-blur-xl border border-white/5 rounded-full py-1 shadow-sm">
				<div className="hidden sm:flex items-center gap-2.5">
					{PROJECT_ACTIONS.map((action) => (
						<Button
							key={action.id}
							size="icon"
							variant={action.variant}
							className="size-9"
							onClick={actionHandlers[action.id]}
						>
							<HugeiconsIcon icon={action.icon} />
						</Button>
					))}
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild className="sm:hidden">
						<Button size="icon" variant="outline" className="size-9">
							<HugeiconsIcon icon={MoreHorizontalIcon} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{PROJECT_ACTIONS.map((action) => (
							<DropdownMenuItem
								key={action.id}
								variant={action.id === "delete" ? "destructive" : undefined}
								onClick={actionHandlers[action.id]}
							>
								<HugeiconsIcon icon={action.icon} />
								{action.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				projectNames={selectedProjectNames}
				onConfirm={handleDeleteConfirm}
			/>
		</>
	);
}

function SortDropdown({ children }: { children: React.ReactNode }) {
	const { sortKey, setSortKey } = useProjectsStore();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
			<DropdownMenuContent className="w-48" align="center">
				<DropdownMenuCheckboxItem
					checked={sortKey === "createdAt"}
					onCheckedChange={() => setSortKey({ sortKey: "createdAt" })}
				>
					Created
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "updatedAt"}
					onCheckedChange={() => setSortKey({ sortKey: "updatedAt" })}
				>
					Modified
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "name"}
					onCheckedChange={() => setSortKey({ sortKey: "name" })}
				>
					Name
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={sortKey === "duration"}
					onCheckedChange={() => setSortKey({ sortKey: "duration" })}
				>
					Duration
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NewProjectButton() {
	const editor = useEditor();
	const router = useRouter();
	const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
	const [missingMedia, setMissingMedia] = useState<ImportedMediaRef[]>([]);
	const [missingDialogOpen, setMissingDialogOpen] = useState(false);
	const [pendingImportProjectId, setPendingImportProjectId] = useState<
		string | null
	>(null);

	const handleCreateProject = async () => {
		const projectId = await editor.project.createNewProject({
			name: "New project",
		});
		router.push(`/editor/${projectId}`);
	};

	const handleImportProject = async () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".artidor,.artpr";
		input.onchange = async (event) => {
			const file = (event.target as HTMLInputElement).files?.[0];
			if (!file) return;
			try {
				const project = await importProject(file);
				await storageService.saveProject({ project });
				await editor.project.loadAllProjects();

				// Detect missing media
				const mediaRefs = collectMediaRefs(project);
				if (mediaRefs.length > 0) {
					setMissingMedia(mediaRefs);
					setPendingImportProjectId(project.metadata.id);
					setMissingDialogOpen(true);
					toast.success("Project imported — some media files may be missing");
				} else {
					toast.success("Project imported");
					router.push(`/editor/${project.metadata.id}`);
				}
			} catch (error) {
				toast.error("Failed to import project", {
					description: error instanceof Error ? error.message : "Invalid file",
				});
			}
		};
		input.click();
	};

	const handleMissingMediaConfirm = async (matches: Map<string, File>) => {
		if (!pendingImportProjectId) return;

		if (matches.size > 0) {
			try {
				for (const file of matches.values()) {
					const processedAssets = await processMediaAssets({ files: [file] });
					const processed = processedAssets[0];
					if (processed) {
						await editor.media.addMediaAsset({
							projectId: pendingImportProjectId,
							asset: processed,
						});
					}
				}
				toast.success(
					`Linked ${matches.size} media file${matches.size !== 1 ? "s" : ""}`,
				);
			} catch {
				toast.error("Some media files could not be linked");
			}
		}

		router.push(`/editor/${pendingImportProjectId}`);
		setPendingImportProjectId(null);
		setMissingMedia([]);
	};

	return (
		<div className="flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 shadow-inner shadow-white/[0.02] backdrop-blur">
			<Button
				size="sm"
				variant="ghost"
				className="h-8 rounded-full px-3 text-[12px] font-medium text-white/65 hover:bg-white/[0.08] hover:text-white"
				onClick={handleImportProject}
			>
				<span className="hidden xl:inline">Import project</span>
				<span className="xl:hidden">Import</span>
			</Button>
			<Button
				size="sm"
				variant="ghost"
				className="h-8 rounded-full px-3 text-[12px] font-medium text-white/65 hover:bg-white/[0.08] hover:text-white"
				onClick={() => setIsPresetDialogOpen(true)}
			>
				<span className="hidden xl:inline">New Preset</span>
				<span className="xl:hidden">Preset</span>
			</Button>
			<Button
				size="sm"
				className="h-8 gap-1.5 rounded-full bg-white px-3.5 text-[12px] font-semibold text-[#0a0a0c] shadow-[0_6px_22px_rgba(255,255,255,0.18)] hover:bg-white/90"
				onClick={handleCreateProject}
			>
				<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
				<span className="hidden lg:inline">New project</span>
				<span className="lg:hidden">New</span>
			</Button>
			<NewPresetDialog
				open={isPresetDialogOpen}
				onOpenChange={setIsPresetDialogOpen}
			/>
			<MissingMediaDialog
				open={missingDialogOpen}
				onOpenChange={setMissingDialogOpen}
				missingMedia={missingMedia}
				onConfirm={handleMissingMediaConfirm}
			/>
		</div>
	);
}

function NewPresetDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [name, setName] = useState("New preset");
	const [category, setCategory] = useState("Custom");
	const [description, setDescription] = useState("");

	const handleSave = async (event: React.FormEvent) => {
		event.preventDefault();
		const preset: UserPreset = {
			id: generateUUID(),
			name: name.trim() || "New preset",
			kind: "group",
			category: category.trim() || "Custom",
			description: description.trim(),
			thumbnail: null,
			duration: 0,
			createdAt: Date.now(),
			items: [],
		};
		await savePreset({ preset });
		toast.success(`Saved "${preset.name}" to presets`);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[420px]">
				<form onSubmit={handleSave}>
					<DialogHeader>
						<DialogTitle>New Preset</DialogTitle>
						<DialogDescription>
							Configure preset metadata and save it to your library.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4 p-6">
						<Input
							value={name}
							placeholder="Preset name"
							onChange={(event) => setName(event.target.value)}
						/>
						<Input
							value={category}
							placeholder="Category"
							onChange={(event) => setCategory(event.target.value)}
						/>
						<Textarea
							value={description}
							placeholder="Description"
							onChange={(event) => setDescription(event.target.value)}
						/>
						<p className="text-xs text-muted-foreground">
							Included elements/keyframes: 0. Save timeline selections from the
							element context menu.
						</p>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit">Save preset</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function TemplatesButton() {
	// Online templates aren't shipped yet. We surface the entry point so the
	// feature is discoverable, but keep it locked: non-interactive, dimmed, and
	// badged "Soon". Wire up navigation here once the template gallery exists.
	return (
		<Button
			type="button"
			size="sm"
			variant="outline"
			aria-disabled
			title="Online templates — coming soon"
			className="relative hidden h-9 cursor-not-allowed items-center gap-1.5 rounded-full border-white/[0.08] bg-white/[0.03] px-3 text-[12px] opacity-60 hover:bg-white/[0.05] lg:flex"
		>
			<HugeiconsIcon icon={LayoutGridIcon} className="size-3.5" />
			<span className="hidden font-medium xl:block">Templates</span>
			<span className="rounded-full border border-white/15 bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/60">
				Soon
			</span>
		</Button>
	);
}

function ProjectItem({
	project,
	allProjectIds,
}: {
	project: TProjectMetadata;
	allProjectIds: string[];
}) {
	const {
		selectedProjectIds,
		viewMode,
		setProjectSelected,
		selectProjectRange,
	} = useProjectsStore();
	const selectedProjectIdSet = new Set(selectedProjectIds);
	const isSelected = selectedProjectIdSet.has(project.id);
	const selectedProjectCount = selectedProjectIds.length;
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
	const editor = useEditor();
	const durationLabel = formatProjectDuration({ duration: project.duration });
	const isMultiSelect = selectedProjectCount > 1;
	const isGridView = viewMode === "grid";

	const handleRename = () => setIsRenameDialogOpen(true);
	const handleDuplicate = async () => {
		await duplicateProjects({ editor, ids: [project.id] });
	};
	const handleDeleteClick = () => setIsDeleteDialogOpen(true);
	const handleInfoClick = () => setIsInfoDialogOpen(true);
	const handleDeleteConfirm = async () => {
		await deleteProjects({ editor, ids: [project.id] });
		setIsDeleteDialogOpen(false);
	};

	const handleCheckboxChange = ({
		checked,
		shiftKey,
	}: {
		checked: boolean;
		shiftKey: boolean;
	}) => {
		if (shiftKey && checked) {
			selectProjectRange({ projectId: project.id, allProjectIds });
			return;
		}
		setProjectSelected({ projectId: project.id, isSelected: checked });
	};

	const gridContent = (
		<Card
			data-project-card-id={project.id}
			tabIndex={-1}
			className="bg-card/40 hover:bg-card/65 border border-border/10 rounded-xl backdrop-blur-md transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 overflow-hidden p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
		>
			<div className="bg-muted/30 relative aspect-video border-b border-border/5">
				<div className="absolute inset-0">
					{project.thumbnail ? (
						<Image
							src={project.thumbnail}
							alt="Project thumbnail"
							fill
							className="object-cover"
						/>
					) : (
						<GeneratedThumbnail seed={project.id} />
					)}
				</div>

				{durationLabel && (
					<div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-sm">
						{durationLabel}
					</div>
				)}
			</div>

			<CardContent className="flex flex-col gap-1.5 p-4 pt-3 bg-transparent">
				<h3 className="group-hover:text-foreground/95 line-clamp-1 text-sm leading-snug font-medium">
					{project.name}
				</h3>
				<div className="text-muted-foreground flex items-center gap-1.5 text-xs">
					<HugeiconsIcon icon={Calendar04Icon} className="size-3.5" />
					<span>Created {formatDate({ date: project.createdAt })}</span>
				</div>
			</CardContent>
		</Card>
	);

	const listRowContent = (
		<div
			data-project-card-id={project.id}
			tabIndex={-1}
			className="flex items-center gap-3 flex-1 min-w-0 focus:outline-none"
		>
			<div className="bg-muted relative size-10 rounded overflow-hidden shrink-0">
				{project.thumbnail ? (
					<Image
						src={project.thumbnail}
						alt="Project thumbnail"
						fill
						className="object-cover"
					/>
				) : (
					<GeneratedThumbnail
						seed={project.id}
						className="[&>div]:text-[10px]"
					/>
				)}
			</div>

			<h3 className="group-hover:text-foreground/90 text-sm font-medium truncate flex-1 min-w-0">
				{project.name}
			</h3>

			<span className="text-muted-foreground text-sm shrink-0 hidden sm:block">
				{durationLabel ?? "—"}
			</span>

			<span className="text-muted-foreground text-sm shrink-0 w-auto pl-8 text-right hidden xs:block">
				{formatDate({ date: project.createdAt })}
			</span>
		</div>
	);

	const listContent = (
		<div
			className={`flex items-center gap-4 py-2 px-4 border-b border-border/50 ${
				isSelected ? "bg-primary/5" : ""
			}`}
		>
			<Checkbox
				checked={isSelected}
				onMouseDown={(event) => event.preventDefault()}
				onClick={(event) => {
					handleCheckboxChange({
						checked: !isSelected,
						shiftKey: event.shiftKey,
					});
				}}
				onCheckedChange={() => {}}
				className="size-5 shrink-0"
			/>

			<Link href={`/editor/${project.id}`} className="flex-1 min-w-0">
				{listRowContent}
			</Link>

			{!isMultiSelect && (
				<ProjectMenu
					projectId={project.id}
					isOpen={isDropdownOpen}
					onOpenChange={setIsDropdownOpen}
					variant="list"
					onRenameClick={handleRename}
					onDuplicateClick={handleDuplicate}
					onDeleteClick={handleDeleteClick}
					onInfoClick={handleInfoClick}
				/>
			)}
		</div>
	);

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div className="group relative">
						{isGridView ? (
							<>
								<Link href={`/editor/${project.id}`} className="block">
									{gridContent}
								</Link>

								<Checkbox
									checked={isSelected}
									onMouseDown={(event) => event.preventDefault()}
									onClick={(event) => {
										handleCheckboxChange({
											checked: !isSelected,
											shiftKey: event.shiftKey,
										});
									}}
									onCheckedChange={() => {}}
									className={`absolute z-10 size-5 top-3 left-3 ${
										isSelected || isDropdownOpen
											? "opacity-100"
											: "opacity-0 group-hover:opacity-100"
									}`}
								/>

								{!isMultiSelect && (
									<ProjectMenu
										projectId={project.id}
										isOpen={isDropdownOpen}
										onOpenChange={setIsDropdownOpen}
										onRenameClick={handleRename}
										onDuplicateClick={handleDuplicate}
										onDeleteClick={handleDeleteClick}
										onInfoClick={handleInfoClick}
									/>
								)}
							</>
						) : (
							listContent
						)}
					</div>
				</ContextMenuTrigger>
				<ProjectContextMenuContent
					projectId={project.id}
					onRenameClick={handleRename}
					onDuplicateClick={handleDuplicate}
					onDeleteClick={handleDeleteClick}
					onInfoClick={handleInfoClick}
				/>
			</ContextMenu>

			<RenameProjectDialog
				isOpen={isRenameDialogOpen}
				onOpenChange={setIsRenameDialogOpen}
				projectName={project.name}
				onConfirm={async (newName) => {
					await renameProject({ editor, id: project.id, name: newName });
					setIsRenameDialogOpen(false);
				}}
			/>

			<DeleteProjectDialog
				isOpen={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				projectNames={[project.name]}
				onConfirm={handleDeleteConfirm}
			/>

			<ProjectInfoDialog
				isOpen={isInfoDialogOpen}
				onOpenChange={setIsInfoDialogOpen}
				project={project}
			/>
		</>
	);
}

function ProjectContextMenuContent({
	onRenameClick,
	onDuplicateClick,
	onDeleteClick,
	onInfoClick,
	projectId,
}: {
	onRenameClick: () => void;
	onDuplicateClick: () => void;
	onDeleteClick: () => void;
	onInfoClick: () => void;
	projectId: string;
}) {
	const editor = useEditor();
	const [exportVideoOpen, setExportVideoOpen] = useState(false);
	const [exportProjectOpen, setExportProjectOpen] = useState(false);
	const [driveBusy, setDriveBusy] = useState(false);

	const projectName =
		editor.project.getSavedProjects().find((p) => p.id === projectId)?.name ??
		"Project";

	const handleSaveAsPreset = async () => {
		try {
			const fullProject = await storageService.loadProject({ id: projectId });
			if (!fullProject?.project) {
				toast.error("Failed to load project for preset");
				return;
			}
			const preset = buildProjectPreset({ project: fullProject.project });
			await savePreset({ preset });
			editor.project.loadAllProjects();
			toast.success(`Saved "${preset.name}" to presets`);
		} catch (_err) {
			toast.error("Failed to save project as preset");
		}
	};

	const handleCopyToDrive = async () => {
		if (!getGoogleClientId()) {
			toast.error("Google Drive isn't set up yet", {
				description:
					"Add your Google Client ID via the Drive import dialog first.",
			});
			return;
		}
		if (!getGoogleAccessToken()) {
			try {
				await initiateGoogleOAuth();
			} catch {
				toast.error("Google Drive sign-in required");
				return;
			}
		}

		setDriveBusy(true);
		try {
			const fullProject = await storageService.loadProject({ id: projectId });
			if (!fullProject?.project) {
				toast.error("Failed to load project");
				return;
			}

			const project = fullProject.project;
			const folderName = project.metadata.name || "Artidor Project";
			const folderId = await createDriveFolder(folderName);

			// Save encrypted project file to Drive
			await saveProjectToDrive(folderId, null, project);

			toast.success("Project copied to Google Drive", {
				description: `${folderName} — open in editor to sync media files`,
				action: {
					label: "Open",
					onClick: () =>
						window.open(
							`https://drive.google.com/drive/folders/${folderId}`,
							"_blank",
							"noopener,noreferrer",
						),
				},
			});
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Failed to copy to Drive";
			toast.error(
				msg === "unauthenticated" ? "Connect Google Drive first." : msg,
			);
		} finally {
			setDriveBusy(false);
		}
	};

	return (
		<>
			<ContextMenuContent>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Edit03Icon} />}
					onClick={onRenameClick}
				>
					Rename
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Copy02Icon} />}
					onClick={onDuplicateClick}
				>
					Duplicate
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={Video01Icon} />}
					onClick={() => setExportVideoOpen(true)}
				>
					Export to Video
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={FileExportIcon} />}
					onClick={() => setExportProjectOpen(true)}
				>
					Export Project File
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={GoogleIcon} />}
					onClick={handleCopyToDrive}
					disabled={driveBusy}
				>
					{driveBusy ? "Copying to Drive…" : "Copy to Google Drive"}
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={StarIcon} />}
					onClick={handleSaveAsPreset}
				>
					Save as preset
				</ContextMenuItem>
				<ContextMenuItem
					icon={<HugeiconsIcon icon={InformationCircleIcon} />}
					onClick={onInfoClick}
				>
					Info
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					variant="destructive"
					icon={<HugeiconsIcon icon={Delete02Icon} />}
					onClick={onDeleteClick}
				>
					Delete
				</ContextMenuItem>
			</ContextMenuContent>

			<ExportVideoDialog
				open={exportVideoOpen}
				onOpenChange={setExportVideoOpen}
				projectId={projectId}
				projectName={projectName}
			/>
			<ExportProjectDialog
				open={exportProjectOpen}
				onOpenChange={setExportProjectOpen}
				projectId={projectId}
				projectName={projectName}
			/>
		</>
	);
}

function ProjectMenu({
	projectId,
	isOpen,
	onOpenChange,
	variant = "grid",
	onRenameClick,
	onDuplicateClick,
	onDeleteClick,
	onInfoClick,
}: {
	projectId: string;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	variant?: "grid" | "list";
	onRenameClick: () => void;
	onDuplicateClick: () => void;
	onDeleteClick: () => void;
	onInfoClick: () => void;
}) {
	const editor = useEditor();
	const [exportVideoOpen, setExportVideoOpen] = useState(false);
	const [exportProjectOpen, setExportProjectOpen] = useState(false);
	const [driveBusy, setDriveBusy] = useState(false);

	const projectName =
		editor.project.getSavedProjects().find((p) => p.id === projectId)?.name ??
		"Project";

	const handleSaveAsPreset = async () => {
		const fullProject = await storageService.loadProject({ id: projectId });
		if (!fullProject?.project) {
			toast.error("Failed to load project for preset");
			return;
		}
		const preset = buildProjectPreset({ project: fullProject.project });
		await savePreset({ preset });
		editor.project.loadAllProjects();
		toast.success(`Saved "${preset.name}" to presets`);
		onOpenChange(false);
	};

	const handleCopyToDrive = async () => {
		if (!getGoogleClientId()) {
			toast.error("Google Drive isn't set up yet", {
				description:
					"Add your Google Client ID via the Drive import dialog first.",
			});
			return;
		}
		if (!getGoogleAccessToken()) {
			try {
				await initiateGoogleOAuth();
			} catch {
				toast.error("Google Drive sign-in required");
				return;
			}
		}

		setDriveBusy(true);
		onOpenChange(false);
		try {
			const fullProject = await storageService.loadProject({ id: projectId });
			if (!fullProject?.project) {
				toast.error("Failed to load project");
				return;
			}

			const project = fullProject.project;
			const folderName = project.metadata.name || "Artidor Project";
			const folderId = await createDriveFolder(folderName);

			await saveProjectToDrive(folderId, null, project);

			toast.success("Project copied to Google Drive", {
				description: `${folderName} — open in editor to sync media files`,
				action: {
					label: "Open",
					onClick: () =>
						window.open(
							`https://drive.google.com/drive/folders/${folderId}`,
							"_blank",
							"noopener,noreferrer",
						),
				},
			});
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : "Failed to copy to Drive";
			toast.error(
				msg === "unauthenticated" ? "Connect Google Drive first." : msg,
			);
		} finally {
			setDriveBusy(false);
		}
	};

	const handleMenuClick = ({
		event,
	}: {
		event: MouseEvent<HTMLButtonElement>;
	}) => {
		event.preventDefault();
		event.stopPropagation();
	};

	const handleMenuKeyDown = ({
		event,
	}: {
		event: KeyboardEvent<HTMLButtonElement>;
	}) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
	};

	const handleRename = () => {
		onRenameClick();
		onOpenChange(false);
	};

	const handleDuplicate = () => {
		onDuplicateClick();
		onOpenChange(false);
	};

	const handleDeleteClick = () => {
		onDeleteClick();
		onOpenChange(false);
	};

	const handleInfoClick = () => {
		onInfoClick();
		onOpenChange(false);
	};

	const isGrid = variant === "grid";

	return (
		<>
			<DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="background"
						className={
							isGrid
								? `absolute z-10 top-3 right-3 ${isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`
								: "!bg-transparent !shadow-none"
						}
						size="icon"
						aria-label="Project menu"
						onClick={(event) =>
							handleMenuClick({
								event: event as unknown as MouseEvent<HTMLButtonElement>,
							})
						}
						onMouseDown={(event) => event.stopPropagation()}
						onKeyDown={(event) =>
							handleMenuKeyDown({
								event: event as unknown as KeyboardEvent<HTMLButtonElement>,
							})
						}
					>
						<HugeiconsIcon
							icon={MoreHorizontalIcon}
							className="text-foreground"
							aria-hidden="true"
						/>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-52" align="end">
					<DropdownMenuItem onClick={handleRename}>
						<HugeiconsIcon icon={Edit03Icon} />
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleDuplicate}>
						<HugeiconsIcon icon={Copy02Icon} />
						Duplicate
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							setExportVideoOpen(true);
							onOpenChange(false);
						}}
					>
						<HugeiconsIcon icon={Video01Icon} />
						Export to Video
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => {
							setExportProjectOpen(true);
							onOpenChange(false);
						}}
					>
						<HugeiconsIcon icon={FileExportIcon} />
						Export Project File
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => void handleCopyToDrive()}
						disabled={driveBusy}
					>
						<HugeiconsIcon icon={GoogleIcon} />
						{driveBusy ? "Copying…" : "Copy to Google Drive"}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => void handleSaveAsPreset()}>
						<HugeiconsIcon icon={StarIcon} />
						Save as preset
					</DropdownMenuItem>
					<DropdownMenuItem onClick={handleInfoClick}>
						<HugeiconsIcon icon={InformationCircleIcon} />
						Info
					</DropdownMenuItem>
					<DropdownMenuItem variant="destructive" onClick={handleDeleteClick}>
						<HugeiconsIcon icon={Delete02Icon} />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<ExportVideoDialog
				open={exportVideoOpen}
				onOpenChange={setExportVideoOpen}
				projectId={projectId}
				projectName={projectName}
			/>
			<ExportProjectDialog
				open={exportProjectOpen}
				onOpenChange={setExportProjectOpen}
				projectId={projectId}
				projectName={projectName}
			/>
		</>
	);
}

function ProjectsSkeleton() {
	const skeletonIds = Array.from(
		{ length: 24 },
		(_, index) => `skeleton-${index}`,
	);

	return (
		<div className="px-4 xs:grid-cols-2 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4">
			{skeletonIds.map((skeletonId) => (
				<Card
					key={skeletonId}
					className="bg-background overflow-hidden border-none p-0"
				>
					<div className="bg-muted relative aspect-video">
						<div className="absolute inset-0">
							<Skeleton className="bg-muted/50 size-full" />
						</div>
					</div>
					<CardContent className="flex flex-col gap-2 px-0 pt-4">
						<Skeleton className="bg-muted/50 h-4 w-3/4" />
						<div className="text-muted-foreground flex items-center gap-1.5">
							<Skeleton className="bg-muted/50 size-4" />
							<Skeleton className="bg-muted/50 h-4 w-24" />
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

function EmptyState({
	onCreateNew,
}: {
	onCreateNew: () => Promise<void> | void;
}) {
	const { searchQuery, setSearchQuery } = useProjectsStore();
	const editor = useEditor();
	const router = useRouter();
	const savedProjects = editor.project.getSavedProjects();

	const handleSelectTemplate = async (template: ProjectTemplate) => {
		// Use the template's title as the project name; the
		// createNewProject call will land us in the editor where
		// the user can immediately start filling it in.
		try {
			const projectId = await editor.project.createNewProject({
				name: template.title,
			});
			router.push(`/editor/${projectId}`);
		} catch (error) {
			toast.error("Failed to create project", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
		}
	};

	// The "no search results" empty state — saved projects exist but
	// the current query matches none of them. Inverts the page's
	// surface treatment so it feels like a contextual nudge, not a
	// generic placeholder.
	if (savedProjects.length > 0) {
		return (
			<div className="panel glass-strong mx-auto mt-12 flex w-full max-w-xl flex-col items-center gap-5 rounded-2xl border border-white/[0.08] p-10 text-center">
				<div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70">
					<HugeiconsIcon icon={Search01Icon} className="size-6" />
				</div>
				<div className="flex flex-col gap-2">
					<h3 className="font-serif text-2xl font-medium italic tracking-[-0.01em] text-white">
						Nothing matched.
					</h3>
					<p className="text-muted-foreground max-w-sm text-[13.5px] font-light leading-relaxed">
						Your search for <span className="text-white">"{searchQuery}"</span>{" "}
						didn't match any project names. Try a different keyword or clear the
						filter.
					</p>
				</div>
				<Button
					onClick={() => setSearchQuery({ query: "" })}
					variant="outline"
					size="sm"
					className="h-9 rounded-full border-white/15 bg-white/[0.04] px-4 text-[12.5px] text-white/85 hover:bg-white/[0.08]"
				>
					Clear search
				</Button>
			</div>
		);
	}

	// The "no projects at all" empty state. The marquee of the
	// page — needs to look like a pitch, not a placeholder. The
	// glassmorphic surface matches the rest of the dark luxury
	// marketing chrome; the pulsing dot says "live"; the three
	// quick-tip rows teach the visitor what Artidor can do for
	// them in their first session.
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-3xl border border-white/[0.08] bg-black/35 p-7 text-center shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-9">
			{/* Status pill — single line, anchored at the top. */}
			<div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10.5px] font-medium tracking-wide text-white/65 backdrop-blur">
				<span className="relative flex size-1.5">
					<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
					<span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
				</span>
				Empty workspace
			</div>

			{/* Hero block — icon + headline + sub. Three lines max. */}
			<div className="flex flex-col items-center gap-2">
				<div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
					<HugeiconsIcon icon={Video01Icon} className="size-5" />
				</div>
				<h2 className="font-serif text-2xl font-medium italic tracking-[-0.01em] text-white md:text-[1.7rem]">
					Your first project, one click away.
				</h2>
				<p className="text-muted-foreground max-w-md text-[12.5px] font-light leading-relaxed">
					Drop in some media, trim on the timeline, export — that's the whole
					loop. Everything stays on your device; nothing uploads anywhere.
				</p>
			</div>

			{/* Three-up feature strip — quick "what you can do" hints. */}
			<div className="grid w-full grid-cols-1 gap-1.5 text-left sm:grid-cols-3">
				{[
					{
						title: "Drop media in",
						body: "Video, audio, images — your project holds whatever you throw at it.",
					},
					{
						title: "Edit on the timeline",
						body: "Trim, split, keyframe. The same primitives as a $500 editor.",
					},
					{
						title: "Export in MP4 / WebM",
						body: "Or ask the AI co-pilot to do the whole thing for you.",
					},
				].map((tip) => (
					<div
						key={tip.title}
						className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-2"
					>
						<div className="text-[11.5px] font-semibold text-white/90">
							{tip.title}
						</div>
						<div className="mt-0.5 text-[10.5px] font-light leading-snug text-white/55">
							{tip.body}
						</div>
					</div>
				))}
			</div>

			{/* Primary CTA — single, prominent. */}
			<Button
				size="lg"
				className="mt-3 h-10 gap-2 rounded-full bg-white px-5 text-[13px] font-medium text-[#0a0a0c] shadow-[0_8px_30px_rgba(255,255,255,0.18)] hover:bg-white/90"
				onClick={() => void onCreateNew()}
			>
				<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
				Create your first project
			</Button>

			{/* Templates — 4-up row of compact pills, equally spaced. */}
			<TemplatesRow onSelect={handleSelectTemplate} />
		</div>
	);
}
