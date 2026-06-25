# Feature: Feedback Table

## Status: COMPLETE

## What

User feedback is now stored in a database table. The in-editor
feedback prompt submits to `/api/feedback` with message, rating
(1-5 stars), and category (bug/feature/praise/other).

## Files Changed

- `apps/web/src/lib/db/schema.ts` — uncommented + enhanced feedback
  table (id, userId, email, message, rating, category, createdAt)
- `apps/web/src/app/api/feedback/route.ts` — new POST route
  (auth-gated, rate-limited 5/hour per IP)
- `apps/web/src/app/editor/[project_id]/page.tsx` — FeedbackPrompt
  component now has inline form with rating stars + category buttons
  instead of placeholder link

## SOP Checks

| Check | Result |
|-------|--------|
| `bunx tsc --noEmit` | exit 0 |
| `bun run lint:web` | 0 errors |
| `bun run test` | all pass |

## Note

A Drizzle migration needs to be generated (`bun run db:generate`)
before deploying to production. The schema is defined but the SQL
migration file hasn't been created yet.
