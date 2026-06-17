import type { InstalledPlugin, PluginManifest } from "./types";
import { validateManifest } from "./store";

/**
 * Parsed plugin package. We use a JSON-based format rather than zip for
 * simplicity (no zip dependency required). The package is a single JSON
 * file containing the manifest and the JS source of the entry file.
 *
 * Example plugin package:
 * {
 *   "manifest": { ... },
 *   "source": "artidor.registerEffect({ id: 'glow', ... });"
 * }
 */
export interface PluginPackage {
	manifest: PluginManifest;
	source: string;
}

/**
 * Read a .artidor-plugin file (JSON format) and parse it into a
 * structured package. Validates the manifest before returning.
 */
export async function readPluginFile(file: File): Promise<PluginPackage> {
	const text = await file.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch (err) {
		throw new Error(
			`Invalid plugin file — expected JSON: ${(err as Error).message}`,
		);
	}
	if (!parsed || typeof parsed !== "object") {
		throw new Error("Invalid plugin file — expected an object");
	}
	const pkg = parsed as Record<string, unknown>;
	if (typeof pkg.manifest !== "object" || pkg.manifest === null) {
		throw new Error("Plugin file missing `manifest` field");
	}
	if (typeof pkg.source !== "string") {
		throw new Error("Plugin file missing `source` field");
	}
	validateManifest(pkg.manifest);
	return {
		manifest: pkg.manifest as PluginManifest,
		source: pkg.source,
	};
}

/**
 * Convert a parsed package into an `InstalledPlugin` ready for storage.
 */
export function packageToInstalled({
	pkg,
}: {
	pkg: PluginPackage;
}): InstalledPlugin {
	const now = Date.now();
	return {
		id: pkg.manifest.id,
		manifest: pkg.manifest,
		source: pkg.source,
		enabled: true,
		installedAt: now,
		updatedAt: now,
	};
}

/**
 * Generate a sample plugin package (for documentation & testing). The
 * sample registers a custom shape "demo-shape" with a magenta fill.
 */
export function buildSamplePluginPackage(): PluginPackage {
	return {
		manifest: {
			id: "com.example.demo-plugin",
			name: "Demo Plugin",
			version: "1.0.0",
			description: "A sample plugin that adds a custom shape",
			author: "Artidor",
			category: "shapes",
			entry: "plugin.js",
			permissions: ["shapes"],
			extensions: [
				{
					type: "shape",
					id: "demo-star",
					name: "Demo Star",
					description: "A custom shape added by the demo plugin",
				},
			],
		},
		source: `
// Register a custom shape via the plugin API
artidor.registerShape({
  id: "demo-star",
  name: "Demo Star",
  keywords: ["demo", "star", "plugin"],
  params: [
    { key: "fill", label: "Fill", type: "color", default: "#ff00ff" },
    { key: "stroke", label: "Stroke", type: "color", default: "#000000" },
    { key: "strokeWidth", label: "Width", type: "number", default: 2, min: 0, max: 64, step: 1 },
  ],
  render: function(ctx, params, width, height) {
    ctx.clearRect(0, 0, width, height);
    var cx = width / 2;
    var cy = height / 2;
    var r = Math.min(width, height) / 2 - 10;
    var path = new Path2D();
    for (var i = 0; i < 10; i++) {
      var angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      var radius = i % 2 === 0 ? r : r * 0.4;
      var x = cx + Math.cos(angle) * radius;
      var y = cy + Math.sin(angle) * radius;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
    if (params.fill) {
      ctx.fillStyle = params.fill;
      ctx.fill(path);
    }
    if (params.strokeWidth > 0) {
      ctx.strokeStyle = params.stroke;
      ctx.lineWidth = params.strokeWidth;
      ctx.stroke(path);
    }
    artidor.log("Demo shape rendered");
  }
});
`,
	};
}
