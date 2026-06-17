# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-tabs.spec.ts >> Editor — asset & inspector tabs >> Adjust panel renders adjustment controls, not video controls
- Location: tests\02-tabs.spec.ts:109:6

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Artidor/i).first()
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for getByText(/Artidor/i).first()

```

```yaml
- region "Notifications alt+T"
- alert
- img
- heading "Editor hit a snag." [level=1]
- paragraph: Your project is still saved. Reloading usually fixes transient state glitches.
- button "Reload editor"
- link "Back to projects":
  - /url: /projects
  - button "Back to projects"
```

# Test source

```ts
  1   | /**
  2   |  * Shared helpers for the Artidor editor end-to-end suite.
  3   |  *
  4   |  * The editor exposes a stable, framework-free command API on
  5   |  * `window.__ARTIDOR_API__` (see `apps/web/src/lib/api/editor-api.ts`)
  6   |  * and a dev-only read-only state snapshot on `window.__ARTIDOR_DEBUG__`.
  7   |  * Tests use both: the public API to drive actions, the debug handle
  8   |  * to assert on what the timeline now contains.
  9   |  */
  10  | import { expect, type Page } from "@playwright/test";
  11  | 
  12  | export type DebugState = {
  13  | 	activeSceneId: string | null;
  14  | 	tracks: {
  15  | 		main: { id: string; name: string; elementCount: number };
  16  | 		overlay: Array<{ id: string; name: string; elementCount: number }>;
  17  | 		audio: Array<{ id: string; name: string; elementCount: number }>;
  18  | 	} | null;
  19  | 	elements: Array<{
  20  | 		id: string;
  21  | 		trackId: string;
  22  | 		type: string;
  23  | 		name: string;
  24  | 	}>;
  25  | };
  26  | 
  27  | /**
  28  |  * Open the editor at a fake project id and wait for the dark theme +
  29  |  * "Artidor" branding to mount. The editor auto-creates an "Untitled
  30  |  * Project" on first load so we don't need a database fixture.
  31  |  *
  32  |  * Also dismisses the onboarding dialog that pops on first visit
  33  |  * (otherwise its z-250 backdrop intercepts pointer events on every
  34  |  * subsequent click).
  35  |  */
  36  | export async function bootEditor(page: Page): Promise<void> {
  37  | 	await page.goto("/editor/test-project", { waitUntil: "domcontentloaded" });
  38  | 	await expect(page.locator("html")).toHaveClass(/dark/, { timeout: 30_000 });
> 39  | 	await expect(page.getByText(/Artidor/i).first()).toBeVisible({
      |                                                   ^ Error: expect(locator).toBeVisible() failed
  40  | 		timeout: 30_000,
  41  | 	});
  42  | 	// Let the React tree finish initial effects + lazy chunks.
  43  | 	await page.waitForTimeout(1_500);
  44  | 
  45  | 	// Dismiss the onboarding modal if it's open. The dialog has a
  46  | 	// `Next` button on step 0 and a `Close` button on later steps.
  47  | 	for (let attempt = 0; attempt < 6; attempt++) {
  48  | 		const closeBtn = page.getByRole("button", { name: /^Close$/i }).first();
  49  | 		if (await closeBtn.isVisible({ timeout: 200 }).catch(() => false)) {
  50  | 			await closeBtn.click().catch(() => undefined);
  51  | 			await page.waitForTimeout(200);
  52  | 			continue;
  53  | 		}
  54  | 		const nextBtn = page.getByRole("button", { name: /^Next$/i }).first();
  55  | 		if (await nextBtn.isVisible({ timeout: 200 }).catch(() => false)) {
  56  | 			await nextBtn.click().catch(() => undefined);
  57  | 			await page.waitForTimeout(200);
  58  | 			continue;
  59  | 		}
  60  | 		break;
  61  | 	}
  62  | 
  63  | 	// Wait for both the public API and the dev-only debug handle to
  64  | 	// be available. EditorCore attaches both during its constructor
  65  | 	// run, but only after EditorProvider mounts and runs it. Poll with
  66  | 	// a generous budget because cold compile on first load can take a
  67  | 	// while.
  68  | 	await expect
  69  | 		.poll(
  70  | 			async () =>
  71  | 				await page.evaluate(() => {
  72  | 					const w = window as unknown as {
  73  | 						__ARTIDOR_API__?: unknown;
  74  | 						__ARTIDOR_DEBUG__?: unknown;
  75  | 					};
  76  | 					return Boolean(w.__ARTIDOR_API__ && w.__ARTIDOR_DEBUG__);
  77  | 				}),
  78  | 			{ timeout: 30_000, intervals: [500] },
  79  | 		)
  80  | 		.toBe(true);
  81  | }
  82  | 
  83  | /**
  84  |  * Click an asset-panel tab (left bar). Asset tabs expose
  85  |  * `aria-label = display name` (e.g. "Effects"), so we use getByRole
  86  |  * for precise targeting. `force: true` skips the stability check
  87  |  * because the asset panel uses motion animations that the stability
  88  |  * heuristic sometimes flags.
  89  |  */
  90  | export async function clickAssetTab(
  91  | 	page: Page,
  92  | 	label: RegExp,
  93  | ): Promise<void> {
  94  | 	const tab = page.getByRole("button", { name: label }).first();
  95  | 	await tab.scrollIntoViewIfNeeded({ timeout: 10_000 });
  96  | 	await tab.click({ force: true, timeout: 10_000 });
  97  | 	await page.waitForTimeout(500);
  98  | }
  99  | 
  100 | /** Run a command through the editor's public API. */
  101 | export async function runCommand(
  102 | 	page: Page,
  103 | 	name: string,
  104 | 	args: Record<string, unknown> = {},
  105 | ): Promise<{ ok: boolean; message?: string; data?: unknown }> {
  106 | 	return await page.evaluate(
  107 | 		async ([n, a]) => {
  108 | 			const api = (window as unknown as { __ARTIDOR_API__?: { run: typeof __ARTIDOR_API__["run"] } })
  109 | 				.__ARTIDOR_API__;
  110 | 			if (!api) throw new Error("__ARTIDOR_API__ missing");
  111 | 			return await api.run(n, a);
  112 | 		},
  113 | 		[name, args] as const,
  114 | 	);
  115 | }
  116 | 
  117 | /** Read the live editor state via the dev-only debug handle. */
  118 | export async function getEditorState(page: Page): Promise<DebugState> {
  119 | 	return await page.evaluate(() => {
  120 | 		const w = window as unknown as {
  121 | 			__ARTIDOR_DEBUG__?: { getState: () => DebugState };
  122 | 		};
  123 | 		if (!w.__ARTIDOR_DEBUG__) throw new Error("__ARTIDOR_DEBUG__ missing");
  124 | 		return w.__ARTIDOR_DEBUG__.getState();
  125 | 	});
  126 | }
  127 | 
  128 | /** Insert a text element on the timeline. Returns the new element id. */
  129 | export async function insertTextElement(
  130 | 	page: Page,
  131 | 	opts: {
  132 | 		content?: string;
  133 | 		durationSeconds?: number;
  134 | 		fontSize?: number;
  135 | 		color?: string;
  136 | 		trackId?: string;
  137 | 	} = {},
  138 | ): Promise<string> {
  139 | 	const result = await runCommand(page, "insert_text_element", {
```