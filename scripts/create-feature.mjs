#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const slug = process.argv[2];

if (!slug) {
  console.error("Usage: bun scripts/create-feature.mjs <feature-slug>");
  process.exit(1);
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error("Feature slug must be kebab-case.");
  process.exit(1);
}

const src = "features/_template";
const dest = `features/${slug}`;

if (fs.existsSync(dest)) {
  console.error(`Feature already exists: ${dest}`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });

for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}

console.log(`Created ${dest}`);
