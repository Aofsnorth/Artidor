---
name: artidor-git-bitrot-recovery
description: >-
  Use when D:\Artidor git objects or Delta worktrees break - "inflate: data
  stream error", "pack has bad object", "packed object ... is corrupt", "bad
  file", fsck missing blobs, or Delta failing to prepare a worktree
  ("repository local:<uuid> has not been shared", "git cat-file --batch request
  failed: failed to fill whole buffer").
---

# Artidor git bit-rot recovery

## When to Use

- Delta refuses to prepare/mount the Artidor worktree:
  `filesystem error initializing <path>: repository local:<uuid> has not been shared`.
- `git` prints `inflate: data stream error (incorrect data check)`,
  `pack has bad object at offset N`, `fatal: packed object <sha> ... is corrupt`,
  or `git cat-file <sha>: bad file`.
- `git fsck` reports `missing blob` / `broken link from tree ... to blob ...`.
- Working-tree binaries differ from HEAD by only a few bytes.
- Every `git` command prints `error: HEAD: invalid reflog entry <sha>`.
- Tooling fails with nonsense syntax errors: `tsc` throws
  `SyntaxError: Unexpected identifier 'numberTypolToumericStringType'`, Biome exits
  29/132 or segfaults, `next build` reports invalid JSON in
  `capsize-font-metrics.json`, or bun:test resolves a bogus export
  (`export 'Check' not found in './Tick01Icon.js'`).

## When NOT to Use

- Normal merge/rebase conflicts, or a dirty working tree without object errors.
- Delta UI-only problems (a worktree that mounts but shows stale files) - check
  `.delta\worktrees\<namespace>` content first.

## Environment Facts

- Main checkout: `D:\Artidor` (moved from `E:\Projects\Software\Artidor`; E: is gone).
  Volume D: produces bit-level damage, so keep backups on C:.
- No network here (`github.com` does not resolve) - re-cloning from origin is NOT
  a recovery path. Everything must be rebuilt from local copies.
- Delta per-thread clone: `D:\Artidor\.delta\clones\<namespace>\Artidor.git`
  (a `git clone --shared --separate-git-dir` result: `bare = false`,
  `core.worktree` points at the worktree dir, `objects/info/alternates` points at
  `D:/Artidor/.git/objects`).
- Delta worktree dir: `D:\Artidor\.delta\worktrees\<namespace>\Artidor`, with a
  `.git` file pointing back at the clone.
- A materialised Delta worktree from before the damage is a **valid recovery
  source** for blob content.
- Prior repair backups live in `C:\Users\Axeliory\delta-artidor-backup\<timestamp>\`.

## Procedure

### 0. Sweep the working tree before trusting any result

In-place corruption keeps the file's size and mtime, so `git status` can report a
clean tree while the bytes are wrong. Compare every tracked blob:

```bash
git ls-files -s | while read mode hash stage path; do
  actual=$(git hash-object "$path" 2>/dev/null)
  [ "$actual" = "$hash" ] || echo "$path"
done
```

Do not `rm` a file before its replacement is already readable: a damaged pack can
make `git checkout` abort mid-way and leave the path empty. Prefer
`git cat-file blob <oid> > <path>`, then verify with `git hash-object`.

### 0.1 Repair `node_modules` and tooling

The bun store under `node_modules/.bun/` rots too, and a plain reinstall re-creates
the same bad bytes because the cached tarball is damaged as well.

1. Prove the file is bad with a parser, not a build:
   `node -e "JSON.parse(require('fs').readFileSync(p,'utf8'))"` or
   `node -e "new Function(require('fs').readFileSync(p,'utf8'))"`.
2. `bun pm cache rm`
3. `rm -rf node_modules/.bun/<pkg>@<version>+<hash>` (the exact directory the
   symlink resolves to, e.g. `node_modules/.bun/next@16.4.0+<hash>`)
4. `bun install --frozen-lockfile`
5. Re-run the parser check. Repeat for each package the build reports.

When `typescript` itself keeps rotting, bypass `node_modules` entirely:

```bash
mkdir -p .tmp-tscheck
curl -sSL -o .tmp-tscheck/ts.tgz https://registry.npmjs.org/typescript/-/typescript-<ver>.tgz
tar -xzf .tmp-tscheck/ts.tgz -C .tmp-tscheck
node .tmp-tscheck/package/lib/tsc.js --noEmit -p apps/web/tsconfig.json
rm -rf .tmp-tscheck
```

### 1. Confirm the cause

```bash
grep -n "worktree preparation\|has not been shared\|failed to fill whole buffer" \
  "$LOCALAPPDATA/delta"/delta.log* | tail -20
```

`"git cat-file --batch request failed: failed to fill whole buffer"` means git
died mid-batch on a corrupt object; that is the real error. The
`has not been shared` wording is Delta's wrapper message for a worktree whose
clone never got created.

### 2. Enumerate the damage

```bash
git fsck --no-progress --full                       # missing blobs only
git verify-pack -v .git/objects/pack/<pack>.idx      # stops at first bad object
```

`git fsck` does NOT report corrupt packed blobs - only missing ones. To find
every unreadable object, loop `git cat-file --batch` over the object list and
restart it after each failure (git aborts the whole batch on a corrupt object):

```bash
git cat-file --batch-all-objects --batch-check | awk '{print $1}' | sort -u > /tmp/left.txt
while [ -s /tmp/left.txt ]; do
  git cat-file --batch < /tmp/left.txt > /dev/null 2>/tmp/err.txt
  [ -s /tmp/err.txt ] || break
  sha=$(grep -oE '[0-9a-f]{40}' /tmp/err.txt | head -1); echo "$sha" >> /tmp/bad.txt
  grep -v "^$sha$" /tmp/left.txt > /tmp/l2.txt && mv /tmp/l2.txt /tmp/left.txt
done
```

### 3. Recover blob content

For each corrupt blob, look for a byte-identical copy (matching oid) in:
`D:\Artidor\.delta\worktrees\<namespace>\Artidor\...` (pre-damage materialisation),
or the working tree, and check with `git hash-object -- <file>`.

### 4. Rebuild the pack without the corrupt objects

```bash
git cat-file --batch-all-objects --batch-check | awk '{print $1}' | sort -u \
  | grep -vxF -f /tmp/bad.txt > /tmp/keep.txt
git pack-objects --non-empty --no-reuse-delta --delta-base-offset .git/packbuild-tmp/newpack < /tmp/keep.txt
git verify-pack -v .git/packbuild-tmp/newpack-<sha>.idx   # must be clean
```

Then swap: install the new pack into `.git/objects/pack/`, move the old pack
**out** of that directory to a C: backup, and delete `multi-pack-index` (it
caches object locations and must be regenerated).

### 5. Restore blobs as healthy loose objects

```bash
git --git-dir='D:/Artidor/.git' hash-object -w -t blob --stdin < <good copy>
```

Verify the file exists under `.git/objects/<xx>/<rest>` afterwards.

### 6. Restore bit-rotted working-tree binaries

```bash
git cat-file blob "$(git rev-parse HEAD:<path>)" | cmp -l - <path> | wc -l
```

A handful of differing bytes in a multi-MB file is bit rot, not an edit.
Restore those paths with `git restore --pathspec-from-file=<list>`.

### 7. Repair the reflog chain

Entries pointing at vanished objects make every git command print
`invalid reflog entry`. Drop those entries and re-chain
(`old` of each kept entry = `new` of the previous kept entry), keeping a `.bak`
copy of the original reflog.

### 8. Make Delta re-prepare the worktree

Delete the empty `D:\Artidor\.delta\clones\<namespace>` and
`D:\Artidor\.delta\worktrees\<namespace>` directories, then **restart Delta**.
The app caches the failed mount and does not retry in-session.

## Pitfalls

- `git cat-file blob <oid> > <path>` silently truncates when the pack entry is
  damaged. Always verify the written file's `git hash-object`; if the object is
  unreadable, fetch that one blob from origin
  (`https://raw.githubusercontent.com/Aofsnorth/Artidor/<commit>/<path>`) and check
  the hash again.
- Corrupted YAML frontmatter blocks Zed from loading a skill. A plain scalar
  `description` cannot contain `: `; use `>-` folded style or quote it.
- `git fsck` can look clean while `git cat-file blob <sha>` fails. Always test
  content reads, not just headers.
- `git hash-object -w` does NOT overwrite an existing loose object file, even a
  corrupt one - the read still fails with `bad file`. Delete the stale file first.
- Git resolves the **packed** copy before the loose one, so a healthy loose
  object does not mask a corrupt packed one. The corrupt entry must leave the pack.
- MSYS path mangling: `--git-dir=/d/Artidor/.git` can write outside the intended
  repo. Use `D:/Artidor/.git`.
- Do not delete the corrupt pack before the replacement is verified, and keep the
  copy off D: (that volume is the source of the damage).
- `git gc --prune=now` drops unreachable objects, including any dangling work.
  Avoid it until the store is confirmed healthy.
- Delta's clone dirs hold no independent object copies (alternates), so they are
  not a recovery source - the materialised worktree is.

## Verification

- Object-store sweep from step 2 reports zero unreadable objects.
- `git rev-list --objects <commit> | cut -d' ' -f1 | git cat-file --batch` for
  every commit the thread uses: no stderr.
- Simulate Delta's materialisation exactly:
  `git clone --shared --separate-git-dir=<tmp.git> --no-checkout D:/Artidor <tmp>`,
  then `git --git-dir=<tmp.git> ls-tree -r <commit> | awk '{print $3}' | git --git-dir=<tmp.git> cat-file --batch`
  for each commit: no stderr.
- `git fsck --full` shows only the blobs that are genuinely unrecoverable
  (report them; do not hide them).
- `git diff --numstat` shows no binary-only (`-`) entries, and `git status`
  prints no reflog errors.
