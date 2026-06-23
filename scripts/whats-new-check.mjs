#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";

function run(command) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const changed =
  run("git diff --name-only origin/main...HEAD") ||
  run("git diff --name-only HEAD~1 HEAD");

const files = changed.split("\\n").filter(Boolean);

const userFacingPatterns = [
  /^apps\\/web\\/src\\/app\\//,
  /^apps\\/web\\/src\\/components\\//,
  /^apps\\/web\\/src\\/core\\//,
  /^apps\\/web\\/src\\/hooks\\//,
  /^apps\\/web\\/src\\/lib\\/ai\\//,
  /^apps\\/web\\/src\\/lib\\/timeline\\//,
  /^apps\\/web\\/src\\/lib\\/export\\//,
  /^rust\\//,
];

const whatsNewFiles = [
  "apps/web/src/lib/whats-new/feed.ts",
  "apps/web/src/app/changelog/page.tsx",
  "ROADMAP.md",
  "docs/product/WHATS_NEW_POLICY.md",
];

const hasUserFacingChange = files.some((file) =>
  userFacingPatterns.some((pattern) => pattern.test(file))
);

const hasWhatsNewUpdate = files.some((file) =>
  whatsNewFiles.includes(file)
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