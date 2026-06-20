# Rules

## Purpose
Build this feature safely, incrementally, and with clear approval gates.

## Approval rules
Do not implement source changes until FEATURE.MD and PLAN.MD are reviewed and approved, unless the user explicitly enables Auto Approve for this feature.

## Edit restrictions
No unrelated features. No unrelated refactors. No large rewrites unless explicitly approved. No new dependencies unless justified and approved.

## Sensitive areas
Do not modify authentication, API keys, environment variables, database migrations, AI tool calls, export/render pipeline, Rust/WASM core, WebGPU/WGSL shaders, or payment/sponsor code without review.

## Testing requirements
Run applicable checks: `bun run lint:web`, `cd apps/web && bunx tsc --noEmit`, `bun run build:web`, targeted tests, and manual QA from QA.MD.

## AI behavior rules
Before code edits, explain understanding, relevant files, planned changes, risks, and tests. After each implementation step, log files changed, what changed, why safe, how to test, and remaining work.

## Priority order
1. Waiting for user approval/review
2. Current explicit prompt
3. Approved feature plan
4. Critical issue discovered
5. TODO.MD tasks
6. Related cleanup only
7. Optional improvements only if approved

## Workflow
Define feature -> plan implementation -> wait for approval -> implement small steps -> verify -> update logs -> request review.
