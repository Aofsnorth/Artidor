# Implementation Roadmap — UI Polish & Task Continuation

**Date:** 2026-07-15  
**Status:** In Progress  
**Branch:** `main` (current working branch)  
**Goal:** Finish the open UI/UX threads from the previous session, implement the new user requests below, then resume the remaining long-term milestones. Every deliverable must pass lint, typecheck, targeted tests, and `bun run build:web`.

---

## 1. Context & User Requests

The following requests came from the user in this continuation thread (translated from Indonesian):

1. **Transition thumbnails** — replace the current procedural/cartoon SVG scene images with real-life (IRL), free-for-commercial-use photographs. Use many different photos, not just one or two.
2. **Templates tab** — show a "Coming Soon" placeholder and lock the tab so users cannot interact with templates yet.
3. **Presets empty state** — move the "No presets yet" copy down so it sits vertically centered and no longer collides with the top bar.
4. **Plugins tab** — ensure that when a user creates a plugin with a custom/new group, that new group appears in the category filter bar.
5. **Scripting / documentation** — keep a complete running plan so no progress is missed. This file is that plan.
6. **Continue unfinished milestone tasks** — Tasks 8–15 from the master completion plan are still pending and must be resumed after the UI polish batch is closed.

---

## 2. What Was Already Done Before This Plan

- **Task 4a + 4b — Localization:** Timeline toolbar, graphics-style controls, and all asset/catalog views (filters, presets, templates, transitions, plugins, adjustments, overlays, animations, text, effects, advanced) are localized with EN/ID dictionaries.
- **Task 5 — Graphic Border & Keyframe-Complete Controls:**
  - Border model, renderer, and UI added.
  - Border + shadow animation property paths added to `property-registry.ts` and `types.ts`.
  - Resolver updated in `media-graphic-style.ts` so border/shadow values are animated at playback time.
  - `graphics-style-tab.tsx` now routes every numeric/color control (Color & Fill, Stroke, Border, Shadow) through `useKeyframedNumberProperty` / `useKeyframedColorProperty`, including text `color`, `stroke`, and `shadow` paths.
- **Task 6 — Verified Blend Modes:** Complete and tested.
- **Task 7 — Alight Motion Effect Catalog Audit:** Research doc created at `docs/research/alight-motion-effects-web-2026-07-11.md`.
- **Transition preview diversity (first pass):** `getTransitionPhotoPair` switched from 4 local webp images to procedural SVG scenes. **This is being superseded by the IRL photo request in this plan.**

---

## 3. Open Work — UI Polish Batch

| # | Task | Files Expected to Change |
|---|------|--------------------------|
| 3.1 | Replace transition preview images with many IRL free-commercial-use photos | `apps/web/src/components/editor/panels/assets/views/components/procedural-preview.ts`, `procedural-preview.test.ts`, `transitions.tsx` |
| 3.2 | Make Templates tab "Coming Soon" / locked | `apps/web/src/components/editor/panels/assets/views/templates.tsx`, `dictionaries.ts` |
| 3.3 | Center Presets empty-state copy | `apps/web/src/components/editor/panels/assets/views/presets.tsx` |
| 3.4 | Dynamic plugin category groups | `apps/web/src/lib/plugins/types.ts`, `apps/web/src/lib/plugins/store.ts`, `apps/web/src/components/editor/panels/assets/views/plugins.tsx`, `plugin-detail-dialog.tsx`, `dictionaries.ts` |
| 3.5 | Add i18n keys and What's New entry | `apps/web/src/lib/i18n/dictionaries.ts`, `apps/web/src/lib/whats-new/feed.ts`, `feed.test.ts` |

### 3.1 Transition Photos — Design Decisions

- Use a curated list of **Picsum IDs** (Unsplash-sourced, free for commercial use).
- `getTransitionPhotoPair(type)` deterministically picks two different IDs from the list based on the transition type hash.
- The A/B preview layers currently apply a tinted palette overlay. To keep photos looking real instead of cartoon/colorful, replace the palette-tinted gradient with a subtle, neutral darkening overlay (`rgba(10,10,12,0.25)` → `rgba(10,10,12,0.05)`).
- Keep the existing hover light-streak effects; they are subtle and do not change the photo content.

### 3.2 Templates Tab — Design Decisions

- Keep the `PanelView` title as "Templates" (localized).
- Replace the category bar, search, and grid with a centered "Coming Soon" card.
- Use a lock icon (`Lock02Icon` from Hugeicons).
- Disable all apply handlers.
- Add localized keys: `catalog.templatesComingSoon`, `catalog.templatesLockedHint`.

### 3.3 Presets Empty State — Design Decisions

- The `EmptyState` already uses `h-full` and `items-center justify-center`.
- The parent container in `PresetsView` must grow to fill the panel height. Add `flex-1 min-h-0` to the inner flex container.
- This ensures the empty copy sits in the vertical center of the panel instead of near the top.

### 3.4 Plugins Dynamic Categories — Design Decisions

- **Type change:** widen `PluginCategory` from a fixed union to `string`. Keep `PLUGIN_CATEGORIES` as the recommended default list.
- **Validation change:** remove the install-time rejection for unknown categories in `store.ts`. Unknown permissions may still be rejected; categories are UI-only metadata.
- **Label/description helpers:** convert `CATEGORY_LABELS` and `CATEGORY_DESCRIPTIONS` from `Record<PluginCategory, string>` to `Record<string, string>` (with fallbacks returning the raw category key).
- **UI change:** in `PluginsView`, derive the chip list from `[...PLUGIN_CATEGORIES, ...uniqueCategoriesFromInstalledPlugins]`. Show known categories first, then custom ones. Use a helper `getCategoryLabel(cat)` that translates known keys and falls back to the raw string.
- Update `plugin-detail-dialog.tsx` to use the same label helper.

---

## 4. Verification Gate

Before marking any item complete, run:

```bash
bunx biome lint apps/web/src --max-diagnostics=1000
bunx tsc --noEmit -p apps/web/tsconfig.json
bun test apps/web/src/components/editor/panels/assets/views/components/procedural-preview.test.ts apps/web/src/lib/i18n/dictionaries.test.ts apps/web/src/lib/rendering.test.ts apps/web/src/lib/whats-new/__tests__/feed.test.ts apps/web/src/services/renderer/compositor/media-graphic-style.test.ts apps/web/src/components/editor/panels/assets/views/components/catalog-search.test.ts
bun run build:web
```

Note: full `bun run test` has pre-existing WASM test-environment failures (`wasm.__wbindgen_start is not a function`) unrelated to these changes; do not suppress them, but do not block UI deliverables on them.

---

## 5. Remaining Long-Term Milestones (Resume After UI Batch)

| Task | Description |
|------|-------------|
| Task 8 | Effects Engine Phase B — implement priority effects from the AM catalog audit |
| Task 9 | Timeline Low-End-PC Performance |
| Task 10 | Preview, Renderer, Export Performance/Correctness |
| Task 11 | Audio Detection, Beat Analysis, Transcription |
| Task 12 | AI Takeover Reliability and Motion |
| Task 13 | Security Audit and Safe Remediation |
| Task 14 | Scalability Audit Toward One Million Users |
| Task 15 | Full Validation and Release Evidence |

---

## 6. Changelog / What's New

After the UI batch lands, add a What's New entry covering:

- Transition previews now use real-life free-commercial-use photographs.
- Templates tab is locked with a Coming Soon message.
- Presets empty state is vertically centered.
- Plugin Manager now shows custom plugin categories/groups.
