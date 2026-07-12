import { effectsRegistry } from "@/lib/effects";
import type {
	EffectDefinition,
	EffectPassTemplate,
} from "@/lib/effects/types";
import type { EffectPresetDefinition } from "@/lib/presets/types";
import type {
	ParamDefinition,
	ParamValues,
} from "@/lib/params";

/**
 * Converts a preset effect definition into a real EffectDefinition that the
 * GPU effect renderer can use. This bridges the cosmetic "fx-*" presets in
 * lib/presets/effects.ts to the registered WGSL shader definitions.
 */
export function createPresetEffectDefinition(
	preset: EffectPresetDefinition,
): EffectDefinition {
	const baseType = resolveBaseType(preset);
	const base = baseType ? findBaseDefinition(baseType) : undefined;
	if (base) {
		return createMappedDefinition(preset, base);
	}
	return buildCssBasedDefinition(preset);
}

function findBaseDefinition(type: string): EffectDefinition | undefined {
	const all = effectsRegistry.getAll();
	return all.find((d) => d.type === type);
}

function createMappedDefinition(
	preset: EffectPresetDefinition,
	base: EffectDefinition,
): EffectDefinition {
	return {
		type: preset.type,
		name: preset.name,
		keywords: [preset.category.toLowerCase(), ...base.keywords],
		params: resolveParams(base, preset),
		renderer: base.renderer,
	};
}

function resolveParams(
	base: EffectDefinition,
	preset: EffectPresetDefinition,
): ParamDefinition[] {
	const overrides = computeParamOverrides(base, preset);
	return base.params.map((param) => {
		const value = overrides[param.key];
		if (value === undefined) return param;
		return { ...param, default: value } as ParamDefinition;
	});
}

function computeParamOverrides(
	base: EffectDefinition,
	preset: EffectPresetDefinition,
): Record<string, number | string | boolean> {
	const params = preset.params;
	const overrides: Record<string, number | string | boolean> = {};

	const first = (keys: string[], fallback: number): number => {
		for (const key of keys) {
			const raw = params[key];
			if (typeof raw === "number") return raw;
			if (typeof raw === "string") {
				const parsed = Number.parseFloat(raw);
				if (Number.isFinite(parsed)) return parsed;
			}
		}
		return fallback;
	};

	switch (base.type) {
		case "box-blur":
		case "lens-blur": {
			const radius = first(["radius"], -1);
			if (radius >= 0) {
				overrides.amount = Math.min(100, radius * 10);
			} else {
				const amount = first(["amount"], 50);
				overrides.amount =
					amount < 1 && amount >= 0
						? Math.min(100, Math.round(amount * 100))
						: Math.min(100, amount);
			}
			break;
		}
		case "directional-blur": {
			const amount = first(["amount"], 50);
			overrides.amount =
				amount < 1 && amount >= 0
					? Math.min(100, Math.round(amount * 100))
					: Math.min(100, amount);
			const radius = first(["radius"], -1);
			if (radius >= 0) overrides.amount = Math.min(100, radius * 10);
			overrides.direction = firstDirectionOrAngle(params, 0);
			break;
		}
		case "motion-blur": {
			const distance = first(["distance"], -1);
			if (distance >= 0) {
				overrides.amount = Math.min(50, distance);
			} else {
				const intensity = first(["intensity"], -1);
				if (intensity >= 0) {
					overrides.amount =
						intensity < 1 && intensity >= 0
							? Math.min(50, Math.round(intensity * 16))
							: Math.min(50, intensity);
				} else {
					overrides.amount = first(["amount"], 10);
				}
			}
			overrides.direction = firstDirectionOrAngle(params, 0);
			break;
		}
		case "zoom-blur": {
			const amount = first(["amount"], 50);
			overrides.amount =
				amount < 1 && amount >= 0
					? Math.min(100, Math.round(amount * 100))
					: Math.min(100, amount);
			break;
		}
		case "ripple":
		case "wave": {
			const amplitude = first(["amplitude"], -1);
			if (amplitude >= 0) {
				overrides.amount = Math.min(100, amplitude);
			} else {
				overrides.amount = first(["amount"], 50);
			}
			break;
		}
		case "swirl":
		case "twist": {
			const angle = first(["angle"], -1);
			if (angle >= 0) {
				overrides.amount = Math.min(100, (angle / 360) * 100);
			} else {
				overrides.amount = first(["amount"], 50);
			}
			break;
		}
		case "bulge": {
			const radius = first(["radius"], -1);
			if (radius >= 0) {
				overrides.amount = Math.min(100, radius);
			} else {
				const amount = first(["amount"], 75);
				overrides.amount =
					amount < 1 && amount >= 0
						? Math.min(100, Math.round(amount * 100))
						: Math.min(100, amount);
			}
			break;
		}
		case "fisheye": {
			const amount = first(["amount"], 50);
			overrides.amount =
				amount < 1 && amount >= 0
					? Math.min(100, Math.round(amount * 100))
					: Math.min(100, amount);
			break;
		}
		case "scale": {
			const aspect = first(["aspect"], -1);
			if (aspect >= 0) {
				overrides.amount = Math.min(100, ((aspect - 0.5) / 1.5) * 100);
			} else {
				const amount = first(["amount"], 50);
				if (amount > 1 && preset.type.startsWith("fx-")) {
					overrides.amount = Math.min(
						100,
						((amount - 0.5) / 1.5) * 100,
					);
				} else {
					overrides.amount = Math.min(100, amount);
				}
			}
			break;
		}
		case "rotate": {
			overrides.amount = first(["amount"], 50);
			break;
		}
		case "skew": {
			overrides.amount = first(["amount"], 30);
			const axis = params.axis;
			overrides.axis =
				typeof axis === "string" ? axis.toLowerCase() : "x";
			break;
		}
		case "flip-horizontal":
		case "flip-vertical": {
			overrides.amount = first(["amount"], 100);
			break;
		}
		case "pixelate": {
			const size = first(["size", "tileSize"], -1);
			if (size >= 0) {
				overrides.amount = size;
			} else {
				const amount = first(["amount"], 50);
				overrides.amount =
					amount < 1 && amount >= 0
						? Math.min(100, Math.round(amount * 100))
						: Math.min(100, amount);
			}
			break;
		}
		case "kaleidoscope": {
			const tiles = first(["tiles"], -1);
			if (tiles >= 0) {
				overrides.amount = Math.min(100, ((tiles - 2) / 14) * 100);
			} else {
				overrides.amount = first(["amount"], 50);
			}
			break;
		}
		case "tile":
		case "contour-lines":
		case "matte-edge":
		case "datamosh": {
			overrides.amount = first(["amount"], 50);
			break;
		}
		case "checker": {
			const size = first(["size"], -1);
			if (size >= 0) {
				const squares = PREVIEW_SIZE / size;
				overrides.amount = Math.min(
					100,
					((squares - 2) / 30) * 100,
				);
			} else {
				overrides.amount = first(["amount"], 30);
			}
			break;
		}
		case "grid": {
			const size = first(["size"], -1);
			const rows = first(["rows"], -1);
			if (size >= 0) {
				const cells = PREVIEW_SIZE / size;
				overrides.amount = Math.min(
					100,
					((cells - 4) / 20) * 100,
				);
			} else if (rows >= 0) {
				overrides.amount = Math.min(
					100,
					((rows - 4) / 20) * 100,
				);
			} else {
				overrides.amount = first(["amount"], 35);
			}
			break;
		}
		case "halftone": {
			overrides.amount = first(["amount"], 50);
			break;
		}
		case "scanlines": {
			const intensity = first(["intensity"], -1);
			if (intensity >= 0 && intensity < 1) {
				overrides.amount = Math.min(100, Math.round(intensity * 100));
			} else {
				overrides.amount = first(["amount", "width"], 50);
			}
			break;
		}
		case "grain": {
			const amount = first(["amount"], 50);
			overrides.amount =
				amount < 1 && amount >= 0
					? Math.min(100, Math.round(amount * 100))
					: Math.min(100, amount);
			break;
		}
		case "posterize": {
			const levels = first(["levels"], -1);
			if (levels >= 0) {
				overrides.amount = Math.min(
					100,
					((32 - levels) / (32 - 2)) * 100,
				);
			} else {
				const amount = first(["amount"], 60);
				overrides.amount =
					amount < 1 && amount >= 0
						? Math.min(100, Math.round(amount * 100))
						: Math.min(100, amount);
			}
			break;
		}
		case "edge-detect": {
			const threshold = first(["threshold"], -1);
			if (threshold >= 0 && threshold <= 1) {
				overrides.amount = Math.min(100, threshold * 100);
			} else {
				overrides.amount = first(["amount"], 50);
			}
			break;
		}
		case "thermal":
		case "emboss": {
			const heat = first(["heat", "strength"], -1);
			if (heat >= 0 && heat <= 1) {
				overrides.amount = Math.min(100, Math.round(heat * 100));
			} else {
				overrides.amount = first(["amount"], 50);
			}
			break;
		}
		case "comic": {
			const edge = first(["edge"], -1);
			if (edge >= 0 && edge <= 1) {
				overrides.amount = Math.min(100, edge * 100);
			} else {
				overrides.amount = first(["amount"], 60);
			}
			break;
		}
		case "ascii": {
			overrides.amount = first(["amount", "size"], 50);
			break;
		}
		case "duotone": {
			overrides.amount = first(["amount"], 70);
			break;
		}
		case "color-balance":
		case "replace-color":
		case "tint":
		case "gradient-overlay":
		case "four-color-gradient": {
			const amount = first(["amount"], 50);
			overrides.amount =
				amount < 1 && amount >= 0
					? Math.min(100, Math.round(amount * 100))
					: Math.min(100, amount);
			break;
		}
		case "saturation": {
			const saturation = first(["saturation"], -1);
			if (saturation >= 0) {
				overrides.amount =
					saturation < 1
						? Math.min(200, Math.round(saturation * 100))
						: Math.min(200, saturation);
			} else {
				const amount = first(["amount"], 100);
				overrides.amount =
					amount < 1 && amount >= 0
						? Math.min(200, Math.round(amount * 100))
						: Math.min(200, amount);
			}
			break;
		}
		case "contrast": {
			const contrast = first(["contrast"], -1);
			if (contrast >= 0) {
				overrides.amount =
					contrast < 1
						? Math.min(200, Math.round(contrast * 100))
						: Math.min(200, contrast);
			} else {
				const amount = first(["amount"], 100);
				overrides.amount =
					amount < 1 && amount >= 0
						? Math.min(200, Math.round(amount * 100))
						: Math.min(200, amount);
			}
			break;
		}
		case "brightness": {
			const brightness = parseFilterBrightness(preset.previewCss);
			if (brightness !== null) {
				overrides.amount = Math.min(200, Math.round(brightness * 100));
			} else {
				const intensity = first(["intensity"], -1);
				if (intensity >= 0 && intensity < 1) {
					overrides.amount = Math.min(
						200,
						Math.round(100 + intensity * 100),
					);
				} else {
					const amount = first(["amount"], 100);
					overrides.amount =
						amount < 1 && amount >= 0
							? Math.min(200, Math.round(amount * 100))
							: Math.min(200, amount);
				}
			}
			break;
		}
		case "hue-rotate": {
			const hue = parseFilterHueRotate(preset.previewCss);
			if (hue !== null) {
				overrides.amount = hue;
			} else {
				const raw = first(["hue"], 0);
				overrides.amount = raw;
			}
			break;
		}
		case "sepia":
		case "grayscale":
		case "invert": {
			const amount = first(["amount"], 100);
			overrides.amount =
				amount < 1 && amount >= 0
					? Math.min(100, Math.round(amount * 100))
					: Math.min(100, amount);
			break;
		}
		case "temperature": {
			const warmth = first(["warmth"], -1);
			if (warmth >= -1 && warmth <= 1) {
				overrides.amount = warmth * 100;
			} else {
				const intensity = first(["intensity"], -1);
				if (intensity >= 0 && intensity <= 1) {
					const sign = /cool/.test(preset.type) ? -1 : 1;
					overrides.amount = sign * intensity * 40;
				} else {
					overrides.amount = first(["amount"], 0);
				}
			}
			break;
		}
		case "vignette": {
			const amount = first(["amount"], 50);
			overrides.amount =
				amount < 1 && amount >= 0
					? Math.min(100, Math.round(amount * 100))
					: Math.min(100, amount);
			break;
		}
		case "outer-glow": {
			const radius = parseDropShadowBlur(preset.previewCss) ??
				first(["radius"], -1);
			overrides.radius = radius >= 0 ? radius : 8;
			const intensity = first(["intensity"], -1);
			overrides.intensity =
				intensity >= 0 && intensity < 1
					? Math.min(100, Math.round(intensity * 100))
					: intensity >= 0
						? Math.min(100, intensity)
						: 60;
			break;
		}
		case "inner-glow": {
			const amount = parseBoxShadowBlur(preset.previewCss) ??
				first(["amount"], -1);
			overrides.amount = amount >= 0 ? amount : 40;
			const intensity = first(["intensity"], -1);
			overrides.intensity =
				intensity >= 0 && intensity < 1
					? Math.min(100, Math.round(intensity * 100))
					: intensity >= 0
						? Math.min(100, intensity)
						: 60;
			break;
		}
		case "edge-glow": {
			overrides.amount = first(["amount"], 35);
			overrides.intensity = first(["intensity"], 70);
			break;
		}
		case "glow": {
			const intensity = first(["intensity"], -1);
			if (intensity >= 0 && intensity < 1) {
				overrides.amount = Math.min(100, Math.round(intensity * 100));
			} else {
				overrides.amount = intensity >= 0
					? Math.min(100, intensity)
					: first(["amount"], 50);
			}
			break;
		}
		case "dreamy-bloom": {
			const intensity = first(["intensity"], -1);
			if (intensity >= 0 && intensity < 1) {
				overrides.intensity = Math.min(100, Math.round(intensity * 100));
			} else {
				overrides.intensity = intensity >= 0
					? Math.min(100, intensity)
					: first(["amount"], 70);
			}
			break;
		}
		case "neon-boost": {
			const intensity = first(["amount", "intensity"], -1);
			if (intensity >= 0 && intensity < 1) {
				overrides.intensity = Math.min(100, Math.round(intensity * 100));
			} else {
				overrides.intensity = intensity >= 0
					? Math.min(100, intensity)
					: 70;
			}
			break;
		}
		case "cinematic-pop": {
			const intensity = first(["intensity"], -1);
			overrides.intensity =
				intensity >= 0 && intensity < 1
					? Math.min(100, Math.round(intensity * 100))
					: intensity >= 0
						? Math.min(100, intensity)
						: 70;
			break;
		}
		case "matte-film": {
			const amount = first(["amount"], -1);
			if (amount >= 0 && amount < 1) {
				overrides.intensity = Math.min(100, Math.round(amount * 100));
			} else {
				const intensity = first(["intensity"], -1);
				overrides.intensity =
					intensity >= 0 && intensity < 1
						? Math.min(100, Math.round(intensity * 100))
						: intensity >= 0
							? Math.min(100, intensity)
							: 70;
			}
			break;
		}
		case "retro-crt": {
			const intensity = first(["intensity"], -1);
			if (intensity >= 0 && intensity < 1) {
				overrides.intensity = Math.min(100, Math.round(intensity * 100));
			} else {
				const lineGap = first(["lineGap"], -1);
				overrides.intensity = lineGap >= 0 ? lineGap * 10 : 70;
			}
			break;
		}
		case "vhs": {
			const amount = first(["amount"], -1);
			if (amount >= 0 && amount < 1) {
				overrides.amount = Math.min(100, Math.round(amount * 100));
			} else {
				const intensity = first(["intensity"], -1);
				overrides.amount =
					intensity >= 0 && intensity < 1
						? Math.min(100, Math.round(intensity * 100))
						: intensity >= 0
							? Math.min(100, intensity)
							: 50;
			}
			break;
		}
		case "drop-shadow": {
			overrides.distance = first(["distance"], 10);
			overrides.blur = first(["blur"], 4);
			overrides.angle = first(["angle"], 135);
			break;
		}
		case "stroke": {
			overrides.thickness = first(["width", "thickness"], 3);
			overrides.amount = first(["amount"], 80);
			break;
		}
		case "text-glow":
		case "text-stroke": {
			overrides.amount = first(["amount"], 40);
			overrides.intensity = first(["intensity"], 60);
			break;
		}
		case "text-shadow": {
			overrides.amount = first(["amount"], 40);
			overrides.intensity = first(["intensity"], 50);
			overrides.direction = first(["direction"], 45);
			break;
		}
		case "text-3d": {
			overrides.amount = first(["amount"], 50);
			break;
		}
		default: {
			// For unhandled base types, copy any directly matching keys.
			// Use Object.assign to avoid tripping Semgrep's remote-property-injection
			// rule on the bracket-assignment pattern; the key is from base.params
			// (the trusted effect registry), not from user input.
			for (const param of base.params) {
				const raw = params[param.key];
				if (raw !== undefined) {
					Object.assign(overrides, { [param.key]: raw });
				}
			}
		}
	}

	return overrides;
}

function firstDirectionOrAngle(
	params: ParamValues,
	fallback: number,
): number {
	const rawAngle = params.angle;
	const rawDirection = params.direction;
	if (typeof rawAngle === "number") return rawAngle;
	if (typeof rawDirection === "number") return rawDirection;
	if (typeof rawDirection === "string") {
		if (rawDirection === "horizontal") return 0;
		if (rawDirection === "vertical") return 90;
	}
	if (typeof rawAngle === "string") {
		const parsed = Number.parseFloat(rawAngle);
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

function resolveBaseType(preset: EffectPresetDefinition): string | null {
	const { type } = preset;
	if (!type.startsWith("fx-")) {
		return findBaseDefinition(type) ? type : null;
	}

	if (type.startsWith("fx-blur-")) return resolveBlurBaseType(preset);
	if (type.startsWith("fx-glow-")) return resolveGlowBaseType(preset);
	if (type.startsWith("fx-light-")) return resolveLightBaseType(preset);
	if (type.startsWith("fx-style-") || type.startsWith("fx-stylize-")) {
		return resolveStyleBaseType(preset);
	}
	if (type.startsWith("fx-distort-")) return resolveDistortBaseType(preset);
	if (type.startsWith("fx-tex-") || type.startsWith("fx-texture-")) {
		return resolveTextureBaseType(preset);
	}
	if (type.startsWith("fx-retro-")) return resolveRetroBaseType(preset);
	if (type.startsWith("fx-cine-") || type.startsWith("fx-cinematic-")) {
		return resolveCineBaseType(preset);
	}
	if (type.startsWith("fx-art-") || type.startsWith("fx-artistic-")) {
		return resolveArtBaseType(preset);
	}
	if (type.startsWith("fx-gen-")) return resolveGeneratorBaseType(preset);
	if (type.startsWith("fx-particles-")) return null;
	if (type.startsWith("fx-color-")) return resolveColorBaseType(preset);
	return null;
}

function resolveBlurBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.slice("fx-blur-".length);
	if (suffix === "motion") return "motion-blur";
	if (suffix === "directional") return "directional-blur";
	if (suffix === "radial") return "zoom-blur";
	if (suffix === "anamorphic") return "directional-blur";
	return "box-blur";
}

function resolveGlowBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.slice("fx-glow-".length);
	if (suffix === "inner") return "inner-glow";
	if (suffix === "dream") return "dreamy-bloom";
	return "outer-glow";
}

function resolveLightBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.slice("fx-light-".length);
	if (suffix === "inner-glow") return "inner-glow";
	if (suffix === "edge-glow") return "edge-glow";
	if (suffix === "vignette") return "vignette";
	if (suffix === "square-vignette") return "vignette";
	if (suffix === "bloom") return "dreamy-bloom";
	if (
		suffix === "spot" ||
		suffix === "fill" ||
		suffix === "rim" ||
		suffix === "strobe-light" ||
		suffix === "blink" ||
		suffix === "spotlight"
	) {
		return "brightness";
	}
	if (suffix === "caustic") return "glow";
	return "glow";
}

function resolveStyleBaseType(preset: EffectPresetDefinition): string | null {
	const prefix = preset.type.startsWith("fx-stylize-")
		? "fx-stylize-"
		: "fx-style-";
	const suffix = preset.type.slice(prefix.length);

	const map: Record<string, string> = {
		posterize: "posterize",
		"edge-detect": "edge-detect",
		halftone: "halftone",
		mirror: "kaleidoscope",
		kaleidoscope: "kaleidoscope",
		ascii: "ascii",
		comic: "comic",
		thermal: "thermal",
		"thermal-warm": "thermal",
		mosaic: "pixelate",
		emboss: "emboss",
		pixelate: "pixelate",
		duotone: "duotone",
		stroke: "stroke",
		"neon-boost": "neon-boost",
		tile: "tile",
		checker: "checker",
		grid: "grid",
		"contour-lines": "contour-lines",
		"matte-edge": "matte-edge",
	};

	return map[suffix] ?? null;
}

function resolveDistortBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.slice("fx-distort-".length);

	const map: Record<string, string> = {
		wave: "wave",
		ripple: "ripple",
		swirl: "swirl",
		bulge: "bulge",
		pinch: "bulge",
		twist: "twist",
		fisheye: "fisheye",
		stretch: "scale",
		"glitch-displace": "datamosh",
		"mirror-h": "flip-horizontal",
		"mirror-v": "flip-vertical",
		bend: "bulge",
		"flip-h": "flip-horizontal",
		"flip-v": "flip-vertical",
		turbulence: "grain",
	};

	return map[suffix] ?? null;
}

function resolveTextureBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.startsWith("fx-tex-")
		? preset.type.slice("fx-tex-".length)
		: preset.type.slice("fx-texture-".length);

	if (suffix === "grain" || suffix === "noise" || suffix === "paper" ||
		suffix === "concrete" || suffix === "canvas") {
		return "grain";
	}
	if (suffix === "grid" || suffix === "bricks") return "grid";
	if (suffix === "dots") return "halftone";
	if (suffix === "stripes") return "scanlines";
	return null;
}

function resolveRetroBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.slice("fx-retro-".length);

	const map: Record<string, string> = {
		vhs: "vhs",
		scanlines: "scanlines",
		crt: "retro-crt",
		super8: "matte-film",
		"16mm": "matte-film",
		broadcast: "vhs",
		polaroid: "matte-film",
		"faded-print": "matte-film",
		kodak: "temperature",
		fuji: "temperature",
		movie: "matte-film",
		technicolor: "saturation",
		sepia: "sepia",
	};

	return map[suffix] ?? null;
}

function resolveCineBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.startsWith("fx-cinematic-")
		? preset.type.slice("fx-cinematic-".length)
		: preset.type.slice("fx-cine-".length);

	const map: Record<string, string> = {
		pop: "cinematic-pop",
		"bokeh-cine": "box-blur",
		"anamorphic-cine": "scale",
		"pan-speed": "motion-blur",
		spotlight: "brightness",
		cinestill: "temperature",
		"grade-cool": "temperature",
		"grade-warm": "temperature",
	};

	return map[suffix] ?? null;
}

function resolveArtBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.startsWith("fx-artistic-")
		? preset.type.slice("fx-artistic-".length)
		: preset.type.slice("fx-art-".length);

	if (suffix === "pixel-art" || suffix === "mosaic-art" || suffix === "cubism") {
		return "pixelate";
	}
	return null;
}

function resolveGeneratorBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.slice("fx-gen-".length);

	const map: Record<string, string> = {
		noise: "grain",
		checkerboard: "checker",
		"grid-gen": "grid",
		"dots-gen": "halftone",
		stripes: "scanlines",
		"triangles-gen": "grid",
		"hexagons-gen": "halftone",
	};

	return map[suffix] ?? null;
}

function resolveColorBaseType(preset: EffectPresetDefinition): string | null {
	const suffix = preset.type.slice("fx-color-".length);

	const map: Record<string, string> = {
		balance: "color-balance",
		replace: "replace-color",
		tint: "tint",
		"gradient-overlay": "gradient-overlay",
		"four-gradient": "four-color-gradient",
	};

	return map[suffix] ?? null;
}

const PREVIEW_SIZE = 160;

function buildCssBasedDefinition(
	preset: EffectPresetDefinition,
): EffectDefinition {
	const params: ParamDefinition[] = [];
	const passes: EffectPassTemplate[] = [];

	const previewCss = preset.previewCss ?? "";

	if (previewCss.includes("filter:")) {
		const filterPart = previewCss.split("filter:")[1]?.split(";")[0] ?? "";
		for (const match of filterPart.matchAll(
			/(brightness|contrast|saturate|sepia|grayscale|invert|hue-rotate|blur|drop-shadow)\(([^)]*)\)/g,
		)) {
			const [, name, rawValue] = match;
			addFilterPass(name as FilterFunction, rawValue, params, passes);
		}
	}

	if (previewCss.includes("transform:")) {
		const transformPart = previewCss.split("transform:")[1]?.split(";")[0] ?? "";
		for (const match of transformPart.matchAll(
			/(scaleX|scaleY|scale|rotate|skewX|skewY)\(([^)]*)\)/g,
		)) {
			const [, name, rawValue] = match;
			addTransformPass(name as TransformFunction, rawValue, params, passes);
		}
	}

	return {
		type: preset.type,
		name: preset.name,
		keywords: [preset.category.toLowerCase(), "preset"],
		params,
		renderer: { passes },
	};
}

type FilterFunction =
	| "brightness"
	| "contrast"
	| "saturate"
	| "sepia"
	| "grayscale"
	| "invert"
	| "hue-rotate"
	| "blur"
	| "drop-shadow";

type TransformFunction =
	| "scaleX"
	| "scaleY"
	| "scale"
	| "rotate"
	| "skewX"
	| "skewY";

function addFilterPass(
	name: FilterFunction,
	rawValue: string,
	params: ParamDefinition[],
	passes: EffectPassTemplate[],
): void {
	switch (name) {
		case "brightness": {
			const value = parseFilterNumber(rawValue, 1);
			const key = "brightness";
			params.push(numberParam(key, "Brightness", value, 0, 2));
			passes.push({
				shader: "brightness",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams[key], value),
				}),
			});
			break;
		}
		case "contrast": {
			const value = parseFilterNumber(rawValue, 1);
			const key = "contrast";
			params.push(numberParam(key, "Contrast", value, 0, 2));
			passes.push({
				shader: "contrast",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams[key], value),
				}),
			});
			break;
		}
		case "saturate": {
			const value = parseFilterNumber(rawValue, 1);
			const key = "saturate";
			params.push(numberParam(key, "Saturation", value, 0, 2));
			passes.push({
				shader: "saturation",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams[key], value),
				}),
			});
			break;
		}
		case "sepia": {
			const value = parseFilterNumber(rawValue, 0);
			const key = "sepia";
			params.push(numberParam(key, "Sepia", value, 0, 1));
			passes.push({
				shader: "sepia",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams[key], value),
				}),
			});
			break;
		}
		case "grayscale": {
			const value = parseFilterNumber(rawValue, 0);
			const key = "grayscale";
			params.push(numberParam(key, "Grayscale", value, 0, 1));
			passes.push({
				shader: "grayscale",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams[key], value),
				}),
			});
			break;
		}
		case "invert": {
			const value = parseFilterNumber(rawValue, 0);
			const key = "invert";
			params.push(numberParam(key, "Invert", value, 0, 1));
			passes.push({
				shader: "invert",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams[key], value),
				}),
			});
			break;
		}
		case "hue-rotate": {
			const value = parseAngle(rawValue);
			const key = "hue-rotate";
			params.push(numberParam(key, "Hue", value, -360, 360));
			passes.push({
				shader: "hue-rotate",
				uniforms: ({ effectParams }) => ({
					u_amount: (asNumber(effectParams[key], value) * Math.PI) / 180,
				}),
			});
			break;
		}
		case "blur": {
			const value = parsePixelValue(rawValue);
			const key = "blur";
			params.push(numberParam(key, "Blur", value, 0, 50));
			passes.push({
				shader: "gaussian-blur",
				uniforms: ({ effectParams }) => {
					const blur = asNumber(effectParams[key], value);
					return {
						u_sigma: blur,
						u_step: Math.max(1, blur / 10),
						u_direction: [1, 0],
					};
				},
			});
			passes.push({
				shader: "gaussian-blur",
				uniforms: ({ effectParams }) => {
					const blur = asNumber(effectParams[key], value);
					return {
						u_sigma: blur,
						u_step: Math.max(1, blur / 10),
						u_direction: [0, 1],
					};
				},
			});
			break;
		}
		case "drop-shadow": {
			const shadow = parseDropShadow(rawValue);
			const distanceKey = "distance";
			const blurKey = "blur";
			const angleKey = "angle";
			params.push(
				numberParam(distanceKey, "Distance", shadow.offset, 0, 100),
				numberParam(blurKey, "Blur", shadow.blur, 0, 50),
				numberParam(angleKey, "Angle", shadow.angle, 0, 360),
			);
			passes.push({
				shader: "drop-shadow",
				uniforms: ({ effectParams }) => {
					const distance = asNumber(effectParams[distanceKey], shadow.offset);
					const blur = asNumber(effectParams[blurKey], shadow.blur);
					const angle = asNumber(effectParams[angleKey], shadow.angle);
					const radians = (angle * Math.PI) / 180;
					return {
						u_distance: distance / PREVIEW_SIZE,
						u_blur: blur,
						u_direction: [Math.cos(radians), Math.sin(radians)],
					};
				},
			});
			break;
		}
	}
}

function addTransformPass(
	name: TransformFunction,
	rawValue: string,
	params: ParamDefinition[],
	passes: EffectPassTemplate[],
): void {
	const value = Number.parseFloat(rawValue) || 1;

	switch (name) {
		case "scaleX": {
			if (value < 0) {
				passes.push({
					shader: "flip-horizontal",
					uniforms: () => ({ u_amount: 1 }),
				});
			} else {
				const key = "scaleX";
				params.push(numberParam(key, "Scale X", value, 0.1, 5));
				passes.push({
					shader: "scale",
					uniforms: ({ effectParams }) => ({
						u_amount: scaleToAmount(asNumber(effectParams[key], value)),
					}),
				});
			}
			break;
		}
		case "scaleY": {
			if (value < 0) {
				passes.push({
					shader: "flip-vertical",
					uniforms: () => ({ u_amount: 1 }),
				});
			} else {
				const key = "scaleY";
				params.push(numberParam(key, "Scale Y", value, 0.1, 5));
				passes.push({
					shader: "scale",
					uniforms: ({ effectParams }) => ({
						u_amount: scaleToAmount(asNumber(effectParams[key], value)),
					}),
				});
			}
			break;
		}
		case "scale": {
			const key = "scale";
			params.push(numberParam(key, "Scale", value, 0.1, 3));
			passes.push({
				shader: "scale",
				uniforms: ({ effectParams }) => ({
					u_amount: scaleToAmount(asNumber(effectParams[key], value)),
				}),
			});
			break;
		}
		case "rotate": {
			const key = "rotate";
			const degrees = parseAngle(rawValue);
			params.push(numberParam(key, "Rotate", degrees, 0, 360));
			passes.push({
				shader: "rotate",
				uniforms: ({ effectParams }) => ({
					u_amount: asNumber(effectParams[key], degrees) / 360,
				}),
			});
			break;
		}
		case "skewX": {
			const key = "skewX";
			const degrees = parseAngle(rawValue);
			params.push(numberParam(key, "Skew X", degrees, -89, 89));
			passes.push({
				shader: "skew",
				uniforms: ({ effectParams }) => ({
					u_amount: Math.tan(
						(asNumber(effectParams[key], degrees) * Math.PI) / 180,
					),
					u_direction: [1, 0],
				}),
			});
			break;
		}
		case "skewY": {
			const key = "skewY";
			const degrees = parseAngle(rawValue);
			params.push(numberParam(key, "Skew Y", degrees, -89, 89));
			passes.push({
				shader: "skew",
				uniforms: ({ effectParams }) => ({
					u_amount: Math.tan(
						(asNumber(effectParams[key], degrees) * Math.PI) / 180,
					),
					u_direction: [0, 1],
				}),
			});
			break;
		}
	}
}

function scaleToAmount(scale: number): number {
	return Math.max(0, Math.min(1, (scale - 0.5) / 1.5));
}

function numberParam(
	key: string,
	label: string,
	defaultValue: number,
	min: number,
	max: number,
): ParamDefinition {
	return {
		key,
		label,
		type: "number",
		default: defaultValue,
		min,
		max,
		step: 1,
	};
}

function parseFilterNumber(raw: string, fallback: number): number {
	const trimmed = raw.trim();
	if (trimmed.endsWith("%")) {
		const parsed = Number.parseFloat(trimmed);
		if (Number.isFinite(parsed)) return parsed / 100;
	}
	const parsed = Number.parseFloat(trimmed);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePixelValue(raw: string): number {
	const parsed = Number.parseFloat(raw);
	return Number.isFinite(parsed) ? parsed : 0;
}

function parseAngle(raw: string): number {
	const trimmed = raw.trim();
	const parsed = Number.parseFloat(trimmed);
	return Number.isFinite(parsed) ? parsed : 0;
}

function parseDropShadow(raw: string): {
	offset: number;
	blur: number;
	angle: number;
} {
	const parts = raw.split(/\s+/).filter(Boolean);
	const x = Number.parseFloat(parts[0] ?? "0") || 0;
	const y = Number.parseFloat(parts[1] ?? "0") || 0;
	const blur = Number.parseFloat(parts[2] ?? "0") || 0;
	const offset = Math.sqrt(x * x + y * y);
	const angle = (Math.atan2(y, x) * 180) / Math.PI;
	return { offset, blur, angle };
}

function parseDropShadowBlur(css?: string): number | null {
	if (!css) return null;
	const match = css.match(/drop-shadow\(\s*[^)]*\s+(\d+(?:\.\d+)?)px/);
	if (match) return Number.parseFloat(match[1]);
	return null;
}

function parseBoxShadowBlur(css?: string): number | null {
	if (!css) return null;
	const match = css.match(/box-shadow:\s*inset\s+[^)]*\s+(\d+(?:\.\d+)?)px/);
	if (match) return Number.parseFloat(match[1]);
	return null;
}

function parseFilterBrightness(css?: string): number | null {
	if (!css) return null;
	const match = css.match(/brightness\(([^)]*)\)/);
	if (!match) return null;
	return parseFilterNumber(match[1], Number.NaN);
}

function parseFilterHueRotate(css?: string): number | null {
	if (!css) return null;
	const match = css.match(/hue-rotate\(([^)]*)\)/);
	if (!match) return null;
	return parseAngle(match[1]);
}

function asNumber(value: unknown, fallback: number): number {
	if (typeof value === "number") return value;
	if (typeof value === "string") {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}
	return fallback;
}
