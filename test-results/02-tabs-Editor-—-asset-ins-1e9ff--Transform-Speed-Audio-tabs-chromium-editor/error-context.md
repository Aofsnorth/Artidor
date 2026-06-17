# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-tabs.spec.ts >> Editor — asset & inspector tabs >> Text element inspector does NOT show Transform / Speed / Audio tabs
- Location: tests\02-tabs.spec.ts:205:6

# Error details

```
Error: element 6e0065c4-d0fd-4ecf-82fe-7b54d67f8221 not in state

expect(received).toBeTruthy()

Received: undefined
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - region "Notifications alt+T"
  - generic [ref=e7] [cursor=pointer]:
    - button "Open issues overlay" [ref=e8]:
      - img [ref=e10]
      - generic [ref=e12]:
        - generic [ref=e13]: "6"
        - generic [ref=e14]: "7"
      - generic [ref=e15]:
        - text: Issue
        - generic [ref=e16]: s
    - button "Collapse issues badge" [ref=e17]:
      - img [ref=e18]
  - alert [ref=e20]
  - generic [ref=e23]:
    - banner [ref=e24]:
      - generic [ref=e25]:
        - button "Artidor Logo" [ref=e26] [cursor=pointer]:
          - img "Project thumbnail" [ref=e27]
        - generic [ref=e28]:
          - generic [ref=e29]:
            - link "Projects" [ref=e30] [cursor=pointer]:
              - /url: /projects
            - generic [ref=e31]: /
          - textbox [ref=e32] [cursor=pointer]: Untitled Project
      - button "Fit" [ref=e34]:
        - generic [ref=e35]: Fit
        - img [ref=e36]
      - navigation [ref=e38]:
        - button "Open settings" [ref=e39] [cursor=pointer]:
          - img [ref=e40]
        - button "Invite collaborators" [ref=e43]:
          - img [ref=e44]
          - generic [ref=e48]: Invite
        - button "Export" [ref=e50] [cursor=pointer]:
          - img [ref=e51]
          - generic [ref=e55]: Export
          - img [ref=e56]
    - generic [ref=e59]:
      - generic [ref=e60]:
        - generic [ref=e61]:
          - button "Assets" [ref=e62] [cursor=pointer]:
            - img
            - generic [ref=e63]: Assets
          - button "AI Edit" [disabled] [ref=e64]:
            - img
            - generic [ref=e65]: AI Edit
          - button "Text" [ref=e66] [cursor=pointer]:
            - img
            - generic [ref=e67]: Text
          - button "Elements" [ref=e68] [cursor=pointer]:
            - img
            - generic [ref=e69]: Elements
          - button "Transitions" [ref=e70] [cursor=pointer]:
            - img
            - generic [ref=e71]: Transitions
          - button "Effects" [ref=e72] [cursor=pointer]:
            - img
            - generic [ref=e73]: Effects
          - button "Overlays" [ref=e74] [cursor=pointer]:
            - img
            - generic [ref=e75]: Overlays
          - button "Audio" [ref=e76] [cursor=pointer]:
            - img
            - generic [ref=e77]: Audio
          - button "Motion" [ref=e78] [cursor=pointer]:
            - img
            - generic [ref=e79]: Motion
          - button "Adjust" [ref=e80] [cursor=pointer]:
            - img
            - generic [ref=e81]: Adjust
          - button "Templates" [ref=e82] [cursor=pointer]:
            - img
            - generic [ref=e83]: Templates
          - button "Preset" [ref=e84] [cursor=pointer]:
            - img
            - generic [ref=e85]: Preset
          - button "Tools" [ref=e86] [cursor=pointer]:
            - img
            - generic [ref=e87]: Tools
          - button "Plugins" [ref=e88] [cursor=pointer]:
            - img
            - generic [ref=e89]: Plugins
          - button "Scripting" [ref=e90] [cursor=pointer]:
            - img
            - generic [ref=e91]: Scripting
          - button "Settings" [ref=e92] [cursor=pointer]:
            - img
            - generic [ref=e93]: Settings
        - generic "1 MB used of 3 GB available" [ref=e94]:
          - generic [ref=e95]: 3 GB
          - generic [ref=e96]: Free
      - generic [ref=e101]:
        - generic [ref=e103]:
          - generic [ref=e108]:
            - generic [ref=e109]:
              - generic [ref=e110]: Assets
              - generic [ref=e111]:
                - button [ref=e112] [cursor=pointer]:
                  - img
                - button [ref=e113] [cursor=pointer]:
                  - img
                - button "Import" [ref=e114] [cursor=pointer]:
                  - img
                  - text: Import
            - generic [ref=e117]:
              - generic [ref=e118]:
                - button "Library Local project media" [ref=e119]:
                  - generic [ref=e120]: Library
                  - generic [ref=e121]: Local project media
                - button "Stock Browse licensed assets" [ref=e122]:
                  - generic [ref=e123]: Stock
                  - generic [ref=e124]: Browse licensed assets
                - button "Cloud Synced team media" [ref=e125]:
                  - generic [ref=e126]: Cloud
                  - generic [ref=e127]: Synced team media
              - generic [ref=e128]:
                - generic [ref=e129]:
                  - generic [ref=e130]: Videos
                  - generic [ref=e131]: "0"
                - generic [ref=e132]:
                  - generic [ref=e133]: Audio
                  - generic [ref=e134]: "0"
                - generic [ref=e135]:
                  - generic [ref=e136]: Images
                  - generic [ref=e137]: "0"
              - generic [ref=e138]:
                - button "New folder" [ref=e139] [cursor=pointer]:
                  - img
                  - text: New folder
                - button "Your creative journey begins here Import media or drag and drop to get started. Import media" [ref=e140]:
                  - img [ref=e144]
                  - generic [ref=e147]:
                    - heading "Your creative journey begins here" [level=3] [ref=e148]
                    - paragraph [ref=e149]: Import media or drag and drop to get started.
                  - generic [ref=e150]: Import media
          - separator [ref=e151]
          - generic [ref=e155]:
            - generic [ref=e157]:
              - generic [ref=e158]:
                - button "Fit" [ref=e159]
                - button "16:9" [ref=e160]
                - button "Fullscreen preview" [ref=e161]:
                  - img [ref=e162]
                - button "More preview tools" [ref=e164]:
                  - img [ref=e165]
              - application "Preview canvas" [ref=e171]
            - generic [ref=e172]:
              - generic [ref=e173]:
                - button "Show audio visualizer" [ref=e174] [cursor=pointer]
                - button "00:00:00:00" [ref=e182] [cursor=pointer]
                - generic [ref=e183]: /
                - generic [ref=e184]: 00:00:00:00
              - generic [ref=e185]:
                - button "Go to start" [ref=e186] [cursor=pointer]:
                  - img
                - button "Jump backward (or previous bookmark)" [ref=e187] [cursor=pointer]:
                  - img
                - button "Play" [ref=e188] [cursor=pointer]:
                  - img
                - button "Jump forward (or next bookmark)" [ref=e189] [cursor=pointer]:
                  - img
                - button "Go to end" [ref=e190] [cursor=pointer]:
                  - img
              - generic [ref=e191]:
                - button "Enable loop playback" [ref=e192] [cursor=pointer]:
                  - img
                - generic [ref=e193]:
                  - button "Freehand draw" [ref=e194] [cursor=pointer]:
                    - img
                  - button "Vector draw" [ref=e195] [cursor=pointer]:
                    - img
                - button [ref=e196] [cursor=pointer]:
                  - img
          - separator [ref=e197]
          - generic [ref=e200]:
            - generic [ref=e203]:
              - generic [ref=e205]:
                - generic [ref=e206]: Details
                - button "Reset all" [ref=e207]
              - generic [ref=e209]:
                - generic [ref=e210]:
                  - generic [ref=e211]:
                    - img [ref=e212]
                    - button "Regenerate thumbnail from first frame" [ref=e214]:
                      - img [ref=e215]
                  - generic [ref=e218]:
                    - generic "Untitled Project" [ref=e219]
                    - button "Reset all" [ref=e220]
                  - generic [ref=e222]: Project
                  - button "View full project info" [ref=e223]
                - generic [ref=e224]:
                  - generic [ref=e225]:
                    - img [ref=e226]
                    - generic [ref=e229]: Project
                  - generic [ref=e230]:
                    - generic [ref=e231]:
                      - term [ref=e232]: Duration
                      - definition [ref=e233]: 0:00
                    - generic [ref=e234]:
                      - term [ref=e235]: Frame rate
                      - definition [ref=e236]:
                        - generic [ref=e237]:
                          - generic [ref=e238]: "30"
                          - generic [ref=e239]: fps
                    - generic [ref=e240]:
                      - term [ref=e241]: Resolution
                      - definition [ref=e242]: 1920 × 1080
                    - generic [ref=e243]:
                      - term [ref=e244]: Background
                      - definition [ref=e245]: Solid color
                - generic [ref=e246]:
                  - generic [ref=e247]:
                    - img [ref=e248]
                    - generic [ref=e252]: Activity
                  - generic [ref=e253]:
                    - generic [ref=e254]:
                      - term [ref=e255]: Created
                      - definition [ref=e256]: Jun 18, 2026
                    - generic [ref=e257]:
                      - term [ref=e258]: Modified
                      - definition [ref=e259]: Jun 18, 2026
                    - generic [ref=e260]:
                      - term [ref=e261]: Project ID
                      - definition [ref=e262]:
                        - generic [ref=e263]:
                          - code [ref=e264]: 6920bb9b
                          - button "Copy project ID" [ref=e265]:
                            - img [ref=e266]
            - generic [ref=e269]:
              - button "Resize audio meter" [ref=e270]
              - generic [ref=e271]:
                - generic [ref=e272]:
                  - generic:
                    - generic: "-60"
                    - generic: "-54"
                    - generic: "-48"
                    - generic: "-42"
                    - generic: "-36"
                    - generic: "-30"
                    - generic: "-24"
                    - generic: "-18"
                    - generic: "-12"
                    - generic: "-6"
                    - generic: "0"
                - generic [ref=e273]:
                  - generic:
                    - generic: "-60"
                    - generic: "-54"
                    - generic: "-48"
                    - generic: "-42"
                    - generic: "-36"
                    - generic: "-30"
                    - generic: "-24"
                    - generic: "-18"
                    - generic: "-12"
                    - generic: "-6"
                    - generic: "0"
              - generic [ref=e274]:
                - generic [ref=e275]: L
                - generic [ref=e276]: R
              - generic [ref=e277]:
                - button "DIM" [ref=e278]
                - button "Open audio visualizer" [ref=e279]:
                  - img [ref=e280]
        - separator [ref=e281]
        - region "Timeline" [ref=e286]:
          - generic [ref=e288]:
            - generic [ref=e289]:
              - button "Add track" [ref=e290] [cursor=pointer]:
                - img
                - text: Add track
              - generic [ref=e291]:
                - button [ref=e292] [cursor=pointer]:
                  - img
                - button [ref=e293] [cursor=pointer]:
                  - img
                - button [ref=e295] [cursor=pointer]:
                  - img
                - button [ref=e296] [cursor=pointer]:
                  - img
                - button [ref=e298] [cursor=pointer]:
                  - img
                - button [ref=e299] [cursor=pointer]:
                  - img
                - button [ref=e301] [cursor=pointer]:
                  - img
                - button [disabled] [ref=e302]:
                  - img [ref=e303]
                - button [ref=e309] [cursor=pointer]:
                  - img
                - button [ref=e310] [cursor=pointer]:
                  - img
                - button [ref=e311] [cursor=pointer]:
                  - img
                - button [ref=e312] [cursor=pointer]:
                  - img
                - button [ref=e313] [cursor=pointer]:
                  - img
                - button [ref=e315] [cursor=pointer]:
                  - img
                - button [ref=e316] [cursor=pointer]:
                  - img
                - button [ref=e317] [cursor=pointer]:
                  - img
                - button [ref=e318] [cursor=pointer]:
                  - img
                - button [ref=e320] [cursor=pointer]:
                  - img
            - button "Main scene" [ref=e322] [cursor=pointer]:
              - generic [ref=e323]: Main scene
              - img [ref=e325]
            - generic [ref=e330]:
              - button [ref=e331] [cursor=pointer]:
                - img
              - button [ref=e332] [cursor=pointer]:
                - img
              - button [ref=e334] [cursor=pointer]:
                - img
              - button [ref=e335] [cursor=pointer]:
                - img
              - button [ref=e336] [cursor=pointer]:
                - img
              - button [ref=e338] [cursor=pointer]:
                - img
              - button [ref=e339] [cursor=pointer]:
                - img
              - button [ref=e340] [cursor=pointer]:
                - img
              - button [ref=e342] [cursor=pointer]:
                - img
              - button [ref=e344] [cursor=pointer]:
                - img
              - button [ref=e345] [cursor=pointer]:
                - img
              - generic [ref=e347]:
                - button "Zoom out" [ref=e348] [cursor=pointer]:
                  - img
                - slider [ref=e353]
                - button "Zoom in" [ref=e354] [cursor=pointer]:
                  - img
          - generic [ref=e355]:
            - generic [ref=e356]:
              - button "Resize track labels column" [ref=e357]:
                - generic:
                  - img
              - generic [ref=e360]: Tracks
              - generic [ref=e365]:
                - generic [ref=e366]:
                  - generic [ref=e367]:
                    - button "Hide track" [ref=e368] [cursor=pointer]:
                      - img [ref=e369]
                    - button "Change track color" [ref=e372]
                    - generic [ref=e373]: V1
                    - button "Main Track" [ref=e374]
                  - button "Lock track" [ref=e376] [cursor=pointer]:
                    - img [ref=e377]
                - generic [ref=e380]:
                  - generic [ref=e381]:
                    - generic [ref=e382]: O
                    - 'slider "Track opacity: 100%" [ref=e383] [cursor=pointer]': "100"
                    - generic [ref=e384]: 100%
                  - generic [ref=e385]:
                    - generic [ref=e386]: V
                    - 'slider "Track volume: 100%" [ref=e387] [cursor=pointer]': "100"
                    - generic [ref=e388]: 100%
            - generic [ref=e390]:
              - generic [ref=e392]:
                - slider "Timeline ruler" [ref=e393]:
                  - generic [ref=e394]: 00:00:00:00
                  - generic [ref=e399]: 00:00:00:15
                  - generic [ref=e404]: 00:00:01:00
                  - generic [ref=e409]: 00:00:01:15
                  - generic [ref=e414]: 00:00:02:00
                  - generic [ref=e419]: 00:00:02:15
                  - generic [ref=e424]: 00:00:03:00
                  - generic [ref=e429]: 00:00:03:15
                - generic "Timeline ruler" [ref=e434]
              - generic [ref=e438]:
                - generic [ref=e439]:
                  - button "Select Main Track track" [ref=e440]
                  - generic [ref=e441]:
                    - generic: Drop media
                - button "Resize track height" [ref=e442]
              - slider "Timeline playhead":
                - button "Drag playhead" [ref=e444]
    - generic [ref=e445]:
      - generic "Total time you have been working on this project." [ref=e447]:
        - generic [ref=e448]: Worked on
        - generic [ref=e449]: 00:00:04
      - generic [ref=e450]:
        - generic [ref=e451]: 1080p
        - generic [ref=e452]: •
        - generic [ref=e453]: 30 fps
        - generic [ref=e454]: •
        - generic [ref=e455]: 16:9
        - generic [ref=e456]: •
        - generic [ref=e457]: Stereo
```

# Test source

```ts
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
  140 | 		content: opts.content ?? "Hello world",
  141 | 		durationSeconds: opts.durationSeconds ?? 3,
  142 | 		fontSize: opts.fontSize ?? 48,
  143 | 		color: opts.color ?? "#ffffff",
  144 | 		...(opts.trackId ? { trackId: opts.trackId } : {}),
  145 | 	});
  146 | 	expect(result.ok, `insert_text_element: ${result.message}`).toBe(true);
  147 | 	const data = result.data as { id?: string } | undefined;
  148 | 	expect(data?.id, "insert_text_element returned no id").toBeTruthy();
  149 | 	return data!.id!;
  150 | }
  151 | 
  152 | /** Select an element on the timeline by id. */
  153 | export async function selectElement(
  154 | 	page: Page,
  155 | 	trackId: string,
  156 | 	elementId: string,
  157 | ): Promise<void> {
  158 | 	const result = await runCommand(page, "select_elements", {
  159 | 		elements: [{ trackId, elementId }],
  160 | 	});
  161 | 	expect(result.ok, `select_elements: ${result.message}`).toBe(true);
  162 | }
  163 | 
  164 | /** Convenience: insert a text element and then select it. */
  165 | export async function insertAndSelectText(
  166 | 	page: Page,
  167 | 	opts: {
  168 | 		content?: string;
  169 | 		durationSeconds?: number;
  170 | 		fontSize?: number;
  171 | 		color?: string;
  172 | 	} = {},
  173 | ): Promise<{ elementId: string; trackId: string }> {
  174 | 	const elementId = await insertTextElement(page, opts);
  175 | 	const state = await getEditorState(page);
  176 | 	const element = state.elements.find((e) => e.id === elementId);
> 177 | 	expect(element, `element ${elementId} not in state`).toBeTruthy();
      |                                                       ^ Error: element 6e0065c4-d0fd-4ecf-82fe-7b54d67f8221 not in state
  178 | 	await selectElement(page, element!.trackId, elementId);
  179 | 	return { elementId, trackId: element!.trackId };
  180 | }
  181 | 
  182 | /** Click an inspector / properties tab by label (e.g. "Transform"). */
  183 | export async function clickInspectorTab(
  184 | 	page: Page,
  185 | 	label: RegExp,
  186 | ): Promise<void> {
  187 | 	const tab = page.locator('[role="tablist"] button, [role="tab"]').filter({
  188 | 		hasText: label,
  189 | 	}).first();
  190 | 	await tab.scrollIntoViewIfNeeded({ timeout: 10_000 });
  191 | 	await tab.click({ force: true, timeout: 10_000 });
  192 | 	await page.waitForTimeout(400);
  193 | }
  194 | 
  195 | /** Collect every visible "page error" / fatal console error. */
  196 | export function installErrorRecorder(page: Page): {
  197 | 	errors: string[];
  198 | 	warnings: string[];
  199 | } {
  200 | 	const errors: string[] = [];
  201 | 	const warnings: string[] = [];
  202 | 	page.on("pageerror", (err) => errors.push(err.message));
  203 | 	page.on("console", (msg) => {
  204 | 		const t = msg.text();
  205 | 		if (msg.type() === "error") {
  206 | 			// Allow noise from third-party libs and known noisy logs.
  207 | 			if (
  208 | 				/Uncaught/i.test(t) ||
  209 | 				/TypeError/i.test(t) ||
  210 | 				/Hydration/i.test(t) ||
  211 | 				/Cannot read properties/i.test(t) ||
  212 | 				/is not a function/i.test(t)
  213 | 			) {
  214 | 				errors.push(t);
  215 | 			} else {
  216 | 				warnings.push(t);
  217 | 			}
  218 | 		}
  219 | 	});
  220 | 	return { errors, warnings };
  221 | }
  222 | 
```