/**
 * Shared helpers for the Artidor editor end-to-end suite.
 *
 * The editor exposes a stable, framework-free command API on
 * `window.__ARTIDOR_API__` (see `apps/web/src/lib/api/editor-api.ts`)
 * and a dev-only read-only state snapshot on `window.__ARTIDOR_DEBUG__`.
 * Tests use both: the public API to drive actions, the debug handle
 * to assert on what the timeline now contains.
 */
import { expect, type Page } from "@playwright/test";

export type DebugState = {
	activeSceneId: string | null;
	tracks: {
		main: { id: string; name: string; elementCount: number };
		overlay: Array<{ id: string; name: string; elementCount: number }>;
		audio: Array<{ id: string; name: string; elementCount: number }>;
	} | null;
	elements: Array<{
		id: string;
		trackId: string;
		type: string;
		name: string;
	}>;
};

/**
 * Open the editor at a fake project id and wait for the dark theme +
 * "Artidor" branding to mount. The editor auto-creates an "Untitled
 * Project" on first load so we don't need a database fixture.
 *
 * Also dismisses the onboarding dialog that pops on first visit
 * (otherwise its z-250 backdrop intercepts pointer events on every
 * subsequent click).
 */
export async function bootEditor(page: Page): Promise<void> {
	await page.goto("/editor/test-project", { waitUntil: "domcontentloaded" });
	await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 30_000 });
	await expect(page.getByText(/Artidor/i).first()).toBeVisible({
		timeout: 30_000,
	});
	// Let the React tree finish initial effects + lazy chunks.
	await page.waitForTimeout(1_500);

	// Dismiss the onboarding modal if it's open. The dialog has a
	// `Next` button on step 0 and a `Close` button on later steps.
	for (let attempt = 0; attempt < 6; attempt++) {
		const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
		if (await closeBtn.isVisible({ timeout: 200 }).catch(() => false)) {
			await closeBtn.click().catch(() => undefined);
			await page.waitForTimeout(200);
			continue;
		}
		const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
		if (await nextBtn.isVisible({ timeout: 200 }).catch(() => false)) {
			await nextBtn.click().catch(() => undefined);
			await page.waitForTimeout(200);
			continue;
		}
		break;
	}

	// Wait for both the public API and the dev-only debug handle to
	// be available. EditorCore attaches both during its constructor
	// run, but only after EditorProvider mounts and runs it. Poll with
	// a generous budget because cold compile on first load can take a
	// while.
	await expect
		.poll(
			async () =>
				await page.evaluate(() => {
					const w = window as unknown as {
						__ARTIDOR_API__?: unknown;
						__ARTIDOR_DEBUG__?: unknown;
					};
					return Boolean(w.__ARTIDOR_API__ && w.__ARTIDOR_DEBUG__);
				}),
			{ timeout: 30_000, intervals: [500] },
		)
		.toBe(true);
}

/**
 * Click an asset-panel tab (left bar). Asset tabs expose
 * `aria-label = display name` (e.g. "Effects"), so we use getByRole
 * for precise targeting. `force: true` skips the stability check
 * because the asset panel uses motion animations that the stability
 * heuristic sometimes flags.
 */
export async function clickAssetTab(
	page: Page,
	label: RegExp,
): Promise<void> {
	const tab = page.getByRole("button", { name: label }).first();
	await tab.scrollIntoViewIfNeeded({ timeout: 10_000 });
	await tab.click({ force: true, timeout: 10_000 });
	await page.waitForTimeout(500);
}

/** Run a command through the editor's public API. */
export async function runCommand(
	page: Page,
	name: string,
	args: Record<string, unknown> = {},
): Promise<{ ok: boolean; message?: string; data?: unknown }> {
	return await page.evaluate(
		async ([n, a]) => {
			const api = (window as unknown as { __ARTIDOR_API__?: { run: typeof __ARTIDOR_API__["run"] } })
				.__ARTIDOR_API__;
			if (!api) throw new Error("__ARTIDOR_API__ missing");
			return await api.run(n, a);
		},
		[name, args] as const,
	);
}

/** Read the live editor state via the dev-only debug handle. */
export async function getEditorState(page: Page): Promise<DebugState> {
	return await page.evaluate(() => {
		const w = window as unknown as {
			__ARTIDOR_DEBUG__?: { getState: () => DebugState };
		};
		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
		return w.__ARTIDOR_DEBUG__.getState();
	});
}

/** Insert a text element on the timeline. Returns the new element id. */
export async function insertTextElement(
	page: Page,
	opts: {
		content?: string;
		durationSeconds?: number;
		fontSize?: number;
		color?: string;
		trackId?: string;
	} = {},
): Promise<string> {
	const result = await runCommand(page, "insert_text_element", {
		content: opts.content ?? "Hello world",
		durationSeconds: opts.durationSeconds ?? 3,
		fontSize: opts.fontSize ?? 48,
		color: opts.color ?? "#ffffff",
		...(opts.trackId ? { trackId: opts.trackId } : {}),
	});
	expect(result.ok, `insert_text_element: ${result.message}`).toBe(true);
	const data = result.data as { id?: string } | undefined;
	expect(data?.id, "insert_text_element returned no id").toBeTruthy();
	return data!.id!;
}

/** Select an element on the timeline by id. */
export async function selectElement(
	page: Page,
	trackId: string,
	elementId: string,
): Promise<void> {
	const result = await runCommand(page, "select_elements", {
		elements: [{ trackId, elementId }],
	});
	expect(result.ok, `select_elements: ${result.message}`).toBe(true);
}

/** Convenience: insert a text element and then select it. */
export async function insertAndSelectText(
	page: Page,
	opts: {
		content?: string;
		durationSeconds?: number;
		fontSize?: number;
		color?: string;
	} = {},
): Promise<{ elementId: string; trackId: string }> {
	const elementId = await insertTextElement(page, opts);
	const state = await getEditorState(page);
	const element = state.elements.find((e) => e.id === elementId);
	expect(element, `element ${elementId} not in state`).toBeTruthy();
	await selectElement(page, element!.trackId, elementId);
	return { elementId, trackId: element!.trackId };
}

/** Click an inspector / properties tab by label (e.g. "Transform"). */
export async function clickInspectorTab(
	page: Page,
	label: RegExp,
): Promise<void> {
	const tab = page.locator('[role="tablist"] button, [role="tab"]').filter({
		hasText: label,
	}).first();
	await tab.scrollIntoViewIfNeeded({ timeout: 10_000 });
	await tab.click({ force: true, timeout: 10_000 });
	await page.waitForTimeout(400);
}

/** Collect every visible "page error" / fatal console error. */
export function installErrorRecorder(page: Page): {
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];
	page.on("pageerror", (err) => errors.push(err.message));
	page.on("console", (msg) => {
		const t = msg.text();
		if (msg.type() === "error") {
			// Allow noise from third-party libs and known noisy logs.
			if (
				/Uncaught/i.test(t) ||
				/TypeError/i.test(t) ||
				/Hydration/i.test(t) ||
				/Cannot read properties/i.test(t) ||
				/is not a function/i.test(t)
			) {
				errors.push(t);
			} else {
				warnings.push(t);
			}
		}
	});
	return { errors, warnings };
}
