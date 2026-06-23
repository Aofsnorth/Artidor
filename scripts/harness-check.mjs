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
