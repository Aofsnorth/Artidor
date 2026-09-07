import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, devices } from "playwright";

// Existing server only; every context is disposable and has no real user projects.
const browser = await chromium.launch({ headless: true, timeout: 20_000 });
const context = await browser.newContext({
	viewport: { width: 1440, height: 960 },
	reducedMotion: "reduce",
});
await context.addInitScript(() => {
	if (location.origin === "http://127.0.0.1:3005") {
		localStorage.setItem("hasSeenOnboarding", "true");
	}
});
const page = await context.newPage();
page.setDefaultTimeout(10_000);
const report = { passed: [], routes: [], runtimeErrors: [] };
page.on("pageerror", (error) =>
	report.runtimeErrors.push({ url: page.url(), message: error.message }),
);
const check = (name) => {
	report.passed.push(name);
	console.log(`PASS: ${name}`);
};
const visit = async (path) => {
	const response = await page.goto(`http://127.0.0.1:3005${path}`, {
		waitUntil: "domcontentloaded",
		timeout: 45_000,
	});
	assert(response?.ok(), `${path} returns HTTP ${response?.status()}`);
	await page.waitForTimeout(500);
};
const capture = async (name) =>
	page.screenshot({
		path: `features/ui-polish-2026-09-06/screenshots/verified-${name}.png`,
	});
const noOverflow = async (name) => {
	const size = await page.evaluate(() => ({
		width: innerWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	assert(
		size.scrollWidth <= size.width + 1,
		`${name}: ${size.scrollWidth}px overflows ${size.width}px`,
	);
};
const inViewport = async (locator, name) => {
	const rect = await locator.boundingBox();
	assert(rect, `${name} is visible`);
	const size = page.viewportSize();
	assert(
		rect.x >= -1 &&
			rect.y >= -1 &&
			rect.x + rect.width <= size.width + 1 &&
			rect.y + rect.height <= size.height + 1,
		`${name} fits viewport: ${JSON.stringify(rect)}`,
	);
};
try {
	await visit("/");
	for (const width of [375, 768, 1440]) {
		await page.setViewportSize({ width, height: 960 });
		await noOverflow(`Home ${width}`);
		assert.equal(
			await page
				.locator(
					"header a button, header button a, main > section:first-child a button",
				)
				.count(),
			0,
		);
		await capture(`home-${width}`);
	}
	assert.notEqual(
		await page
			.locator("h1")
			.evaluate((element) => getComputedStyle(element).userSelect),
		"none",
	);
	check(
		"Home fits 375/768/1440; public text selectable; no nested navigation controls",
	);

	await page.setViewportSize({ width: 375, height: 812 });
	const menuButton = page.getByRole("button", {
		name: "Toggle menu",
		exact: true,
	});
	assert.equal(await page.getByRole("dialog").count(), 0);
	await menuButton.click();
	const menu = page.getByRole("dialog");
	await menu.waitFor();
	await inViewport(menu, "Mobile navigation");
	await page.keyboard.press("Tab");
	assert(
		await menu.evaluate((element) => element.contains(document.activeElement)),
	);
	await page.keyboard.press("Shift+Tab");
	assert(
		await menu.evaluate((element) => element.contains(document.activeElement)),
	);
	await capture("mobile-menu");
	await page.keyboard.press("Escape");
	await menu.waitFor({ state: "hidden" });
	assert(
		await menuButton.evaluate((element) => element === document.activeElement),
	);
	await menuButton.click();
	await page.setViewportSize({ width: 1440, height: 960 });
	await menu.waitFor({ state: "hidden" });
	check(
		"Mobile menu traps focus, closes on Escape/desktop resize, restores trigger focus",
	);

	await visit("/projects");
	await page
		.getByRole("button", { name: "Create your first project", exact: true })
		.waitFor();
	await capture("projects-empty");
	await visit("/editor/ui-polish-verification");
	await page.waitForFunction(() =>
		Boolean(
			window.__ARTIDOR_API__ && window.__ARTIDOR_DEBUG__?.getState().tracks,
		),
	);
	await page.locator(".editing-screen").waitFor();
	await page.waitForTimeout(1500);
	await page.evaluate(async () => {
		const result = await window.__ARTIDOR_API__.run("insert_text_element", {
			content: "The quiet coast",
			durationSeconds: 5,
		});
		if (!result.ok) throw new Error(result.message);
		const saved = await window.__ARTIDOR_API__.run("save_project");
				if (!saved.ok) throw new Error(saved.message);
	});
	await page
		.getByTestId("properties-panel")
		.getByRole("button", { name: "Default tab", exact: true })
		.waitFor();
	assert.equal(
		await page.getByRole("button", { name: "Reset all", exact: true }).count(),
		0,
	);
	await page
		.getByTestId("properties-panel")
		.getByLabel("Transform", { exact: true })
		.click();
	assert.equal(
		await page
			.getByTestId("properties-panel")
			.getByLabel("Transform", { exact: true })
			.getAttribute("aria-pressed"),
		"true",
	);
	await page
		.getByTestId("properties-panel")
		.getByRole("button", { name: "Default tab", exact: true })
		.click();
	assert.equal(
		await page
			.getByTestId("properties-panel")
			.getByRole("button", { name: "Text", exact: true })
			.last()
			.getAttribute("aria-pressed"),
		"true",
	);
	const rail = page
		.getByRole("button", { name: "Assets", exact: true })
		.first();
	assert((await rail.boundingBox()).height >= 44);
	const panelStyle = await page
		.getByTestId("properties-panel")
		.evaluate((element) => ({
			blur: getComputedStyle(element).backdropFilter,
			shadow: getComputedStyle(element).boxShadow,
		}));
	assert.equal(panelStyle.blur, "none");
	assert.equal(panelStyle.shadow, "none");
	const motion = await page.evaluate(() => {
		const probe = document.createElement("span");
		probe.className = "drop-ring-rotate-fast";
		document.body.append(probe);
		const duration = getComputedStyle(probe).animationDuration;
		probe.remove();
		return duration;
	});
	assert(
		Number.parseFloat(motion) < 0.001,
		"Reduced motion disables decorative rotation",
	);
	await capture("editor-inspector");
	check(
		"Inspector selection/default tab works; rail targets >=44px; opaque panels; reduced motion",
	);

	await page.getByRole("button", { name: "Export", exact: true }).click();
	await capture("export");
	await page.keyboard.press("Escape");
	await visit("/projects");
	for (const width of [375, 768, 1440]) {
		await page.setViewportSize({ width, height: 960 });
		const search = page.getByRole("textbox", { name: "Search projects" });
		await search.waitFor();
		assert.equal(await page.locator("#projects-search-input").count(), 1);
		await inViewport(search, `Projects search ${width}`);
		await noOverflow(`Projects ${width}`);
		await capture(`projects-${width}`);
	}
	await page.setViewportSize({ width: 768, height: 1024 });
	await page.keyboard.press("/");
	assert(
		await page
			.getByRole("textbox", { name: "Search projects" })
			.evaluate((element) => element === document.activeElement),
	);
	await page
		.getByRole("textbox", { name: "Search projects" })
		.fill("no-such-project-qa");
	await page.getByRole("heading", { name: "No matching projects" }).waitFor();
	await capture("projects-no-results");
	await page.getByRole("button", { name: "Clear search", exact: true }).click();
	const sort = page.getByRole("button", {
		name: /^Sort (ascending|descending)$/,
	});
	const beforeSort = await sort.getAttribute("aria-label");
	await sort.focus();
	await page.keyboard.press("Enter");
	assert.notEqual(await sort.getAttribute("aria-label"), beforeSort);
	check(
		"Project search exists once at all widths; slash shortcut, no-results recovery, single keyboard sort",
	);

	await page
		.getByRole("button", { name: "Open settings", exact: true })
		.click();
	const settings = page.getByRole("dialog", { name: "Settings", exact: true });
	await settings.waitFor();
	for (const width of [375, 768, 1440]) {
		await page.setViewportSize({ width, height: 812 });
		await inViewport(settings, `Settings ${width}`);
		const sizes = await settings.evaluate((element) => ({
			width: element.clientWidth,
			scroll: element.scrollWidth,
		}));
		assert(
			sizes.scroll <= sizes.width + 1,
			`Settings content ${width} is not clipped`,
		);
		await capture(`settings-${width}`);
	}
	for (const label of ["AI", "Shortcuts", "Audio", "General"]) {
		await settings.getByRole("button", { name: label, exact: true }).click();
		await capture(`settings-${label.toLowerCase()}`);
	}
	await page.keyboard.press("Escape");
	check("Settings fit 375/768/1440; all four categories remain accessible");

	const publicRoutes = [
		"/docs",
		"/roadmap",
		"/changelog",
		"/blog",
		"/contributors",
		"/sponsors",
		"/brand",
		"/privacy",
		"/terms",
	];
	const details = [];
	for (const route of publicRoutes) {
		await visit(route);
		if (route === "/blog" || route === "/changelog") {
			const href = await page
				.locator(`main a[href^='${route}/']`)
				.first()
				.getAttribute("href")
				.catch(() => null);
			if (href) details.push(href);
		}
		for (const width of [375, 768, 1440]) {
			await page.setViewportSize({ width, height: 960 });
			await noOverflow(`${route} ${width}`);
			await capture(`${route.slice(1)}-${width}`);
		}
		report.routes.push(route);
		check(`${route}: 375/768/1440 layout`);
	}
	for (const route of details) {
		await visit(route);
		await noOverflow(route);
		report.routes.push(route);
		await capture(`detail-${report.routes.length}`);
	}
	for (const route of [
		"/c/ui-polish-qa",
		"/s/ui-polish-qa",
		"/oauth-callback",
	]) {
		await page.setViewportSize({ width: 375, height: 812 });
		await visit(route);
		await noOverflow(route);
		await capture(`entry-${route.split("/")[1]}`);
		report.routes.push(route);
	}
	check(
		"Collaboration entry, missing share and empty OAuth callback layout (no join/auth requests)",
	);

	for (const deviceName of ["iPhone 13", "iPad Mini", "Pixel 7"]) {
		const mobileContext = await browser.newContext({
			...devices[deviceName],
			reducedMotion: "reduce",
		});
		const mobile = await mobileContext.newPage();
		await mobile.goto("http://127.0.0.1:3005/editor/mobile-qa", {
			waitUntil: "domcontentloaded",
			timeout: 45_000,
		});
		await mobile.getByRole("heading", { name: /desktop/i }).waitFor();
		await mobile.screenshot({
			path: `features/ui-polish-2026-09-06/screenshots/verified-gate-${deviceName.replaceAll(" ", "-")}.png`,
		});
		if (deviceName === "Pixel 7")
			assert.equal(
				await mobile
					.getByRole("button", { name: "Take a look anyway" })
					.count(),
				0,
			);
		await mobileContext.close();
	}
	check("Existing iPhone/iPad soft gate and Android hard gate preserved");
	assert.equal(
		report.runtimeErrors.length,
		0,
		JSON.stringify(report.runtimeErrors),
	);
} catch (error) {
	report.failure = {
		message: error.message,
		url: page.url(),
		text: (await page.locator("body").innerText()).slice(0, 10_000),
	};
	await capture("failure");
	throw error;
} finally {
	await writeFile(
		"features/ui-polish-2026-09-06/verification.json",
		JSON.stringify(report, null, 2),
	);
	await browser.close();
}
