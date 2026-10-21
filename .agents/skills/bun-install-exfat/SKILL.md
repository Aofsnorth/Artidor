---
name: bun-install-exfat
description: "Use when `bun install` fails in Artidor with EISDIR symlink floods, EPERM mkdir on node_modules, ENOENT for @artidor/web or artidor-wasm, or 'Local NTFS volumes are required'. Drive E: is exFAT (no symlinks/junctions/hardlinks), so every Bun linker needs manual workspace copies."
---

# Bun install on exFAT (E: drive)

## When to use / not use

- Use: install errors above on this machine. The project lives on an exFAT volume.
- Do NOT use on NTFS drives — there just run `bun install` (default isolated linker is fine, needs Windows Developer Mode for symlinks).

## Procedure

1. If `node_modules` cannot be deleted (Access denied / delete-pending): kill only the Zed language servers for this project (vtsls, typescript typingsInstaller, eslint, tailwind, json, yaml — find via `Get-CimInstance Win32_Process` cmdline match). Zed restarts them automatically. Never kill Enorme/9router/node services outside the project.
2. Delete stale state: `cmd //c "rmdir /s /q node_modules"` (and `apps\web\node_modules`). MSYS `rm -rf` is slow; use rmdir. Bun background installs (`nohup ... &`) die when the terminal tool call ends — run installs in the foreground with a large `timeout_ms` (full install ≈ 11 min).
3. Install: `bun install --linker=hoisted` (isolated linker always fails on exFAT; .npmrc `node-linker=isolated` is ignored/unreachable without symlinks).
4. Workspace links cannot be created on exFAT — bun leaves `node_modules/@artidor` empty and reports cascading ENOENT under `@artidor/web/node_modules/...`. Fill with real copies (robocopy, not junctions — "Local NTFS volumes are required"):
   - `cmd //c "robocopy apps\web node_modules\@artidor\web /E /XD node_modules .next .content-collections .turbo /NFL /NDL /NJH /NP"`
   - `cmd //c "robocopy packages\mcp-server node_modules\@artidor\mcp-server /E /XD node_modules /NFL /NDL /NJH /NP"`
   - `mkdir node_modules/artidor-wasm` + `cmd //c "robocopy rust\wasm\pkg node_modules\artidor-wasm /E /NFL /NDL /NJH /NP"` (local wasm package, declared `workspace:*`).
5. Re-run `bun install --linker=hoisted` until it reports "Checked ... (no changes)".

## Pitfalls

- These node_modules entries are COPIES, not links. After every `bun run build:wasm`, re-copy `rust/wasm/pkg` → `node_modules/artidor-wasm` or the editor keeps running the old wasm.
- robocopy exit codes 0–7 are success; sh reports them as failures.
- `git config core.autocrlf=true` checks out all files as CRLF; `biome check` then reports format errors on every CRLF file. Environmental, not code — do not mass-reformat.

## Turbopack junction panic on exFAT ("failed to create junction point")

Symptom: `next dev` (Turbopack, Next 16.3.x) panics with `failed to create junction point at ...\\.next\\dev\\node_modules\\<pkg>-<hash>` on page compile (os error 1, Incorrect function).

Root cause: a **dynamic `import("<esm-package>")` reachable from the SSR graph** (e.g. in a client component module) is compiled by Turbopack into an `[externals]` chunk that does `import("<pkg>-<hash>")`; Turbopack materializes a Windows junction for that alias under `.next/dev/node_modules`. exFAT cannot host reparse points. Static imports and worker-graph dynamic imports are bundled (safe). `experimental.turbopackFileSystemCacheForDev/Build: false` does NOT fix this (different mechanism). `experimental.esmExternals` is webpack-only, ignored by Turbopack. Pre-creating a real dir at the junction path fails too (Turbopack removes then recreates it).

Fix pattern: move the dynamic import into a dedicated Web Worker (`new Worker(new URL("./x.worker.ts", import.meta.url), { type: "module" })` — browser-only graph, package gets bundled). Keep the main-thread module's public API stable (transfer ImageBitmaps in/out; worker does OffscreenCanvas work). Applied to `apps/web/src/lib/segmentation/ai-cutout(.worker).ts`.

Keep `experimental.turbopackFileSystemCacheForDev/Build: false` on win32 in `apps/web/next.config.ts` — the persistent FS cache needs links too and must stay off on exFAT.

## Corrupted package repair (runtime Module not found)

Symptom: `next dev` floods with `Can't resolve './icons/xxx.mjs'` or `Export default doesn't exist ... The module has no exports at all` from one package's barrel file (e.g. lucide-react). Barrel exists, icon modules missing/0-byte.

Procedure:
1. Confirm corruption: count files in the package dir vs `grep -c "from './icons/" <barrel>.mjs`, and count `find <dir> -name '*.mjs' -size 0`.
2. CRITICAL: check the bun cache copy too (`$HOME/.bun/install/cache/<pkg>@<ver>@@@1`). If it is also incomplete, a plain reinstall restores the same corruption — delete BOTH `node_modules/<pkg>` (via `cmd //c rmdir /s /q`) and the cache entry before reinstalling.
3. `bun install --linker=hoisted` — restores only the deleted package (~30s).
4. Verify exhaustively: `bun -e` script that extracts every `from './icons/...'` path from the barrel and asserts exists + size>0. Also confirm workspace copies (`node_modules/@artidor/*`, `artidor-wasm`) survived the reinstall.

## D: is a USB SSD that corrupts data transiently (read this before blaming the code)

`D:\Artidor` is a **USB-attached SSD** (`Get-Disk` shows BusType USB; C: is the
internal NVMe). It returns *plausible but wrong* bytes for large files, and the
damage is **transient** - re-reading the file, or copying it to a new path,
usually yields the correct bytes again. NTFS reports the volume as healthy
(NTFS event 98: "Volume D: is healthy"), so nothing in the event log points at
it.

Signature: **4-byte-aligned damage** (one or a few 32-bit words changed), in
files that were recently written or read.

What it looks like in practice:

- `bun install` copies a package out of the C: cache onto D: and the copy is
  corrupt even though the cache copy is byte-identical to the npm tarball.
  Compare with the tarball, not with the cache, to see the difference.
- A `next dev` / `turbo.exe` / `node` process **segfaults or exits with code 5
  right after it starts**, with no error message. The same binary, byte-identical,
  runs fine when copied to a different path.
- A file that was correct a minute ago differs from the published package by a
  handful of bytes.
- Git objects go bad: `git fsck` reports CRC mismatches, `pack has bad object`,
  `corrupt loose object`.

Procedure:

1. **Confirm the volume**: `Get-Disk | Format-Table Number,FriendlyName,BusType,HealthStatus`.
   A USB bus type explains all of it.
2. **Verify `node_modules` against the C: cache** (the cache is on C: and is
   healthy). Compare every file of every materialised package; the ones that
   differ are the damaged ones. Repair by writing the cache copy to a **new
   path** and swapping it into place, then **re-read and verify** - an in-place
   rewrite keeps the damaged copy, and a single write can be damaged too, so
   retry until the read-back matches.
3. **Re-verify after every `bun install`.** The install itself is what damages
   the copies. A repair that is not followed by a re-verify will look like it
   worked and then fail again later.
4. **For git**: rebuild the object store from `origin` (a fresh mirror fetch
   gives clean packs) and keep the corrupt pack as a backup **off D:**. See the
   `artidor-git-bitrot-recovery` skill.
5. **A segfaulting binary is a symptom, not a bug in the binary.** Check the
   bytes against the published package first; if they match, the file on disk is
   fine and the damage is in transit.

Keep the bun cache and any backups on C:. D: is the source of the damage.

## Verification

- `bun install --linker=hoisted` ends with `(no changes)`.
- `node_modules/.bin/tsc.exe --noEmit -p apps/web/tsconfig.json` — known pre-existing error in `lib/auth/server.ts` (rate-limit storage type) is unrelated noise.
- `bun test --isolate apps/web/src` — ~1262 pass.
