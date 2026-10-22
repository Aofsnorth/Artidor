/**
 * Export download helper — the object URL must outlive the synthetic click.
 *
 * Revoking immediately after `click()` can cancel a large download in
 * Firefox/Safari before the browser starts fetching it.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { downloadBuffer } from "./index";

type Globals = Record<string, unknown>;
const globals = globalThis as unknown as Globals;
const originalDocument = globals.document;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
	URL.createObjectURL = () => "blob:export";
	URL.revokeObjectURL = () => {};
});

afterEach(() => {
	if (originalDocument === undefined) {
		delete globals.document;
	} else {
		globals.document = originalDocument;
	}
	URL.createObjectURL = originalCreateObjectURL;
	URL.revokeObjectURL = originalRevokeObjectURL;
});

describe("downloadBuffer", () => {
	test("revokes the object URL after the click, not synchronously", async () => {
		const revoked: string[] = [];
		const clicked: Array<{ href: string; download: string }> = [];
		const link = {
			href: "",
			download: "",
			click() {
				clicked.push({ href: this.href, download: this.download });
			},
		};
		globals.document = {
			createElement: () => link,
			body: { appendChild: () => {}, removeChild: () => {} },
		};
		URL.revokeObjectURL = (url: string) => {
			revoked.push(url);
		};

		downloadBuffer({
			buffer: new ArrayBuffer(8),
			filename: "clip.mp4",
			mimeType: "video/mp4",
			revokeDelayMs: 5,
		});

		expect(clicked).toEqual([{ href: "blob:export", download: "clip.mp4" }]);
		// Still alive immediately after click: the download may not have started.
		expect(revoked).toEqual([]);

		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(revoked).toEqual(["blob:export"]);
	});
});
