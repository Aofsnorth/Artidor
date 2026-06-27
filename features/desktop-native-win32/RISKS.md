# Risks: Desktop Native (Win32 API)

## Risk: Conflicts with ROADMAP.md (large rewrite not on roadmap)

- **Likelihood**: Certain (already true)
- **Impact**: High (could be reverted/misunderstood by other agents/CI)
- **Mitigation**: Owner explicitly overrode the roadmap on 2026-06-27.
  Override recorded in `ROADMAP.md`. This feature folder documents the
  approval. Prime Directive honored by incremental, smallest-first work.
- **Rollback**: Delete `apps/desktop-native/` and the feature folder;
  revert the `ROADMAP.md` note. No other files are touched.

## Risk: Scope is far larger than one session (176k LOC web app)

- **Likelihood**: Certain
- **Impact**: Medium (expectation mismatch; partial parity for a long time)
- **Mitigation**: Be honest in FEATURE.md/PLAN.md. Deliver the smallest
  verifiable unit per increment. Do not claim "100% full" until it is.
- **Rollback**: Each increment is isolated to `apps/desktop-native/`.

## Risk: Duplicates the active Tauri desktop effort

- **Likelihood**: Medium
- **Impact**: Medium (two native paths to maintain)
- **Mitigation**: Both paths coexist by design (owner decision). Tauri
  remains the roadmap-default; Win32 is an explicit parallel path. No
  shared files are modified, so Tauri work is unaffected.
- **Rollback**: Independent — removing Win32 never touches Tauri.

## Risk: Standalone crate outside root workspace

- **Likelihood**: Low
- **Impact**: Low (not built by `cargo build --workspace` at root; not
  covered by root CI until Increment 7)
- **Mitigation**: The crate has its own `[workspace]` table so it builds
  and is verified independently with `cargo build` from its own
  directory. Workspace membership (root `Cargo.toml` edit) is deferred
  to Increment 7 with explicit approval.
- **Rollback**: None needed — isolation is intentional.

## Risk: `windows` crate version churn / API differences

- **Likelihood**: Medium
- **Impact**: Low (compile errors, easily fixed)
- **Mitigation**: Pin to a single resolved version via `cargo add`
  (writes exact version into Cargo.toml). Keep the Win32 surface tiny.
- **Rollback**: Re-pin or drop the dependency.

## Risk: GUI cannot be visually verified in this environment

- **Likelihood**: Medium
- **Impact**: Low (Increment 0 is a scaffold)
- **Mitigation**: `cargo build` success is the increment-0 verification
  gate. Visual parity checks happen in later increments on a real
  desktop. Document this honestly.
- **Rollback**: N/A.

## No security risk (Increment 0)

- No secrets, auth, payment, MCP, or API changes.
- No `.env*`, keys, tokens touched.
- No network behavior (the `windows` features used are local windowing
  only).
- No CI/security policy changes.
- Crate is isolated; does not affect web or Tauri security posture.
