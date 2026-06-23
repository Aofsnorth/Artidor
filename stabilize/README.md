# Stabilize

Use this folder for bug triage, regression control, and quality stabilization.

## Struktur

```
stabilize/
├─ README.md              ← file ini (index)
├─ BUGS.md                ← bug tracker
├─ STATE.md               ← current state, focus, risks, decisions
├─ QA.md                  ← smoke test + browser matrix
├─ REGRESSIONS.md         ← regression tracker
├─ CRITICAL.MD            ← critical issue template
├─ PROBLEM.MD             ← problem reports (audit + fix workflow)
├─ MAINTENANCE.MD         ← chronological maintenance log
├─ TODO.md                ← task list
├─ RULES.md               ← branch rules, approval, sensitive areas
└─ improvement-tracks/    ← improvement opportunities (read-only reference)
   ├─ README.md           ← index subfolder
   ├─ PERFORMANCE.md      ← 10 perf opportunities
   ├─ FFMPEG-OPTIONS.md   ← 4 opsi integrasi FFmpeg
   ├─ SECURITY-AUDIT.md   ← 10-section security checklist
   ├─ TECH-DEBT.md        ← 12 tech debt items
   ├─ ACCESSIBILITY.md    ← WCAG 2.1 AA checklist
   ├─ TESTING.md          ← test strategy + coverage targets
   └─ CI-CD.md            ← 10 CI/CD improvements dengan YAML snippets
```

## Governance (root files)

File-file di root (`BUGS.md`, `PROBLEM.MD`, `MAINTENANCE.MD`, `RULES.MD`, dll)
adalah **governance aktif**: dipakai untuk track bug, audit, fix workflow, dan
maintenance log. Update sesuai `RULES.MD` §2 (perlu approval) dan §3 (satu
perubahan logis per langkah).

## Improvement Tracks (subfolder)

File-file di `improvement-tracks/` adalah **read-only reference** dengan
actionable items grounded ke codebase Artidor. Update status `- [x]` `- [⚠️]`
`- [🚨]` langsung tanpa approval. Untuk implement fix individual, buat problem
baru di `PROBLEM.MD` per `RULES.MD` §2.

Lihat `improvement-tracks/README.md` untuk deskripsi tiap file.

## Catatan

- Folder `stabilize/` ini berdiri sendiri di root repo (bukan di bawah `apps/`).
- File governance existing **tidak boleh dipindah atau diubah tanpa approval**
  (per `RULES.MD` §3).
- Improvement tracks adalah **rekomendasi**, bukan instruction. Eksekusi tetap
  lewat `PROBLEM.MD` workflow.
