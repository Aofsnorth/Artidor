# What's New Policy

AI agents must update the What's New feed when a change is user-facing.

The feed lives at `apps/web/src/lib/whats-new/feed.ts` and is rendered by
`apps/web/src/components/whats-new/whats-new-card.tsx`. A CI check at
`scripts/whats-new-check.mjs` enforces this policy on every PR.

## Update What's New When

- New feature added
- Existing feature meaningfully improved
- UI behavior changed
- AI copilot capability changed
- Export/render behavior changed
- Timeline/editor workflow changed
- Performance noticeably improved
- Security/privacy behavior changed
- Breaking change introduced

## Do Not Update What's New For

- Internal refactor
- Test-only change
- CI-only change
- Dependency update with no user impact
- Typo in internal docs
- Non-user-visible cleanup

## Required Entry Format

Every entry in the `WHATS_NEW` array must match the `WhatsNewEntry`
interface defined in `feed.ts`:

```ts
interface WhatsNewEntry {
  /** Stable unique id (also the seen-tracking key). Newest entry first. */
  id: string;
  /** Absolute date, YYYY-MM-DD. */
  date: string;
  /** Short, user-readable title (1 line). */
  title: string;
  /** Type tag — drives the chip color and label. */
  tag: "feature" | "improvement" | "fix" | "performance" | "security";
  /** Bullet points describing what changed and the user impact. */
  items: string[];
}
```

### Field guidelines

- **`id`** — Stable unique id, conventionally `YYYY-MM-DD-short-slug`.
  Never reuse an id; it is the localStorage key that tracks whether the
  user has seen the entry.
- **`date`** — `YYYY-MM-DD`. Entries must be ordered newest-first. The
  dev-mode validator (`validateWhatsNewFeed`) throws if an older entry
  appears above a newer one.
- **`title`** — One short sentence. Avoid prefixes like "Fix:" or
  "New:" — the `tag` chip already conveys that.
- **`tag`** — One of:
  - `feature` — something new the user can do
  - `improvement` — an existing thing got better
  - `fix` — a bug was fixed
  - `performance` — something got faster
  - `security` — a security/privacy behavior changed
- **`items`** — One to three short bullets. Each bullet should state
  **what changed** and **why the user cares** (the user impact). Keep
  each bullet under ~2 lines in the card.

### Example

```ts
{
  id: "2026-06-30-searchable-puter-models",
  date: "2026-06-30",
  tag: "improvement",
  title: "Searchable model dropdowns for Puter.js providers",
  items: [
    "All Puter.js model selections are now searchable comboboxes. Type to filter by name, id, or provider.",
    "Expanded image model detection to catch more names (dalle, midjourney, sd variants, etc.).",
  ],
},
```

## Rule

If the agent changes a user-facing feature and does not update What's
New, it must explain why in the PR.
