#!/usr/bin/env node

import { execSync } from "node:child_process";

const riskyPatterns = [
  /^\.github\//,
  /^packages\/mcp-server\//,
  /^apps\/web\/src\/app\/api\//,
  /^apps\/web\/src\/lib\/auth\//,
  /^apps\/web\/src\/lib\/ai\//,
  /^rust\//,
  /^Cargo\.toml$/,
  /^Cargo\.lock$/,
  /^package\.json$/,
  /^bun\.lock$/,
  /^LICENSE$/,
  /^SECURITY\.md$/,
  /^PERMISSIONS\.md$/,
  /^\.env/,
];

const output = execSync("git diff --name-only", { encoding: "utf8" }).trim();
const files = output ? output.split("\n") : [];

const risky = files.filter((file) => riskyPatterns.some((pattern) => pattern.test(file)));

if (risky.length) {
  console.log("⚠️ Risky files changed:");
  for (const file of risky) console.log(`- ${file}`);
  console.log("\nHuman approval and stronger QA required.");
  process.exit(2);
}

console.log("✅ No risky files detected in current diff.");
