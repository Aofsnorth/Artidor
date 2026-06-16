/**
 * Re-export of the StyleProfile + FrameRate types, decoupled from
 * their implementation files so we can use them as type-only
 * imports elsewhere without pulling in the heavy runtime modules.
 */

export type { StyleProfile } from "./extractor";
export type { FrameRate } from "artidor-wasm";
