/**
 * App-wide magic numbers.
 *
 * Centralized here so that "60 fps", "8 sec storage poll", and similar
 * tunables are discoverable, testable, and don't drift across files.
 *
 * Anything domain-specific (timing, layout sizing, audio) stays in
 * its feature module — this file is for cross-cutting values that
 * would otherwise be duplicated in many call sites.
 */

/** Default project / export frame rate (frames per second). */
export const DEFAULT_FPS = 60;

/** Debounce delay for the storage estimate polling loop (ms). */
export const STORAGE_ESTIMATE_POLL_INTERVAL_MS = 30_000;

/** How long "Copied!" / similar transient toast states linger (ms). */
export const COPIED_FEEDBACK_MS = 2_000;

/** Slightly faster copy-state reset for one-off UI affordances (ms). */
export const COPIED_FEEDBACK_SHORT_MS = 1_500;

/** Decoder / heavy-load timeout for AI style extraction (ms). */
export const AI_DECODER_TIMEOUT_MS = 15_000;

/** How often the renderer checks for cancellation while exporting (ms). */
export const EXPORT_CANCEL_POLL_MS = 100;

/** How long to wait between reconnect attempts to the API relay (ms). */
export const API_RELAY_RECONNECT_MS = 2_000;

/** Cadence at which the transcription service retries init (ms). */
export const TRANSCRIPTION_INIT_RETRY_MS = 100;

/**
 * Throttle for asset downloads on the brand page — keeps the browser
 * from being hammered with parallel fetches when the user bulk-downloads
 * the press kit. Adjust if the bundle size grows.
 */
export const BRAND_DOWNLOAD_STAGGER_MS = 200;

/** Responsive shell height: editor preview pane is capped at this vh. */
export const EDITOR_PREVIEW_MAX_VH = 52;