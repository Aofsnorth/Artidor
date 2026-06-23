# Security Audit Checklist

> Checklist yang **bisa dilakukan di kode** (bukan rekomendasi kosong).
> Setiap item actionable, grounded ke file yang ada, dengan cara verifikasi.
> Ikuti RULES.MD §4 untuk area sensitif: auth, API key, env, migrasi, AI tools,
> export/render, Rust/WASM, WebGPU/WGSL, payment.

---

## Cara Pakai

Ceklist format: `- [ ] item (file) — catatan`.

- `- [ ]` belum dicek
- `- [x]` sudah dicek, aman
- `- [⚠️]` dicek, ada temuan
- `- [🚨]` dicek, ada critical (pindah ke `CRITICAL.MD`)

Update status langsung di file ini; tidak perlu approval terpisah untuk pencatatan.

---

## 1. Secrets & Credentials

- [ ] **Tidak ada API key di source code**
  - `grep -r "sk-" apps/ packages/ rust/ --include="*.ts" --include="*.tsx" --include="*.rs"`
  - `grep -r "sk-ant-" apps/ packages/ rust/ --include="*.ts" --include="*.tsx" --include="*.rs"`
  - Expected: tidak ada hasil.

- [ ] **Tidak ada API key di `.env*` yang ter-commit**
  - `apps/web/.env*` ada di `.gitignore` (cek `.gitignore` root).
  - `apps/web/.env.example` ada placeholder kosong, bukan real key.

- [ ] **`.gitleaks.toml` aktif dan recent**
  - Cek `.github/workflows/ci.yml` ada job `gitleaks`.
  - Allowlist hanya untuk placeholder CI yang legitimate.

- [ ] **MCP server tidak expose secrets di prompt**
  - `packages/mcp-server/src/tools/` (cek semua) — tidak boleh echo
    user API key atau token ke prompt.
  - Lihat `apps/web/src/lib/ai/providers/` — OpenAI/Anthropic key hanya di server
    env, tidak pernah dikirim ke client.

- [ ] **Tanda tangan JWT/auth secret di env, bukan hardcoded**
  - `apps/web/src/lib/auth/` — secret load dari `process.env`.

---

## 2. Input Validation

- [ ] **Project file loader validasi schema**
  - `apps/web/src/lib/project-file/` — pakai Zod atau similar, tidak `JSON.parse` mentah.
  - File `.artidor` dari user bisa arbitrary size; cek ada size limit.

- [ ] **API routes validasi body**
  - `apps/web/src/app/api/` — semua POST/PUT/PATCH pakai Zod atau hand-rolled validator.
  - Cek masing-masing route:
    - `ai/route.ts`
    - `auth/route.ts`
    - `drive/route.ts`
    - `github/route.ts`
    - `share/route.ts`
    - `sounds/route.ts`
    - `health/route.ts`

- [ ] **MCP tool inputs di-type dan di-validate**
  - `packages/mcp-server/src/tools/` — setiap tool handler validasi input schema.
  - Lihat pola di tools yang sudah ada; jika ada yang `any`, flag.

- [ ] **File upload di-batasi ukuran dan MIME**
  - `apps/web/src/app/api/drive/` (jika ada upload) — batasi max size, cek MIME,
    simpan ke location yang aman (di luar `public/`).

- [ ] **URL eksternal (avatar, icon, thumbnail) di-validate**
  - `apps/web/src/lib/stickers/providers/` — hanya allow HTTPS, optional allowlist
    domain.
  - `apps/web/src/components/landing/` — tidak ada image dari user-controlled URL
    tanpa sanitasi.

---

## 3. XSS / Injection

- [ ] **React default escaping cukup untuk semua dynamic content**
  - Cek `dangerouslySetInnerHTML` di seluruh `apps/web/src/`. Expected: tidak ada,
    atau hanya di trusted markdown renderer (lihat `apps/web/src/lib/changelog/components/`).
  - Markdown renderer (`apps/web/src/lib/changelog/`) sanitasi HTML, strip `<script>`,
    `<iframe>`, `on*` attributes.

- [ ] **CSS injection dicegah**
  - `apps/web/src/lib/presets/css-parser.ts` (file baru problem 005) — parser
    tidak boleh inject `expression()`, `url(javascript:...)`, atau `behavior:`.
  - Scan semua `style={{ ... }}` di `apps/web/src/` — pastikan tidak ada
    user-controlled value masuk ke property name atau selector.

- [ ] **SVG inline aman**
  - Cek `apps/web/src/components/icons/` — SVG di-hardcode, tidak ada `<foreignObject>`
    atau `<script>` di dalam SVG.
  - SVG data URL di `apps/web/src/lib/presets/overlays.ts` (Paper) di-hardcode,
    bukan dari user input.

- [ ] **AI prompt injection dicegah**
  - `apps/web/src/lib/ai/tools/` — system prompt tidak meng-include user-controlled
    text tanpa sanitasi.
  - Style profile JSON (`StyleProfile`) di-pass via system prompt, tapi di-sanitize dulu.
  - Cek: tool name, command, atau file path dari user tidak masuk ke system prompt.

---

## 4. Auth & Authorization

- [ ] **Middleware auth aktif di protected routes**
  - `apps/web/src/middleware.ts` (jika ada) atau `apps/web/src/lib/auth/`
    middleware.
  - `/editor/[project_id]/` dan `/projects/` — cek apakah perlu auth, dan apakah
    unauth user ditolak dengan benar.

- [ ] **Session token expiry sesuai standar**
  - `apps/web/src/lib/auth/` — cek konfigurasi session TTL, refresh token rotation.

- [ ] **CSRF protection aktif**
  - `better-auth` (di `package.json`) — cek konfigurasi default CSRF.
  - POST/PUT/DELETE/ butuh same-origin check.

- [ ] **OAuth callback URL di-validate**
  - `apps/web/src/app/oauth-callback/` — `state` parameter dicek, `redirect_uri`
    di-allowlist.

---

## 5. Data Storage

- [ ] **IndexedDB tidak simpan plain-text API key**
  - `apps/web/src/services/storage/indexeddb-adapter.ts` — tidak ada
    API key di write.

- [ ] **localStorage keys di-namespace**
  - `whats-new`, `last-seen-version`, dll. (lihat `apps/web/src/stores/`).
  - Tidak ada key yang clash dengan library lain (Zustand, Next, dsb).

- [ ] **Service worker cache tidak bocor antar-user**
  - `apps/web/public/sw.js` (jika ada) — cache key include project ID atau user
    ID, sehingga user A tidak lihat cache user B.

- [ ] **OPFS adapter (jika ada) di-scope ke user**
  - `apps/web/src/services/storage/opfs-adapter.ts` — folder per user.

- [ ] **Export file download lewat Blob URL, bukan eval**
  - `apps/web/src/lib/export/` — `URL.createObjectURL(blob)` + `URL.revokeObjectURL`
    setelah click. Tidak ada `document.write` atau `eval`.

---

## 6. Network

- [ ] **HTTPS only**
  - `next.config.ts` — `headers()` set `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
  - `apps/web/src/lib/env/` — production URL pakai HTTPS.

- [ ] **CSP aktif**
  - `next.config.ts` — `Content-Security-Policy` header set.
  - Allow list: `'self'`, `data:` (untuk inline), `blob:` (untuk export), `'unsafe-inline'`
    minimal untuk Next.js inline style.

- [ ] **CORS policy benar**
  - `apps/web/src/app/api/` — `Access-Control-Allow-Origin` bukan `*` di endpoint
    yang butuh auth.

- [ ] **Rate limiting di API endpoint**
  - `/api/ai/` (kalau ada) — rate limit per user/IP, cegah abuse.

- [ ] **Dependency lockfile di-commit dan tidak di-bypass**
  - `bun.lock` di-commit, `package.json` punya `packageManager: "bun@1.2.18"` (pinned).
  - `Cargo.lock` di-commit.

---

## 7. Dependency Security

- [ ] **Tidak ada dependency dengan known CVE**
  - `bun audit` (atau `npm audit`) — output 0 critical/high.
  - OSV scan via `mcp_security_tools_osv_scan` — output 0 high.

- [ ] **Trivy filesystem scan clean**
  - `mcp_security_tools_trivy_filesystem` — 0 high/critical.

- [ ] **License compliance**
  - Semua dependency di `package.json` punya license yang kompatibel dengan MIT.
  - Copyleft (GPL/AGPL) wajib di-avoid atau di-dokumentasi.

- [ ] **Pin version dependency kritikal**
  - `next`, `react`, `@biomejs/biome`, `better-auth`, `drizzle-orm`, `artidor-wasm` —
    version pinned (pakai `^` minor atau `~` patch, bukan `*`).

- [ ] **Dependabot aktif**
  - `.github/dependabot.yml` ada dan include `npm`, `cargo`, `github-actions`.

---

## 8. Build & Deploy

- [ ] **CI secrets di GitHub, bukan di source**
  - `.github/workflows/` — pakai `${{ secrets.X }}`, bukan literal value.

- [ ] **Build artifact reproducible**
  - `Cargo.lock` di-commit, `bun.lock` di-commit.
  - Docker build punya pinned base image SHA, bukan `latest`.

- [ ] **No secrets in build output**
  - `next.config.ts` — `NEXT_PUBLIC_*` env vars hanya untuk value yang memang
    aman di-expose ke client.

- [ ] **Sourcemap strategy sesuai**
  - Production sourcemap di-upload ke error tracker (Sentry-style), tidak di-ship
    ke user.

---

## 9. Browser & Runtime

- [ ] **Clipboard API aman**
  - `apps/web/src/lib/clipboard/` — tidak baca clipboard tanpa user gesture.
  - `navigator.clipboard.writeText` di-trigger dari event handler, bukan async.

- [ ] **Web Worker origin benar**
  - `apps/web/src/workers/` (jika ada) — worker script di-serve dari same origin.

- [ ] **Notification API tidak spam**
  - `apps/web/src/components/whats-new/` — only show once per session per entry.

- [ ] **File System Access API opt-in**
  - `apps/web/src/lib/export/` — kalau pakai File System Access API, harus
    di-trigger dari user click, bukan auto.

---

## 10. AI / MCP Specific

- [ ] **MCP tools deny-by-default**
  - `packages/mcp-server/src/tools/` — setiap tool opt-in, ada allowlist kategori.

- [ ] **AI tool logs tidak bocor secrets**
  - `apps/web/src/lib/ai/telemetry/` — telemetry log di-redact API key, password,
    token.

- [ ] **Tool call result tidak arbitrary HTML**
  - AI tool return string, bukan HTML. UI render sebagai text/JSON.

- [ ] **Rate limit per provider**
  - `apps/web/src/lib/ai/providers/openai.ts`, `anthropic.ts`, `ollama.ts` —
    rate limit per user session.

- [ ] **Style profile tidak exfiltrate**
  - `apps/web/src/lib/ai/style/` — `StyleProfile` di-include ke prompt,
    tapi tidak ada image upload ke provider (semua client-side analysis).

---

## Quick Run

```bash
# Dari root Artidor
cd "C:\Users\Arthe\Documents\MyProject\Artidor"

# 1. Secret scan
mcp_security_tools_gitleaks_scan path="."

# 2. Dependency vulnerability
mcp_security_tools_osv_scan path="."

# 3. Trivy filesystem
mcp_security_tools_trivy_filesystem path="."

# 4. Manual greps
grep -r "sk-" apps/ packages/ rust/ --include="*.ts" --include="*.tsx" --include="*.rs"
grep -rn "dangerouslySetInnerHTML" apps/web/src/
grep -rn "eval(" apps/web/src/
grep -rn "new Function" apps/web/src/
```

---

## Severity & Tindak Lanjut

- **CRITICAL** — eksploitasi langsung mungkin, data loss, auth bypass. → Pindah ke
  `CRITICAL.MD`, surface ke user, fix immediate.
- **HIGH** — vulnerability tapi butuh kondisi khusus. → Catat di `BUGS.md` dengan
  `severity: P0`, fix dalam 1 sprint.
- **MEDIUM** — best practice violation, defense in depth missing. → Catat di
  `PROBLEM.MD` problem baru, fix oportunistic.
- **LOW** — nitpick, code smell. → Catat di `PERFORMANCE.md` atau `TECH-DEBT.md`.

---

## Catatan

File ini **read-only reference**. Update status `- [x]` `- [⚠️]` `- [🚨]` langsung
tanpa approval, tapi:
- Temuan CRITICAL → buat problem baru di `PROBLEM.MD` dan catat di `CRITICAL.MD`.
- Temuan HIGH → buat problem baru di `PROBLEM.MD`.
- Temuan MEDIUM/LOW → kumpulkan dulu, propose batch fix dalam satu PR.
