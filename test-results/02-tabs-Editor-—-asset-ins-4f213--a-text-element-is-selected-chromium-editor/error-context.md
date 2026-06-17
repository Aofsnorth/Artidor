# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-tabs.spec.ts >> Editor — asset & inspector tabs >> inspector shows a Text tab when a text element is selected
- Location: tests\02-tabs.spec.ts:209:6

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.panel.glass-strong').last().locator('button[aria-label="Text"]').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('.panel.glass-strong').last().locator('button[aria-label="Text"]').first()

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
- text: 3 GB Free Assets
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
- text: / 00:00:03:00
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
- text: Inspector
- button "Reset all"
- button "Element" [disabled]:
  - img
  - text: Element
- button "Text"
- button "Video" [disabled]:
  - img
  - text: Video
- button "Image" [disabled]:
  - img
  - text: Image
- button "Audio" [disabled]:
  - img
  - text: Audio
- text: text
- button "Inspector smoke"
- text: text
- button "Favourite media" [disabled]:
  - img
- button "Media card options":
  - img
- button "Text":
  - img
  - text: Text
- button "Transform":
  - img
  - text: Transform
- button "Link":
  - img
  - text: Link
- button "Camera":
  - img
  - text: Camera
- button "Animation":
  - img
  - text: Animation
- button "Content"
- button "Collapse section":
  - img
- textbox "Name": Inspector smoke
- button "Style"
- button "Collapse section":
  - img
- text: Alignment
- button "Align left": ←
- button "Align center" [pressed]: ↔
- button "Align right": →
- text: Emphasis
- button "Bold": B
- button "Italic": I
- text: Decoration
- combobox: No decoration
- button "Animate"
- button "Collapse section":
  - img
- text: Preset
- combobox: None
- button "Typography"
- button "Collapse section":
  - img
- text: Font
- button "Inter":
  - img
  - text: Inter
- text: Size
- button "Drag to adjust value":
  - img
- textbox: "48"
- button "Reset to default":
  - img
- button "Toggle text color keyframe":
  - img
- text: Color
- button
- textbox: FFFFFF
- button "Spacing"
- button "Collapse section":
  - img
- text: Letter spacing
- button "Drag to adjust value":
  - img "Text width"
- textbox: "0"
- text: Line height
- button "Drag to adjust value":
  - img "Text height"
- textbox: "1.2"
- button "Background"
- button:
  - img
- button "Expand section":
  - img
- button "Toggle background color keyframe":
  - img
- text: Color
- button
- textbox: "000000"
- button "Toggle background width keyframe":
  - img
- text: Width
- button "Drag to adjust value": W
- textbox: "0"
- button "Reset to default":
  - img
- button "Toggle background height keyframe":
  - img
- text: Height
- button "Drag to adjust value": H
- textbox: "0"
- button "Reset to default":
  - img
- button "Toggle x-offset keyframe":
  - img
- text: X-offset
- button "Drag to adjust value": X
- textbox: "0"
- button "Toggle y-offset keyframe":
  - img
- text: Y-offset
- button "Drag to adjust value": "Y"
- textbox: "0"
- button "Toggle corner radius keyframe":
  - img
- text: Corner radius
- button "Drag to adjust value": R
- textbox: "0"
- button "Effects"
- button "Collapse section":
  - img
- text: Stroke
- switch
- text: Shadow
- switch
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
  - text: T1
  - button "Text track"
  - button "Lock track"
  - button "Delete track"
  - text: O
  - 'slider "Track opacity: 100%"': "100"
  - text: 100%
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
  - slider "Timeline ruler": 00:00:00:00 00:00:00:15 00:00:01:00 00:00:01:15 00:00:02:00 00:00:02:15 00:00:03:00 00:00:03:15 00:00:04:00 00:00:04:15
  - button "Select Text track track"
  - button "Inspector smoke"
  - button "Left resize handle"
  - button "Right resize handle"
  - button "Resize track height"
  - button "Select Main Track track"
  - text: Drop media
  - button "Resize track height"
  - slider "Timeline playhead":
    - button "Drag playhead"
- text: Worked on 00:00:14 1080p • 30 fps • 16:9 • Stereo
```

# Test source

```ts
  123 | 	test("Effects panel renders many distinct cards (not 1 repeated)", async ({
  124 | 		page,
  125 | 	}) => {
  126 | 		await bootEditor(page);
  127 | 		await clickAssetTab(page, /^Effects$/i);
  128 | 		// Wait for the effect grid to settle — IO gating means cards
  129 | 		// render lazily so we need a beat.
  130 | 		await page.waitForTimeout(2_500);
  131 | 		const count = await countAssetCards(page);
  132 | 		expect(
  133 | 			count,
  134 | 			"Effects panel should expose many distinct cards (>=30)",
  135 | 		).toBeGreaterThan(30);
  136 | 	});
  137 | 
  138 | 	test("long effect preset names render via MarqueeText", async ({
  139 | 		page,
  140 | 	}) => {
  141 | 		await bootEditor(page);
  142 | 		await clickAssetTab(page, /^Effects$/i);
  143 | 		await page.waitForTimeout(2_500);
  144 | 		// The marquee text component renders a hidden overflow track,
  145 | 		// so any element with `overflow: hidden` *and* a wider child
  146 | 		// proves the marquee mechanism is in use. Effects with long
  147 | 		// names (e.g. "Chroma Key", "Kaleidoscope") are tagged for
  148 | 		// marquee rendering.
  149 | 		const overflowing = await page.evaluate(() => {
  150 | 			const containers = Array.from(
  151 | 				document.querySelectorAll<HTMLElement>('[class*="overflow-hidden"]'),
  152 | 			);
  153 | 			return containers
  154 | 				.filter((el) => {
  155 | 					const child = el.firstElementChild as HTMLElement | null;
  156 | 					if (!child) return false;
  157 | 					return child.scrollWidth > el.clientWidth;
  158 | 				})
  159 | 				.slice(0, 5)
  160 | 				.map((el) => ({
  161 | 					scrollWidth: el.scrollWidth,
  162 | 					clientWidth: el.clientWidth,
  163 | 					text: (el.textContent ?? "").trim().slice(0, 50),
  164 | 				}));
  165 | 		});
  166 | 		expect(
  167 | 			overflowing.length,
  168 | 			"At least some Effects cards should have marquee-running text (scrollWidth > clientWidth)",
  169 | 		).toBeGreaterThan(0);
  170 | 	});
  171 | 
  172 | 	test("Transitions panel renders many distinct cards", async ({ page }) => {
  173 | 		await bootEditor(page);
  174 | 		await clickAssetTab(page, /^Transitions$/i);
  175 | 		await page.waitForTimeout(2_500);
  176 | 		const count = await countAssetCards(page);
  177 | 		expect(
  178 | 			count,
  179 | 			"Transitions panel should expose many distinct cards (>=20)",
  180 | 		).toBeGreaterThan(20);
  181 | 	});
  182 | 
  183 | 	test("Overlays panel renders many distinct cards", async ({ page }) => {
  184 | 		await bootEditor(page);
  185 | 		await clickAssetTab(page, /^Overlays$/i);
  186 | 		await page.waitForTimeout(2_500);
  187 | 		const count = await countAssetCards(page);
  188 | 		expect(
  189 | 			count,
  190 | 			"Overlays panel should expose many distinct cards (>=10)",
  191 | 		).toBeGreaterThan(10);
  192 | 	});
  193 | 
  194 | 	test("AI Edit tab is gated (Coming Soon) but the DOM exists", async ({
  195 | 		page,
  196 | 	}) => {
  197 | 		await bootEditor(page);
  198 | 		const aiTab = page.getByRole("button", { name: /AI Edit/i }).first();
  199 | 		await expect(aiTab).toBeVisible();
  200 | 		const ariaDisabled = await aiTab.getAttribute("aria-disabled");
  201 | 		const classAttr = (await aiTab.getAttribute("class")) ?? "";
  202 | 		const isDimmed = /opacity-40|cursor-not-allowed/.test(classAttr);
  203 | 		expect(
  204 | 			ariaDisabled === "true" || isDimmed,
  205 | 			"AI Edit tab should be visibly disabled while feature flag is off",
  206 | 		).toBeTruthy();
  207 | 	});
  208 | 
  209 | 	test("inspector shows a Text tab when a text element is selected", async ({
  210 | 		page,
  211 | 	}) => {
  212 | 		await bootEditor(page);
  213 | 		await insertAndSelectText(page, { content: "Inspector smoke" });
  214 | 		await page.waitForTimeout(800);
  215 | 		// The inspector should now be visible with a "Text" tab (since
  216 | 		// the element is a text element). Scope to the PropertiesPanel
  217 | 		// so we don't hit the asset-panel "Text" tab by mistake.
  218 | 		const inspector = page.locator(".panel.glass-strong").last();
  219 | 		await expect(inspector).toBeVisible();
  220 | 		const inspectorTextTab = inspector
  221 | 			.locator('button[aria-label="Text"]')
  222 | 			.first();
> 223 | 		await expect(inspectorTextTab).toBeVisible({ timeout: 10_000 });
      |                                  ^ Error: expect(locator).toBeVisible() failed
  224 | 	});
  225 | 
  226 | 	test("Text element inspector does NOT show Speed / Speed Ramp / Audio tabs", async ({
  227 | 		page,
  228 | 	}) => {
  229 | 		await bootEditor(page);
  230 | 		await insertAndSelectText(page, { content: "Text only" });
  231 | 		await page.waitForTimeout(500);
  232 | 		// Scope to the PropertiesPanel (right column) so we don't
  233 | 		// false-positive on the asset-panel tabs in the left bar.
  234 | 		const inspector = page.locator(".panel.glass-strong").last();
  235 | 		await expect(inspector).toBeVisible();
  236 | 		// Tabs that should NOT appear for a plain text element.
  237 | 		for (const forbiddenLabel of ["Speed", "Speed Ramp", "Audio"]) {
  238 | 			const tab = inspector
  239 | 				.locator(`button[aria-label="${forbiddenLabel}"]`)
  240 | 				.first();
  241 | 			const visible = await tab.isVisible({ timeout: 500 }).catch(() => false);
  242 | 			expect(
  243 | 				visible,
  244 | 				`Text inspector should not show tab "${forbiddenLabel}"`,
  245 | 			).toBe(false);
  246 | 		}
  247 | 	});
  248 | });
  249 | 
```