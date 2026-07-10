# Technical Debt Tracker

> Inventaris hutang teknis yang **bisa dilakukan di kode** (bukan rencana besar).
> Setiap item actionable: lokasi file, dampak, biaya, risiko, dan owner suggestion.
> Berbeda dari `PERFORMANCE.md` (fokus performa) — file ini fokus pada maintainability,
> code health, dan sustainability jangka panjang.

---

## Cara Baca

| Field | Arti |
| --- | --- |
| **Dampak** | High / Medium / Low — efek ke velocity / bug rate |
| **Risiko** | High / Medium / Low — peluang regresi saat fix |
| **Bidang** | Web / Rust / WASM / Docs / CI / Shared |
| **Status** | 🟡 Open / 🟢 Applied / ⚪ Won't Fix |

---

## 1. Dual ORM (Drizzle + Kysely)

- **Bidang:** Web
- **File:** `package.json` (`drizzle-orm`, `kysely`), `apps/web/drizzle.config.ts`,
  `apps/web/src/lib/db/`
- **Dampak:** Medium
- **Risiko:** Medium

**Temuan:**
Repo punya dua ORM sekaligus. Drizzle untuk schema/migration, Kysely untuk query.
Pola ini valid (Drizzle → Kysely type bridge) tapi menambah cognitive load untuk
kontributor baru dan memperbesar bundle. Per README arsitektur, filosofi Rust-first
→ semakin tipis TypeScript layer semakin baik.

**Actionable Fix (dipecah jadi 2 fase):**

1. **Fase 1 (audit):** petakan semua query di `apps/web/src/lib/db/` dan
   `apps/web/src/lib/auth/`, klasifikasikan: (a) yang bisa murni Drizzle,
   (b) yang butuh raw SQL via Kysely.
2. **Fase 2 (migrasi, besar):** migrasi (b) ke Drizzle, hapus Kysely.
   Estimasi: 1–2 minggu.
3. **Alternatif:** pertahankan Kysely, hapus Drizzle (kebalikannya). Tapi ini
   lebih invasive karena Drizzle juga handle schema migration.

**Verifikasi:** `bun run build`, `bunx tsc --noEmit`, test auth + project flow.

---

## 2. Test Coverage Gap

- **Bidang:** Web / Rust
- **File:** `apps/web/src/lib/**/__tests__/` (lihat yang sudah ada),
  `rust/crates/*/tests/`
- **Dampak:** High
- **Risiko:** Low (add test, no behavior change)

**Temuan:**
Cek folder `__tests__/` di:

- `apps/web/src/lib/animation/__tests__/` ✅ ada
- `apps/web/src/lib/graphics/__tests__/` ✅ ada
- `apps/web/src/lib/masks/__tests__/` ✅ ada
- `apps/web/src/lib/project-file/__tests__/` ✅ ada
- `apps/web/src/lib/retime/__tests__/` ✅ ada
- `apps/web/src/lib/stickers/__tests__/` ✅ ada
- `apps/web/src/lib/fps/__tests__/` ✅ ada
- `apps/web/src/lib/whats-new/__tests__/` ✅ ada
- `apps/web/src/lib/transitions/definitions/` — belum jelas ada atau tidak
- `apps/web/src/lib/effects/definitions/` — belum jelas ada atau tidak
- `apps/web/src/lib/commands/**/` — belum jelas ada atau tidak
- `apps/web/src/core/managers/**/` — belum jelas ada atau tidak
- `rust/crates/*/tests/` — perlu audit terpisah

**Actionable Fix (fase per area):**

1. **Phase 1:** Coverage minimal 60% untuk:
   - `lib/export/` (format, MIME, extension) — 5 test
   - `lib/storage/` (adapter, service) — 8 test
   - `core/managers/save-manager.ts` — 6 test (lihat PERFORMANCE.md §1)
   - `core/managers/playback-manager.ts` — 6 test
2. **Phase 2:** Coverage 60% untuk commands:
   - `lib/commands/timeline/` — split, trim, ripple
   - `lib/commands/media/` — import, delete
   - `lib/commands/scene/` — add, remove, switch
3. **Phase 3:** Rust unit test untuk:
   - `rust/crates/time/` (tick math, frame conversion)
   - `rust/crates/bridge/` (WASM bindings)

**Verifikasi:** `bun run test`, `cargo test`, lihat coverage report.

---

## 3. Konsolidasi `manager vs hook` Pattern

- **Bidang:** Web
- **File:** `apps/web/src/core/managers/`, `apps/web/src/hooks/`
- **Dampak:** Medium
- **Risiko:** Medium (refactor pattern, harus hati-hati)

**Temuan:**

- `core/managers/` punya 14 file: `ai-manager`, `audio-manager`, `clipboard-manager`,
  `commands`, `diagnostics-manager`, `media-manager`, `playback-manager`,
  `project-manager`, `renderer-manager`, `save-manager`, `scenes-manager`,
  `selection-manager`, `teleprompter-manager`, `timeline-manager`.
- `hooks/` punya banyak `use-*` yang tipis (storage estimate, dll).
- Batas antara "manager (class, stateful, subscribe pattern)" vs "hook (React
  binding, reactive)" tidak selalu jelas.

**Actionable Fix (audit, bukan refactor besar):**

1. Buat `apps/web/src/core/ARCHITECTURE.md` yang mendokumentasikan:
   - Kapan sesuatu jadi `manager` (long-lived, side-effect-heavy, stateful)
   - Kapan sesuatu jadi `hook` (React-specific binding, reactive)
   - Contoh yang sudah benar
2. Untuk `manager` yang sebenarnya stateless atau trivial: kandidat jadi
   pure function.
3. Untuk `hook` yang sebenarnya mengandung business logic: kandidat jadi
   `manager` + thin hook wrapper.

**Verifikasi:** docs PR, tidak ada code change langsung (audit only).

---

## 4. Dead Code — `ChangelogNotification` Stub

- **Bidang:** Web
- **File:** `apps/web/src/lib/changelog/components/changelog-notification.tsx`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
Sudah tercatat di `PROBLEM.MD` problem 004 placeholder. Stub `return null` masih
di-import dan di-render di 2 halaman:

- `apps/web/src/app/editor/[project_id]/page.tsx` baris 59–61, 110
- `apps/web/src/app/projects/page.tsx` baris 93, 303

Stub juga tulis ke localStorage key `last-seen-version` yang tidak ada pembaca.

**Actionable Fix (kecil, terlingkup):**

1. Hapus `apps/web/src/lib/changelog/components/changelog-notification.tsx`.
2. Hapus import di `editor/[project_id]/page.tsx` dan `projects/page.tsx`.
3. Hapus render di kedua file.
4. Tambah test (opsional): tidak ada import `ChangelogNotification` di codebase
   (`grep` di CI).
5. Tambah entri "What's New" kategori `"improvement"`.

**Verifikasi:** grep clean, `bun run build` sukses, smoke test di editor + projects.

---

## 5. Magic Numbers di Timeline/Playback

- **Bidang:** Web
- **File:** `apps/web/src/core/managers/playback-manager.ts`,
  `apps/web/src/lib/timeline/`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
`TICKS_PER_SECOND = 120_000` ada di `lib/wasm/` (Rust-defined, di-import). Tapi
ada literal lain yang tidak di-konsolidasikan:

- `60` (fps default) di banyak tempat
- `800` (debounce save) di `save-manager.ts` constructor default
- `30_000` (storage poll interval) di `use-storage-estimate.ts`
- `52vh` (modal max height) di `whats-new-card.tsx`

**Actionable Fix (kecil, terlingkup):**

1. Buat `apps/web/src/lib/constants.ts` dengan konstanta:

   ```ts
   export const DEFAULT_FPS = 60;
   export const SAVE_DEBOUNCE_MS = 800;
   export const STORAGE_POLL_INTERVAL_MS = 30_000;
   export const WHATS_NEW_MODAL_MAX_HEIGHT = "52vh";
   ```

2. Replace literal di source.
3. Test tidak boleh berubah (default sama).

**Verifikasi:** grep tidak menemukan literal di source lain, `bun run build` sukses.

---

## 6. Tipe `any` dan Type Leak

- **Bidang:** Web
- **File:** `apps/web/src/` (scan)
- **Dampak:** Medium
- **Risiko:** Low (refactor, no behavior change)

**Temuan:**
Per `AGENTS.md` §"Code Quality Standard": "No unnecessary `any`". Perlu scan
berapa banyak `any` di source.

**Actionable Fix (audit → gradual):**

1. `cd "C:\Users\Arthe\Documents\MyProject\Artidor" && grep -rn ": any" apps/web/src/ --include="*.ts" --include="*.tsx" | wc -l`
2. Untuk setiap occurrence, evaluasi:
   - Bisa jadi `unknown` + type guard?
   - Bisa jadi generic `<T>`?
   - Bisa jadi proper interface?
3. Quick wins duluan: `Record<string, any>` → `Record<string, unknown>`.
4. Whitelist `any` yang legitimate (mis. third-party type yang broken).

**Verifikasi:** tsc strict lulus, count `: any` turun signifikan.

---

## 7. Logging Konsistensi

- **Bidang:** Web
- **File:** `apps/web/src/lib/diagnostics/`, `apps/web/src/core/managers/diagnostics-manager.ts`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
Pola log bervariasi: `console.log`, `console.warn`, `console.error`, custom
logger (jika ada), telemetry store (untuk AI events). Tidak ada format konsisten
(timestamp, level, context).

**Actionable Fix (kecil, terlingkup):**

1. Pilih atau buat `apps/web/src/lib/log.ts`:

   ```ts
   export const log = {
     debug: (ctx: string, msg: string, data?: unknown) => { /* ... */ },
     info:  (ctx: string, msg: string, data?: unknown) => { /* ... */ },
     warn:  (ctx: string, msg: string, data?: unknown) => { /* ... */ },
     error: (ctx: string, msg: string, err?: unknown) => { /* ... */ },
   };
   ```

2. Replace `console.log` di non-test source.
3. Production: route ke telemetry (opt-in), bukan console.
4. Test: log dipanggil dengan format benar.

**Verifikasi:** grep `console.log` di `apps/web/src/` turun drastis.

---

## 8. Path Alias Konsistensi

- **Bidang:** Web
- **File:** `apps/web/tsconfig.json`, `apps/web/next.config.ts`
- **Dampak:** Low
- **Risiko:** Low

**Temuan:**
`@/lib/...` dan `@/components/...` adalah alias yang dipakai. Cek apakah semua
import konsisten, atau ada campur relative (`../../`) dan alias.

**Actionable Fix (kecil, terlingkup):**

1. Audit import statement: `cd "C:\Users\Arthe\Documents\MyProject\Artidor" && grep -rn "from '\\.\\." apps/web/src/ | wc -l`
2. Pilih konvensi: alias only, atau alias preferred + relative untuk sibling.
3. Tambah Biome rule (jika belum ada) untuk enforce.

**Verifikasi:** import style konsisten, biome clean.

---

## 9. Error Handling Pattern

- **Bidang:** Web / Rust
- **File:** `apps/web/src/lib/`, `rust/crates/`
- **Dampak:** Medium
- **Risiko:** Low

**Temuan:**
Pola error handling bervariasi:

- `try/catch` dengan swallow (storage estimate)
- `try/catch` dengan rethrow
- `.catch(() => null)` pattern
- Custom error class
- Rust: `Result<T, E>` dengan `?` propagation (idiomatis), `unwrap()` (anti-pattern
  di production, OK di test)

**Actionable Fix (kecil, terlingkup):**

1. Buat `apps/web/src/lib/errors.ts` dengan typed error classes:

   ```ts
   export class StorageError extends Error { ... }
   export class ExportError extends Error { ... }
   export class RenderError extends Error { ... }
   export class AIError extends Error { ... }
   ```

2. Ganti generic `Error` di catch blocks.
3. Tambah `userMessage` field untuk error yang ditampilkan ke user.
4. Test: error type muncul dengan benar.

**Verifikasi:** grep `catch (err)` di source, setiap error ditransform ke typed.

---

## 10. Bundle Size Audit

- **Bidang:** Web
- **File:** `apps/web/next.config.ts`, `apps/web/package.json`
- **Dampak:** High (UX)
- **Risiko:** Low (analysis, not change)

**Temuan:**
Tidak ada CI step yang memonitor bundle size. `@ffmpeg/ffmpeg`, `next`, `react`,
`drizzle-orm`, `kysely`, dan 200+ dependencies lain bisa bengkak tanpa notice.

**Actionable Fix (governance):**

1. Tambah `@next/bundle-analyzer` ke devDependencies.
2. Tambah script: `"analyze": "ANALYZE=true bun run build:web"`.
3. Tambah CI job yang:
   - Build dengan analyzer
   - Parse `.next/analyze/*.html` atau JSON
   - Compare dengan baseline (PR-comment style)
   - Fail jika bundle > baseline + 5%
4. Tambah docs di `apps/web/docs/BUNDLE.md`.

**Verifikasi:** CI run, PR comment muncul, alert jika bengkak.

---

## 11. Docs Drift

- **Bidang:** Docs
- **File:** `README.md`, `PROGRESS_SUMMARY.md`, `ROADMAP.md`, `docs/`
- **Dampak:** Medium
- **Risiko:** Low

**Temuan:**
`PROGRESS_SUMMARY.md` dari 2026-06-17 (per entri maintenance). Setelah banyak
commit baru, beberapa item di tabel mungkin sudah outdated. Cek klaim:

- "58 efek" (latest)
- "50 transisi" (latest)
- "Shapes 75+ customizable" (latest)
- "Frame interpolation uncommitted" (per PROGRESS_SUMMARY — perlu re-verify)

**Actionable Fix (kecil, terlingkup):**

1. Buat `scripts/verify-progress.sh` yang:
   - Hitung efek dari `lib/effects/definitions/index.ts`
   - Hitung transisi dari `lib/transitions/index.ts`
   - Hitung shapes dari `lib/graphics/definitions/`
   - Compare dengan klaim di `PROGRESS_SUMMARY.md`
2. Run script, update doc.
3. Tambah CI: jalankan script, fail jika mismatch.

**Verifikasi:** `bun run verify:progress` sukses, doc akurat.

---

## 12. TypeScript Strictness

- **Bidang:** Web
- **File:** `apps/web/tsconfig.json`
- **Dampak:** Medium
- **Risiko:** Low (gradual)

**Temuan:**
Cek apakah `tsconfig.json` punya `"strict": true` dan sub-flags
(`noImplicitAny`, `strictNullChecks`, dll). Jika belum full strict, ada banyak
type safety hole laten.

**Actionable Fix (gradual):**

1. Audit `tsconfig.json` saat ini.
2. Set `"strict": true`.
3. Fix errors satu per satu (jangan `// @ts-ignore`).
4. Enable `noUncheckedIndexedAccess` (jika belum).
5. Enable `exactOptionalPropertyTypes` (jika belum).

**Verifikasi:** tsc clean, no regression.

---

## Out of Scope (Tidak Bisa Diubah Saat Ini)

| Item | Alasan |
| --- | --- |
| Hapus better-auth | Auth sensitive, governance protected |
| Hapus Drizzle | Perlu keputusan roadmap |
| Pindah ke Biome full (replace ESLint) | Biome sudah ada, mungkin sudah jadi default |
| Replace Bun dengan Node | Architecture decision |
| Tambah Sentry/error tracking | Dependency baru, perlu approval |
| Multi-language i18n | ROADMAP, fitur baru |
| Tambah Storybook | Tooling baru, perlu approval |

---

## Quick Wins (Mulai dari Sini)

Jika baru mulai tackle tech debt, urutan yang direkomendasikan:

1. **#4 Dead Code ChangelogNotification** — kecil, jelas, low risk
2. **#5 Magic Numbers** — pure rename, no behavior change
3. **#7 Logging Konsistensi** — infrastruktur, banyak follow-up benefit
4. **#9 Error Handling** — typed errors → better debugging
5. **#10 Bundle Size Audit** — visibility dulu, fix nanti
6. **#12 TypeScript Strictness** — gradual, banyak payoff

Yang lebih besar (#1, #2, #3, #6, #8, #11) butuh waktu dan keputusan arsitektur.
