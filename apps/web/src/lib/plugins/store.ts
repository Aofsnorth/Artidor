import { create } from "zustand";
import { toast } from "sonner";
import { createPluginSandbox } from "./sandbox";
import {
	deletePlugin,
	getAllPlugins,
	savePlugin,
	updatePluginState,
} from "./storage";
import type { InstalledPlugin, PluginInstance, PluginManifest } from "./types";
import { effectsRegistry } from "@/lib/effects/registry";
import type { EffectDefinition } from "@/lib/effects/types";
import { transitionsRegistry } from "@/lib/transitions/registry";
import type { TransitionDefinition } from "@/lib/transitions/types";
import { graphicsRegistry } from "@/lib/graphics/registry";
import type { GraphicDefinition } from "@/lib/graphics/types";

interface PluginsState {
	/** All installed plugins (from IndexedDB). */
	plugins: InstalledPlugin[];
	/** Whether the initial load has completed. */
	loaded: boolean;
	loadPlugins: () => Promise<void>;
	installPlugin: (plugin: InstalledPlugin) => Promise<boolean>;
	uninstallPlugin: (id: string) => Promise<void>;
	setPluginEnabled: ({
		id,
		enabled,
	}: {
		id: string;
		enabled: boolean;
	}) => Promise<void>;
	updatePlugin: (plugin: InstalledPlugin) => Promise<void>;
}

/**
 * Validates that a manifest is well-formed. Throws on invalid input.
 */
export function validateManifest(
	manifest: unknown,
): asserts manifest is PluginManifest {
	if (!manifest || typeof manifest !== "object") {
		throw new Error("Manifest must be an object");
	}
	const m = manifest as Record<string, unknown>;
	if (typeof m.id !== "string" || m.id.length === 0) {
		throw new Error("Manifest missing or invalid `id`");
	}
	if (typeof m.name !== "string" || m.name.length === 0) {
		throw new Error("Manifest missing or invalid `name`");
	}
	if (typeof m.version !== "string") {
		throw new Error("Manifest missing or invalid `version`");
	}
	if (typeof m.category !== "string") {
		throw new Error("Manifest missing or invalid `category`");
	}
	if (typeof m.entry !== "string" || m.entry.length === 0) {
		throw new Error("Manifest missing or invalid `entry`");
	}
	if (!Array.isArray(m.extensions) || m.extensions.length === 0) {
		throw new Error("Manifest must declare at least one extension");
	}
	for (const ext of m.extensions) {
		const record = ext as Record<string, unknown> | null;
		if (
			!record ||
			typeof record !== "object" ||
			typeof record.type !== "string" ||
			typeof record.id !== "string" ||
			typeof record.name !== "string"
		) {
			throw new Error("Invalid extension entry in manifest");
		}
	}
}

/**
 * Run an installed plugin: evaluate its source in a sandbox, then
 * register any extensions it contributed to the appropriate registry.
 * Idempotent — running twice with the same plugin is safe (the
 * second run will overwrite the first).
 */
function activatePlugin(plugin: InstalledPlugin): PluginInstance {
	const instance = createPluginSandbox({
		plugin,
		onStateChange: (state) => {
			void updatePluginState(plugin.id, state);
		},
	});

	// Register plugin-contributed shapes into the graphics registry
	for (const shape of instance.registrations.shapes) {
		graphicsRegistry.register(shape.id, shape.definition as GraphicDefinition);
	}

	// Register plugin-contributed effects
	for (const effect of instance.registrations.effects) {
		effectsRegistry.register(effect.id, effect.definition as EffectDefinition);
	}

	// Register plugin-contributed transitions
	for (const transition of instance.registrations.transitions) {
		transitionsRegistry.register(
			transition.id,
			transition.definition as TransitionDefinition,
		);
	}

	return instance;
}

/**
 * Deactivate a plugin: remove all its extensions from the registries.
 * We track the plugin's registered ids by looking at its manifest's
 * extensions (namespaced by plugin id).
 */
function deactivatePlugin(plugin: InstalledPlugin): void {
	for (const ext of plugin.manifest.extensions) {
		const namespacedId = `${plugin.id}.${ext.id}`;
		switch (ext.type) {
			case "shape":
				graphicsRegistry.unregister(namespacedId);
				break;
			case "effect":
				effectsRegistry.unregister(namespacedId);
				break;
			case "transition":
				transitionsRegistry.unregister(namespacedId);
				break;
			case "preset":
				// Presets are not registered in a global registry; the
				// presets store will filter by source.
				break;
		}
	}
}

export const usePluginsStore = create<PluginsState>()((set, get) => ({
	plugins: [],
	loaded: false,

	async loadPlugins() {
		try {
			const plugins = await getAllPlugins();
			// Activate all enabled plugins
			for (const plugin of plugins) {
				if (plugin.enabled) {
					try {
						activatePlugin(plugin);
					} catch (err) {
						console.error(`Failed to activate plugin ${plugin.id}:`, err);
					}
				}
			}
			set({ plugins, loaded: true });
		} catch (err) {
			console.error("Failed to load plugins:", err);
			set({ plugins: [], loaded: true });
		}
	},

	async installPlugin(plugin) {
		const existing = get().plugins.find((p) => p.id === plugin.id);
		if (existing) {
			toast.error(`Plugin "${plugin.manifest.name}" is already installed`);
			return false;
		}
		try {
			await savePlugin(plugin);
			if (plugin.enabled) {
				try {
					activatePlugin(plugin);
				} catch (err) {
					console.error(`Failed to activate plugin ${plugin.id}:`, err);
					toast.warning(
						`Plugin "${plugin.manifest.name}" installed but failed to activate`,
					);
				}
			}
			set((state) => ({ plugins: [...state.plugins, plugin] }));
			toast.success(`Plugin "${plugin.manifest.name}" installed`);
			return true;
		} catch (err) {
			toast.error(`Failed to install plugin: ${(err as Error).message}`);
			return false;
		}
	},

	async uninstallPlugin(id) {
		const plugin = get().plugins.find((p) => p.id === id);
		if (!plugin) return;
		try {
			// Deactivate first (removes extensions from registries)
			if (plugin.enabled) {
				deactivatePlugin(plugin);
			}
			await deletePlugin(id);
			set((state) => ({
				plugins: state.plugins.filter((p) => p.id !== id),
			}));
			toast.success(`Plugin "${plugin.manifest.name}" uninstalled`);
		} catch (err) {
			toast.error(`Failed to uninstall plugin: ${(err as Error).message}`);
		}
	},

	async setPluginEnabled({ id, enabled }) {
		const plugin = get().plugins.find((p) => p.id === id);
		if (!plugin || plugin.enabled === enabled) return;
		try {
			const updated = { ...plugin, enabled };
			if (enabled) {
				activatePlugin(updated);
			} else {
				deactivatePlugin(updated);
			}
			await savePlugin(updated);
			set((state) => ({
				plugins: state.plugins.map((p) => (p.id === id ? updated : p)),
			}));
		} catch (err) {
			toast.error(`Failed to toggle plugin: ${(err as Error).message}`);
		}
	},

	async updatePlugin(plugin) {
		try {
			await savePlugin(plugin);
			set((state) => ({
				plugins: state.plugins.map((p) => (p.id === plugin.id ? plugin : p)),
			}));
		} catch (err) {
			toast.error(`Failed to update plugin: ${(err as Error).message}`);
		}
	},
}));
