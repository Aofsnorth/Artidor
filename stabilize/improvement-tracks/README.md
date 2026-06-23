# Improvement Tracks

> Kumpulan opportunity peningkatan Artidor yang **bisa dilakukan di kode** (bukan
> wishlist kosong). Setiap track grounded ke file yang ada di repo, dengan
> actionable items, dampak, risiko, dan cara verifikasi.
>
> **Status:** Semua file di folder ini adalah **read-only reference**. Update
> status `- [x]` / `- [⚠️]` / `- [🚨]` langsung tanpa approval. Untuk implement
> fix individual, buat problem baru di `../PROBLEM.MD` per `../RULES.MD` §2.

## Daftar Track

| File | Baris | Fokus | Quick Win Pertama |
|---|---:|---|---|
| [`PERFORMANCE.md`](./PERFORMANCE.md) | ~298 | 10 perf opportunities (save manager, playback drift, IDB leak, dll) | #1 Save manager re-entrancy guard |
| [`FFMPEG-OPTIONS.md`](./FFMPEG-OPTIONS.md) | ~232 | 4 opsi integrasi FFmpeg (WASM, desktop, server, hybrid) | Evaluasi Opsi 1 (FFmpeg.wasm lazy) |
| [`SECURITY-AUDIT.md`](./SECURITY-AUDIT.md) | ~301 | 10-section security checklist (secrets, XSS, auth, storage, dll) | #1 Secrets & credentials scan |
| [`TECH-DEBT.md`](./TECH-DEBT.md) | ~385 | 12 tech debt items (dual ORM, test gap, dead code, magic numbers, dll) | #4 Dead code ChangelogNotification |
| [`ACCESSIBILITY.md`](./ACCESSIBILITY.md) | ~251 | WCAG 2.1 AA checklist (keyboard, ARIA, contrast, screen reader, dll) | `aria-label` ke icon-only buttons |
| [`TESTING.md`](./TESTING.md) | ~389 | Test strategy + coverage targets + anti-patterns + quick start | `core/managers/save-manager.test.ts` |
| [`CI-CD.md`](./CI-CD.md) | ~450 | 10 CI/CD improvements dengan YAML snippets siap pakai | #1 WASM pkg staleness check |

## Cara Pakai

1. **Browse** — buka file sesuai area yang mau di-improve.
2. **Pick item** — pilih satu item (jangan batch banyak sekaligus).
3. **Cek status** — kalau `- [x]` berarti sudah aman/selesai, skip.
4. **Buat problem** — copy struktur ke `../PROBLEM.MD` (template di sana).
5. **Approval** — per `../RULES.MD` §2, AI harus explain dulu sebelum edit code.
6. **Tunggu OK** — jangan edit source sebelum ada approval eksplisit.
7. **Update status** — setelah fix applied dan diverifikasi, ubah ke `- [x]`.

## Severity & Routing

- **CRITICAL** → catat juga di `../CRITICAL.MD`, surface ke user immediate.
- **HIGH** → buat problem baru di `../PROBLEM.MD`, fix dalam 1 sprint.
- **MEDIUM** → kumpulkan, fix oportunistic.
- **LOW** → polish, batch dengan item lain.

## Anti-Patterns

Per `../RULES.MD` §3 dan `../AGENTS.md`:

- ❌ Jangan langsung edit code tanpa approval.
- ❌ Jangan batch banyak fix jadi satu PR besar.
- ❌ Jangan hapus test untuk membuat CI pass.
- ❌ Jangan bypass linter/typecheck.
- ❌ Jangan edit area sensitif (auth, AI tools, Rust/WASM, payment) tanpa
  review ekstra (lihat `../RULES.MD` §4).

## Highlight Temuan (Live Snapshot)

Item-item yang menurut saya paling berdampak dan paling aman untuk dieksekusi
dulu (semua `- [ ]` = open). Detail di file masing-masing.

### Quick Wins (effort < 2 jam, low risk)

- [ ] **PERFORMANCE §5** — HEVC export filename ambiguous (label mp4 padahal codec HEVC)
- [ ] **TECH-DEBT §4** — Dead code `ChangelogNotification` (sudah placeholder problem 004)
- [ ] **TECH-DEBT §5** — Magic numbers (60 fps, 800ms debounce, 30s poll) → constants.ts
- [ ] **PERFORMANCE §3** — `useStorageEstimate` polling 30s di tab background
- [ ] **PERFORMANCE §6** — Effects/Transitions filter tidak di-memoize
- [ ] **PERFORMANCE §8** — Storage card tidak real-time setelah import
- [ ] **PERFORMANCE §10** — 4 pre-existing biome warnings
- [ ] **CI-CD §3** — Playwright artifact upload on failure
- [ ] **CI-CD §6** — Auto-merge Dependabot config
- [ ] **ACCESSIBILITY §6** — `outline-none` audit + `focus-visible:ring-2`

### Medium Effort (1–2 hari, medium risk)

- [ ] **PERFORMANCE §1** — Save manager `flush()` bisa silent no-op (caller hang)
- [ ] **PERFORMANCE §2** — Playback timer drift (ganti ke `requestAnimationFrame`)
- [ ] **PERFORMANCE §4** — IndexedDB connection leak setelah ratusan save
- [ ] **CI-CD §1** — WASM pkg staleness check (penting, sering kelupaan)
- [ ] **CI-CD §4** — Cache optimization untuk Bun + Cargo
- [ ] **CI-CD §7** — Lighthouse CI integration
- [ ] **PERFORMANCE §9** — Frame interpolation uncommitted (per PROGRESS_SUMMARY)

### Strategic Decisions (butuh input user)

- [ ] **FFMPEG-OPTIONS** — Pilih Opsi 1/2/3/4 (WASM/desktop/server/hybrid)
- [ ] **TECH-DEBT §1** — Dual ORM (Drizzle + Kysely) → pilih salah satu
- [ ] **TECH-DEBT §3** — Manager vs Hook pattern (audit only, no refactor)
- [ ] **TECH-DEBT §10** — Bundle size monitor (CI infrastructure)
- [ ] **TECH-DEBT §12** — TypeScript strictness gradual rollout

## Update

Track ini ditambahkan 2026-06-23. Untuk status real-time, lihat file masing-masing.
Setiap kali fix applied dan diverifikasi, update `- [ ]` → `- [x]` langsung di
file track yang relevan.
