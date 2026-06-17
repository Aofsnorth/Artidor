import type {
	InstalledPlugin,
	PluginApi,
	PluginInstance,
	PluginRegistrations,
	PluginStorage,
} from "./types";

/**
 * Sandboxed execution environment for a plugin. Uses a Function
 * constructor to wrap the plugin code in a closure, providing it with
 * a restricted `artidor` API object and shadowing global objects
 * like `window`, `document`, and `localStorage` to prevent accidental
 * breakage.
 *
 * This is a lightweight sandbox for robustness, not a perfect security
 * sandbox (which would require Web Workers or cross-origin iframes).
 * Plugins should only be installed from trusted sources.
 */
export function createPluginSandbox({
	plugin,
	onStateChange,
}: {
	plugin: InstalledPlugin;
	/** Callback when the plugin modifies its persistent storage. */
	onStateChange: (state: Record<string, unknown>) => void;
}): PluginInstance {
	const registrations: PluginRegistrations = {
		effects: [],
		transitions: [],
		shapes: [],
		presets: [],
	};

	let state = { ...(plugin.state ?? {}) };

	const storage: PluginStorage = {
		get: <T>(key: string) => (state[key] as T) ?? null,
		set: <T>(key: string, value: T) => {
			state = { ...state, [key]: value };
			onStateChange(state);
		},
		delete: (key: string) => {
			const next = { ...state };
			delete next[key];
			state = next;
			onStateChange(state);
		},
		keys: () => Object.keys(state),
	};

	const api: PluginApi = {
		log: (...args: unknown[]) => {
			console.log(`[plugin:${plugin.id}]`, ...args);
		},
		registerEffect: (def: Record<string, unknown>) => {
			if (!def?.id || !def?.name || typeof def?.render !== "function") {
				console.warn(`[plugin:${plugin.id}] Invalid effect definition`, def);
				return;
			}
			registrations.effects.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				definition: def,
			});
		},
		registerTransition: (def: Record<string, unknown>) => {
			if (!def?.id || !def?.name || typeof def?.render !== "function") {
				console.warn(
					`[plugin:${plugin.id}] Invalid transition definition`,
					def,
				);
				return;
			}
			registrations.transitions.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				definition: def,
			});
		},
		registerShape: (def: Record<string, unknown>) => {
			if (!def?.id || !def?.name || typeof def?.render !== "function") {
				console.warn(`[plugin:${plugin.id}] Invalid shape definition`, def);
				return;
			}
			registrations.shapes.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				definition: def,
			});
		},
		registerPreset: (def: Record<string, unknown>) => {
			if (!def?.id || !def?.name || !def?.data) {
				console.warn(`[plugin:${plugin.id}] Invalid preset definition`, def);
				return;
			}
			registrations.presets.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				data: def.data,
			});
		},
		storage,
	};

	try {
		// Wrap the plugin source in a self-executing function that takes
		// the `artidor` API object and shadows globals.
		// Uses strict mode.
		const wrapper = new Function(
			"artidor",
			"window",
			"document",
			"localStorage",
			"sessionStorage",
			`
"use strict";
try {
	${plugin.source}
} catch (e) {
	throw new Error("Plugin execution failed: " + e.message);
}
			`,
		);

		// Execute with undefined shadows for globals to prevent DOM manipulation
		wrapper(api, undefined, undefined, undefined, undefined);
	} catch (err) {
		console.error(`[plugin:${plugin.id}] Initialization failed:`, err);
	}

	return {
		plugin,
		api,
		registrations,
	};
}
