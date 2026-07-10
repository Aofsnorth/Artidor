# Web Editor Hardening

Status: design approved; implementation planning pending.

Scope: `apps/web` only. Tauri consumes the web application unchanged.

Design: [`../../docs/superpowers/specs/2026-07-10-web-editor-hardening-design.md`](../../docs/superpowers/specs/2026-07-10-web-editor-hardening-design.md)

## Phases

1. Editor reliability
2. Search and visual consistency
3. Localization foundation
4. Effects phase B
5. Performance, audio, and export verification
6. Security and scalability audit

## Constraints

- Preserve the current dirty worktree.
- No new dependency unless separately justified and approved.
- Keep existing project files backward compatible.
- Report measured performance, security, and scale evidence; never absolute guarantees.
