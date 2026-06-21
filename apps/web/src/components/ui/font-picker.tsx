"use client";

import {
	useState,
	useMemo,
	useRef,
	useEffect,
	useCallback,
	type CSSProperties,
} from "react";
import { List, type RowComponentProps } from "react-window";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadFullFont } from "@/lib/fonts/google-fonts";
import { SYSTEM_FONTS } from "@/lib/fonts/system-fonts";
import type { FontAtlas, FontAtlasEntry } from "@/lib/fonts/types";
import { useFontAtlas } from "@/hooks/use-font-atlas";
import { useCustomFontsStore } from "@/stores/custom-fonts-store";
import { cn } from "@/utils/ui";
import { ChevronDown, Search, Upload } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { TextIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

const FONT_TABS = [
	{ key: "all", label: "All fonts" },
	{ key: "my-fonts", label: "My fonts" },
	{ key: "favorites", label: "Favorites" },
] as const;

type FontTab = (typeof FONT_TABS)[number]["key"];

const ROW_HEIGHT = 40;
const PREVIEW_SCALE = 0.8;
const LIST_WIDTH = 288;
const MAX_LIST_HEIGHT = 288;
const OVERSCAN = 15;

interface FontPickerProps {
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	className?: string;
}

export function FontPicker({
	defaultValue,
	onValueChange,
	className,
}: FontPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState<FontTab>("all");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const {
		atlas,
		status,
		fontNames,
		retry: handleRetry,
	} = useFontAtlas({ open });
	const customFonts = useCustomFontsStore((s) => s.fonts);
	const importFont = useCustomFontsStore((s) => s.importFont);
	const fontFileInputRef = useRef<HTMLInputElement>(null);

	// Merge custom fonts with atlas fonts (custom fonts appear at the top).
	const allFontNames = useMemo(() => {
		const customNames = customFonts.map((f) => f.family);
		return [...customNames, ...fontNames.filter((n) => !customNames.includes(n))];
	}, [customFonts, fontNames]);

	const handleImportFont = useCallback(async () => {
		fontFileInputRef.current?.click();
	}, []);

	const handleFontFileChange = useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const files = event.target.files;
			if (!files?.length) return;
			for (const file of Array.from(files)) {
				const family = await importFont(file);
				if (family) {
					toast.success(`Font "${file.name.replace(/\.[^.]+$/, "")}" imported`);
				} else {
					toast.error(`Failed to import "${file.name}"`);
				}
			}
			// Reset so the same file can be re-imported.
			event.target.value = "";
		},
		[importFont],
	);

	const filteredFonts = useMemo(() => {
		if (!search) return allFontNames;
		const query = search.toLowerCase();
		return allFontNames.filter((name) => name.toLowerCase().includes(query));
	}, [allFontNames, search]);

	const listHeight = Math.min(
		MAX_LIST_HEIGHT,
		filteredFonts.length * ROW_HEIGHT,
	);

	const handleSelect = useCallback(
		async ({ family }: { family: string }) => {
			// Custom fonts are already loaded via FontFace API.
			const isCustom = customFonts.some((f) => f.family === family);
			if (!isCustom && !SYSTEM_FONTS.has(family)) {
				try {
					await loadFullFont({ family });
				} catch {
					// ignore load failure, font will fall back to system default
				}
			}
			onValueChange?.(family);
			setOpen(false);
		},
		[onValueChange, customFonts],
	);

	useEffect(() => {
		if (!open) {
			setSearch("");
			setActiveTab("all");
		}
	}, [open]);

	const activeTabLabel =
		FONT_TABS.find((t) => t.key === activeTab)?.label.toLowerCase() ?? "";

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				className={cn(
					"border-border bg-accent flex h-7 w-full cursor-pointer items-center justify-between gap-1 rounded-md border px-2.5 text-sm whitespace-nowrap focus-visible:border-primary focus-visible:ring-0 focus:outline-hidden",
					className,
				)}
			>
				<div className="flex min-w-0 items-center gap-1.5">
					<span className="text-muted-foreground [&_svg]:size-3.5 shrink-0">
						<HugeiconsIcon icon={TextIcon} />
					</span>
					<span className="truncate" style={{ fontFamily: defaultValue }}>
						{defaultValue ?? "Select a font"}
					</span>
				</div>
				<ChevronDown className="size-3 shrink-0 opacity-50" />
			</PopoverTrigger>
			<PopoverContent
				className="w-72 p-0 overflow-hidden"
				align="start"
				side="left"
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					searchInputRef.current?.focus();
				}}
				onCloseAutoFocus={(event) => {
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				<div className="relative px-3 py-1.5">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 shrink-0 opacity-50" />
					<Input
						ref={searchInputRef}
						placeholder={`Search ${activeTabLabel}...`}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						size="xs"
						className="w-full pl-5 bg-transparent border-none! shadow-none!"
					/>
				</div>
				<div className="flex border-b px-3">
					{FONT_TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							className={cn(
								"px-3 py-1.5 text-xs border-b-2 -mb-px",
								activeTab === tab.key
									? "border-foreground text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
							onClick={() => setActiveTab(tab.key)}
						>
							{tab.label}
						</button>
					))}
				</div>
				{/* Custom font import */}
				<div className="flex items-center gap-2 border-b px-3 py-1.5">
					<button
						type="button"
						className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2 py-1 text-[0.68rem] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
						onClick={handleImportFont}
					>
						<Upload className="size-3" />
						Import font
					</button>
					<input
						ref={fontFileInputRef}
						type="file"
						accept=".ttf,.otf,.woff,.woff2"
						multiple
						className="hidden"
						onChange={handleFontFileChange}
					/>
					{customFonts.length > 0 && (
						<span className="text-[0.6rem] text-white/30">
							{customFonts.length} custom
						</span>
					)}
				</div>
				{status === "loading" && (
					<div className="py-8 text-center text-sm text-muted-foreground">
						Loading fonts...
					</div>
				)}
				{status === "error" && (
					<div className="flex flex-col items-center gap-3 py-8 px-4">
						<p className="text-sm text-muted-foreground text-center">
							Failed to load font previews.
						</p>
						<Button variant="outline" size="sm" onClick={handleRetry}>
							Retry
						</Button>
					</div>
				)}
				{status === "idle" &&
					fontNames.length > 0 &&
					filteredFonts.length === 0 && (
						<div className="py-6 text-center text-sm text-muted-foreground">
							No fonts found.
						</div>
					)}
				{status === "idle" && atlas && filteredFonts.length > 0 && (
					<List
						rowCount={filteredFonts.length}
						rowHeight={ROW_HEIGHT}
						overscanCount={OVERSCAN}
						rowComponent={FontRow}
						rowProps={{
							atlas,
							filteredFonts,
							selectedFont: defaultValue,
							onFontSelect: handleSelect,
							customFontFamilies: new Set(customFonts.map((f) => f.family)),
						}}
						style={{ height: listHeight, width: LIST_WIDTH }}
					/>
				)}
			</PopoverContent>
		</Popover>
	);
}

function FontSpritePreview({ entry }: { entry: FontAtlasEntry }) {
	return (
		<div
			className="shrink-0"
			style={{
				width: entry.w,
				height: ROW_HEIGHT,
				backgroundColor: "currentColor",
				WebkitMaskImage: `url(/fonts/font-chunk-${entry.ch}.avif)`,
				WebkitMaskPosition: `-${entry.x}px -${entry.y}px`,
				WebkitMaskRepeat: "no-repeat",
				maskImage: `url(/fonts/font-chunk-${entry.ch}.avif)`,
				maskPosition: `-${entry.x}px -${entry.y}px`,
				maskRepeat: "no-repeat",
				transform: `scale(${PREVIEW_SCALE})`,
				transformOrigin: "left center",
			}}
		/>
	);
}

type FontRowProps = {
	atlas: FontAtlas;
	filteredFonts: string[];
	selectedFont: string | undefined;
	onFontSelect: (params: { family: string }) => void;
	customFontFamilies: Set<string>;
};

function FontRow({
	index,
	style,
	atlas,
	filteredFonts,
	selectedFont,
	onFontSelect,
	customFontFamilies,
}: RowComponentProps<FontRowProps>) {
	const fontName = filteredFonts[index];
	const entry = atlas?.fonts[fontName];
	const isSelected = fontName === selectedFont;
	const isSystemFont = SYSTEM_FONTS.has(fontName);
	const isCustomFont = customFontFamilies.has(fontName);

	// Custom fonts show their display name (without the prefix).
	const displayName = isCustomFont
		? fontName.replace(/^ArtidorCustom_/, "")
		: fontName;

	return (
		<button
			type="button"
			style={style as CSSProperties}
			className={cn(
				"flex w-full cursor-pointer items-center gap-2 px-3 outline-hidden hover:bg-popover-hover",
				isSelected && "bg-popover-hover",
			)}
			onClick={() => onFontSelect({ family: fontName })}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onFontSelect({ family: fontName });
				}
			}}
			aria-label={displayName}
		>
			<div className="min-w-0 overflow-hidden flex items-center gap-2">
				{isSystemFont || isCustomFont ? (
					<span
						className="text-xl text-foreground/85"
						style={{ fontFamily: fontName }}
					>
						{displayName}
					</span>
				) : entry ? (
					<FontSpritePreview entry={entry} />
				) : (
					<span className="text-sm text-foreground/60">{fontName}</span>
				)}
				{isCustomFont && (
					<span className="rounded bg-white/[0.08] px-1 py-0.5 text-[0.5rem] uppercase tracking-wider text-white/40">
						custom
					</span>
				)}
			</div>
		</button>
	);
}
