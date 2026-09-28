/**
 * Editor API — a stable, framework-free public surface over the editor.
 *
 * The roadmap (docs/features-big-1.md: "Editor API") wants "everything
 * doable in the editor doable via API". That command vocabulary already
 * exists as the AI tool registry (lib/ai/tools/registry.ts) + executor
 * (lib/ai/tools/executor.ts), but it was only reachable from the React AI
 * panel. This module promotes it to a first-class facade that is callable
 * from anywhere — the Scripting tab, the in-tab automation bridge, and the
 * MCP server all sit on top of this one validated vocabulary.
 *
 * It adds the same arg safety the LLM path relies on: every call is
 * validated against the tool's JSON Schema before it touches EditorCore,
 * so external callers (scripts / agents) can't smuggle in bad input.
 *
 * The registry + executor it wraps are loaded lazily (see `loadToolRuntime`),
 * so building the API — which the EditorCore constructor does on every page
 * load — does not pull the AI toolchain into the editor's initial chunk.
 */

import type { EditorCore } from "@/core";
import type { ToolExecutionResult } from "@/lib/ai/tools/executor";
import type { Effect } from "@/lib/effects/types";

type ToolRegistryModule = typeof import("@/lib/ai/tools/registry");
type ToolExecutorModule = typeof import("@/lib/ai/tools/executor");

interface ToolRuntime {
	registry: ToolRegistryModule;
	executor: ToolExecutorModule;
}

/**
 * The command vocabulary — the tool registry (~100 JSON schemas) and the tool
 * executor — is only needed once something actually drives the editor through
 * this API: the Scripting tab, the in-tab automation bridge, or the MCP relay.
 * It is therefore imported on first use instead of at module evaluation, which
 * keeps it out of the editor's initial chunk for the (common) case where the
 * user never opens the AI panel or the Scripting tab. The promise is memoized,
 * so both modules are fetched and evaluated at most once.
 */
let toolRuntimePromise: Promise<ToolRuntime> | null = null;

/**
 * Set as soon as the registry chunk lands. `listCommands` is synchronous (see
 * `EditorApi`), so it reads the registry from here rather than awaiting.
 */
let loadedRegistry: ToolRegistryModule | null = null;

function loadToolRuntime(): Promise<ToolRuntime> {
	// A rejected load is not memoized, so a later call can retry instead of
	// failing every command for the rest of the session.
	toolRuntimePromise ??= Promise.all([
		import("@/lib/ai/tools/registry"),
		import("@/lib/ai/tools/executor"),
	])
		.then(([registry, executor]) => {
			loadedRegistry = registry;
			return { registry, executor };
		})
		.catch((error: unknown) => {
			toolRuntimePromise = null;
			throw error;
		});
	return toolRuntimePromise;
}

/**
 * Kick off the load without waiting for it. Used by the synchronous
 * `listCommands`, which has no way to report a load failure; `run` surfaces
 * the same failure to its caller.
 */
function prefetchToolRuntime(): void {
	void loadToolRuntime().catch(() => {});
}

function toCommandInfo(registry: ToolRegistryModule): CommandInfo[] {
	return registry.ALL_TOOLS.map((t) => ({
		name: t.def.function.name,
		description: t.def.function.description,
		category: t.category,
		parameters: t.def.function.parameters as Record<string, unknown>,
	}));
}

function describeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export interface CommandInfo {
	name: string;
	description: string;
	category: string;
	/** JSON Schema for the command's arguments. */
	parameters: Record<string, unknown>;
}

export interface EditorApi {
	/**
	 * Every command the editor exposes, with its arg schema. Synchronous by
	 * contract — the bridge and the Scripting tab post the result straight back
	 * to their transport without awaiting it — so it reflects the registry once
	 * it has been loaded (see `loadToolRuntime`) and starts that load otherwise.
	 */
	listCommands(): CommandInfo[];
	/**
	 * Run a command by name. Args are validated against the command's JSON
	 * Schema first; invalid args resolve to `{ ok: false }` rather than
	 * throwing. `source` defaults to "user" (external/automation origin).
	 */
	run(
		name: string,
		args?: Record<string, unknown>,
		source?: "user" | "ai",
	): Promise<ToolExecutionResult>;
}

declare global {
	interface Window {
		/** Present only in the live editor tab; absent during SSR. */
		__ARTIDOR_API__?: EditorApi;
		/**
		 * Dev-only debug handle. Tree-shaken out of production builds
		 * (the editor core wraps the assignment in a NODE_ENV guard).
		 * Exposes a read-only snapshot of the active scene's tracks +
		 * elements so end-to-end tests can assert on timeline state
		 * without depending on private selectors.
		 */
		__ARTIDOR_DEBUG__?: {
			getState: () => {
				activeSceneId: string | null;
				tracks: {
					main: { id: string; name: string; elementCount: number };
					overlay: Array<{
						id: string;
						name: string;
						elementCount: number;
					}>;
					overlayAfter: Array<{
						id: string;
						name: string;
						elementCount: number;
					}>;
					audio: Array<{
						id: string;
						name: string;
						elementCount: number;
					}>;
				} | null;
				elements: Array<{
					id: string;
					trackId: string;
					type: string;
					name: string;
					effects: Effect[];
				}>;
			};
			/**
			 * Test-only: insert a synthetic video element onto the
			 * main track so end-to-end tests can drive the
			 * retime / frame-interpolation / speed-graph inspector
			 * flows without a real media file. The element has no
			 * mediaId and never renders, so it's invisible to the
			 * user but full-fidelity for inspector / clipboard /
			 * preset flows.
			 */
			insertMockVideo: (opts?: { durationSeconds?: number }) => string;
			insertMockVideos: (
				count: number,
				opts?: { durationSeconds?: number },
			) => void;
			/**
			 * Test-only: insert a synthetic IMAGE element on the main
			 * track. The Adjust panel and the DaVinci grading viewer are
			 * registered for image elements only, so driving those tabs
			 * needs one. The `mediaId` is dangling on purpose — the scene
			 * builder skips elements whose asset is missing, so the preview
			 * stays empty while the inspector renders its full controls.
			 */
			insertMockImage: (opts?: { durationSeconds?: number }) => string;
			/**
			 * Test-only: open the "Save to preset" dialog with the
			 * given elements. The right-click context menu's "Save
			 * as preset" item funnels into the same dialog store.
			 */
			openSavePresetDialog: (input: {
				elements: Array<{ trackId: string; elementId: string }>;
				defaultName: string;
			}) => void;
			/**
			 * Test-only: switch the editor's tool mode
			 * (`select` | `draw` | `vector`) so tests can drive
			 * the freehand / vector flows without depending on
			 * the preview toolbar's click-to-toggle UI.
			 */
			setToolMode: (mode: "select" | "draw" | "vector") => void;
		};
	}
}

/* -------------------------------------------------------------------------- */
/*                       Minimal JSON Schema validator                        */
/* -------------------------------------------------------------------------- */

/**
 * The tool schemas are intentionally simple (object / string / number /
 * boolean / array / enum with min/max/length/items), so a focused
 * validator is enough — we don't pull in a full JSON Schema engine.
 */
interface JsonSchema {
	type?: string;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	additionalProperties?: boolean;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	minItems?: number;
	items?: JsonSchema;
}

function validateValue(
	schema: JsonSchema,
	value: unknown,
	path: string,
): string | null {
	if (schema.enum && !schema.enum.includes(value)) {
		return `${path} must be one of: ${schema.enum.join(", ")}`;
	}
	switch (schema.type) {
		case "string":
			if (typeof value !== "string") return `${path} must be a string`;
			if (schema.minLength != null && value.length < schema.minLength)
				return `${path} is too short`;
			if (schema.maxLength != null && value.length > schema.maxLength)
				return `${path} is too long`;
			return null;
		case "number":
			if (typeof value !== "number" || !Number.isFinite(value))
				return `${path} must be a number`;
			if (schema.minimum != null && value < schema.minimum)
				return `${path} must be >= ${schema.minimum}`;
			if (schema.maximum != null && value > schema.maximum)
				return `${path} must be <= ${schema.maximum}`;
			return null;
		case "boolean":
			return typeof value === "boolean" ? null : `${path} must be a boolean`;
		case "array": {
			if (!Array.isArray(value)) return `${path} must be an array`;
			if (schema.minItems != null && value.length < schema.minItems)
				return `${path} needs at least ${schema.minItems} item(s)`;
			if (schema.items) {
				for (let i = 0; i < value.length; i++) {
					const err = validateValue(schema.items, value[i], `${path}[${i}]`);
					if (err) return err;
				}
			}
			return null;
		}
		case "object":
			return validateObject(schema, value, path);
		default:
			return null;
	}
}

function validateObject(
	schema: JsonSchema,
	value: unknown,
	path: string,
): string | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return `${path || "arguments"} must be an object`;
	}
	const obj = value as Record<string, unknown>;
	for (const key of schema.required ?? []) {
		if (!(key in obj) || obj[key] === undefined) {
			return `Missing required field: ${path ? `${path}.` : ""}${key}`;
		}
	}
	if (schema.additionalProperties === false && schema.properties) {
		for (const key of Object.keys(obj)) {
			if (!(key in schema.properties)) {
				return `Unexpected field: ${path ? `${path}.` : ""}${key}`;
			}
		}
	}
	for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
		if (key in obj && obj[key] !== undefined) {
			const err = validateValue(
				propSchema,
				obj[key],
				path ? `${path}.${key}` : key,
			);
			if (err) return err;
		}
	}
	return null;
}

/* -------------------------------------------------------------------------- */
/*                                  Factory                                   */
/* -------------------------------------------------------------------------- */

export function createEditorApi(editor: EditorCore): EditorApi {
	return {
		listCommands() {
			// Synchronous by contract: the in-tab bridge (`bridge.ts`) and the
			// Scripting tab both post this result straight back to their
			// transport, so it cannot wait for the chunk. Before the registry
			// lands this returns an empty list and starts the load, so the next
			// call is complete — and any caller that ran a command first
			// (`run` awaits the same load) always sees the full list.
			if (!loadedRegistry) prefetchToolRuntime();
			return loadedRegistry ? toCommandInfo(loadedRegistry) : [];
		},

		async run(name, args = {}, source = "user") {
			let runtime: ToolRuntime;
			try {
				runtime = await loadToolRuntime();
			} catch (error) {
				return {
					ok: false,
					message: `Failed to load editor commands: ${describeError(error)}`,
				};
			}

			const registered = runtime.registry.TOOLS_BY_NAME[name];
			if (!registered) {
				return { ok: false, message: `Unknown command: ${name}` };
			}
			const schemaError = validateObject(
				registered.def.function.parameters as JsonSchema,
				args,
				"",
			);
			if (schemaError) {
				return { ok: false, message: schemaError };
			}
			return runtime.executor.executeTool({
				editor,
				toolName: registered.executorKey,
				arguments: args,
				source,
			});
		},
	};
}
