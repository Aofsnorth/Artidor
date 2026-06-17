// Templates — 150 entries across 15 categories × 10 each.
// Shape: { id, name, description, category, durationSec, build() }.

import type {
	TemplateBuild,
	TemplateCategory,
	TemplateDefinition,
} from "./types";

type Track = { id: string; type: string; name: string };
type TE = {
	id: string;
	trackId: string;
	text: string;
	startSec: number;
	durationSec: number;
	fontSize: number;
	color: string;
	fontWeight: number;
	textAlign: "left" | "center" | "right";
	y: number;
};
type GE = {
	id: string;
	trackId: string;
	kind: string;
	startSec: number;
	durationSec: number;
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string;
};
type FX = { type: string; params?: Record<string, number | string | boolean> };

const tr = (id: string, type: string, name: string): Track => ({ id, type, name });
const tx = (
	id: string,
	trackId: string,
	text: string,
	startSec: number,
	durationSec: number,
	fontSize = 48,
	color = "#ffffff",
	fontWeight = 700,
	textAlign: TE["textAlign"] = "center",
	y = 50,
): TE => ({ id, trackId, text, startSec, durationSec, fontSize, color, fontWeight, textAlign, y });
const gr = (
	id: string,
	trackId: string,
	kind: string,
	startSec: number,
	durationSec: number,
	x: number,
	y: number,
	width: number,
	height: number,
	fill: string,
): GE => ({ id, trackId, kind, startSec, durationSec, x, y, width, height, fill });
const fx = (type: string, params?: FX["params"]): FX => (params ? { type, params } : { type });

const tmpl = (
	id: string,
	name: string,
	description: string,
	category: TemplateCategory,
	durationSec: number,
	build: () => TemplateBuild,
): TemplateDefinition => ({ id, name, description, category, durationSec, build });

export const templates: TemplateDefinition[] = [
	// ── Intro (10)
	tmpl("tpl-intro-001", "Quick Intro", "3-second title intro", "Intro", 3, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "Welcome", 0.3, 2.4, 72, "#ffffff", 800, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-blur-soft", { radius: 2 })],
	})),
	tmpl("tpl-intro-002", "Logo Intro", "Animated logo intro", "Intro", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("graphic", "graphic", "Logo")],
		textElements: [tx("tx-1", "graphic", "BRAND", 1, 2.5, 80, "#ffffff", 900, "center", 60)],
		graphicElements: [gr("logo-1", "graphic", "circle", 0, 4, 40, 40, 20, 20, "#3b82f6"), gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-glow-neon", { intensity: 1 })],
	})),
	tmpl("tpl-intro-003", "Cinematic Intro", "Cinematic title sequence", "Intro", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "FEATURE PRESENTATION", 1.5, 2, 36, "#fbbf24", 600, "center", 50), tx("tx-2", "text", "THE STORY", 2.5, 1.5, 72, "#ffffff", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-cine-letterbox", { barHeight: 12 })],
	})),
	tmpl("tpl-intro-004", "Vlog Intro", "Casual vlog intro", "Intro", 3, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "Hey There!", 0.5, 2, 64, "#ffffff", 800, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#ec4899")],
		effects: [fx("fx-glow-warm", { intensity: 0.6 })],
	})),
	tmpl("tpl-intro-005", "Countdown Intro", "Animated countdown", "Intro", 6, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Number")],
		textElements: [tx("tx-3", "text", "3", 0, 1, 120, "#ef4444", 900, "center", 50), tx("tx-2", "text", "2", 2, 1, 120, "#f59e0b", 900, "center", 50), tx("tx-1", "text", "1", 4, 1, 120, "#22c55e", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-style-posterize", { levels: 4 })],
	})),
	tmpl("tpl-intro-006", "Splash Intro", "Bold splash intro", "Intro", 2, () => ({
		tracks: [tr("video", "video", "Video"), tr("graphic", "graphic", "Shape")],
		textElements: [tx("tx-1", "graphic", "GO", 0.2, 1.6, 96, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("splash-1", "graphic", "circle", 0, 2, 0, 0, 100, 100, "#facc15")],
		effects: [fx("fx-style-mosaic", { tileSize: 12 })],
	})),
	tmpl("tpl-intro-007", "Minimal Intro", "Clean minimal title", "Intro", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Title", 0.5, 3, 56, "#1f2937", 700, "left", 45)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#f3f4f6")],
		effects: [],
	})),
	tmpl("tpl-intro-008", "Tech Intro", "Futuristic tech intro", "Intro", 3, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "TECH//2026", 0.3, 2.4, 64, "#22d3ee", 800, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-electric", { intensity: 1 })],
	})),
	tmpl("tpl-intro-009", "Retro Intro", "80s retro intro", "Intro", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "RETRO VIBES", 0.5, 3, 56, "#fde047", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1e1b4b")],
		effects: [fx("fx-retro-vhs", { amount: 0.6 })],
	})),
	tmpl("tpl-intro-010", "News Intro", "News broadcast intro", "Intro", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "BREAKING NEWS", 0.3, 4.4, 36, "#ffffff", 800, "center", 35), tx("tx-2", "text", "Headline goes here", 1.2, 3.5, 28, "#fafafa", 500, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 30, "#dc2626"), gr("bg-2", "video", "rect", 0, 5, 0, 30, 100, 70, "#1f2937")],
		effects: [fx("fx-cine-letterbox", { barHeight: 8 })],
	})),

	// ── Outro (10)
	tmpl("tpl-outro-001", "Simple Outro", "End card with subscribe", "Outro", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "Thanks for watching", 0.5, 4, 48, "#ffffff", 700, "center", 40), tx("tx-2", "text", "SUBSCRIBE", 2.5, 2, 64, "#ef4444", 900, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#111827")],
		effects: [],
	})),
	tmpl("tpl-outro-002", "Social Outro", "Social media call-to-action", "Outro", 6, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "Follow us @brand", 1, 4, 36, "#ffffff", 600, "center", 35), tx("tx-2", "text", "@instagram", 2.5, 3, 56, "#ec4899", 800, "center", 60), tx("tx-3", "text", "@tiktok", 3.5, 2, 56, "#000000", 800, "center", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-outro-003", "End Screen", "YouTube-style end screen", "Outro", 8, () => ({
		tracks: [tr("video", "video", "Video"), tr("graphic", "graphic", "Cards")],
		textElements: [tx("tx-1", "graphic", "More videos", 0.5, 7, 32, "#ffffff", 600, "left", 15)],
		graphicElements: [gr("card-1", "graphic", "rect", 0.5, 7, 10, 40, 35, 30, "#374151"), gr("card-2", "graphic", "rect", 0.5, 7, 55, 40, 35, 30, "#374151"), gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#111827")],
		effects: [],
	})),
	tmpl("tpl-outro-004", "Logo Outro", "Closing logo animation", "Outro", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("graphic", "graphic", "Logo")],
		textElements: [tx("tx-1", "graphic", "BRAND", 0.5, 3, 80, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("logo-1", "graphic", "circle", 0, 4, 45, 45, 10, 10, "#3b82f6"), gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-glow-soft", { intensity: 0.7 })],
	})),
	tmpl("tpl-outro-005", "Quote Outro", "Inspirational quote outro", "Outro", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Quote")],
		textElements: [tx("tx-1", "text", "Stay hungry, stay foolish.", 0.5, 4, 36, "#ffffff", 500, "center", 50), tx("tx-2", "text", "— Steve Jobs", 3.5, 1.2, 24, "#9ca3af", 400, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-blur-soft", { radius: 3 })],
	})),
	tmpl("tpl-outro-006", "CTA Outro", "Call-to-action outro", "Outro", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "CTA")],
		textElements: [tx("tx-1", "text", "Visit", 0.5, 3, 32, "#ffffff", 500, "center", 35), tx("tx-2", "text", "www.brand.com", 1, 2.5, 48, "#22d3ee", 700, "center", 55), tx("tx-3", "text", "Use code SAVE20", 2.5, 1.3, 28, "#fbbf24", 600, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#111827")],
		effects: [],
	})),
	tmpl("tpl-outro-007", "Bumper Outro", "Quick bumper end", "Outro", 2, () => ({
		tracks: [tr("video", "video", "Video"), tr("graphic", "graphic", "Bumper")],
		textElements: [tx("tx-1", "graphic", "BYE", 0.2, 1.6, 72, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 2, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-style-posterize", { levels: 6 })],
	})),
	tmpl("tpl-outro-008", "Farewell Outro", "Warm farewell card", "Outro", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "Until next time", 0.5, 4, 48, "#ffffff", 600, "center", 50), tx("tx-2", "text", "<3", 2, 2, 64, "#ef4444", 700, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1e293b")],
		effects: [fx("fx-glow-warm", { intensity: 0.5 })],
	})),
	tmpl("tpl-outro-009", "Credits Outro", "Rolling credits", "Outro", 8, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Credits")],
		textElements: [tx("tx-1", "text", "Director — Jane Doe", 0.5, 7, 24, "#ffffff", 500, "center", 30), tx("tx-2", "text", "Editor — John Smith", 2, 5, 24, "#ffffff", 500, "center", 50), tx("tx-3", "text", "Music — Band Name", 4, 3, 24, "#ffffff", 500, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-cine-letterbox", { barHeight: 10 })],
	})),
	tmpl("tpl-outro-010", "Tease Outro", "Next episode teaser", "Outro", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "NEXT TIME", 0.5, 4, 36, "#ffffff", 700, "center", 30), tx("tx-2", "text", "Coming soon...", 1.5, 3, 48, "#fbbf24", 800, "center", 55)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1e1b4b")],
		effects: [fx("fx-glow-neon", { intensity: 0.8 })],
	})),

	// ── LowerThird (10)
	tmpl("tpl-lt-001", "Basic Lower Third", "Name + title bar", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "Bar")],
		textElements: [tx("tx-1", "text", "John Doe", 0.2, 3.6, 36, "#ffffff", 800, "left", 70), tx("tx-2", "text", "Senior Editor", 0.2, 3.6, 20, "#fbbf24", 500, "left", 80)],
		graphicElements: [gr("bar-1", "graphic", "rect", 0.2, 3.6, 0, 68, 60, 4, "#fbbf24"), gr("bar-2", "graphic", "rect", 0.2, 3.6, 0, 85, 30, 1, "#fbbf24")],
		effects: [],
	})),
	tmpl("tpl-lt-002", "News Lower Third", "News broadcast style", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "BG")],
		textElements: [tx("tx-1", "text", "BREAKING:", 0.2, 3.6, 20, "#fbbf24", 700, "left", 70), tx("tx-2", "text", "Headline story here", 0.2, 3.6, 32, "#ffffff", 700, "left", 80)],
		graphicElements: [gr("bg-1", "graphic", "rect", 0.2, 3.6, 0, 67, 100, 22, "#000000"), gr("bar-1", "graphic", "rect", 0.2, 3.6, 0, 67, 5, 22, "#ef4444")],
		effects: [],
	})),
	tmpl("tpl-lt-003", "Sport Lower Third", "Sports broadcast style", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "BG")],
		textElements: [tx("tx-1", "text", "10 — PLAYER", 0.2, 3.6, 36, "#ffffff", 900, "left", 70), tx("tx-2", "text", "TEAM NAME", 0.2, 3.6, 20, "#fbbf24", 600, "left", 82)],
		graphicElements: [gr("bg-1", "graphic", "rect", 0.2, 3.6, 0, 65, 100, 25, "#1e3a8a"), gr("bg-2", "graphic", "rect", 0.2, 3.6, 0, 65, 12, 25, "#dc2626")],
		effects: [],
	})),
	tmpl("tpl-lt-004", "Modern Lower Third", "Modern minimal style", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "Accent")],
		textElements: [tx("tx-1", "text", "Speaker Name", 0.2, 3.6, 32, "#ffffff", 700, "left", 70), tx("tx-2", "text", "Job Title", 0.2, 3.6, 18, "#9ca3af", 400, "left", 82)],
		graphicElements: [gr("accent-1", "graphic", "rect", 0.2, 3.6, 0, 70, 3, 15, "#22d3ee")],
		effects: [],
	})),
	tmpl("tpl-lt-005", "Glass Lower Third", "Glass morphism style", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "Glass")],
		textElements: [tx("tx-1", "text", "Name", 0.2, 3.6, 28, "#ffffff", 700, "left", 70), tx("tx-2", "text", "Title", 0.2, 3.6, 18, "#e5e7eb", 400, "left", 82)],
		graphicElements: [gr("glass-1", "graphic", "rect", 0.2, 3.6, 0, 65, 60, 25, "#ffffff")],
		effects: [fx("fx-blur-soft", { radius: 4 })],
	})),
	tmpl("tpl-lt-006", "Animated Lower Third", "Animated entry", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "Bar")],
		textElements: [tx("tx-1", "text", "Animated", 0.5, 3.3, 32, "#ffffff", 700, "left", 70), tx("tx-2", "text", "Lower third", 0.5, 3.3, 18, "#fbbf24", 500, "left", 82)],
		graphicElements: [gr("bar-1", "graphic", "rect", 0.2, 3.6, 0, 65, 100, 3, "#ef4444")],
		effects: [fx("fx-glow-warm", { intensity: 0.4 })],
	})),
	tmpl("tpl-lt-007", "Two Line Lower Third", "Two line name + role", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "BG")],
		textElements: [tx("tx-1", "text", "FULL NAME", 0.2, 3.6, 28, "#ffffff", 700, "left", 67), tx("tx-2", "text", "CEO, COMPANY NAME", 0.2, 3.6, 18, "#cbd5e1", 500, "left", 80)],
		graphicElements: [gr("bg-1", "graphic", "rect", 0.2, 3.6, 0, 60, 70, 28, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-lt-008", "Highlight Lower Third", "Highlighted accent", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "Highlight")],
		textElements: [tx("tx-1", "text", "Featured", 0.2, 3.6, 28, "#1f2937", 700, "left", 72), tx("tx-2", "text", "GUEST", 0.2, 3.6, 20, "#1f2937", 500, "left", 84)],
		graphicElements: [gr("hl-1", "graphic", "rect", 0.2, 3.6, 0, 65, 50, 25, "#fde047")],
		effects: [],
	})),
	tmpl("tpl-lt-009", "Subscribe Lower Third", "YouTube subscribe call-out", "LowerThird", 3, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text"), tr("graphic", "graphic", "Button")],
		textElements: [tx("tx-1", "text", "Subscribe!", 0.2, 2.6, 28, "#ffffff", 700, "left", 72)],
		graphicElements: [gr("btn-1", "graphic", "rect", 0.2, 2.6, 0, 65, 35, 25, "#ef4444")],
		effects: [],
	})),
	tmpl("tpl-lt-010", "Quote Lower Third", "Pull quote overlay", "LowerThird", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "Customer Quote", 0.2, 3.6, 22, "#ffffff", 500, "left", 70), tx("tx-2", "text", "— Customer Name", 0.2, 3.6, 16, "#fbbf24", 400, "left", 85)],
		graphicElements: [gr("bg-1", "video", "rect", 0.2, 3.6, 0, 65, 100, 25, "#1e293b")],
		effects: [],
	})),

	// ── Title (10)
	tmpl("tpl-title-001", "Hero Title", "Big hero title", "Title", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "THE TITLE", 0.5, 3, 96, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-title-002", "Subtitle Title", "Title with subtitle", "Title", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Main Title", 0.5, 4, 72, "#ffffff", 800, "center", 45), tx("tx-2", "text", "Subtitle here", 2, 2.5, 32, "#fbbf24", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-title-003", "Multi-line Title", "Multi-line title", "Title", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "LINE ONE", 0.5, 3, 64, "#ffffff", 800, "center", 40), tx("tx-2", "text", "LINE TWO", 1.2, 2.3, 64, "#ffffff", 800, "center", 55), tx("tx-3", "text", "LINE THREE", 1.9, 1.6, 64, "#fbbf24", 800, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [],
	})),
	tmpl("tpl-title-004", "Typographic Title", "Big typography", "Title", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Aa", 0.3, 3.4, 240, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#dc2626")],
		effects: [],
	})),
	tmpl("tpl-title-005", "Stacked Title", "Stacked layout", "Title", 5, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "TOP LINE", 0.5, 4, 48, "#9ca3af", 700, "center", 40), tx("tx-2", "text", "HEADLINE", 1.5, 3, 80, "#ffffff", 900, "center", 55), tx("tx-3", "text", "BOTTOM LINE", 3, 1.5, 36, "#fbbf24", 600, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-title-006", "Bordered Title", "Title with borders", "Title", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title"), tr("graphic", "graphic", "Frame")],
		textElements: [tx("tx-1", "text", "Title", 0.5, 3, 64, "#1f2937", 800, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#fef3c7"), gr("border-1", "graphic", "rect", 0.2, 3.6, 5, 35, 90, 30, "transparent")],
		effects: [],
	})),
	tmpl("tpl-title-007", "Vertical Title", "Side-aligned title", "Title", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "TITLE", 0.5, 3, 56, "#ffffff", 800, "left", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 30, 40, 40, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-title-008", "Glitch Title", "Glitchy title", "Title", 3, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "GLITCH", 0.2, 2.6, 80, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-distort-glitch-displace", { amount: 5 })],
	})),
	tmpl("tpl-title-009", "Outline Title", "Outlined text title", "Title", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Outline", 0.5, 3, 72, "#1f2937", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#fbbf24")],
		effects: [fx("fx-style-stroke", { width: 3, color: "#ffffff" })],
	})),
	tmpl("tpl-title-010", "Accent Title", "Title with accent shape", "Title", 4, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Title"), tr("graphic", "graphic", "Accent")],
		textElements: [tx("tx-1", "text", "Title", 0.5, 3, 64, "#ffffff", 800, "left", 50)],
		graphicElements: [gr("accent-1", "graphic", "rect", 0.5, 3, 0, 45, 8, 12, "#22d3ee")],
		effects: [],
	})),

	// ── Slideshow (10)
	tmpl("tpl-slideshow-001", "Basic Slideshow", "Simple image slideshow", "Slideshow", 12, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Captions")],
		textElements: [tx("tx-1", "text", "Slide 1", 0.5, 2.5, 32, "#ffffff", 600, "center", 85), tx("tx-2", "text", "Slide 2", 4.5, 2.5, 32, "#ffffff", 600, "center", 85), tx("tx-3", "text", "Slide 3", 8.5, 2.5, 32, "#ffffff", 600, "center", 85)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#0f172a"), gr("bg-2", "video", "rect", 4, 4, 0, 0, 100, 100, "#1e293b"), gr("bg-3", "video", "rect", 8, 4, 0, 0, 100, 100, "#334155")],
		effects: [],
	})),
	tmpl("tpl-slideshow-002", "Ken Burns Slideshow", "Slideshow with ken burns", "Slideshow", 16, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Captions")],
		textElements: [tx("tx-1", "text", "Caption 1", 1, 3, 28, "#ffffff", 500, "center", 85), tx("tx-2", "text", "Caption 2", 5, 3, 28, "#ffffff", 500, "center", 85), tx("tx-3", "text", "Caption 3", 9, 3, 28, "#ffffff", 500, "center", 85), tx("tx-4", "text", "Caption 4", 13, 3, 28, "#ffffff", 500, "center", 85)],
		graphicElements: [gr("img-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1f2937"), gr("img-2", "video", "rect", 4, 4, 0, 0, 100, 100, "#374151"), gr("img-3", "video", "rect", 8, 4, 0, 0, 100, 100, "#4b5563"), gr("img-4", "video", "rect", 12, 4, 0, 0, 100, 100, "#6b7280")],
		effects: [fx("fx-zoom-ken-burns", { strength: 1.2 })],
	})),
	tmpl("tpl-slideshow-003", "Polaroid Slideshow", "Polaroid frame style", "Slideshow", 10, () => ({
		tracks: [tr("video", "video", "Images"), tr("graphic", "graphic", "Frames")],
		textElements: [tx("tx-1", "video", "Photo 1", 0.5, 4, 20, "#1f2937", 500, "center", 90), tx("tx-2", "video", "Photo 2", 5, 4, 20, "#1f2937", 500, "center", 90)],
		graphicElements: [gr("frame-1", "graphic", "rect", 0.5, 4, 15, 10, 70, 75, "#fafaf3"), gr("frame-2", "graphic", "rect", 5, 4, 15, 10, 70, 75, "#fafaf3")],
		effects: [fx("fx-retro-polaroid", { amount: 0.6 })],
	})),
	tmpl("tpl-slideshow-004", "Wedding Slideshow", "Romantic wedding slideshow", "Slideshow", 15, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Titles"), tr("graphic", "graphic", "Hearts")],
		textElements: [tx("tx-1", "text", "Our Story", 1, 13, 48, "#f9a8d4", 600, "center", 50), tx("tx-2", "text", "Forever", 6, 8, 36, "#ffffff", 500, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#831843"), gr("heart-1", "graphic", "circle", 7, 1, 45, 45, 10, 10, "#f9a8d4")],
		effects: [fx("fx-glow-warm", { intensity: 0.5 })],
	})),
	tmpl("tpl-slideshow-005", "Travel Slideshow", "Travel photo slideshow", "Slideshow", 12, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Location")],
		textElements: [tx("tx-1", "text", "PARIS", 1, 2.5, 36, "#ffffff", 800, "left", 80), tx("tx-2", "text", "TOKYO", 4, 2.5, 36, "#ffffff", 800, "left", 80), tx("tx-3", "text", "NEW YORK", 7, 2.5, 36, "#ffffff", 800, "left", 80), tx("tx-4", "text", "BALI", 10, 2, 36, "#ffffff", 800, "left", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#1e3a8a"), gr("bg-2", "video", "rect", 3, 3, 0, 0, 100, 100, "#7c2d12"), gr("bg-3", "video", "rect", 6, 3, 0, 0, 100, 100, "#374151"), gr("bg-4", "video", "rect", 9, 3, 0, 0, 100, 100, "#065f46")],
		effects: [],
	})),
	tmpl("tpl-slideshow-006", "Birthday Slideshow", "Birthday celebration slideshow", "Slideshow", 12, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Title"), tr("graphic", "graphic", "Confetti")],
		textElements: [tx("tx-1", "text", "Happy Birthday!", 1, 10, 48, "#fbbf24", 800, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 12, 0, 0, 100, 100, "#ec4899"), gr("conf-1", "graphic", "circle", 0, 12, 10, 10, 5, 5, "#facc15"), gr("conf-2", "graphic", "circle", 0, 12, 80, 20, 5, 5, "#22d3ee")],
		effects: [fx("fx-particles-confetti", { count: 100, speed: 6 })],
	})),
	tmpl("tpl-slideshow-007", "Memorial Slideshow", "Memorial slideshow", "Slideshow", 20, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Tribute")],
		textElements: [tx("tx-1", "text", "In Loving Memory", 1, 18, 36, "#ffffff", 500, "center", 85)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1f2937"), gr("bg-2", "video", "rect", 5, 5, 0, 0, 100, 100, "#374151"), gr("bg-3", "video", "rect", 10, 5, 0, 0, 100, 100, "#4b5563"), gr("bg-4", "video", "rect", 15, 5, 0, 0, 100, 100, "#6b7280")],
		effects: [fx("fx-retro-sepia", { amount: 0.4 })],
	})),
	tmpl("tpl-slideshow-008", "Product Slideshow", "Product showcase", "Slideshow", 12, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Product")],
		textElements: [tx("tx-1", "text", "PRODUCT NAME", 1, 2.5, 32, "#1f2937", 700, "left", 80), tx("tx-2", "text", "$99.99", 1, 2.5, 24, "#dc2626", 700, "left", 90)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#f3f4f6"), gr("bg-2", "video", "rect", 4, 4, 0, 0, 100, 100, "#e5e7eb"), gr("bg-3", "video", "rect", 8, 4, 0, 0, 100, 100, "#d1d5db")],
		effects: [],
	})),
	tmpl("tpl-slideshow-009", "Year in Review", "Annual recap slideshow", "Slideshow", 30, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Months")],
		textElements: [tx("tx-1", "text", "JANUARY", 1, 2, 36, "#ffffff", 700, "left", 85), tx("tx-2", "text", "FEBRUARY", 3.5, 2, 36, "#ffffff", 700, "left", 85), tx("tx-3", "text", "MARCH", 6, 2, 36, "#ffffff", 700, "left", 85), tx("tx-4", "text", "DECEMBER", 27.5, 2, 36, "#ffffff", 700, "left", 85)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 2.5, 0, 0, 100, 100, "#1e3a8a"), gr("bg-2", "video", "rect", 2.5, 2.5, 0, 0, 100, 100, "#1e40af"), gr("bg-3", "video", "rect", 5, 2.5, 0, 0, 100, 100, "#1d4ed8")],
		effects: [],
	})),
	tmpl("tpl-slideshow-010", "Testimonial Slideshow", "Customer testimonial slideshow", "Slideshow", 18, () => ({
		tracks: [tr("video", "video", "Images"), tr("text", "text", "Quote")],
		textElements: [tx("tx-1", "text", "Great product!", 1, 5, 28, "#ffffff", 500, "center", 70), tx("tx-1a", "text", "— Customer A", 4, 2, 18, "#9ca3af", 400, "center", 80), tx("tx-2", "text", "Loved it.", 7, 5, 28, "#ffffff", 500, "center", 70), tx("tx-2a", "text", "— Customer B", 10, 2, 18, "#9ca3af", 400, "center", 80), tx("tx-3", "text", "Will buy again.", 13, 4, 28, "#ffffff", 500, "center", 70), tx("tx-3a", "text", "— Customer C", 15, 2, 18, "#9ca3af", 400, "center", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 18, 0, 0, 100, 100, "#111827")],
		effects: [],
	})),
	// ── Promo (10)
	tmpl("tpl-promo-001", "Product Promo", "Standard product promo", "Promo", 15, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "INTRODUCING", 0.5, 4, 24, "#fbbf24", 600, "center", 35), tx("tx-2", "text", "PRODUCT X", 2, 4, 64, "#ffffff", 900, "center", 55), tx("tx-3", "text", "Available now", 10, 4, 24, "#ffffff", 500, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#0f172a"), gr("bg-2", "video", "rect", 6, 9, 0, 0, 100, 100, "#1e293b")],
		effects: [fx("fx-cine-pop", { intensity: 0.7 })],
	})),
	tmpl("tpl-promo-002", "Sale Promo", "Flash sale announcement", "Promo", 6, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Sale")],
		textElements: [tx("tx-1", "text", "FLASH SALE", 0.3, 5, 48, "#ffffff", 900, "center", 35), tx("tx-2", "text", "50% OFF", 1.5, 4, 96, "#fbbf24", 900, "center", 60), tx("tx-3", "text", "Today only!", 4, 1.5, 24, "#ffffff", 600, "center", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#dc2626")],
		effects: [fx("fx-glow-warm", { intensity: 0.8 })],
	})),
	tmpl("tpl-promo-003", "App Promo", "Mobile app promo", "Promo", 12, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "Meet the app", 1, 5, 48, "#ffffff", 800, "left", 35), tx("tx-2", "text", "that does it all", 3, 5, 36, "#22d3ee", 600, "left", 50), tx("tx-3", "text", "Download now", 8, 3, 28, "#ffffff", 600, "left", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 12, 0, 0, 100, 100, "#1e1b4b")],
		effects: [fx("fx-glow-electric", { intensity: 0.6 })],
	})),
	tmpl("tpl-promo-004", "Event Promo", "Event promo spot", "Promo", 15, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Event")],
		textElements: [tx("tx-1", "text", "THE EVENT", 1, 6, 48, "#ffffff", 800, "center", 30), tx("tx-2", "text", "DATE: JUNE 20", 3, 6, 32, "#fbbf24", 700, "center", 50), tx("tx-3", "text", "VENUE: TBD", 5, 6, 32, "#fbbf24", 700, "center", 60), tx("tx-4", "text", "TICKETS ON SALE", 9, 5, 36, "#ffffff", 700, "center", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#831843")],
		effects: [fx("fx-particles-sparkle", { count: 60, speed: 3 })],
	})),
	tmpl("tpl-promo-005", "Restaurant Promo", "Food promo", "Promo", 10, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "Taste the difference", 0.5, 4, 36, "#fbbf24", 700, "left", 40), tx("tx-2", "text", "Open daily 11am-11pm", 5, 4, 24, "#ffffff", 500, "left", 50), tx("tx-3", "text", "123 Main St", 7, 2, 20, "#fbbf24", 500, "left", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 10, 0, 0, 100, 100, "#1c1917")],
		effects: [fx("fx-cine-grade-warm", { intensity: 0.5 })],
	})),
	tmpl("tpl-promo-006", "Fitness Promo", "Gym/fitness promo", "Promo", 12, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "NO EXCUSES", 0.5, 5, 64, "#ffffff", 900, "center", 40), tx("tx-2", "text", "Just results", 3, 4, 36, "#fbbf24", 700, "center", 55), tx("tx-3", "text", "Join today", 8, 3, 28, "#ffffff", 600, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 12, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-glow-fiery", { intensity: 0.7 })],
	})),
	tmpl("tpl-promo-007", "Fashion Promo", "Fashion brand promo", "Promo", 10, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "ELEGANCE", 1, 4, 64, "#1f2937", 300, "left", 50), tx("tx-2", "text", "SS26 COLLECTION", 4, 4, 24, "#1f2937", 500, "left", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 10, 0, 0, 100, 100, "#fef3c7")],
		effects: [],
	})),
	tmpl("tpl-promo-008", "Tech Promo", "Tech product promo", "Promo", 15, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "BUILT FOR SPEED", 0.5, 5, 48, "#22d3ee", 800, "center", 40), tx("tx-2", "text", "Powered by AI", 3, 5, 32, "#ffffff", 600, "center", 55), tx("tx-3", "text", "Starting at $999", 9, 4, 28, "#fbbf24", 700, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-electric", { intensity: 0.8 })],
	})),
	tmpl("tpl-promo-009", "Real Estate Promo", "Real estate listing", "Promo", 20, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Listing")],
		textElements: [tx("tx-1", "text", "FOR SALE", 0.5, 6, 36, "#fbbf24", 700, "left", 35), tx("tx-2", "text", "Modern Home", 2, 6, 48, "#ffffff", 700, "left", 50), tx("tx-3", "text", "$1.2M", 4, 5, 32, "#22c55e", 700, "left", 65), tx("tx-4", "text", "Contact agent", 14, 4, 24, "#ffffff", 500, "left", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 20, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-promo-010", "Course Promo", "Online course promo", "Promo", 20, () => ({
		tracks: [tr("video", "video", "Footage"), tr("text", "text", "Course")],
		textElements: [tx("tx-1", "text", "LEARN SOMETHING NEW", 0.5, 6, 36, "#22d3ee", 700, "center", 30), tx("tx-2", "text", "Course Title", 2, 6, 56, "#ffffff", 800, "center", 50), tx("tx-3", "text", "Enroll today", 14, 4, 32, "#fbbf24", 700, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 20, 0, 0, 100, 100, "#1e1b4b")],
		effects: [fx("fx-glow-electric", { intensity: 0.5 })],
	})),

	// ── Social (10)
	tmpl("tpl-social-001", "Instagram Story", "Vertical IG story format", "Social", 15, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "Swipe up!", 11, 3, 36, "#ffffff", 700, "center", 80), tx("tx-2", "text", "Hello world", 1, 5, 32, "#ffffff", 600, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#ec4899")],
		effects: [],
	})),
	tmpl("tpl-social-002", "TikTok Vertical", "Vertical TikTok format", "Social", 15, () => ({
		tracks: [tr("video", "video", "Video"), tr("text", "text", "Text")],
		textElements: [tx("tx-1", "text", "POV:", 0.5, 3, 28, "#ffffff", 700, "left", 20), tx("tx-2", "text", "When you finally make it work", 0.5, 5, 24, "#ffffff", 600, "left", 30), tx("tx-3", "text", "#fyp", 10, 3, 20, "#22d3ee", 700, "left", 85)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#000000")],
		effects: [],
	})),
	tmpl("tpl-social-003", "Twitter Quote", "Quote card for Twitter", "Social", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Quote")],
		textElements: [tx("tx-1", "text", "This is a quote.", 0.5, 4, 32, "#ffffff", 600, "center", 45), tx("tx-2", "text", "— @username", 3, 1.5, 20, "#9ca3af", 400, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1d4ed8")],
		effects: [],
	})),
	tmpl("tpl-social-004", "YouTube Thumbnail", "YT thumbnail text", "Social", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "YOU WON'T", 0.2, 1.4, 60, "#ffffff", 900, "left", 25), tx("tx-2", "text", "BELIEVE THIS!", 0.2, 1.4, 60, "#fbbf24", 900, "left", 45)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#dc2626"), gr("shape-1", "video", "circle", 0, 3, 70, 30, 25, 25, "#fbbf24")],
		effects: [],
	})),
	tmpl("tpl-social-005", "LinkedIn Post", "Professional post", "Social", 10, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "We're hiring!", 1, 8, 48, "#0a66c2", 700, "left", 45), tx("tx-2", "text", "Apply at link.bio", 4, 5, 28, "#1f2937", 500, "left", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 10, 0, 0, 100, 100, "#ffffff")],
		effects: [],
	})),
	tmpl("tpl-social-006", "Pinterest Pin", "Vertical Pinterest pin", "Social", 15, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "5 Tips", 1, 6, 64, "#ffffff", 900, "center", 35), tx("tx-2", "text", "for better photos", 3, 6, 36, "#ffffff", 600, "center", 50), tx("tx-3", "text", "yourblog.com", 10, 4, 24, "#fbbf24", 500, "center", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#dc2626")],
		effects: [],
	})),
	tmpl("tpl-social-007", "Facebook Cover", "Wide cover video", "Social", 8, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Brand Name", 1, 6, 48, "#ffffff", 800, "center", 50), tx("tx-2", "text", "Tagline here", 4, 3, 24, "#fbbf24", 500, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#1877f2")],
		effects: [],
	})),
	tmpl("tpl-social-008", "Reddit Post", "Reddit video post", "Social", 12, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "TIL:", 0.5, 4, 36, "#ff4500", 700, "left", 35), tx("tx-2", "text", "An interesting fact", 2, 4, 32, "#ffffff", 600, "left", 50), tx("tx-3", "text", "r/todayilearned", 9, 2, 20, "#9ca3af", 500, "left", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 12, 0, 0, 100, 100, "#1a1a1b")],
		effects: [],
	})),
	tmpl("tpl-social-009", "Snapchat Geofilter", "Geo-filter style", "Social", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "CITY NAME", 0.5, 4, 32, "#ffffff", 700, "center", 50), tx("tx-2", "text", "EST. 1850", 2.5, 2, 18, "#fbbf24", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1e40af")],
		effects: [],
	})),
	tmpl("tpl-social-010", "Discord Banner", "Discord server banner", "Social", 10, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "SERVER NAME", 1, 8, 48, "#ffffff", 900, "center", 45), tx("tx-2", "text", "Welcome!", 5, 4, 32, "#5865f2", 700, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 10, 0, 0, 100, 100, "#1e1b4b")],
		effects: [],
	})),

	// ── Story (10)
	tmpl("tpl-story-001", "Story Intro", "Story opening card", "Story", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Once upon a time", 0.5, 3, 36, "#ffffff", 600, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1e3a8a")],
		effects: [fx("fx-particles-stars", { count: 80, speed: 2 })],
	})),
	tmpl("tpl-story-002", "Story Chapter", "Chapter divider", "Story", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Chapter 1", 0.3, 2.4, 48, "#fbbf24", 700, "center", 45), tx("tx-2", "text", "The Beginning", 0.8, 1.9, 24, "#ffffff", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#000000")],
		effects: [],
	})),
	tmpl("tpl-story-003", "Story Quote", "Quote overlay", "Story", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Quote")],
		textElements: [tx("tx-1", "text", "Words to remember.", 0.5, 4, 28, "#ffffff", 500, "center", 50), tx("tx-2", "text", "— Narrator", 4, 1, 16, "#9ca3af", 400, "center", 62)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-story-004", "Story Flashback", "Flashback effect", "Story", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Earlier...", 0.3, 3.4, 36, "#fbbf24", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#451a03")],
		effects: [fx("fx-color-sepia", { amount: 0.7 })],
	})),
	tmpl("tpl-story-005", "Story Time Skip", "Time skip indicator", "Story", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Three years later...", 0.5, 2, 32, "#ffffff", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#1e293b")],
		effects: [],
	})),
	tmpl("tpl-story-006", "Story Climax", "Climax beat", "Story", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "...", 0.3, 2.4, 96, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#dc2626")],
		effects: [fx("fx-light-flash", { intensity: 0.7 })],
	})),
	tmpl("tpl-story-007", "Story Resolution", "Resolution card", "Story", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "And so...", 0.5, 3, 32, "#fbbf24", 600, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#065f46")],
		effects: [],
	})),
	tmpl("tpl-story-008", "Story End", "The End card", "Story", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "THE END", 0.5, 3, 72, "#ffffff", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-cine-letterbox", { barHeight: 15 })],
	})),
	tmpl("tpl-story-009", "Story Twist", "Plot twist indicator", "Story", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Wait...", 0.5, 2, 48, "#fbbf24", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#7c2d12")],
		effects: [fx("fx-style-posterize", { levels: 4 })],
	})),
	tmpl("tpl-story-010", "Story Credits", "Story credits", "Story", 8, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Credits")],
		textElements: [tx("tx-1", "text", "Written by", 0.5, 2, 18, "#9ca3af", 400, "center", 35), tx("tx-2", "text", "Author Name", 1, 2, 24, "#ffffff", 600, "center", 45), tx("tx-3", "text", "Produced by", 4, 2, 18, "#9ca3af", 400, "center", 55), tx("tx-4", "text", "Producer Name", 4.5, 3, 24, "#ffffff", 600, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#000000")],
		effects: [],
	})),

	// ── Wedding (10)
	tmpl("tpl-wedding-001", "Save the Date", "Save the date card", "Wedding", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Info")],
		textElements: [tx("tx-1", "text", "Save the Date", 0.5, 4, 32, "#9ca3af", 500, "center", 35), tx("tx-2", "text", "Jane & John", 1, 3, 56, "#1f2937", 700, "center", 55), tx("tx-3", "text", "June 20, 2026", 3.5, 1.2, 20, "#1f2937", 500, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#fef3c7")],
		effects: [],
	})),
	tmpl("tpl-wedding-002", "Engagement", "Engagement announcement", "Wedding", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "We're Engaged!", 0.5, 5, 48, "#fbbf24", 700, "center", 50), tx("tx-2", "text", "<<3", 3, 2, 64, "#f9a8d4", 700, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#fdf2f8")],
		effects: [fx("fx-glow-warm", { intensity: 0.4 })],
	})),
	tmpl("tpl-wedding-003", "Wedding Day", "Wedding day title", "Wedding", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "The Wedding of", 0.5, 4, 28, "#fbbf24", 500, "center", 40), tx("tx-2", "text", "Jane & John", 1.5, 3, 56, "#1f2937", 700, "center", 55), tx("tx-3", "text", "June 20, 2026", 3.5, 1, 20, "#9ca3af", 400, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#fffbeb")],
		effects: [],
	})),
	tmpl("tpl-wedding-004", "Bridal Party", "Bridal party intro", "Wedding", 12, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Names")],
		textElements: [tx("tx-1", "text", "Maid of Honor", 0.5, 3, 24, "#fbbf24", 600, "center", 40), tx("tx-2", "text", "Sarah Smith", 1, 3, 36, "#1f2937", 700, "center", 50), tx("tx-3", "text", "Best Man", 4, 3, 24, "#fbbf24", 600, "center", 40), tx("tx-4", "text", "Mike Johnson", 4.5, 3, 36, "#1f2937", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 12, 0, 0, 100, 100, "#fef3c7")],
		effects: [],
	})),
	tmpl("tpl-wedding-005", "Reception", "Reception info", "Wedding", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Info")],
		textElements: [tx("tx-1", "text", "Reception", 0.5, 4, 36, "#fbbf24", 700, "center", 40), tx("tx-2", "text", "The Grand Hall", 1.5, 2, 28, "#1f2937", 600, "center", 55), tx("tx-3", "text", "6:00 PM", 3, 1.5, 24, "#9ca3af", 500, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#fffbeb")],
		effects: [],
	})),
	tmpl("tpl-wedding-006", "Thank You", "Thank you card", "Wedding", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "Thank You", 0.5, 4, 48, "#fbbf24", 700, "center", 40), tx("tx-2", "text", "For celebrating with us", 2, 2.5, 20, "#1f2937", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#fef3c7")],
		effects: [],
	})),
	tmpl("tpl-wedding-007", "Honeymoon", "Honeymoon announcement", "Wedding", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "Honeymoon in Hawaii", 0.5, 5, 36, "#fbbf24", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#06b6d4")],
		effects: [fx("fx-particles-sparkle", { count: 50, speed: 3 })],
	})),
	tmpl("tpl-wedding-008", "Love Story", "Love story intro", "Wedding", 12, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Story")],
		textElements: [tx("tx-1", "text", "How We Met", 0.5, 5, 32, "#fbbf24", 700, "center", 30), tx("tx-2", "text", "In a coffee shop, 2018...", 2, 9, 24, "#1f2937", 500, "center", 55)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 12, 0, 0, 100, 100, "#fef3c7")],
		effects: [fx("fx-color-sepia", { amount: 0.4 })],
	})),
	tmpl("tpl-wedding-009", "Ceremony", "Ceremony opening", "Wedding", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "Ceremony", 0.5, 4, 48, "#fbbf24", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#fffbeb")],
		effects: [fx("fx-glow-warm", { intensity: 0.5 })],
	})),
	tmpl("tpl-wedding-010", "Wedding Memories", "Memories slideshow intro", "Wedding", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Our Memories", 0.5, 3, 36, "#fbbf24", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#fdf2f8")],
		effects: [fx("fx-glow-warm", { intensity: 0.4 })],
	})),

	// ── Travel (10)
	tmpl("tpl-travel-001", "Destination Intro", "Destination title", "Travel", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "Welcome to", 0.5, 4, 28, "#9ca3af", 500, "center", 40), tx("tx-2", "text", "PARIS", 1.5, 3, 64, "#fbbf24", 900, "center", 55)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1e3a8a")],
		effects: [],
	})),
	tmpl("tpl-travel-002", "Itinerary Day", "Day-by-day card", "Travel", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Info")],
		textElements: [tx("tx-1", "text", "Day 1", 0.5, 4, 36, "#fbbf24", 700, "left", 35), tx("tx-2", "text", "Eiffel Tower", 1.5, 3, 48, "#ffffff", 700, "left", 50), tx("tx-3", "text", "9:00 AM", 3, 2, 24, "#9ca3af", 500, "left", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-travel-003", "Travel Tips", "Travel tip card", "Travel", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Tip")],
		textElements: [tx("tx-1", "text", "TIP #1", 0.5, 4, 24, "#fbbf24", 600, "left", 35), tx("tx-2", "text", "Pack light!", 1.2, 3, 48, "#ffffff", 800, "left", 55), tx("tx-3", "text", "You'll thank yourself later.", 3, 2, 20, "#9ca3af", 500, "left", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-travel-004", "Travel Map", "Map animation card", "Travel", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Route")],
		textElements: [tx("tx-1", "text", "NYC -> LAX", 0.5, 5, 36, "#ffffff", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#1e3a8a"), gr("route-1", "video", "rect", 1, 4, 10, 48, 80, 4, "#fbbf24")],
		effects: [fx("fx-glow-warm", { intensity: 0.5 })],
	})),
	tmpl("tpl-travel-005", "Travel Memory", "Travel memory card", "Travel", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Copy")],
		textElements: [tx("tx-1", "text", "Best Moment", 0.5, 4, 32, "#fbbf24", 700, "center", 40), tx("tx-2", "text", "Sunset in Santorini", 1.5, 3, 36, "#ffffff", 600, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1c1917")],
		effects: [fx("fx-cine-grade-warm", { intensity: 0.6 })],
	})),
	tmpl("tpl-travel-006", "Travel Countdown", "Top 10 countdown", "Travel", 12, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "List")],
		textElements: [tx("tx-1", "text", "#10 Kyoto", 0.5, 1, 24, "#fbbf24", 700, "left", 45), tx("tx-2", "text", "#9 Patagonia", 1.5, 1, 24, "#fbbf24", 700, "left", 45), tx("tx-3", "text", "#8 Iceland", 2.5, 1, 24, "#fbbf24", 700, "left", 45), tx("tx-4", "text", "#1 Bali", 10, 1.5, 32, "#22c55e", 800, "left", 45)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 12, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-travel-007", "Travel Quote", "Travel quote overlay", "Travel", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Quote")],
		textElements: [tx("tx-1", "text", "Travel is the only thing you buy that makes you richer.", 0.5, 4, 28, "#ffffff", 500, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0e7490")],
		effects: [fx("fx-blur-soft", { radius: 2 })],
	})),
	tmpl("tpl-travel-008", "Travel Highlight", "Travel highlight reel", "Travel", 15, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "HIGHLIGHTS", 0.5, 14, 48, "#ffffff", 800, "center", 50), tx("tx-2", "text", "Trip 2026", 4, 10, 24, "#fbbf24", 500, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 15, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-zoom-ken-burns", { strength: 1.1 })],
	})),
	tmpl("tpl-travel-009", "Travel Stats", "Travel statistics", "Travel", 8, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Stats")],
		textElements: [tx("tx-1", "text", "12", 0.5, 3, 96, "#22c55e", 900, "center", 35), tx("tx-2", "text", "countries visited", 0.5, 3, 24, "#ffffff", 500, "center", 55), tx("tx-3", "text", "5,000", 4, 3, 96, "#22d3ee", 900, "center", 35), tx("tx-4", "text", "photos taken", 4, 3, 24, "#ffffff", 500, "center", 55)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-travel-010", "Travel Vlog Intro", "Travel vlog opening", "Travel", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "TRAVEL DIARY", 0.5, 3, 36, "#fbbf24", 800, "center", 50), tx("tx-2", "text", "Day in Tokyo", 1.5, 2, 24, "#ffffff", 500, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1c1917")],
		effects: [fx("fx-cine-grade-warm", { intensity: 0.4 })],
	})),

	// ── Sports (10)
	tmpl("tpl-sports-001", "Match Intro", "Sports match intro", "Sports", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Teams")],
		textElements: [tx("tx-1", "text", "HOME", 0.5, 5, 36, "#ffffff", 800, "left", 30), tx("tx-2", "text", "VS", 0.5, 5, 64, "#fbbf24", 900, "center", 50), tx("tx-3", "text", "AWAY", 0.5, 5, 36, "#ffffff", 800, "right", 30)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#1e3a8a")],
		effects: [],
	})),
	tmpl("tpl-sports-002", "Score Card", "Live score card", "Sports", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Score")],
		textElements: [tx("tx-1", "text", "HOME", 0.5, 4, 24, "#ffffff", 600, "left", 40), tx("tx-2", "text", "AWAY", 0.5, 4, 24, "#ffffff", 600, "right", 40), tx("tx-3", "text", "3", 0.5, 4, 72, "#22c55e", 900, "left", 55), tx("tx-4", "text", "1", 0.5, 4, 72, "#ef4444", 900, "right", 55)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#000000"), gr("bar-1", "video", "rect", 0.5, 4, 0, 35, 100, 35, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-sports-003", "Player Intro", "Player introduction", "Sports", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Player")],
		textElements: [tx("tx-1", "text", "10", 0.5, 3, 96, "#fbbf24", 900, "center", 35), tx("tx-2", "text", "PLAYER NAME", 0.5, 3, 32, "#ffffff", 800, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-sports-004", "Goal Replay", "Goal replay intro", "Sports", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Replay")],
		textElements: [tx("tx-1", "text", "GOAL!", 0.5, 2, 96, "#22c55e", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-light-flash", { intensity: 0.9 })],
	})),
	tmpl("tpl-sports-005", "Halftime Stats", "Halftime statistics", "Sports", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Stats")],
		textElements: [tx("tx-1", "text", "HALFTIME", 0.5, 4, 36, "#fbbf24", 700, "center", 35), tx("tx-2", "text", "Possession 60-40", 1.5, 3, 24, "#ffffff", 500, "center", 60), tx("tx-3", "text", "Shots 8-3", 3, 1.5, 24, "#ffffff", 500, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1e3a8a")],
		effects: [],
	})),
	tmpl("tpl-sports-006", "Final Whistle", "Match end", "Sports", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Final")],
		textElements: [tx("tx-1", "text", "FULL TIME", 0.5, 3, 36, "#fbbf24", 800, "center", 45), tx("tx-2", "text", "3 - 1", 0.5, 3, 80, "#22c55e", 900, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-sports-007", "Training Day", "Training montage", "Sports", 10, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "TRAINING DAY", 0.5, 9, 48, "#fbbf24", 800, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 10, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-style-posterize", { levels: 6 })],
	})),
	tmpl("tpl-sports-008", "Team Huddle", "Team huddle intro", "Sports", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "HUDDLE", 0.5, 3, 48, "#fbbf24", 800, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [],
	})),
	tmpl("tpl-sports-009", "MVP Award", "MVP award card", "Sports", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Award")],
		textElements: [tx("tx-1", "text", "MVP", 0.5, 4, 80, "#fbbf24", 900, "center", 35), tx("tx-2", "text", "Player Name", 2, 2.5, 28, "#ffffff", 600, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#fbbf24"), gr("bg-2", "video", "rect", 0, 5, 0, 0, 100, 100, "rgba(0,0,0,.5)")],
		effects: [fx("fx-glow-warm", { intensity: 0.7 })],
	})),
	tmpl("tpl-sports-010", "Season Recap", "Season highlight reel", "Sports", 20, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "SEASON RECAP", 0.5, 19, 48, "#fbbf24", 800, "center", 45), tx("tx-2", "text", "2025-2026", 4, 15, 28, "#ffffff", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 20, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-style-posterize", { levels: 6 })],
	})),

	// ── Music (10)
	tmpl("tpl-music-001", "Album Cover", "Album cover animation", "Music", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title"), tr("graphic", "graphic", "Cover")],
		textElements: [tx("tx-1", "text", "ALBUM TITLE", 0.5, 4, 36, "#ffffff", 800, "left", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a"), gr("cover-1", "graphic", "rect", 0.5, 4, 5, 30, 40, 40, "#ec4899")],
		effects: [fx("fx-glow-neon", { intensity: 0.6 })],
	})),
	tmpl("tpl-music-002", "Lyric Video", "Lyric video card", "Music", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Lyrics")],
		textElements: [tx("tx-1", "text", "First line of song", 0.5, 2.5, 36, "#ffffff", 700, "center", 45), tx("tx-2", "text", "Second line", 3, 2.5, 36, "#ffffff", 700, "center", 55)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-particles-sparkle", { count: 40, speed: 2 })],
	})),
	tmpl("tpl-music-003", "Concert Intro", "Concert intro", "Music", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "LIVE IN CONCERT", 0.5, 4, 32, "#ffffff", 700, "center", 45), tx("tx-2", "text", "ARTIST NAME", 1.5, 3, 48, "#fbbf24", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1c1917")],
		effects: [fx("fx-particles-sparkle", { count: 80, speed: 4 })],
	})),
	tmpl("tpl-music-004", "Music Video Card", "Music video intro", "Music", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "MUSIC VIDEO", 0.5, 3, 32, "#9ca3af", 600, "center", 40), tx("tx-2", "text", "Song Title", 1, 3, 56, "#ffffff", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-neon", { intensity: 0.5 })],
	})),
	tmpl("tpl-music-005", "Tracklist", "Tracklist card", "Music", 8, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Tracklist")],
		textElements: [tx("tx-1", "text", "1. First Track", 0.5, 1.5, 24, "#ffffff", 500, "left", 25), tx("tx-2", "text", "2. Second Track", 2, 1.5, 24, "#ffffff", 500, "left", 30), tx("tx-3", "text", "3. Third Track", 3.5, 1.5, 24, "#ffffff", 500, "left", 35), tx("tx-4", "text", "4. Fourth Track", 5, 1.5, 24, "#fbbf24", 600, "left", 40), tx("tx-5", "text", "5. Fifth Track", 6.5, 1.5, 24, "#ffffff", 500, "left", 45)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#000000")],
		effects: [],
	})),
	tmpl("tpl-music-006", "Equalizer", "Audio equalizer animation", "Music", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("graphic", "graphic", "Bars")],
		textElements: [tx("tx-1", "text", "NOW PLAYING", 0.5, 4, 28, "#fbbf24", 600, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a"), gr("bar-1", "graphic", "rect", 0, 5, 10, 30, 5, 30, "#22d3ee"), gr("bar-2", "graphic", "rect", 0, 5, 20, 20, 5, 40, "#22d3ee"), gr("bar-3", "graphic", "rect", 0, 5, 30, 10, 5, 50, "#22d3ee")],
		effects: [fx("fx-glow-electric", { intensity: 0.7 })],
	})),
	tmpl("tpl-music-007", "Vinyl Spin", "Vinyl record spin", "Music", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("graphic", "graphic", "Vinyl")],
		textElements: [tx("tx-1", "text", "Track 03", 0.5, 3, 28, "#fbbf24", 700, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1f2937"), gr("vinyl-1", "graphic", "circle", 0, 4, 35, 20, 30, 30, "#000000"), gr("vinyl-2", "graphic", "circle", 0, 4, 45, 30, 10, 10, "#fbbf24")],
		effects: [fx("fx-rotate-spin", {})],
	})),
	tmpl("tpl-music-008", "Tour Dates", "Tour dates card", "Music", 8, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Dates")],
		textElements: [tx("tx-1", "text", "JUN 1 - NYC", 0.5, 1.5, 24, "#fbbf24", 700, "left", 25), tx("tx-2", "text", "JUN 3 - LA", 2, 1.5, 24, "#fbbf24", 700, "left", 30), tx("tx-3", "text", "JUN 5 - CHI", 3.5, 1.5, 24, "#fbbf24", 700, "left", 35), tx("tx-4", "text", "JUN 7 - MIA", 5, 1.5, 24, "#fbbf24", 700, "left", 40), tx("tx-5", "text", "ON SALE NOW", 6.5, 1.5, 32, "#22c55e", 800, "center", 70)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-music-009", "Beat Drop", "Beat drop moment", "Music", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Beat")],
		textElements: [tx("tx-1", "text", "DROP", 0.5, 2, 96, "#ef4444", 900, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-light-flash-white", { intensity: 0.9 })],
	})),
	tmpl("tpl-music-010", "Music Stream", "Live music stream intro", "Music", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Live")],
		textElements: [tx("tx-1", "text", "LIVE NOW", 0.5, 4, 32, "#ef4444", 700, "center", 40), tx("tx-2", "text", "Artist Name", 1.5, 3, 36, "#ffffff", 700, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a"), gr("dot-1", "graphic", "circle", 0, 5, 5, 25, 4, 4, "#ef4444")],
		effects: [],
	})),

	// ── Business (10)
	tmpl("tpl-business-001", "Corporate Intro", "Corporate intro", "Business", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "COMPANY", 0.5, 4, 28, "#9ca3af", 500, "center", 40), tx("tx-2", "text", "Brand Name", 1.5, 3, 56, "#1e40af", 700, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#f3f4f6")],
		effects: [],
	})),
	tmpl("tpl-business-002", "Pitch Deck", "Startup pitch deck", "Business", 30, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Slides")],
		textElements: [tx("tx-1", "text", "Problem", 0.5, 5, 36, "#1f2937", 700, "left", 50), tx("tx-2", "text", "Solution", 6, 5, 36, "#1e40af", 700, "left", 50), tx("tx-3", "text", "Market", 12, 5, 36, "#1f2937", 700, "left", 50), tx("tx-4", "text", "Traction", 18, 5, 36, "#1f2937", 700, "left", 50), tx("tx-5", "text", "Ask", 24, 5, 36, "#22c55e", 700, "left", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 30, 0, 0, 100, 100, "#ffffff")],
		effects: [],
	})),
	tmpl("tpl-business-003", "Quarterly Report", "Quarterly report intro", "Business", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Report")],
		textElements: [tx("tx-1", "text", "Q1 2026", 0.5, 4, 36, "#9ca3af", 500, "center", 40), tx("tx-2", "text", "Quarterly Report", 1, 3, 56, "#1e40af", 700, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#f9fafb")],
		effects: [],
	})),
	tmpl("tpl-business-004", "Investor Pitch", "Investor pitch slide", "Business", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Pitch")],
		textElements: [tx("tx-1", "text", "ASK", 0.5, 5, 28, "#9ca3af", 500, "center", 35), tx("tx-2", "text", "$2M Seed", 1.5, 4, 64, "#22c55e", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-business-005", "Team Intro", "Team intro", "Business", 8, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Team")],
		textElements: [tx("tx-1", "text", "MEET THE TEAM", 0.5, 7, 36, "#1e40af", 700, "center", 30), tx("tx-2", "text", "12 passionate builders", 2, 5, 20, "#6b7280", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 8, 0, 0, 100, 100, "#ffffff")],
		effects: [],
	})),
	tmpl("tpl-business-006", "Case Study", "Case study intro", "Business", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Study")],
		textElements: [tx("tx-1", "text", "CASE STUDY", 0.5, 4, 24, "#9ca3af", 500, "center", 35), tx("tx-2", "text", "Customer Name", 1, 3, 48, "#1e40af", 700, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#f9fafb")],
		effects: [],
	})),
	tmpl("tpl-business-007", "Product Demo", "Product demo intro", "Business", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Demo")],
		textElements: [tx("tx-1", "text", "PRODUCT DEMO", 0.5, 4, 28, "#9ca3af", 500, "center", 40), tx("tx-2", "text", "Watch how it works", 1.5, 3, 36, "#1e40af", 700, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-electric", { intensity: 0.5 })],
	})),
	tmpl("tpl-business-008", "Testimonial Card", "Customer testimonial", "Business", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Quote")],
		textElements: [tx("tx-1", "text", "Increased our revenue by 200%", 0.5, 4, 32, "#1e40af", 700, "center", 45), tx("tx-2", "text", "— CEO, Customer Co.", 3, 1.5, 20, "#6b7280", 500, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#f9fafb")],
		effects: [],
	})),
	tmpl("tpl-business-009", "Hiring Ad", "Hiring announcement", "Business", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Job")],
		textElements: [tx("tx-1", "text", "WE'RE HIRING", 0.5, 5, 36, "#22c55e", 700, "center", 35), tx("tx-2", "text", "Senior Engineer", 1.5, 4, 40, "#1f2937", 700, "center", 55), tx("tx-3", "text", "Apply: jobs.co", 4, 1.5, 24, "#1e40af", 600, "center", 75)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#ffffff")],
		effects: [],
	})),
	tmpl("tpl-business-010", "Annual Report", "Annual report intro", "Business", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Report")],
		textElements: [tx("tx-1", "text", "ANNUAL REPORT", 0.5, 4, 28, "#9ca3af", 500, "center", 40), tx("tx-2", "text", "2025", 1.5, 3, 80, "#1e40af", 900, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#f9fafb")],
		effects: [],
	})),

	// ── Tutorial (10)
	tmpl("tpl-tutorial-001", "Tutorial Intro", "Tutorial intro", "Tutorial", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Title")],
		textElements: [tx("tx-1", "text", "HOW TO", 0.5, 3, 24, "#22d3ee", 600, "center", 35), tx("tx-2", "text", "Tutorial Title", 1, 3, 48, "#ffffff", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-electric", { intensity: 0.5 })],
	})),
	tmpl("tpl-tutorial-002", "Step Indicator", "Step 1 of 5", "Tutorial", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Step")],
		textElements: [tx("tx-1", "text", "STEP 1 OF 5", 0.5, 3, 28, "#fbbf24", 600, "center", 45), tx("tx-2", "text", "Setup", 0.5, 3, 48, "#ffffff", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-tutorial-003", "Code Tutorial", "Code tutorial intro", "Tutorial", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Code")],
		textElements: [tx("tx-1", "text", "function hello() {", 0.5, 4, 32, "#22d3ee", 500, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-electric", { intensity: 0.5 })],
	})),
	tmpl("tpl-tutorial-004", "Tip Card", "Pro tip card", "Tutorial", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Tip")],
		textElements: [tx("tx-1", "text", "PRO TIP", 0.5, 3, 24, "#fbbf24", 600, "center", 40), tx("tx-2", "text", "Helpful advice here", 1, 3, 28, "#ffffff", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1f2937")],
		effects: [fx("fx-glow-warm", { intensity: 0.4 })],
	})),
	tmpl("tpl-tutorial-005", "Warning Card", "Common mistake", "Tutorial", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Warning")],
		textElements: [tx("tx-1", "text", "WARNING", 0.5, 3, 28, "#ef4444", 700, "center", 40), tx("tx-2", "text", "Don't do this!", 1, 3, 32, "#ffffff", 600, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-glow-fiery", { intensity: 0.5 })],
	})),
	tmpl("tpl-tutorial-006", "Checklist", "Checklist overlay", "Tutorial", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "List")],
		textElements: [tx("tx-1", "text", "1. First step", 0.5, 1.5, 24, "#22c55e", 600, "left", 30), tx("tx-2", "text", "2. Second step", 2, 1.5, 24, "#22c55e", 600, "left", 40), tx("tx-3", "text", "3. Third step", 3.5, 1.5, 24, "#22c55e", 600, "left", 50), tx("tx-4", "text", "4. Fourth step", 5, 1, 24, "#9ca3af", 500, "left", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-tutorial-007", "Summary Card", "Recap card", "Tutorial", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Summary")],
		textElements: [tx("tx-1", "text", "RECAP", 0.5, 4, 28, "#fbbf24", 600, "center", 35), tx("tx-2", "text", "Key takeaways", 1.5, 3, 36, "#ffffff", 700, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [],
	})),
	tmpl("tpl-tutorial-008", "Next Lesson", "Next lesson card", "Tutorial", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Next")],
		textElements: [tx("tx-1", "text", "NEXT LESSON", 0.5, 3, 24, "#22d3ee", 600, "center", 40), tx("tx-2", "text", "Lesson Title", 1, 3, 40, "#ffffff", 700, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1f2937")],
		effects: [],
	})),
	tmpl("tpl-tutorial-009", "Subscribe CTA", "Subscribe call to action", "Tutorial", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "CTA")],
		textElements: [tx("tx-1", "text", "ENJOYED THIS?", 0.5, 4, 24, "#fbbf24", 600, "center", 35), tx("tx-2", "text", "Subscribe for more!", 1.5, 3, 36, "#ffffff", 700, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-warm", { intensity: 0.5 })],
	})),
	tmpl("tpl-tutorial-010", "Course Complete", "Course completion", "Tutorial", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Done")],
		textElements: [tx("tx-1", "text", "COURSE COMPLETE", 0.5, 4, 32, "#22c55e", 700, "center", 35), tx("tx-2", "text", "Congratulations!", 1.5, 3, 48, "#fbbf24", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#000000"), gr("conf-1", "graphic", "circle", 1, 3, 20, 30, 5, 5, "#fbbf24"), gr("conf-2", "graphic", "circle", 1, 3, 75, 35, 5, 5, "#22d3ee")],
		effects: [fx("fx-particles-confetti", { count: 60, speed: 4 })],
	})),

	// ── Sale (10)
	tmpl("tpl-sale-001", "Flash Sale", "Flash sale announcement", "Sale", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Sale")],
		textElements: [tx("tx-1", "text", "FLASH SALE", 0.5, 4, 48, "#fbbf24", 900, "center", 35), tx("tx-2", "text", "50% OFF", 1.5, 3, 96, "#ef4444", 900, "center", 60), tx("tx-3", "text", "TODAY ONLY", 3, 1.5, 24, "#ffffff", 700, "center", 80)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#dc2626")],
		effects: [fx("fx-light-flash-white", { intensity: 0.8 })],
	})),
	tmpl("tpl-sale-002", "Coupon Code", "Coupon code reveal", "Sale", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Coupon")],
		textElements: [tx("tx-1", "text", "USE CODE", 0.5, 4, 28, "#9ca3af", 500, "center", 35), tx("tx-2", "text", "SAVE20", 1.5, 3, 80, "#fbbf24", 900, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-warm", { intensity: 0.7 })],
	})),
	tmpl("tpl-sale-003", "BOGO", "Buy one get one", "Sale", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Sale")],
		textElements: [tx("tx-1", "text", "BUY ONE", 0.5, 4, 36, "#ffffff", 800, "center", 35), tx("tx-2", "text", "GET ONE FREE", 1.5, 3, 56, "#fbbf24", 900, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1e40af")],
		effects: [],
	})),
	tmpl("tpl-sale-004", "Limited Time", "Limited time offer", "Sale", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Timer")],
		textElements: [tx("tx-1", "text", "LIMITED TIME", 0.5, 3, 28, "#9ca3af", 500, "center", 35), tx("tx-2", "text", "23:59:59", 1, 3, 56, "#ef4444", 900, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-glow-fiery", { intensity: 0.5 })],
	})),
	tmpl("tpl-sale-005", "Season Sale", "Seasonal sale", "Sale", 6, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Sale")],
		textElements: [tx("tx-1", "text", "SUMMER SALE", 0.5, 5, 36, "#fbbf24", 700, "center", 35), tx("tx-2", "text", "Up to 70% off", 1.5, 4, 48, "#ffffff", 800, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 6, 0, 0, 100, 100, "#f59e0b")],
		effects: [fx("fx-cine-grade-warm", { intensity: 0.5 })],
	})),
	tmpl("tpl-sale-006", "Free Shipping", "Free shipping banner", "Sale", 3, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Shipping")],
		textElements: [tx("tx-1", "text", "FREE SHIPPING", 0.5, 2.4, 36, "#22c55e", 700, "center", 50)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 3, 0, 0, 100, 100, "#0f172a")],
		effects: [fx("fx-glow-toxic", { intensity: 0.5 })],
	})),
	tmpl("tpl-sale-007", "Clearance", "Clearance sale", "Sale", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Sale")],
		textElements: [tx("tx-1", "text", "CLEARANCE", 0.5, 3, 48, "#ef4444", 900, "center", 35), tx("tx-2", "text", "Final reductions", 1, 3, 28, "#ffffff", 500, "center", 65)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#000000")],
		effects: [],
	})),
	tmpl("tpl-sale-008", "Bundle Deal", "Bundle offer", "Sale", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Bundle")],
		textElements: [tx("tx-1", "text", "BUNDLE & SAVE", 0.5, 4, 36, "#22c55e", 700, "center", 35), tx("tx-2", "text", "3 for $30", 1.5, 3, 56, "#fbbf24", 900, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#1f2937")],
		effects: [fx("fx-glow-toxic", { intensity: 0.5 })],
	})),
	tmpl("tpl-sale-009", "Early Bird", "Early bird special", "Sale", 4, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Sale")],
		textElements: [tx("tx-1", "text", "EARLY BIRD", 0.5, 3, 36, "#fbbf24", 700, "center", 40), tx("tx-2", "text", "First 100 only", 1, 3, 28, "#ffffff", 500, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 4, 0, 0, 100, 100, "#1e1b4b")],
		effects: [],
	})),
	tmpl("tpl-sale-010", "Sale Countdown", "Countdown to sale", "Sale", 5, () => ({
		tracks: [tr("video", "video", "BG"), tr("text", "text", "Countdown")],
		textElements: [tx("tx-1", "text", "SALE STARTS IN", 0.5, 4, 24, "#fbbf24", 600, "center", 35), tx("tx-2", "text", "03:00", 1, 3, 80, "#ef4444", 900, "center", 60)],
		graphicElements: [gr("bg-1", "video", "rect", 0, 5, 0, 0, 100, 100, "#000000")],
		effects: [fx("fx-glow-fiery", { intensity: 0.5 })],
	})),
];
