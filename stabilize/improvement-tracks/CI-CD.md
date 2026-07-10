# CI/CD Improvements

> Improvement pipeline CI/CD Artidor yang **bisa dilakukan di kode** (file YAML
>
> + scripts + GitHub Actions). Semua grounded ke `.github/workflows/` yang ada.

---

## Inventaris Workflow Saat Ini

Per `ls .github/workflows/`:

- `ci.yml` — CI utama (build, test, lint)
- (mungkin ada juga `e2e.yml`, `security.yml`, `release.yml` — perlu audit)

---

## Pain Points yang Bisa Di-fix

### 1. WASM pkg Staleness

**Temuan:** Tidak ada CI check yang memverifikasi `rust/wasm/pkg/` sesuai dengan
source Rust. Kontributor bisa lupa rebuild.

**Actionable Fix:**

Tambah job di `ci.yml`:

```yaml
verify-wasm:
  name: Verify WASM pkg is fresh
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Install Rust
      uses: dtolnay/rust-toolchain@stable

    - name: Install wasm-pack
      run: cargo install wasm-pack

    - name: Build WASM to temp
      run: |
        wasm-pack build rust/wasm --target bundler --out-dir /tmp/wasm-pkg
        rm -f /tmp/wasm-pkg/.gitignore

    - name: Diff with committed
      run: |
        if ! diff -r rust/wasm/pkg /tmp/wasm-pkg; then
          echo "::error::WASM pkg is stale. Run 'bun run build:wasm' and commit."
          exit 1
        fi
```

**Effort:** 1–2 jam.
**Dampak:** High (mencegah bug deploy karena WASM basi).

---

### 2. Bundle Size Monitor

**Temuan:** Tidak ada monitoring bundle size. Bisa bengkak tanpa notice.

**Actionable Fix:**

Pakai `next bundle analyzer`:

```yaml
analyze-bundle:
  name: Analyze bundle size
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
      with:
        bun-version: 1.2.18

    - name: Install
      run: bun install

    - name: Build with analyzer
      run: ANALYZE=true bun run build:web

    - name: Parse analyzer output
      run: |
        # Extract total bundle size dari .next/analyze/client.html
        # Compare dengan baseline.json
        # Fail jika > baseline + 5%
        bun scripts/check-bundle-size.ts
```

Tambah `apps/web/scripts/check-bundle-size.ts` (Bun script) untuk parse dan
compare.

**Effort:** 4–6 jam (termasuk script).
**Dampak:** Medium (visibility, prevent regression).

---

### 3. Playwright E2E Result Upload

**Temuan:** Jika Playwright e2e gagal di CI, artifact (screenshot, video,
trace) perlu di-upload untuk debug.

**Actionable Fix:**

```yaml
e2e:
  name: E2E tests (Playwright)
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
    - run: bun install
    - run: bunx playwright install --with-deps chromium

    - name: Run E2E
      run: bun run test:e2e

    - name: Upload artifacts on failure
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: |
          playwright-report/
          test-results/
        retention-days: 7
```

**Effort:** 1 jam.
**Dampak:** High (debug-ability).

---

### 4. Cache Optimization

**Temuan:** `bun install` dan `cargo build` lambat tanpa cache. GitHub Actions
punya cache built-in untuk `~/.cargo` dan `node_modules`, tapi perlu config
yang benar.

**Actionable Fix:**

```yaml
- name: Cache Bun
  uses: actions/cache@v4
  with:
    path: |
      ~/.bun/install/cache
      **/node_modules
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock', '**/package.json') }}
    restore-keys: |
      ${{ runner.os }}-bun-

- name: Cache Cargo
  uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      target
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock', '**/Cargo.toml') }}
    restore-keys: |
      ${{ runner.os }}-cargo-
```

Tambah `sccache` untuk Rust:

```yaml
- name: Install sccache
  run: cargo install sccache

- name: Configure sccache
  run: echo "RUSTC_WRAPPER=sccache" >> $GITHUB_ENV
```

**Effort:** 1–2 jam.
**Dampak:** High (CI time turun 30–50%).

---

### 5. Matrix Testing

**Temuan:** Test hanya di 1 OS / 1 Node version. Bisa ada bug yang OS-specific.

**Actionable Fix:**

```yaml
test:
  name: Test (${{ matrix.os }}, bun ${{ matrix.bun }})
  runs-on: ${{ matrix.os }}
  strategy:
    fail-fast: false
    matrix:
      os: [ubuntu-latest, macos-latest, windows-latest]
      bun: ['1.2.18']
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
      with:
        bun-version: ${{ matrix.bun }}
    - run: bun install
    - run: bun test apps/web/src
    - run: cd rust && cargo test
```

**Effort:** 1 jam.
**Dampak:** Medium (catches OS-specific bugs).

**Catatan:** Mungkin mahal (3× cost). Bisa di-reduce ke 1 OS (Ubuntu) untuk unit,
Windows untuk E2E saja.

---

### 6. Auto-merge Dependabot

**Temuan:** `.github/dependabot.yml` (jika ada) mungkin ada, tapi PR Dependabot
sering stuck karena CI gagal atau perlu review.

**Actionable Fix:**

```yaml
# .github/dependabot.yml (suggested)
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]
    labels:
      - "dependencies"
      - "auto-merge"

  - package-ecosystem: "cargo"
    directory: "/rust"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 3
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]

  - package-ecosystem: "github-actions"
    directory: "/.github/workflows"
    schedule:
      interval: "monthly"
    groups:
      actions:
        patterns: ["*"]
```

Aktifkan auto-merge di repo settings (GitHub UI) untuk Dependabot PR.

**Effort:** 1 jam (config) + enable di UI.
**Dampak:** Medium (kurangi maintenance overhead).

---

### 7. Lighthouse CI

**Temuan:** Tidak ada Lighthouse score tracking. Performance, accessibility,
SEO, best practices bisa regress.

**Actionable Fix:**

Pakai `@lhci/cli`:

```yaml
lhci:
  name: Lighthouse CI
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2

    - name: Install
      run: bun install

    - name: Build
      run: bun run build:web

    - name: Start server
      run: |
        bun run start &
        sleep 5

    - name: Run Lighthouse
      run: |
        bunx @lhci/cli@0.13.x autorun \
          --collect.staticDistDir=./apps/web/.next \
          --collect.url=http://localhost:3000 \
          --assert.preset=lighthouse:recommended \
          --upload.target=temporary-public-storage
```

Atau untuk local (tidak butuh server):

```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      http://localhost:3000/
      http://localhost:3000/projects
      http://localhost:3000/editor/test
    uploadArtifacts: true
    temporaryPublicStorage: true
```

**Effort:** 4–6 jam.
**Dampak:** Medium (visibility ke regressions).

---

### 8. Docker Image Build (jika perlu)

**Temuan:** `Dockerfile` ada di `apps/web/`, tapi tidak yakin apakah ada CI yang
build & publish image.

**Actionable Fix (jika belum ada):**

```yaml
docker:
  name: Build & publish Docker image
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - name: Build and push
      uses: docker/build-push-action@v5
      with:
        context: .
        file: apps/web/Dockerfile
        push: true
        tags: |
          aofsnorth/artidor-web:latest
          aofsnorth/artidor-web:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

**Effort:** 2–3 jam.
**Dampak:** Low (kecuali mau self-host Artidor via Docker).

---

### 9. Slack/Discord Notification (Opsional)

**Temuan:** CI failure tidak ada notifikasi real-time. Maintainer bisa miss.

**Actionable Fix:**

```yaml
notify:
  name: Notify on CI failure
  runs-on: ubuntu-latest
  if: failure()
  needs: [ci, e2e, security]
  steps:
    - name: Discord notification
      uses: sarisia/actions-status-discord@v1
      with:
        webhook: ${{ secrets.DISCORD_WEBHOOK }}
        title: "CI Failed"
        url: "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
        color: 0xff0000
```

**Effort:** 30 menit.
**Dampak:** Low (opsional, helpful untuk solo maintainer).

---

### 10. Pre-commit Hook (Lokal)

**Temuan:** Tidak ada pre-commit hook lokal. Kontributor bisa commit tanpa
lint/test, baru CI gagal.

**Actionable Fix:**

Pakai `lefthook` (modern, Bun-compatible) atau `husky`:

```json
// lefthook.yml
pre-commit:
  parallel: true
  commands:
    biome:
      glob: "*.{ts,tsx,js,jsx,json}"
      run: bunx biome check --write --no-errors-on-unmatched {staged_files}
    tsc:
      glob: "*.{ts,tsx}"
      run: cd apps/web && bunx tsc --noEmit
    cargo-fmt:
      glob: "*.rs"
      run: cd rust && cargo fmt --check
    cargo-clippy:
      glob: "*.rs"
      run: cd rust && cargo clippy -- -D warnings
```

Install:

```bash
bun add -D lefthook
bunx lefthook install
```

**Effort:** 1–2 jam.
**Dampak:** High (catch error sebelum commit).

---

## Rangkuman Prioritas

| # | Item | Effort | Dampak | Prioritas |
| --- | --- | --- | --- | --- |
| 1 | WASM pkg staleness check | 1–2 jam | High | 🔴 P0 |
| 2 | Cache optimization | 1–2 jam | High | 🔴 P0 |
| 3 | Playwright artifact upload | 1 jam | High | 🔴 P0 |
| 4 | Pre-commit hook | 1–2 jam | High | 🟡 P1 |
| 5 | Bundle size monitor | 4–6 jam | Medium | 🟡 P1 |
| 6 | Auto-merge Dependabot | 1 jam | Medium | 🟡 P1 |
| 7 | Lighthouse CI | 4–6 jam | Medium | 🟢 P2 |
| 8 | Matrix testing | 1 jam | Medium | 🟢 P2 |
| 9 | Docker publish | 2–3 jam | Low | ⚪ P3 |
| 10 | Discord notification | 30 min | Low | ⚪ P3 |

---

## Catatan

- File ini **planning + reference**.
- Edit `ci.yml` / workflow baru = governance area (per RULES.MD §4, GitHub
  workflows termasuk area sensitif).
- Approval eksplisit per workflow change.
- Test di branch terpisah dulu sebelum merge ke `main`.
- Update `MAINTENANCE.MD` setiap perubahan workflow.
