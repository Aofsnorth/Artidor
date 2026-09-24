// Run: node tests/ai-edit-scroll.mjs
// Real React StrictMode, AIEditView and conversation store; no app server or AI calls.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const webRoot = fileURLToPath(
	new URL("../apps/web/", import.meta.url),
).replaceAll("\\", "/");
const componentPath = fileURLToPath(
	new URL(
		"../apps/web/src/components/editor/panels/assets/views/ai-edit.tsx",
		import.meta.url,
	),
).replaceAll("\\", "/");
const boundaries = `
import { createElement } from "react";
import { useAIStore } from "@/stores/ai-store";
export default function Markdown({ children }) {
  return createElement("div", { style: { whiteSpace: "pre-wrap" } }, children);
}
const assets = [{ id: "fixture-asset", name: "Fixture clip", type: "video" }];
const send = ({ text }) => {
  useAIStore.getState().appendMessage({ role: "user", content: text });
  return Promise.resolve();
};
const editor = {
  project: { subscribe: () => () => {}, getActive: () => null },
  media: { getAssets: () => assets },
  ai: { send, steer: (text) => send({ text }) },
};
export const useEditor = (selector) => selector ? selector(editor) : editor;
const providers = { providers: [], getDefault: () => undefined };
export const useAIProvidersStore = (selector) => selector(providers);
export const useSettingsStore = (selector) => selector({ aiName: "Arth" });
const telemetry = { events: [], enabled: false, setEnabled: () => {} };
export const useTelemetryStore = (selector) => selector(telemetry);
const mcp = { connections: [], servers: [] };
export const useMcpStore = (selector) => selector(mcp);
export const getMcpConnectionManager = () => { throw new Error("Unexpected MCP call"); };
export const TakeoverPermissionCard = () => null;
export const TakeoverActiveBanner = () => null;
export const AIProvidersManager = () => null;
const t = (key) => key;
export const useI18n = () => ({ t });
`;
const bootstrap = `
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
let root;
window.scrollFixture = {
  store: useAIStore,
  mount() {
    root = createRoot(document.getElementById("root"));
    root.render(<StrictMode><AIEditView /></StrictMode>);
  },
  unmount() { root.unmount(); },
};
window.scrollFixture.mount();
`;
const mockedImports = [
	"@/hooks/use-editor",
	"@/stores/ai-providers-store",
	"@/stores/settings-store",
	"@/lib/ai/telemetry/store",
	"@/stores/mcp-store",
	"@/components/editor/ai-takeover/permission-card",
	"@/components/editor/ai-takeover/takeover-active-banner",
	"./ai-providers-manager",
	"@/lib/i18n",
	"react-markdown",
];
// Node drives Chromium; a custom namespace avoids Bun's Windows file-path panic.
const script = execFileSync(
	"bun",
	[
		"-e",
		`
const mocked = new Set(${JSON.stringify(mockedImports)});
const componentPath = ${JSON.stringify(componentPath)};
const result = await Bun.build({
  entrypoints: [componentPath],
  target: "browser",
  format: "iife",
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{ name: "scroll-fixture", setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      if (mocked.has(args.path)) return { path: "boundaries", namespace: "scroll-fixture" };
      const path = args.path.startsWith("@/")
        ? ${JSON.stringify(webRoot)} + "src/" + args.path.slice(2) : args.path;
      return { path: Bun.resolveSync(path, args.resolveDir || ${JSON.stringify(webRoot)}), namespace: "source" };
    });
    build.onLoad({ filter: /.*/, namespace: "scroll-fixture" }, () => ({
      contents: ${JSON.stringify(boundaries)}, loader: "js", resolveDir: ${JSON.stringify(webRoot)},
    }));
    build.onLoad({ filter: /.*/, namespace: "source" }, async (args) => {
      const path = args.path.replaceAll(String.fromCharCode(92), "/");
      const extension = path.slice(path.lastIndexOf(".") + 1);
      return {
        contents: await Bun.file(path).text() + (path === componentPath ? ${JSON.stringify(bootstrap)} : ""),
        loader: ["tsx", "ts", "jsx", "json"].includes(extension) ? extension : "js",
        resolveDir: path.slice(0, path.lastIndexOf("/")),
      };
    });
  }}],
});
if (!result.success) throw new AggregateError(result.logs, "Scroll fixture bundle failed");
process.stdout.write(await result.outputs[0].text());
`,
	],
	{ cwd: webRoot, encoding: "utf8", timeout: 30_000, maxBuffer: 20_000_000 },
);

const browser = await chromium.launch({ headless: true, timeout: 20_000 });
const errors = [];
const context = await browser.newContext({
	viewport: { width: 1440, height: 960 },
	reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const messages = page.locator(".overflow-y-auto");
const composer = page.locator("textarea");
const settle = () =>
	page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			),
	);
const metrics = () =>
	page.evaluate(() => {
		const container = document.querySelector(".overflow-y-auto");
		return {
			top: container.scrollTop,
			remaining:
				container.scrollHeight - container.clientHeight - container.scrollTop,
			ancestor: document.getElementById("ancestor").scrollTop,
			document: window.scrollY,
		};
	});
const append = (content) =>
	page.evaluate((text) => {
		return window.scrollFixture.store
			.getState()
			.appendMessage({ role: "assistant", content: text });
	}, content);
const update = (id, content) =>
	page.evaluate(
		({ id, content }) =>
			window.scrollFixture.store.getState().updateMessage(id, { content }),
		{ id, content },
	);
const expectBottom = () =>
	page.waitForFunction(() => {
		const el = document.querySelector(".overflow-y-auto");
		return el.scrollHeight - el.clientHeight - el.scrollTop < 32;
	});
const pressScrollButton = async (direction) => {
	await page
		.locator(`button[title="aiEdit.scroll.${direction}"]`)
		.evaluate((button) => button.focus({ preventScroll: true }));
	await page.keyboard.press("Enter");
	await settle();
};

try {
	// Route all requests locally: isolated localStorage, no provider or app network.
	await context.route("**/*", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<!doctype html><html lang="en"><head><title>Arth scroll regression</title>
<style>
body { margin: 0; } * { box-sizing: border-box; }
#ancestor { height: 350px; overflow: auto; }
#root { width: 340px; }
#root > div { display: flex; flex-direction: column; height: 700px; }
.flex { display: flex; } .flex-col { flex-direction: column; }
.overflow-y-auto { overflow-y: auto; height: 180px; flex: none; }
.overflow-y-auto > * { flex-shrink: 0; }
.overflow-y-auto > button { width: 24px; height: 24px; }
.gap-3 { gap: 12px; }
.overflow-y-auto > .flex-1 { min-height: 450px; }
.whitespace-pre-wrap { white-space: pre-wrap; }
textarea { width: 300px; } .hidden { display: none; }
</style></head><body><div style="height:200px"></div>
<div id="ancestor"><div style="height:80px"></div><div id="root"></div>
<div style="height:300px"></div></div><div style="height:1500px"></div>
</body></html>`,
		}),
	);
	await page.goto("https://artidor-scroll.test");
	await page.evaluate(() => {
		window.scrollTo(0, 30);
		document.getElementById("ancestor").scrollTop = 20;
		window.scrollCalls = { focus: [], intoView: 0 };
		const focus = HTMLElement.prototype.focus;
		HTMLElement.prototype.focus = function (options) {
			if (this instanceof HTMLTextAreaElement) {
				window.scrollCalls.focus.push(options);
			}
			return focus.call(this, options);
		};
		const scrollIntoView = Element.prototype.scrollIntoView;
		Element.prototype.scrollIntoView = function (options) {
			window.scrollCalls.intoView++;
			return scrollIntoView.call(this, options);
		};
	});
	await page.addScriptTag({ content: script });
	await composer.waitFor();
	await settle();
	const opening = await metrics();
	assert.equal(
		opening.top,
		0,
		"StrictMode must leave the empty welcome at top",
	);
	assert.ok(
		opening.remaining > 0,
		"Fixture must overflow to expose the regression",
	);
	assert.equal(
		opening.ancestor,
		20,
		"Composer focus must not scroll ancestors",
	);
	assert.equal(
		opening.document,
		30,
		"Composer focus must not scroll the document",
	);
	const focusCalls = await page.evaluate(() => window.scrollCalls.focus);
	assert.ok(focusCalls.length >= 2, "StrictMode must replay mount effects");
	assert.ok(focusCalls.every((options) => options?.preventScroll));

	for (const width of [375, 768, 1440]) {
		await page.setViewportSize({ width, height: 960 });
		await page.evaluate(() => {
			window.scrollFixture.store.getState().setStatus("queued");
		});
		await settle();
		assert.equal(
			(await metrics()).top,
			0,
			"Empty status updates must stay at top",
		);
		await page.evaluate(() => {
			window.scrollFixture.store.getState().setStatus("idle");
		});
		await settle();
	}
	await messages.evaluate((el) => {
		el.scrollTop = 100;
	});
	await settle();
	assert.equal(
		(await metrics()).top,
		100,
		"Reading welcome must not snap back to top",
	);
	await composer.fill("   ");
	await composer.press("Enter");
	await append("Incoming content\n".repeat(40));
	await settle();
	assert.ok(
		(await metrics()).remaining > 32,
		"Blank sends must not enable following",
	);

	await page.evaluate(() =>
		window.scrollFixture.store.setState({ messages: [] }),
	);
	await settle();
	assert.equal((await metrics()).top, 0);
	console.log(
		"PASS StrictMode welcome, focus containment, empty updates/resizes",
	);

	await page.evaluate(() => window.scrollFixture.unmount());
	await page.evaluate(() => window.scrollFixture.mount());
	await composer.waitFor();
	await settle();
	assert.equal(
		(await metrics()).top,
		0,
		"Reopening an empty chat must stay at top",
	);

	// Fitting content is not deliberate following, even after it begins to overflow.
	await messages.evaluate((el) => {
		el.style.height = "1200px";
	});
	const historyId = await append("Saved conversation");
	await settle();
	assert.equal((await metrics()).remaining, 0);
	await update(historyId, "Saved conversation\n".repeat(100));
	await settle();
	assert.ok((await metrics()).remaining > 0);
	assert.equal(
		(await metrics()).top,
		0,
		"Fitting content must not enable following",
	);
	await messages.evaluate((el) => {
		el.style.height = "180px";
	});
	await update(historyId, "Saved conversation\n".repeat(40));
	await settle();
	assert.equal(
		(await metrics()).top,
		0,
		"Loading history must not imply following",
	);
	await update(historyId, "Saved conversation updated\n".repeat(45));
	await settle();
	assert.equal((await metrics()).top, 0, "Updates must not enable following");
	const initialHistory = await page.evaluate(
		() => window.scrollFixture.store.getState().messages,
	);
	await page.evaluate(() => window.scrollFixture.unmount());
	await page.evaluate(() => window.scrollFixture.mount());
	await composer.waitFor();
	await settle();
	assert.equal(
		(await metrics()).top,
		0,
		"Reopening history must not jump down",
	);
	assert.deepEqual(
		await page.evaluate(() => window.scrollFixture.store.getState().messages),
		initialHistory,
		"Reopening must preserve conversation content",
	);

	const beforeFollowing = await metrics();
	await pressScrollButton("bottom");
	await expectBottom();
	const replyId = await append("Streaming response\n".repeat(20));
	await settle();
	await expectBottom();
	await update(replyId, "Streaming response\n".repeat(30));
	await settle();
	await expectBottom();
	assert.equal((await metrics()).ancestor, beforeFollowing.ancestor);
	assert.equal((await metrics()).document, beforeFollowing.document);

	await pressScrollButton("top");
	assert.equal((await metrics()).top, 0);
	await update(replyId, "Reading older messages\n".repeat(35));
	await settle();
	assert.equal(
		(await metrics()).top,
		0,
		"Reading history must suspend following",
	);
	await messages.evaluate((el) => {
		el.scrollTop = el.scrollHeight - el.clientHeight - 20;
		el.dispatchEvent(new Event("scroll"));
	});
	await settle();
	await expectBottom();
	await update(replyId, "Deliberately followed response\n".repeat(40));
	await settle();
	await expectBottom();
	console.log(
		"PASS history preservation, keyboard jump controls, streaming follow/pause",
	);

	// Sending from the welcome or while reading history must resume following.
	await page.evaluate(() =>
		window.scrollFixture.store.getState().clearConversation(),
	);
	await settle();
	assert.equal(
		(await metrics()).top,
		0,
		"New conversation must reset the welcome",
	);
	const archived = await page.evaluate(
		() => window.scrollFixture.store.getState().conversations,
	);
	assert.equal(archived.length, 1);
	for (const text of ["First message", "Send while reading ".repeat(60)]) {
		await composer.fill(text);
		await composer.press("Enter");
		await settle();
		await expectBottom();
		await append("Reply grows beyond the viewport\n".repeat(30));
		await settle();
		await expectBottom();
		await pressScrollButton("top");
	}
	await page.evaluate(() =>
		window.scrollFixture.store.getState().setStatus("streaming"),
	);
	await composer.fill("Steer while reading ".repeat(60));
	await page
		.getByText("aiEdit.composer.steer", { exact: true })
		.evaluate((button) => button.click());
	await settle();
	await expectBottom();
	assert.deepEqual(
		await page.evaluate(
			() => window.scrollFixture.store.getState().conversations,
		),
		archived,
		"Sending and steering must preserve archived conversations",
	);
	await page.evaluate(
		(id) => window.scrollFixture.store.getState().loadConversation(id),
		archived[0].id,
	);
	await settle();
	assert.deepEqual(
		await page.evaluate(() => window.scrollFixture.store.getState().messages),
		archived[0].messages,
		"Archived messages must still load unchanged",
	);
	assert.equal(
		await page.evaluate(() => window.scrollCalls.intoView),
		0,
		"Chat scrolling must never use scrollIntoView",
	);
	assert.deepEqual(errors, [], "Browser must have no uncaught errors");
	console.log(
		"PASS sending/steering, new-chat reset, archive restore, container-only scrolling",
	);
} finally {
	await browser.close();
}
