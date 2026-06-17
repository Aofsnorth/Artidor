# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-tabs.spec.ts >> Editor — asset & inspector tabs >> asset panel exposes every documented tab
- Location: tests\02-tabs.spec.ts:29:6

# Error details

```
Error: Tab matching /^Preset Tools$/i should exist

expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /^Preset Tools$/i }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Tab matching /^Preset Tools$/i should exist with timeout 5000ms
  - waiting for getByRole('button', { name: /^Preset Tools$/i }).first()

```

```yaml
- region "Notifications alt+T"
- alert
- banner:
  - button "Artidor Logo":
    - img "Project thumbnail"
  - link "Projects":
    - /url: /projects
  - text: /
  - textbox: Untitled Project
  - button "Fit":
    - text: Fit
    - img
  - navigation:
    - button "Open settings":
      - img
    - button "Invite collaborators":
      - img
      - text: Invite
    - button "Export":
      - img
      - text: Export
      - img
- button "Assets":
  - img
  - text: Assets
- button "AI Edit" [disabled]:
  - img
  - text: AI Edit
- button "Text":
  - img
  - text: Text
- button "Elements":
  - img
  - text: Elements
- button "Transitions":
  - img
  - text: Transitions
- button "Effects":
  - img
  - text: Effects
- button "Overlays":
  - img
  - text: Overlays
- button "Audio":
  - img
  - text: Audio
- button "Motion":
  - img
  - text: Motion
- button "Adjust":
  - img
  - text: Adjust
- button "Templates":
  - img
  - text: Templates
- button "Preset":
  - img
  - text: Preset
- button "Tools":
  - img
  - text: Tools
- button "Plugins":
  - img
  - text: Plugins
- button "Scripting":
  - img
  - text: Scripting
- button "Settings":
  - img
  - text: Settings
- text: 4 GB Free Assets
- button:
  - img
- button:
  - img
- button "Import":
  - img
  - text: Import
- button "Library Local project media"
- button "Stock Browse licensed assets"
- button "Cloud Synced team media"
- text: Videos 0 Audio 0 Images 0
- button "New folder":
  - img
  - text: New folder
- button "Your creative journey begins here Import media or drag and drop to get started. Import media":
  - img
  - heading "Your creative journey begins here" [level=3]
  - paragraph: Import media or drag and drop to get started.
  - text: Import media
- separator
- button "Fit"
- button "16:9"
- button "Fullscreen preview":
  - img
- button "More preview tools":
  - img
- application "Preview canvas"
- button "Show audio visualizer"
- button "00:00:00:00"
- text: / 00:00:00:00
- button "Go to start":
  - img
- button "Jump backward (or previous bookmark)":
  - img
- button "Play":
  - img
- button "Jump forward (or next bookmark)":
  - img
- button "Go to end":
  - img
- button "Enable loop playback":
  - img
- button "Freehand draw":
  - img
- button "Vector draw":
  - img
- button:
  - img
- separator
- text: Details
- button "Reset all"
- img
- button "Regenerate thumbnail from first frame":
  - img
- text: Untitled Project
- button "Reset all"
- text: Project
- button "View full project info"
- img
- text: Project
- term: Duration
- definition: 0:00
- term: Frame rate
- definition: 30 fps
- term: Resolution
- definition: 1920 × 1080
- term: Background
- definition: Solid color
- img
- text: Activity
- term: Created
- definition: Jun 18, 2026
- term: Modified
- definition: Jun 18, 2026
- term: Project ID
- definition:
  - code: beae79de
  - button "Copy project ID":
    - img
- button "Resize audio meter"
- text: "-60 -54 -48 -42 -36 -30 -24 -18 -12 -6 0 -60 -54 -48 -42 -36 -30 -24 -18 -12 -6 0 L R"
- button "DIM"
- button "Open audio visualizer":
  - img
- separator
- region "Timeline":
  - button "Add track"
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button [disabled]:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button "Main scene":
    - text: Main scene
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button "Zoom out":
    - img
  - slider
  - button "Zoom in":
    - img
  - button "Resize track labels column"
  - text: Tracks
  - button "Hide track":
    - img
  - button "Change track color"
  - text: V1
  - button "Main Track"
  - button "Lock track"
  - text: O
  - 'slider "Track opacity: 100%"': "100"
  - text: 100% V
  - 'slider "Track volume: 100%"': "100"
  - text: 100%
  - slider "Timeline ruler": 00:00:00:00 00:00:00:15 00:00:01:00 00:00:01:15 00:00:02:00 00:00:02:15 00:00:03:00 00:00:03:15
  - button "Select Main Track track"
  - text: Drop media
  - button "Resize track height"
  - slider "Timeline playhead":
    - button "Drag playhead"
- text: Worked on 00:00:10 1080p • 30 fps • 16:9 • Stereo
```

# Test source

```ts
  1   | /**
  2   |  * Asset panel + inspector tab tests.
  3   |  *
  4   |  * Verifies the editor's left-bar asset tabs are all reachable, the
  5   |  * Adjust panel shows adjustment controls (not video controls — the
  6   |  * previously-shipped bug), every tab click switches the panel content
  7   |  * without crashing, and the Effects / Transitions / Overlays grids
  8   |  * actually contain many distinct cards (so the user isn't staring at
  9   |  * one repeated placeholder).
  10  |  *
  11  |  * Run via:
  12  |  *   npx playwright test tests/02-tabs.spec.ts
  13  |  */
  14  | import { test, expect } from "@playwright/test";
  15  | import {
  16  | 	bootEditor,
  17  | 	clickAssetTab,
  18  | 	clickInspectorTab,
  19  | 	installErrorRecorder,
  20  | } from "./helpers";
  21  | 
  22  | test.describe("Editor — asset & inspector tabs", () => {
  23  | 	test("editor route loads without fatal errors", async ({ page }) => {
  24  | 		const { errors } = installErrorRecorder(page);
  25  | 		await bootEditor(page);
  26  | 		expect(errors, "fatal console / page errors during boot").toEqual([]);
  27  | 	});
  28  | 
  29  | 	test("asset panel exposes every documented tab", async ({ page }) => {
  30  | 		await bootEditor(page);
  31  | 		const expected: RegExp[] = [
  32  | 			/^Assets$/i,
  33  | 			/^AI Edit$/i,
  34  | 			/^Text$/i,
  35  | 			/^Elements$/i,
  36  | 			/^Transitions$/i,
  37  | 			/^Effects$/i,
  38  | 			/^Overlays$/i,
  39  | 			/^Audio$/i,
  40  | 			/^Motion$/i,
  41  | 			/^Adjust$/i,
  42  | 			/^Templates$/i,
  43  | 			/^Preset Tools$/i,
  44  | 			/^Tools$/i,
  45  | 			/^Color$/i,
  46  | 			/^Plugins$/i,
  47  | 			/^Scripting$/i,
  48  | 			/^Settings$/i,
  49  | 		];
  50  | 		for (const label of expected) {
  51  | 			const tab = page.getByRole("button", { name: label }).first();
> 52  | 			await expect(tab, `Tab matching ${label} should exist`).toBeVisible({
      |                                                            ^ Error: Tab matching /^Preset Tools$/i should exist
  53  | 				timeout: 5_000,
  54  | 			});
  55  | 		}
  56  | 	});
  57  | 
  58  | 	test("every asset tab opens without crashing the React tree", async ({
  59  | 		page,
  60  | 	}) => {
  61  | 		const { errors } = installErrorRecorder(page);
  62  | 		await bootEditor(page);
  63  | 		const tabsToVisit: RegExp[] = [
  64  | 			/^Assets$/i,
  65  | 			/^Text$/i,
  66  | 			/^Elements$/i,
  67  | 			/^Transitions$/i,
  68  | 			/^Effects$/i,
  69  | 			/^Overlays$/i,
  70  | 			/^Audio$/i,
  71  | 			/^Motion$/i,
  72  | 			/^Adjust$/i,
  73  | 			/^Templates$/i,
  74  | 			/^Preset Tools$/i,
  75  | 			/^Tools$/i,
  76  | 			/^Color$/i,
  77  | 			/^Plugins$/i,
  78  | 		];
  79  | 
  80  | 		for (const label of tabsToVisit) {
  81  | 			await clickAssetTab(page, label);
  82  | 			const text = await page.locator("body").innerText();
  83  | 			expect(text.length, `Tab ${label} body text`).toBeGreaterThan(100);
  84  | 		}
  85  | 
  86  | 		expect(errors, "no fatal errors while clicking tabs").toEqual([]);
  87  | 	});
  88  | 
  89  | 	test("Adjust panel renders adjustment controls, not video controls", async ({
  90  | 		page,
  91  | 	}) => {
  92  | 		await bootEditor(page);
  93  | 		await clickAssetTab(page, /^Adjust$/i);
  94  | 		await page.waitForTimeout(800);
  95  | 		const text = await page.locator("body").innerText();
  96  | 		// Should show adjustment category labels — not video / transform
  97  | 		// tabs (those live in the inspector, not in the Adjust panel).
  98  | 		expect(text).toMatch(/Basic|Color|Effects/i);
  99  | 		// Body must be non-trivial.
  100 | 		expect(text.length).toBeGreaterThan(200);
  101 | 	});
  102 | 
  103 | 	test("Effects panel renders many distinct cards (not 1 repeated)", async ({
  104 | 		page,
  105 | 	}) => {
  106 | 		await bootEditor(page);
  107 | 		await clickAssetTab(page, /^Effects$/i);
  108 | 		// Wait for the effect grid to settle — IO gating means cards
  109 | 		// render lazily so we need a beat.
  110 | 		await page.waitForTimeout(2_500);
  111 | 		const cards = page.locator('[draggable="true"]');
  112 | 		const count = await cards.count();
  113 | 		expect(
  114 | 			count,
  115 | 			"Effects panel should expose many distinct cards (>=30)",
  116 | 		).toBeGreaterThan(30);
  117 | 	});
  118 | 
  119 | 	test("long effect preset names render via MarqueeText", async ({
  120 | 		page,
  121 | 	}) => {
  122 | 		await bootEditor(page);
  123 | 		await clickAssetTab(page, /^Effects$/i);
  124 | 		await page.waitForTimeout(2_500);
  125 | 		// The marquee text component renders a hidden overflow track,
  126 | 		// so any element with `overflow: hidden` *and* a wider child
  127 | 		// proves the marquee mechanism is in use. Effects with long
  128 | 		// names (e.g. "Chroma Key", "Kaleidoscope") are tagged for
  129 | 		// marquee rendering.
  130 | 		const overflowing = await page.evaluate(() => {
  131 | 			const containers = Array.from(
  132 | 				document.querySelectorAll<HTMLElement>('[class*="overflow-hidden"]'),
  133 | 			);
  134 | 			return containers
  135 | 				.filter((el) => {
  136 | 					const child = el.firstElementChild as HTMLElement | null;
  137 | 					if (!child) return false;
  138 | 					return child.scrollWidth > el.clientWidth;
  139 | 				})
  140 | 				.slice(0, 5)
  141 | 				.map((el) => ({
  142 | 					scrollWidth: el.scrollWidth,
  143 | 					clientWidth: el.clientWidth,
  144 | 					text: (el.textContent ?? "").trim().slice(0, 50),
  145 | 				}));
  146 | 		});
  147 | 		expect(
  148 | 			overflowing.length,
  149 | 			"At least some Effects cards should have marquee-running text (scrollWidth > clientWidth)",
  150 | 		).toBeGreaterThan(0);
  151 | 	});
  152 | 
```