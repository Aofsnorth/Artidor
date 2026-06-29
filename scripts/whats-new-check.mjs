#!/usr/bin/env node

import { execSync } from "node:child_process";

function run(command) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

// Gather changed files from multiple sources so the check works both in
// CI (committed changes) and locally (staged + unstaged changes before
// committing). We merge all sources into a single set to avoid duplicates.
//
// Priority:
//  1. origin/main...HEAD — all unpushed commits (CI scenario)
//  2. HEAD~3..HEAD — last 3 commits (local scenario after pushing)
//  3. staged + unstaged — uncommitted local changes
const unpushedChanged = run("git diff --name-only origin/main...HEAD");
const recentChanged = run("git diff --name-only HEAD~3..HEAD");
const stagedChanged = run("git diff --cached --name-only");
const unstagedChanged = run("git diff --name-only");

const files = [
  ...new Set(
    [unpushedChanged, recentChanged, stagedChanged, unstagedChanged]
      .flatMap((s) => s.split("\n"))
      .filter(Boolean),
  ),
];

// Normalize Windows backslashes to forward slashes so the same patterns
// match regardless of how the runner formats git output.
const normalize = (p) => p.replaceAll("\\", "/");

const userFacingPatterns = [
	/^apps\/web\/src\/app\//,
	/^apps\/web\/src\/components\//,
	/^apps\/web\/src\/core\//,
	/^apps\/web\/src\/hooks\//,
	/^apps\/web\/src\/lib\/ai\//,
	/^apps\/web\/src\/lib\/timeline\//,
	/^apps\/web\/src\/lib\/export\//,
	// rust/ core + wasm source count as user-facing; rust/wasm/pkg/ is the
	// generated wasm-pack output that gets committed for npm publishing and
	// should not trigger a What's New requirement.
	/^rust\/(?!wasm\/pkg\/)/,
];

const whatsNewFiles = [
  "apps/web/src/lib/whats-new/feed.ts",
  "apps/web/src/app/changelog/page.tsx",
  "ROADMAP.md",
  "docs/product/WHATS_NEW_POLICY.md",
];

const hasUserFacingChange = files.some((file) => {
  const normalized = normalize(file);
  return userFacingPatterns.some((pattern) => pattern.test(normalized));
});

const hasWhatsNewUpdate = files.some((file) =>
  whatsNewFiles.includes(file) || whatsNewFiles.includes(normalize(file))
);

if (hasUserFacingChange && !hasWhatsNewUpdate) {
  console.error("❌ User-facing files changed but What's New/Roadmap was not updated.");
  console.error("");
  console.error("Update one of:");
  for (const file of whatsNewFiles) {
    console.error(`- ${file}`);
  }
  console.error("");
  console.error("If this change truly does not need What's New, document the reason in the PR.");
  process.exit(1);
}

console.log("✅ What's New / Roadmap check passed.");
