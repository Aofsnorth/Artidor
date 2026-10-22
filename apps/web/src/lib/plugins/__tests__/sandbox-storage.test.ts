import { afterEach, describe, expect, test } from "bun:test";
import { createPluginSandbox } from "../sandbox";
import type { InstalledPlugin, PluginPermission } from "../types";

const originalWarn = console.warn;
const originalError = console.error;

afterEach(() => {
	console.warn = originalWarn;
	console.error = originalError;
});

function sandbox({
	permissions,
	state,
}: {
	permissions: PluginPermission[];
	state?: Record<string, unknown>;
}) {
	console.warn = () => {};
	console.error = () => {};
	return createPluginSandbox({
		plugin: {
			id: "com.example.test",
			manifest: {
				id: "com.example.test",
				name: "Test",
				version: "1.0.0",
				category: "effects",
				entry: "plugin.js",
				permissions,
				extensions: [{ type: "effect", id: "glow", name: "Glow" }],
			},
			source: "",
			enabled: true,
			installedAt: 0,
			updatedAt: 0,
			state,
		} as InstalledPlugin,
		onStateChange: () => {},
	});
}

describe("plugin storage permission", () => {
	test("denies reads when the storage permission is absent", () => {
		const instance = sandbox({ permissions: [], state: { saved: "secret" } });

		expect(instance.api.storage.get("saved")).toBeNull();
		expect(instance.api.storage.get("constructor")).toBeNull();
		expect(instance.api.storage.keys()).toEqual([]);
	});

	test("allows own keys when storage is granted", () => {
		const instance = sandbox({
			permissions: ["storage"],
			state: { saved: "value" },
		});

		expect(instance.api.storage.get("saved")).toBe("value");
		expect(instance.api.storage.keys()).toEqual(["saved"]);
	});

	test("never resolves prototype keys even with storage granted", () => {
		const instance = sandbox({ permissions: ["storage"], state: {} });

		expect(instance.api.storage.get("constructor")).toBeNull();
		expect(instance.api.storage.get("toString")).toBeNull();
		expect(instance.api.storage.get("__proto__")).toBeNull();
	});
});
