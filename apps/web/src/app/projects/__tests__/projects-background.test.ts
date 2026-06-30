import { readFile } from "node:fs/promises";
import { describe, expect, test } from "bun:test";

const projectsPageSource = () =>
	readFile(new URL("../page.tsx", import.meta.url), "utf8");

describe("projects page background", () => {
	test("removes the old Covenant artwork background", async () => {
		const source = await projectsPageSource();

		expect(source).not.toContain("/wallpaper/projects-covenant.webp");
	});

	test("renders the PinedIn-style background layer", async () => {
		const source = await projectsPageSource();

		expect(source).toContain("<ProjectsBackground />");
	});
});
