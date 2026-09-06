import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const sourceAt = (relativePath: string) =>
	readFileSync(`${import.meta.dir}/../../${relativePath}`, "utf8");

test("command palette chunk mounts only while open @fast @regression", () => {
	const source = sourceAt("components/providers/editor-provider.tsx");

	expect(source).toContain("const commandPaletteOpen = useEditorUIStore(");
	expect(source).toContain("return commandPaletteOpen ? (");
});

test("environment warning boundary mounts only when configuration is missing @fast @regression", () => {
	const layoutSource = sourceAt("app/layout.tsx");

	expect(layoutSource).toContain(
		"{isEnvMissing ? <DynamicEnvWarningModal /> : null}",
	);
});
