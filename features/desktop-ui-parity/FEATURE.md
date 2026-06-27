# Feature: Desktop UI Parity with Web

## Goal

Make the GPUI desktop app (`apps/desktop/`) visually match the web editor
(`apps/web/src/components/editor/`) exactly, with two desktop-specific additions:
window controls (minimize □, maximize, close ✕) next to the Export button, and
a more elegant overall feel.

## Scope

- **In scope**: `apps/desktop/src/ui/` — all panel rendering code, theme colors,
  layout structure, state for active tab tracking.
- **Out of scope**: `rust/` (no core logic changes), `apps/web/` (no web changes),
  no new dependencies, no Cargo.toml changes.

## Alignment

- ROADMAP.md P2 "UI polish" — desktop app is new (scaffolded in prior session),
  not a redesign of existing web UI.
- User explicitly requested parity + window controls.
- No sensitive paths touched.

## User-facing impact

Yes — visible UI change. What's New entry required.
