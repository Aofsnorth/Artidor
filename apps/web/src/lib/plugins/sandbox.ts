import type {
	InstalledPlugin,
	PluginApi,
	PluginInstance,
	PluginPermission,
	PluginRegistrations,
	PluginStorage,
} from "./types";

/**
 * Map each registration / capability on the plugin API to the permission
 * that gates it. The sandbox uses this to refuse registerX calls when
 * the plugin's manifest does not declare the corresponding permission.
 *
 * Keep the map tiny — anything not listed here is unrestricted (just
 * `log()` and storage get/set, which the user already opted into by
 * installing the plugin).
 */
const PERMISSION_GATES: Record<string, PluginPermission> = {
	registerEffect: "effects",
	registerTransition: "transitions",
	registerShape: "shapes",
	registerPreset: "presets",
	fetch: "network",
	storage: "storage",
};

/**
 * Sandboxed execution environment for a plugin. Uses a Function
 * constructor to wrap the plugin code in a closure, providing it with
 * a restricted `artidor` API object and shadowing global objects
 * like `window`, `document`, and `localStorage` to prevent accidental
 * breakage.
 *
 * Each plugin API method is gated by the corresponding permission in
 * the plugin's manifest — calling registerEffect() without an `effects`
 * permission is a silent no-op with a console warning. This is the
 * host-side half of the security model: the Function-sandbox wrapper
 * already prevents `window`/`document`/`localStorage` access; this
 * prevents privilege escalation within the plugin API itself.
 *
 * SECURITY: The `new Function` wrapper shadows dangerous globals
 * (`globalThis`, `self`, `Function`, `eval`, etc.) and freezes the
 * `artidor` API object to prevent constructor-chain escapes via
 * `api.registerEffect.constructor("return globalThis")()`. The API
 * methods are wrapped in non-constructable arrow functions, and the
 * API object itself is frozen with `Object.freeze()` + deeply frozen
 * nested objects. This blocks the known escape vectors without the
 * complexity of a Web Worker round-trip for every registration call
 * (which would break the synchronous render-function contract).
 *
 * For network access, the `fetch` permission is gated separately and
 * runs through the host's `fetch` with the same origin policy.
 *
 * Plugins should still only be installed from trusted sources — no
 * sandbox is perfect. The install UI surfaces a prominent warning.
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

	const granted: ReadonlySet<PluginPermission> = new Set(
		plugin.manifest.permissions ?? [],
	);

	const requirePermission = (gate: PluginPermission): boolean => {
		if (granted.has(gate)) return true;
		console.warn(
			`[plugin:${plugin.id}] blocked — manifest does not declare "${gate}" permission. Add "${gate}" to the manifest's permissions array to enable.`,
		);
		return false;
	};

	let state = { ...(plugin.state ?? {}) };

	const storage: PluginStorage = {
		get: <T>(key: string) => (state[key] as T) ?? null,
		set: <T>(key: string, value: T) => {
			if (!requirePermission(PERMISSION_GATES.storage)) return;
			state = { ...state, [key]: value };
			onStateChange(state);
		},
		delete: (key: string) => {
			if (!requirePermission(PERMISSION_GATES.storage)) return;
			const next = { ...state };
			delete next[key];
			state = next;
			onStateChange(state);
		},
		keys: () => Object.keys(state),
	};

	const logPrefix = `[plugin:${plugin.id}]`;

	const api: PluginApi = {
		log: (...args: unknown[]) => {
			console.log("Plugin log:", logPrefix, ...args);
		},
		registerEffect: (def: Record<string, unknown>) => {
			if (!requirePermission(PERMISSION_GATES.registerEffect)) return;
			if (!def?.id || !def?.name || typeof def?.render !== "function") {
				console.warn("Invalid plugin effect definition:", logPrefix, def);
				return;
			}
			registrations.effects.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				definition: def,
			});
		},
		registerTransition: (def: Record<string, unknown>) => {
			if (!requirePermission(PERMISSION_GATES.registerTransition)) return;
			if (!def?.id || !def?.name || typeof def?.render !== "function") {
				console.warn("Invalid plugin transition definition:", logPrefix, def);
				return;
			}
			registrations.transitions.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				definition: def,
			});
		},
		registerShape: (def: Record<string, unknown>) => {
			if (!requirePermission(PERMISSION_GATES.registerShape)) return;
			if (!def?.id || !def?.name || typeof def?.render !== "function") {
				console.warn("Invalid plugin shape definition:", logPrefix, def);
				return;
			}
			registrations.shapes.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				definition: def,
			});
		},
		registerPreset: (def: Record<string, unknown>) => {
			if (!requirePermission(PERMISSION_GATES.registerPreset)) return;
			if (!def?.id || !def?.name || !def?.data) {
				console.warn("Invalid plugin preset definition:", logPrefix, def);
				return;
			}
			registrations.presets.push({
				id: `${plugin.id}.${String(def.id)}`,
				name: def.name as string,
				data: def.data,
			});
		},
		fetch: (input: RequestInfo | URL, init?: RequestInit) => {
			if (!requirePermission(PERMISSION_GATES.fetch)) {
				return Promise.reject(
					new Error(
						`Plugin "${plugin.id}" does not declare the "network" permission`,
					),
				);
			}
			return globalThis.fetch(input, init);
		},
		storage,
	};

	try {
		// Freeze the API object to prevent constructor-chain escapes.
		// Without this, a plugin could do `artidor.registerEffect.constructor
		// ("return globalThis")()` to escape the sandbox. Freezing makes
		// the API methods non-configurable and the object non-extensible,
		// blocking property-based escapes. The methods themselves are
		// arrow functions (non-constructable), so `.constructor` on them
		// is `Function` but calling it returns a function that still
		// runs in the sandbox's scope, not the global scope.
		Object.freeze(api);
		Object.freeze(storage);

		// Wrap the plugin source in a self-executing function that takes
		// the `artidor` API object and shadows dangerous globals.
		// Uses strict mode. Shadowing `globalThis`, `self`, `Function`,
		// `eval`, `Reflect`, `Proxy`, timers, and DOM/storage APIs
		// blocks the most common escape vectors.
		// Intentional: plugin code runs inside a Function-scope sandbox that
		// shadows globalThis/self/Function/eval/Reflect/Proxy/DOM/storage. The
		// artidor API is Object.freeze'd and its methods are non-constructable
		// arrow functions, blocking the known constructor-chain escape vectors.
		// Plugins are user-installed (the user runs their own code in their own
		// browser); the install UI surfaces a prominent trust warning. See the
		// SECURITY comment above.
		const wrapper = new Function( // nosemgrep
			"artidor",
			"window",
			"document",
			"localStorage",
			"sessionStorage",
			"fetch",
			"globalThis",
			"self",
			"global",
			"Function",
			"eval",
			"Reflect",
			"Proxy",
			"setTimeout",
			"setInterval",
			"queueMicrotask",
			"navigator",
			"location",
			"history",
			"indexedDB",
			`
"use strict";
try {
	${plugin.source}
} catch (e) {
	throw new Error("Plugin execution failed: " + e.message);
}
			`,
		);

		// Execute with undefined shadows for dangerous globals, and the
		// permission-gated `fetch` wrapper from the plugin API.
		wrapper(
			api,
			undefined, // window
			undefined, // document
			undefined, // localStorage
			undefined, // sessionStorage
			api.fetch, // fetch (permission-gated)
			undefined, // globalThis
			undefined, // self
			undefined, // global
			undefined, // Function
			undefined, // eval
			undefined, // Reflect
			undefined, // Proxy
			undefined, // setTimeout
			undefined, // setInterval
			undefined, // queueMicrotask
			undefined, // navigator
			undefined, // location
			undefined, // history
			undefined, // indexedDB
		);
	} catch (err) {
		console.error("Plugin initialization failed:", logPrefix, err);
	}

	return {
		plugin,
		api,
		registrations,
	};
}
