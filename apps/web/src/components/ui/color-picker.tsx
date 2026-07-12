import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/ui";
import { Input } from "./input";
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverTrigger,
} from "./popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./select";
import { Button } from "./button";
import { Cancel01Icon, ColorPickerIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	type ColorFormat,
	appendAlpha,
	extractColorFromText,
	formatColorValue,
	hexToHsv,
	hsvToHex,
	parseColorInput,
	parseHexAlpha,
} from "@/utils/color";
import { useColorPaletteStore } from "@/stores/color-palette-store";
import { COLOR_PALETTES, GRADIENT_PRESETS } from "@/lib/presets/color-palettes";

interface ColorPickerProps {
	value?: string;
	onChange?: (value: string) => void;
	onChangeEnd?: (value: string) => void;
	className?: string;
	/** When true, the "Saved" tab offers gradient presets. Only enable for
	 * consumers whose render path can paint a CSS gradient string (graphic
	 * shape fill). Solid swatches/recents are always available. */
	allowGradient?: boolean;
}

const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
	(
		{
			className,
			value = "FFFFFF",
			onChange,
			onChangeEnd,
			allowGradient = false,
			...props
		},
		ref,
	) => {
		const valueIsGradient = /gradient\s*\(/i.test(value);

		const [isDragging, setIsDragging] = useState<
			"saturation" | "hue" | "opacity" | null
		>(null);
		// Live saturation/value thumb position during a drag. Decoupled from the
		// `value` round-trip so the ring follows the cursor exactly even if a
		// consumer debounces `onChange` or the color collapses to black (v=0,
		// where hue/saturation are undefined and the ring would otherwise jump).
		const [satDrag, setSatDrag] = useState<{ s: number; v: number } | null>(
			null,
		);
		const [internalHue, setInternalHue] = useState(0);
		const [inputValue, setInputValue] = useState(value);
		const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
		const [mode, setMode] = useState<"custom" | "saved">(
			valueIsGradient ? "saved" : "custom",
		);

		const recentColors = useColorPaletteStore((s) => s.recentColors);
		const addRecentColor = useColorPaletteStore((s) => s.addRecentColor);

		const saturationRef = useRef<HTMLButtonElement>(null);
		const hueRef = useRef<HTMLButtonElement>(null);
		const opacityRef = useRef<HTMLButtonElement>(null);
		const latestDragColorRef = useRef<string | null>(null);

		const isEyeDropperSupported =
			typeof window !== "undefined" && "EyeDropper" in window;

		const { rgb: rgbValue, alpha } = parseHexAlpha({
			hex: valueIsGradient ? "FFFFFF" : value,
		});
		const [h, s, v] = hexToHsv({ hex: rgbValue });

		const handleEyeDropper = async () => {
			if (!isEyeDropperSupported || !EyeDropper) return;
			try {
				const dropper = new EyeDropper();
				const result = await dropper.open();
				const hex = result.sRGBHex.replace("#", "").toLowerCase();
				const finalHex = appendAlpha({ rgbHex: hex, alpha });
				onChange?.(finalHex);
				onChangeEnd?.(finalHex);
			} catch {
				// user cancelled the picker
			}
		};
		// Apply a swatch (recent or palette). Records to the recents MRU.
		const selectSwatch = (hex: string) => {
			const rgbHex = hex.replace("#", "").toLowerCase();
			const finalHex = appendAlpha({ rgbHex, alpha });
			addRecentColor(rgbHex);
			onChange?.(finalHex);
			onChangeEnd?.(finalHex);
		};

		const hueDiff = Math.abs(h - internalHue);
		const isSameHueWrapped = hueDiff < 1 || Math.abs(hueDiff - 360) < 1;
		const displayHue = s === 0 || isSameHueWrapped ? internalHue : h;

		useEffect(() => {
			setInputValue(formatColorValue({ hex: value, format: colorFormat }));
		}, [value, colorFormat]);

		const handlePointerMove = (
			e: React.PointerEvent<HTMLButtonElement>,
			type: "saturation" | "hue" | "opacity" | null = isDragging,
		) => {
			if (!type) return;

			const target = e.currentTarget as HTMLButtonElement;
			const rect = target.getBoundingClientRect();
			const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
			const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

			if (type === "saturation") {
				setSatDrag({ s: x, v: 1 - y });
				const newHex = appendAlpha({
					rgbHex: hsvToHex({ h: displayHue, s: x, v: 1 - y }),
					alpha,
				});
				latestDragColorRef.current = newHex;
				onChange?.(newHex);
			}

			if (type === "hue") {
				const newH = x * 360;
				setInternalHue(newH);
				if (s > 0) {
					const newHex = appendAlpha({
						rgbHex: hsvToHex({ h: newH, s, v }),
						alpha,
					});
					latestDragColorRef.current = newHex;
					onChange?.(newHex);
				}
			}

			if (type === "opacity") {
				const newHex = appendAlpha({ rgbHex: rgbValue, alpha: x });
				latestDragColorRef.current = newHex;
				onChange?.(newHex);
			}
		};

		const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
			const target = e.currentTarget as HTMLButtonElement;
			if (target.hasPointerCapture?.(e.pointerId)) {
				target.releasePointerCapture(e.pointerId);
			}

			if (latestDragColorRef.current !== null) {
				addRecentColor(latestDragColorRef.current);
				onChangeEnd?.(latestDragColorRef.current);
				latestDragColorRef.current = null;
			}
			setIsDragging(null);
			setSatDrag(null);
		};

		const handleSaturationPointerDown = (
			e: React.PointerEvent<HTMLButtonElement>,
		) => {
			e.preventDefault();
			const target = e.currentTarget as HTMLButtonElement;
			if (e.pointerId !== undefined && "setPointerCapture" in target) {
				target.setPointerCapture(e.pointerId);
			}
			setIsDragging("saturation");
			handlePointerMove(e, "saturation");
		};

		const handleHuePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
			e.preventDefault();
			const target = e.currentTarget as HTMLButtonElement;
			if (e.pointerId !== undefined && "setPointerCapture" in target) {
				target.setPointerCapture(e.pointerId);
			}
			setIsDragging("hue");
			handlePointerMove(e, "hue");
		};

		const handleOpacityPointerDown = (
			e: React.PointerEvent<HTMLButtonElement>,
		) => {
			e.preventDefault();
			const target = e.currentTarget as HTMLButtonElement;
			if (e.pointerId !== undefined && "setPointerCapture" in target) {
				target.setPointerCapture(e.pointerId);
			}
			setIsDragging("opacity");
			handlePointerMove(e, "opacity");
		};

		const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setInputValue(
				colorFormat === "hex"
					? e.target.value.replace("#", "")
					: e.target.value,
			);
		};

		const commitInputValue = () => {
			const parsed = parseColorInput({
				input: inputValue,
				format: colorFormat,
			});
			if (parsed) {
				const nextHex = appendAlpha({ rgbHex: parsed, alpha });
				onChange?.(nextHex);
				onChangeEnd?.(nextHex);
				return;
			}

			const extracted = extractColorFromText({ text: inputValue });
			if (extracted) {
				const hasExplicitAlpha = extracted.length > 6;
				const finalHex = hasExplicitAlpha
					? extracted
					: appendAlpha({ rgbHex: extracted, alpha });
				onChange?.(finalHex);
				onChangeEnd?.(finalHex);
			}
		};

		const handleInputBlur = () => {
			commitInputValue();
		};

		const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				commitInputValue();
				e.currentTarget.blur();
			}
		};

		const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
			const pastedText = event.clipboardData.getData("text");
			const extractedHex = extractColorFromText({ text: pastedText });
			if (!extractedHex) return;

			event.preventDefault();
			const hasExplicitAlpha = extractedHex.length > 6;
			const finalHex = hasExplicitAlpha
				? extractedHex
				: appendAlpha({ rgbHex: extractedHex, alpha });
			onChange?.(finalHex);
			onChangeEnd?.(finalHex);
		};

		const saturationStyle = {
			background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${displayHue}, 100%, 50%))`,
		};

		const hueStyle = {
			background:
				"linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
		};

		const checkerboardStyle = {
			backgroundImage: `
        linear-gradient(45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(0,0,0,0.1) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.1) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.1) 75%)
      `,
			backgroundSize: "8px 8px",
			backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
			backgroundColor: "#fff",
		};

		return (
			<Popover>
				<div
					ref={ref}
					className={cn(
						"bg-accent flex h-8 flex-1 items-center gap-2 rounded-md px-[0.45rem]",
						className,
					)}
					{...props}
				>
					<PopoverTrigger asChild>
						<button
							className="size-4.5 cursor-pointer border rounded-sm hover:ring-1 hover:ring-foreground/20 overflow-hidden relative"
							type="button"
						>
							<span
								className="absolute inset-0 dark:invert"
								style={checkerboardStyle}
							/>
							<span
								className="absolute inset-0"
								style={
									valueIsGradient
										? { background: value }
										: { backgroundColor: `#${value}` }
								}
							/>
						</button>
					</PopoverTrigger>
					<div className="flex flex-1 items-center">
						<Input
							className={cn(
								"border-0! bg-transparent p-0 ring-0! ring-offset-0!",
								colorFormat === "hex" && "uppercase",
							)}
							size="sm"
							containerClassName="w-full"
							value={inputValue}
							onChange={handleInputChange}
							onBlur={handleInputBlur}
							onKeyDown={handleInputKeyDown}
							onPaste={handlePaste}
						/>
					</div>
				</div>
				<PopoverContent
					className="w-64 px-0 select-none flex flex-col gap-3 py-2"
					side="left"
					sideOffset={8}
					onOpenAutoFocus={(event) => {
						event.preventDefault();
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
					}}
					onInteractOutside={(event) => {
						if (isDragging) event.preventDefault();
					}}
				>
					<header className="border-b flex justify-between items-center pb-2 px-2">
						<Select
							value={mode}
							onValueChange={(next) => setMode(next as "custom" | "saved")}
						>
							<SelectTrigger variant="outline">
								<SelectValue placeholder="Select a mode" />
							</SelectTrigger>
							<SelectContent position="popper">
								<SelectItem value="custom">Custom</SelectItem>
								<SelectItem value="saved">Saved</SelectItem>
							</SelectContent>
						</Select>
						<div>
							{isEyeDropperSupported && (
								<Button
									variant="ghost"
									size="icon"
									type="button"
									onClick={handleEyeDropper}
								>
									<HugeiconsIcon icon={ColorPickerIcon} />
								</Button>
							)}
							<PopoverClose asChild>
								<Button variant="ghost" size="icon" type="button">
									<HugeiconsIcon icon={Cancel01Icon} />
								</Button>
							</PopoverClose>
						</div>
					</header>
					<div className="px-2 flex flex-col gap-3" hidden={mode !== "custom"}>
						<button
							ref={saturationRef}
							className="relative h-44 aspect-square w-full appearance-none border-0 bg-transparent p-0"
							style={saturationStyle}
							type="button"
							onPointerDown={handleSaturationPointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
						>
							<ColorCircle
								size="sm"
								position={{
									left: `${(satDrag ? satDrag.s : s) * 100}%`,
									top: `${(1 - (satDrag ? satDrag.v : v)) * 100}%`,
								}}
								color={`#${value}`}
							/>
						</button>

						<button
							ref={hueRef}
							className="relative h-4 w-full rounded-lg appearance-none border-0 bg-transparent p-0"
							style={hueStyle}
							type="button"
							onPointerDown={handleHuePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
						>
							<ColorCircle
								size="md"
								position={{
									left: `calc(0.5rem + (100% - 1rem) * ${displayHue / 360})`,
									top: "50%",
								}}
							/>
						</button>

						<button
							ref={opacityRef}
							className="relative h-4 w-full overflow-hidden rounded-lg appearance-none border-0 p-0"
							type="button"
							onPointerDown={handleOpacityPointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
						>
							<div
								className="absolute inset-0 dark:invert"
								style={checkerboardStyle}
							/>
							<div
								className="absolute inset-0 rounded-lg"
								style={{
									background: `linear-gradient(to right, transparent, #${rgbValue})`,
								}}
							/>
							<ColorCircle
								size="md"
								position={{
									left: `calc(0.5rem + (100% - 1rem) * ${alpha})`,
									top: "50%",
								}}
							/>
						</button>

						<div className="flex items-center gap-2">
							<Select
								value={colorFormat}
								onValueChange={(value) => setColorFormat(value as ColorFormat)}
							>
								<SelectTrigger variant="outline" className="min-w-18 max-w-18">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="hex">HEX</SelectItem>
									<SelectItem value="rgb">RGB</SelectItem>
									<SelectItem value="hsl">HSL</SelectItem>
									<SelectItem value="hsv">HSV</SelectItem>
								</SelectContent>
							</Select>

							<Input
								className={cn(
									"h-7 rounded-sm p-2.5",
									colorFormat === "hex" && "uppercase",
								)}
								type="text"
								value={inputValue}
								onChange={handleInputChange}
								onBlur={handleInputBlur}
								onKeyDown={handleInputKeyDown}
								onPaste={handlePaste}
							/>
						</div>
					</div>

					{mode === "saved" && (
						<div className="px-2 flex flex-col gap-3 max-h-72 overflow-y-auto">
							{recentColors.length > 0 && (
								<Swatches
									label="Recent"
									colors={recentColors}
									onSelect={selectSwatch}
								/>
							)}
							{COLOR_PALETTES.map((palette) => (
								<Swatches
									key={palette.id}
									label={palette.name}
									colors={palette.colors}
									onSelect={selectSwatch}
								/>
							))}
							<div className="flex flex-col gap-1.5" hidden={!allowGradient}>
								<span className="text-muted-foreground text-[0.7rem] font-medium">
									Gradients
								</span>
								<div className="grid grid-cols-2 gap-1.5">
									{GRADIENT_PRESETS.map((preset) => (
										<button
											key={preset.id}
											type="button"
											title={preset.name}
											className="h-8 rounded-md border border-white/10 transition-transform hover:scale-[1.03]"
											style={{ background: preset.css }}
											onClick={() => {
												onChange?.(preset.css);
												onChangeEnd?.(preset.css);
											}}
										/>
									))}
								</div>
							</div>
						</div>
					)}
				</PopoverContent>
			</Popover>
		);
	},
);
ColorPicker.displayName = "ColorPicker";

const Swatches = ({
	label,
	colors,
	onSelect,
}: {
	label: string;
	colors: string[];
	onSelect: (hex: string) => void;
}) => (
	<div className="flex flex-col gap-1.5">
		<span className="text-muted-foreground text-[0.7rem] font-medium">
			{label}
		</span>
		<div className="flex flex-wrap gap-1.5">
			{colors.map((color, i) => (
				<button
					// biome-ignore lint/suspicious/noArrayIndexKey: swatch lists are static and may repeat a color
					key={`${color}-${i}`}
					type="button"
					title={color}
					aria-label={`Use ${color}`}
					className="size-5 rounded-full border border-white/15 transition-transform hover:scale-110"
					style={{ backgroundColor: color }}
					onClick={() => onSelect(color)}
				/>
			))}
		</div>
	</div>
);

const ColorCircle = ({
	size,
	position,
	color,
}: {
	size: "sm" | "md";
	position: { left: string; top: string };
	color?: string;
}) => (
	<div
		className={`pointer-events-none absolute rounded-full border-3 border-white shadow-lg ${
			size === "sm" ? "size-3" : "size-4"
		}`}
		style={{
			left: position.left,
			top: position.top,
			transform: "translate(-50%, -50%)",
			backgroundColor: color,
		}}
	/>
);

export { ColorPicker };
