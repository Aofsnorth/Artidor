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
 */

import type { EditorCore } from "@/core";
import { executeTool, type ToolExecutionResult } from "@/lib/ai/tools/executor";
import { ALL_TOOLS, TOOLS_BY_NAME } from "@/lib/ai/tools/registry";

export interface CommandInfo {
	name: string;
	description: string;
	category: string;
	/** JSON Schema for the command's arguments. */
	parameters: Record<string, unknown>;
}

export interface EditorApi {
	/** Every command the editor exposes, with its arg schema. */
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
			return ALL_TOOLS.map((t) => ({
				name: t.def.function.name,
				description: t.def.function.description,
				category: t.category,
				parameters: t.def.function.parameters as Record<string, unknown>,
			}));
		},

		async run(name, args = {}, source = "user") {
			const registered = TOOLS_BY_NAME[name];
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
			return executeTool({
				editor,
				toolName: registered.executorKey,
				arguments: args,
				source,
			});
		},
	};
}
