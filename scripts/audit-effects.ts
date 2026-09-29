/**
 * Effect-renderability audit.
 *
 * Answers one question for every registered effect: if a panel writes this
 * effect onto a clip, does the picture actually change?
 *
 * Why this exists: `resolveEffectPasses` filters on
 * `effectsRegistry.has(effect.type)`, and each definition then declares its
 * own `renderer.passes`. An effect can be registered yet declare no passes,
 * and a panel can write an effect type that was never registered at all. In
 * both cases the params persist and the inspector renders them, but the
 * renderer skips the effect and the image never changes. That is the worst
 * failure mode a grading tool can have: it looks like it works.
 *
 * Usage:  bun scripts/audit-effects.ts          (table)
 *         bun scripts/audit-effects.ts --json   (machine readable)
 *
 * Read-only: touches no project state.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	effectsRegistry,
	registerDefaultEffects,
} from "../apps/web/src/lib/effects";
import type { EffectDefinition } from "../apps/web/src/lib/effects/types";

const ROOT = resolve(import.meta.dir, "..");
const SHADER_DIR = join(ROOT, "rust", "crates", "effects", "src", "shaders");

// The registry is populated by EditorCore at init, not by import side effect.
registerDefaultEffects();

/**
 * Every shader file that exists in the Rust effects crate.
 *
 * Filenames are matched with hyphens and underscores treated as the same
 * character. Both spellings exist in the crate — `tint-shift.wgsl` next to
 * `hue_rotate.wgsl` — and a strict comparison reported `hue-rotate` as a
 * missing shader when it is wired and working.
 *
 * Note this is a proxy: a file on disk is strong evidence but not proof of
 * a `match` arm in `pipeline.rs`. Where it matters, the pipeline was read
 * directly (that is how `hue-rotate` was cleared).
 */
function listShaders(): Set<string> {
	try {
		return new Set(
			readdirSync(SHADER_DIR)
				.filter((file) => file.endsWith(".wgsl"))
				.map((file) => file.replace(/\.wgsl$/, "").replace(/_/g, "-")),
		);
	} catch {
		return new Set();
	}
}

/**
 * Where the UI references each effect type.
 *
 * Two passes, because panels write effects in two different ways and
 * matching only one of them produces a badly wrong picture:
 *
 * 1. Any quoted literal equal to a REGISTERED type — catches the common
 *    `add_clip_effect({ effectType: "blur" })` and `effectType` variable
 *    paths, where the type never appears in a `type:` field.
 * 2. A `type: "<x>"` literal inside a file that also writes an `effects`
 *    array — catches effects whose type is not registered, which is exactly
 *    the case we care about finding.
 */
function scanWrittenTypes(
	registeredTypes: readonly string[],
): Map<string, string[]> {
	const dirs = ["apps/web/src/components", "apps/web/src/lib/ai"];
	const found = new Map<string, string[]>();
	const known = new Set(registeredTypes);

	const record = (type: string, site: string) => {
		const sites = found.get(type) ?? [];
		if (!sites.includes(site)) sites.push(site);
		found.set(type, sites);
	};

	const walk = (dir: string) => {
		let entries: string[];
		try {
			entries = readdirSync(dir, { withFileTypes: true })
				.map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
				.sort();
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.startsWith("@") || entry === "node_modules/") continue;
			const path = join(dir, entry);
			if (entry.endsWith("/")) {
				walk(path);
				continue;
			}
			if (!/\.(ts|tsx)$/.test(entry) || entry.includes(".test.")) continue;
			let text: string;
			try {
				text = readFileSync(path, "utf8");
			} catch {
				continue;
			}
			const rel = `${path.replace(ROOT, ".")}`;

			// Pass 1 — any literal naming a registered effect.
			for (const type of known) {
				const pattern = new RegExp(`"${type}"`, "g");
				for (const match of text.matchAll(pattern)) {
					record(type, `${rel}:${lineNumberOf(text, match.index)}`);
					break;
				}
			}

			// Pass 2 — `type: "<x>"` in a file that writes effects.
			if (!/effects\s*[:=]/.test(text)) continue;
			for (const match of text.matchAll(/type:\s*"([a-z0-9-]+)"/g)) {
				const type = match[1];
				if (!type || known.has(type)) continue;
				record(type, `${rel}:${lineNumberOf(text, match.index)}`);
			}
		}
	};
	for (const dir of dirs) walk(join(ROOT, dir));
	return found;
}

function lineNumberOf(text: string, index: number | null | undefined): number {
	if (index === null || index === undefined) return 0;
	return text.slice(0, index).split("\n").length;
}

type Row = {
	type: string;
	name: string;
	registered: boolean;
	passCount: number;
	shaders: string[];
	missingShaders: string[];
	verdict: "renders" | "no-passes" | "missing-shader" | "unregistered";
	writtenFrom: number;
};

const shaders = listShaders();
const registeredList = effectsRegistry.getAll().map((d) => d.type);
const written = scanWrittenTypes(registeredList);
const allTypes = new Set<string>([...written.keys(), ...registeredList]);

const rows: Row[] = [...allTypes]
	.map((type): Row => {
		const definition = effectsRegistry.has(type)
			? (effectsRegistry.get(type) as EffectDefinition)
			: null;
		const declared =
			definition?.renderer?.passes?.map((pass) => pass.shader) ?? [];
		const missing = declared.filter((shader) => !shaders.has(shader));
		return {
			type,
			name: definition?.name ?? "—",
			registered: Boolean(definition),
			passCount: declared.length,
			shaders: [...new Set(declared)],
			missingShaders: [...new Set(missing)],
			verdict: !definition
				? "unregistered"
				: declared.length === 0
					? "no-passes"
					: missing.length > 0
						? "missing-shader"
						: "renders",
			writtenFrom: written.get(type)?.length ?? 0,
		};
	})
	.sort((a, b) => a.type.localeCompare(b.type));

const summary = {
	total: rows.length,
	renders: rows.filter((r) => r.verdict === "renders").length,
	noPasses: rows.filter((r) => r.verdict === "no-passes").length,
	missingShader: rows.filter((r) => r.verdict === "missing-shader").length,
	unregistered: rows.filter((r) => r.verdict === "unregistered").length,
	uiWritesBroken: rows.filter(
		(r) => r.writtenFrom > 0 && r.verdict !== "renders",
	).length,
};

if (process.argv.includes("--json")) {
	console.log(JSON.stringify({ summary, rows }, null, 2));
} else {
	const pad = (value: string, width: number) => value.padEnd(width, " ");
	console.log(
		`${pad("EFFECT TYPE", 30)} ${pad("VERDICT", 12)} ${pad("PASSES", 7)} WRITTEN FROM UI`,
	);
	console.log("-".repeat(72));
	for (const row of rows) {
		console.log(
			`${pad(row.type, 30)} ${pad(row.verdict, 12)} ${pad(
				String(row.passCount),
				7,
			)}${row.writtenFrom || ""}`,
		);
	}
	console.log("-".repeat(72));
	console.log(
		`total=${summary.total}  renders=${summary.renders}  ` +
			`no-passes=${summary.noPasses}  missing-shader=${summary.missingShader}  ` +
			`unregistered=${summary.unregistered}`,
	);
	console.log(
		`UI writes a NON-RENDERING effect: ${summary.uiWritesBroken} type(s)`,
	);
	const broken = rows.filter(
		(r) => r.writtenFrom > 0 && r.verdict !== "renders",
	);
	if (broken.length > 0) {
		console.log("\n--- UI WRITES SOMETHING THE RENDERER WILL SKIP ---");
		for (const row of broken) {
			console.log(
				`${row.type}  (${row.verdict})  <- ${row.writtenFrom} site(s)`,
			);
			for (const site of (written.get(row.type) ?? []).slice(0, 4)) {
				console.log(`    ${site}`);
			}
		}
	}
	const dead = rows.filter((r) => r.writtenFrom === 0);
	console.log(
		`\n--- NO UI STRING REFERENCE (${dead.length}) --- still reachable via presets / AI tools / the Effects gallery`,
	);
	console.log(dead.map((r) => r.type).join(", ") || "none");
}
