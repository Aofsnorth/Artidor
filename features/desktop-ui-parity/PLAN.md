# Plan: Desktop UI Parity

## Approach

Incremental patches to `apps/desktop/src/ui/`, each verified with `cargo check`.
No large rewrite — each file is updated independently to match the web layout
spec extracted from the React components.

## Patches (in order)

1. **theme.rs** — Update color constants to match web Tailwind palette.
   ✅ Done (prior subagent).

2. **state/editor_state.rs** — Add `AssetsTab` enum + `active_tab` field to
   `PanelVisibility` so the tab bar can track which panel view is active.
   ✅ Done.

3. **ui/tab_bar.rs** — New file: 72px vertical icon rail matching web `TabBar`.
   ✅ Done.

4. **ui/editor_layout.rs** — Restructure layout to match web: tab bar + panel
   cards with gap-2 p-2, rounded-xl borders. ✅ Done.

5. **ui/header.rs** — Match web `EditorHeader`: logo+project capsule (left),
   zoom capsule (center), cloud+settings+share+export+window controls (right).
   Window controls: minimize (—), maximize (□), close (✕).

6. **ui/footer.rs** — Match web `EditorFooter`: "Worked on HH:MM:SS" + FPS (left),
   status dot (center), resolution + fps + aspect + stereo (right).

7. **ui/viewport_panel.rs** — Match web `PreviewPanel`: viewport canvas (flex-1)
   + preview toolbar (44px) with timecode (left), transport controls (center),
   loop+quality+fullscreen (right).

8. **ui/timeline/** — Match web `Timeline`: toolbar (40px) + track labels + ruler.

9. **ui/assets/mod.rs** — Match web `AssetsPanel`: header + content area that
   switches based on `active_tab`.

10. **ui/inspector/** — Match web `PropertiesPanel`: tabbed property editor.

11. **cargo check** — Verify all changes compile.

12. **What's New** — Add feed entry for desktop UI parity.

## Verification

- `cargo check` after each patch
- `cd apps/web && bunx tsc --noEmit` (web unaffected, but verify)
- No tests to update (desktop app has no test infrastructure yet)
