#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "AGENTS.md",
  "RULES.md",
  "PERMISSIONS.md",
  "CHECKLIST.md",
  "SECURITY.md",
  "HARNESS.md",
  ".github/pull_request_template.md",
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/security.yml",
  "docs/harness/README.md",
];

let failed = false;

function fail(message) {
  failed = true;
  console.error(`❌ ${message}`);
}

function pass(message) {
  console.log(`✅ ${message}`);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing required harness file: ${file}`);
  else pass(`Found ${file}`);
}

// --- Cross-reference validation -------------------------------------------
// Best practice (AgentPatterns, OpenAI harness engineering): AGENTS.md is a
// router, and every link it contains must resolve. A broken/phantom link lets
// an agent follow instructions to a file that no longer exists. We parse
// markdown links `[text](target)` and bare backtick `path` references from the
// entry-point docs and fail the build if any local target is missing.
//
// External URLs (http/https/mailto) and pure anchors (#section) are skipped.

const linkSources = [
  "AGENTS.md",
  "RULES.md",
  "PERMISSIONS.md",
  "CHECKLIST.md",
  "SECURITY.md",
  "HARNESS.md",
  "docs/harness/README.md",
];

// Matches [label](target) and [label](target "title").
const markdownLink = /\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
// Matches a backtick-quoted *path* reference: must contain a path separator
// (e.g. `docs/harness/security-model.md`) or start with `docs/`. Bare
// filenames in prose (e.g. `app.rs`, `proxy.ts`) are narrative, not links.
const backtickRef = /`([^`]*\/[^`]+\.(?:md|mjs|ts|tsx|json|yml|yaml|toml|rs)|docs\/[^`]+\.(?:md|mjs|ts|tsx|json|yml|yaml|toml|rs))`/g;

function extractReferences(content) {
  const refs = new Set();
  let m;
  while ((m = markdownLink.exec(content)) !== null) {
    refs.add(m[1]);
  }
  while ((m = backtickRef.exec(content)) !== null) {
    refs.add(m[1]);
  }
  return [...refs];
}

function isExternalOrAnchor(target) {
  return (
    /^https?:\/\//i.test(target) ||
    /^mailto:/i.test(target) ||
    target.startsWith("#")
  );
}

let checkedLinks = 0;
for (const source of linkSources) {
  if (!fs.existsSync(source)) continue;
  const content = fs.readFileSync(source, "utf8");
  for (const ref of extractReferences(content)) {
    if (isExternalOrAnchor(ref)) continue;
    // Skip template/placeholder paths like `features/<slug>/FEATURE.md`.
    if (ref.includes("<") || ref.includes(">")) continue;
    // Resolve relative to the source file's directory so `docs/...` from a
    // root file and sibling links from a docs file both resolve correctly.
    const base = path.dirname(source);
    const resolved = path.normalize(path.join(base, ref));
    checkedLinks += 1;
    if (!fs.existsSync(resolved)) {
      fail(`Broken cross-reference in ${source}: "${ref}" -> ${resolved} does not exist`);
    }
  }
}
if (checkedLinks > 0) pass(`Validated ${checkedLinks} cross-references across ${linkSources.length} docs`);

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (["node_modules", ".git", ".next", "target", "dist", "build"].includes(entry)) continue;
      walk(full, result);
    } else {
      result.push(full.replaceAll("\\", "/"));
    }
  }
  return result;
}

const forbidden = [/^\.env$/, /^\.env\./, /\.pem$/, /\.key$/];

for (const file of walk(".")) {
  const normalized = file.replace(/^\.\//, "");
  for (const pattern of forbidden) {
    if (pattern.test(normalized)) {
      fail(`Forbidden sensitive file appears committed: ${normalized}`);
    }
  }
}

if (failed) {
  console.error("\nHarness check failed.");
  process.exit(1);
}

console.log("\nHarness check passed.");
