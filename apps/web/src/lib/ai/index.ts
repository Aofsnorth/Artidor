/**
 * Public barrel for the AI feature. The chat route, the AI Manager and
 * the UI panel all import from here so internal layout stays flexible.
 */

export * from "./provider";
export * from "./tools/registry";
export * from "./telemetry/store";
export * from "./style/extractor";
export { formatStyleProfile } from "./style/prompt";
export { buildSystemPrompt } from "./system-prompt";
export { executeTool, type ToolExecutionResult } from "./tools/executor";
