/**
 * Smoke test: the editor route loads without console errors, hydration
 * errors, or uncaught exceptions. Fails fast if the page is blank or
 * the React app crashes on mount.
 *
 * Run via:
 *   npx playwright test tests/smoke.spec.ts
 */
import { test, expect } from "@playwright/test";

test.describe("Editor smoke", () => {
	test("editor route loads cleanly", async ({ page }) => {
		const consoleErrors: string[] = [];
		const pageErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});
		page.on("pageerror", (err) => {
			pageErrors.push(err.message);
		});

		await page.goto("/editor/test-project", { waitUntil: "domcontentloaded" });

		// The editor uses a dark theme; verify the html has the dark class
		// so we know the React tree actually mounted (Next.js streams the
		// initial markup, then React hydrates — checking a class change
		// is more reliable than waiting for a specific element).
		await expect(page.locator("html")).toHaveClass(/dark/);

		// Wait for the editor shell to render. EditorHeader always
		// renders "Artidor" branding on the left of the top bar.
		await expect(page.getByText(/Artidor/i).first()).toBeVisible({
			timeout: 30_000,
		});

		// No uncaught exceptions during mount.
		expect(pageErrors).toEqual([]);

		// We allow console.error noise from third-party libs (Next.js dev
		// warnings, hydration hints) but fail on the project-wide
		// "Uncaught" / "Error:" patterns that indicate a real bug.
		const fatalConsoleErrors = consoleErrors.filter(
			(e) =>
				/Uncaught/i.test(e) ||
				/TypeError/i.test(e) ||
				/RangeError/i.test(e) ||
				/Error: Hydration/i.test(e),
		);
		expect(fatalConsoleErrors).toEqual([]);
	});

	test("projects route loads", async ({ page }) => {
		await page.goto("/projects", { waitUntil: "domcontentloaded" });
		// Projects page should render the header or main grid; wait
		// for any meaningful text to appear.
		await expect(page.locator("body")).toBeVisible();
		const bodyText = await page.locator("body").innerText();
		expect(bodyText.length).toBeGreaterThan(50);
	});

	test("landing page loads", async ({ page }) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await expect(page.locator("body")).toBeVisible();
		const bodyText = await page.locator("body").innerText();
		expect(bodyText.length).toBeGreaterThan(50);
	});
});
