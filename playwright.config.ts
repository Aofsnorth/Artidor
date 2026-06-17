import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the Artidor editor end-to-end suite.
 *
 * Why these launch flags?
 * - `--disable-webgpu` — the editor's GPU pipeline (wgpu) crashes
 *   headless Chromium on Windows. Disabling WebGPU forces the editor
 *   into the "degraded" path (WebGL2 / canvas2d fallback) so tests
 *   can drive the React UI without the GPU process dying.
 * - `--disable-gpu` — software rasteriser so the test run doesn't
 *   try to attach to a real GPU.
 * - `--no-sandbox` / `--disable-dev-shm-usage` — standard CI flags.
 *
 * The "Projects" page and the editor page both work without a real
 * project on disk (the editor auto-creates "Untitled Project" on
 * first load), so we don't need a database fixture to run tests.
 */
export default defineConfig({
	testDir: "./tests",
	testMatch: /.*\.spec\.ts/,
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: false, // Single Next.js dev server can't host parallel rewrites cleanly
	retries: 0,
	workers: 1,
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "off",
		// Increase navigation timeout — the editor is a heavy route and
		// cold compile on first load can exceed 30s.
		actionTimeout: 15_000,
	},
	projects: [
		{
			name: "chromium-editor",
			use: {
				...devices["Desktop Chrome"],
				launchOptions: {
					args: [
						"--disable-webgpu",
						"--disable-gpu",
						"--no-sandbox",
						"--disable-dev-shm-usage",
						"--use-gl=swiftshader",
					],
				},
			},
		},
	],
	webServer: {
		command: "bun run dev:web",
		cwd: ".",
		url: "http://127.0.0.1:3000",
		timeout: 180_000,
		reuseExistingServer: true,
		stdout: "pipe",
		stderr: "pipe",
	},
});
