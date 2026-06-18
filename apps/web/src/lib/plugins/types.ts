/**
 * Plugin manifest format. Every plugin package (.artidor-plugin) contains
 * a `manifest.json` file conforming to this schema. The manifest declares
 * what the plugin is, what version, what category, and what extension
 * points it contributes to.
 *
 * Example manifest:
 * {
 *   "id": "com.example.glow-effect",
 *   "name": "Glow Effect",
 *   "version": "1.0.0",
 *   "description": "Adds a soft glow effect",
 *   "author": "Jane Doe",
 *   "category": "effects",
 *   "entry": "plugin.js",
 *   "permissions": ["effects"],
 *   "extensions": [
 *     { "type": "effect", "id": "glow", "name": "Glow" }
 *   ]
 * }
 */

/** Plugin categories — used for grouping in the Plugin Manager UI. */
export const PLUGIN_CATEGORIES = [
	"effects",
	"transitions",
	"shapes",
	"presets",
	"text",
	"export",
	"ai",
	"utility",
	"tools",
	"themes",
] as const;
export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number];

/** Extension point types that plugins can contribute to. */
export const PLUGIN_EXTENSION_TYPES = [
	"effect",
	"transition",
	"shape",
	"preset",
	"text",
	"export",
	"ai",
	"utility",
] as const;
export type PluginExtensionType = (typeof PLUGIN_EXTENSION_TYPES)[number];

/**
 * Permissions a plugin can request. Each permission gates a specific
 * capability on the plugin API — the sandbox refuses registerX calls
 * when the corresponding permission is not declared in the manifest.
 *
 * "dangerous" here is a marker for permissions that touch the host
 * network or filesystem; the UI surfaces them with a warning chip so
 * the user can audit what they're installing.
 */
export const PLUGIN_PERMISSIONS = [
	"effects",
	"transitions",
	"shapes",
	"presets",
	"text",
	"export",
	"ai",
	"utility",
	"storage",
	"network",
] as const;
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

/**
 * Permissions considered potentially sensitive — the UI flags them with
 * a warning icon in the detail dialog so the user is aware that the
 * plugin can touch things outside the in-app sandbox (network requests
 * or persistent local storage).
 */
export const DANGEROUS_PERMISSIONS: ReadonlySet<PluginPermission> = new Set([
	"storage",
	"network",
]);

/** User-facing labels for plugin categories. Singular noun + " Plugin"
 *  suffix is dropped at the call sites that already say "Plugins". */
export const CATEGORY_LABELS: Record<PluginCategory, string> = {
	effects: "Effect",
	transitions: "Transition",
	shapes: "Shape",
	presets: "Preset",
	text: "Text",
	export: "Export",
	ai: "AI",
	utility: "Utility",
	tools: "Tool",
	themes: "Theme",
};

/** User-facing labels for permissions — short verb form. */
export const PERMISSION_LABELS: Record<PluginPermission, string> = {
	effects: "Register effects",
	transitions: "Register transitions",
	shapes: "Register shapes",
	presets: "Register presets",
	text: "Register text styles",
	export: "Register export formats",
	ai: "Use AI endpoints",
	utility: "Register utility panels",
	storage: "Read/write persistent plugin storage",
	network: "Make network requests",
};

/** One-line description of what each category is for, used in tooltips. */
export const CATEGORY_DESCRIPTIONS: Record<PluginCategory, string> = {
	effects: "Custom video / image effect definitions.",
	transitions: "Custom scene transition definitions.",
	shapes: "Custom shape definitions for the graphics library.",
	presets: "Reusable parameter presets that show up in the Preset Tools tab.",
	text: "Custom text styles and animation presets.",
	export: "Additional export formats and rendering targets.",
	ai: "AI-driven tools and inference hooks.",
	utility: "Side panels, helpers, and other editor extensions.",
	tools: "Custom editor tools that show up in Quick Tools.",
	themes: "Color schemes and visual styling overrides.",
};

/** A single extension that a plugin contributes (e.g. one effect). */
export interface PluginExtension {
	type: PluginExtensionType;
	/** Unique id within the plugin (e.g. "glow", "fade-in"). */
	id: string;
	/** Display name shown in the UI. */
	name: string;
	/** Optional description for tooltips. */
	description?: string;
	/** Optional URL to a thumbnail image (relative to plugin root or absolute data URL). */
	thumbnail?: string;
}

/** The plugin manifest — the package's "metadata" file. */
export interface PluginManifest {
	/** Reverse-DNS-style unique id (e.g. "com.author.plugin-name"). */
	id: string;
	/** Human-readable display name. */
	name: string;
	/** Semver version string. */
	version: string;
	/** Short description (1-2 sentences). */
	description?: string;
	/** Plugin author name or organization. */
	author?: string;
	/** Category used for grouping in the Plugin Manager. */
	category: PluginCategory;
	/** Entry point — path to the main JS file inside the package. */
	entry: string;
	/** Permissions the plugin requires. */
	permissions?: PluginPermission[];
	/** Extensions this plugin contributes. */
	extensions: PluginExtension[];
	/** Optional home page / docs URL. */
	homepage?: string;
}

/** A plugin as it lives in storage (manifest + raw source code). */
export interface InstalledPlugin {
	/** The manifest id — used as the storage key. */
	id: string;
	/** The parsed manifest. */
	manifest: PluginManifest;
	/** Raw JavaScript source of the entry file. */
	source: string;
	/** Whether the plugin is currently enabled. */
	enabled: boolean;
	/** Installation timestamp (ms since epoch). */
	installedAt: number;
	/** Last update timestamp (ms since epoch). */
	updatedAt: number;
	/** Optional plugin-defined persistent state, JSON-serializable. */
	state?: Record<string, unknown>;
}

/** Runtime plugin instance after the source has been evaluated. */
export interface PluginInstance {
	plugin: InstalledPlugin;
	/** The exposed plugin API (a thin facade passed to the plugin code). */
	api: PluginApi;
	/** Anything the plugin registered via the API. */
	registrations: PluginRegistrations;
}

/** Things the plugin registered via the API. */
export interface PluginRegistrations {
	effects: Array<{ id: string; name: string; definition: unknown }>;
	transitions: Array<{ id: string; name: string; definition: unknown }>;
	shapes: Array<{ id: string; name: string; definition: unknown }>;
	presets: Array<{ id: string; name: string; data: unknown }>;
}

/**
 * The facade passed to plugin code. Plugins call these methods to
 * register extensions; the facade enforces type-safety on the host side.
 */
export interface PluginApi {
	/** Log a message (prefixed with [plugin:<id>] for debuggability). */
	log(...args: unknown[]): void;
	/** Register a custom effect. */
	registerEffect(definition: unknown): void;
	/** Register a custom transition. */
	registerTransition(definition: unknown): void;
	/** Register a custom shape. */
	registerShape(definition: unknown): void;
	/** Register a custom preset. */
	registerPreset(definition: unknown): void;
	/** Network access, gated by the `network` permission. */
	fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
	/** Persistent state for this plugin. */
	storage: PluginStorage;
}

/** Per-plugin persistent key/value storage. */
export interface PluginStorage {
	get<T = unknown>(key: string): T | null;
	set<T = unknown>(key: string, value: T): void;
	delete(key: string): void;
	keys(): string[];
}
