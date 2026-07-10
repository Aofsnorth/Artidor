# Security Policy

## Secret Handling

Never commit:

- API keys
- auth tokens
- cookies
- private keys
- `.env`
- production credentials
- user media
- database dumps

If a secret is accidentally committed:

1. Revoke/rotate it immediately.
2. Remove it from current branch.
3. Decide whether history rewrite is necessary.
4. Audit logs for usage.

## AI Agent Security Rules

AI agents must:

- Use least privilege.
- Never request secrets.
- Never print secrets.
- Never use production credentials.
- Never modify auth, security, or MCP permission boundaries without explicit approval.
- Always log sensitive tool-boundary changes in PR description.

## MCP Security

MCP servers must:

- Use allowlisted tools.
- Deny arbitrary shell by default.
- Validate input.
- Avoid passing secrets into model context.
- Log tool calls.
- Separate read and write capabilities.

## Required Security Checks

- Gitleaks
- Semgrep
- Dependency audit
- CodeQL
- Manual review for auth/API/MCP changes

## High-Risk Areas

```txt
packages/mcp-server/**
apps/web/src/app/api/**
apps/web/src/lib/auth/**
apps/web/src/lib/ai/**
.github/workflows/**
docker-compose.yml
.env*
```

## Known Dependency Advisories

Tracking advisories that cannot be resolved in-repo and the reason. Each
entry should be dismissed on GitHub Dependabot with the documented reason.

### RUSTSEC-2024-0429 — glib 0.18.5 (unsound `VariantStrIter`)

- **Status**: Upstream-blocked. Dismiss as "tolerable risk".
- **Reason**: `glib 0.18.5` is pulled transitively via
  `tauri 2.11.3` → `wry 0.55.1` → `webkit2gtk 2.0.2` → `gtk 0.18.2`
  (the gtk-rs 0.18 ecosystem). The fix requires `glib >= 0.20.0`, which
  belongs to the gtk-rs 0.20 generation. `webkit2gtk-rs` (the
  tauri-apps fork) has not migrated to gtk-rs 0.20, so this version is
  pinned by Tauri's Linux webview backend and cannot be bumped without
  an upstream Tauri release.
- **Impact**: The affected functions (`VariantStrIter::next/last/nth/
  nth_back/next_back`) are not used by Tauri, wry, or webkit2gtk's
  webview code path. Practical risk is near-zero.
- **Revisit**: Check on each Tauri upgrade whether `webkit2gtk-rs` has
  moved to gtk-rs 0.20+. When available, run `cargo update` to pull
  `glib >= 0.20.0` and remove this entry.

### Collab & Share routes — intentionally anonymous (no auth)

- **Status**: By design. Hardened with stricter rate limits.
- **Routes**: `/api/collab/*`, `/api/share/*`
- **Reason**: Artidor is a local-first editor. Projects live in
  IndexedDB; users can use the editor, share links, and collaborate
  without creating an account. Collab uses capability-based room IDs
  (random UUIDs); share uses capability-based share IDs with optional
  password protection. This is the same model as anonymous paste
  services (Pastebin, Etherpad).
- **Protection in place**:
  - Base rate limiting (100 req/min per IP) on all routes via Upstash
    Redis, with in-memory fail-closed fallback.
  - **Stricter create-resource rate limiting** (10 creates/hour per
    IP) on `/api/collab/create` and `/api/share` POST — prevents
    resource exhaustion abuse while staying anonymous.
  - Share unlock has per-request rate limiting to slow brute force.
  - Collab room membership is tracked by sessionId.
- **Follow-up**: If abuse becomes a problem, add per-IP resource caps
  (max active rooms per IP, max active shares per IP) without
  requiring accounts. Do NOT add required auth — it breaks the
  local-first design philosophy.

### CSP `unsafe-inline` for scripts and styles

- **Status**: Partially fixed (editor only). Needs build testing.
- **Editor (implemented, needs testing)**: `proxy.ts` generates a
  per-request nonce and injects it into the CSP header for `/editor/*`
  routes only. This drops `'unsafe-inline'` from `script-src` for the
  editor — the most security-sensitive surface (AI content, user
  media, plugins). The editor is already dynamically rendered, so the
  nonce requirement adds no performance cost. Next.js auto-attaches
  the nonce to framework scripts, page bundles, and inline scripts
  during SSR.
  - **Testing risk**: Third-party components (BotIdClient, Vercel
    Analytics, SpeedInsights) that inject their own inline scripts
    may break under nonce-based CSP. If CSP violations appear in the
    browser console on editor routes, pass the nonce (from
    `headers().get("x-nonce")`) to those components' script tags, or
    delete `proxy.ts` to fall back to the broader CSP in
    `next.config.ts`.
- **Other routes (trade-off)**: Landing, docs, changelog keep
  `'unsafe-inline'` for scripts and styles. These routes are
  statically rendered (SSG/ISR) for performance; nonce CSP requires
  dynamic rendering, which would disable static caching. The
  `'unsafe-inline'` risk is low on these routes because they render
  no user-generated content.
- **Inline styles (both)**: `'unsafe-inline'` for `style-src` stays
  everywhere. The editor sets thousands of inline styles (transforms,
  gradients, animated keyframes) that can't be nonced without a full
  style pipeline rewrite.
- **Mitigation**: `frame-ancestors 'none'`, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'` close the high-value
  clickjacking / base-tag-injection / object-embed holes regardless.
  XSS is further mitigated by `rehype-sanitize` on AI-generated
  markdown content.

### Puter.js SDK — no SRI (Subresource Integrity)

- **Status**: Follow-up tracked. CSP allowlist provides partial
  protection.
- **Reason**: The Puter.js SDK is loaded from a versionless URL
  (`https://js.puter.com/v2/`). SRI requires a pinned content hash,
  but Puter can update the SDK at this URL at any time — a pinned hash
  would break the Puter provider on the next Puter update.
- **Mitigation**: CSP `script-src` allowlists only `https://js.puter.com`,
  so no other origin can inject scripts even if an XSS is found.
- **Follow-up**: Self-host the Puter.js SDK (vendored + hashed) so SRI
  can be applied without breaking on upstream updates.

## Security Audit — Full Pass

A full security audit was performed covering all API routes, auth, AI
lib, CSP/headers, XSS surfaces, MCP server, Tauri/desktop, CI workflows,
secrets scan, and dependencies. Findings and fixes:

### Fixed

#### Desktop app CSP was disabled (`csp: null`) — CRITICAL

- **Status**: Fixed.
- **Was**: `apps/desktop-web/src-tauri/tauri.conf.json` set `"csp": null`,
  disabling Content-Security-Policy for the desktop webview entirely. The
  web app has a strong CSP (nonce-based for editor, allowlist for other
  routes), but the desktop app had none — an XSS in the desktop app would
  have unrestricted access to Tauri IPC.
- **Fix**: Set a restrictive CSP in `tauri.conf.json`:
  `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'` (no
  `unsafe-inline`), `connect-src` limited to `ipc:`, `asset:`, `https:`,
  `ws:`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`.

#### Tauri custom commands accepted arbitrary file paths — CRITICAL

- **Status**: Fixed.
- **Was**: `read_file_bytes`, `read_file_text`, `get_file_metadata`, and
  `file_to_asset_url` in `apps/desktop-web/src-tauri/src/lib.rs` accepted
  a `path: String` from the webview and passed it directly to
  `tokio::fs::read` / `tokio::fs::metadata`. These commands bypass the
  Tauri fs plugin's scope. Combined with the disabled CSP, a compromised
  webview could read `~/.ssh/id_rsa`, `~/.aws/credentials`, etc.
- **Fix**: Added `validate_user_path()` helper that rejects paths
  containing `..` traversal components and blocks known-sensitive
  credential directories (`.ssh`, `.aws`, `.gnupg`, `.docker`, `.kube`,
  `.azure`, `.config/gcloud`, `.terraform.d`, `.npmrc`, `.pypirc`,
  `.netrc`). Applied to all four path-accepting commands.

#### Collab lock DELETE had no auth check — HIGH

- **Status**: Fixed.
- **Was**: `apps/web/src/app/api/collab/[roomId]/lock/route.ts` DELETE
  handler did not call `getOptionalSession()` or `checkRateLimit()`,
  unlike the POST handler and all other collab routes. An
  unauthenticated caller could release element locks if they knew the
  sessionId (UUID, hard to guess, but still an auth bypass).
- **Fix**: Added `getOptionalSession()` + `checkRateLimit()` to the
  DELETE handler, matching the POST handler and all other collab routes.

#### Rate limit gaps on public GET endpoints — MEDIUM

- **Status**: Fixed.
- **Was**: Three public GET endpoints lacked rate limiting:
  - `/api/share/[id]` GET (metadata) — share ID is 72-bit random so
    enumeration is impractical, but inconsistent with other share routes.
  - `/api/github` GET (repo metadata proxy) — cached 10 min, but an
    attacker could force cache misses to drain the GitHub API rate limit.
  - `/api/health` GET — trivial endpoint, but no limit on health-check
    spam.
- **Fix**: Added `checkRateLimit({ request })` to all three.

#### Sounds search endpoint had no auth (API key drain) — MEDIUM

- **Status**: Fixed.
- **Was**: `/api/sounds/search` proxied to Freesound's API using a
  server-side `FREESOUND_API_KEY` but did not require authentication.
  Anonymous callers could drain the Freesound API quota. This was
  inconsistent with `/api/stock/videos` (Pexels proxy) which already
  required auth.
- **Fix**: Added `getOptionalSession()` check, matching `/api/stock/videos`.

#### AI chat route had no array size limits (DoS) — MEDIUM

- **Status**: Fixed.
- **Was**: `/api/ai/chat` validated the `messages` array with `.min(1)`
  but no `.max()`. An authenticated caller could send a massive messages
  array (or `recentEvents`/`recentCommands`/`externalTools` arrays) to
  exhaust server memory and CPU during zod parsing and AI provider
  forwarding. This route is authenticated, so the risk is medium, but
  the missing bounds were an oversight.
- **Fix**: Added `.max(500)` to `messages`, `.max(200)` to
  `recentEvents` and `recentCommands`, `.max(100)` to `externalTools`.
  These limits are well above any legitimate editor session size.

#### Docker compose missing PEXELS_API_KEY — MEDIUM

- **Status**: Fixed.
- **Was**: `docker-compose.yml` passed `FREESOUND_CLIENT_ID` and
  `FREESOUND_API_KEY` to the web service but not `PEXELS_API_KEY`. The
  `webEnv` zod schema requires `PEXELS_API_KEY` and throws in
  production if missing. A docker deployment would crash on startup.
- **Fix**: Added `PEXELS_API_KEY=${PEXELS_API_KEY:?...}` to the web
  service environment in `docker-compose.yml`.

#### Web fetch proxy had no rate limit — MEDIUM

- **Status**: Fixed.
- **Was**: `/api/web/fetch` is a server-side fetch proxy that downloads
  up to 500 KB per request. It had auth, SSRF protection, size limit,
  and timeout, but no rate limiting. An authenticated caller could
  spam it to exhaust server bandwidth and outbound connections.
- **Fix**: Added `checkRateLimit({ request })` after the auth check.

### Accepted (documented trade-offs)

- **CSP `connect-src` allows all `http:`/`https:`/`ws:`/`wss:`**: Intentional
  for MCP servers (user-added, arbitrary URLs). Documented in `next.config.ts`.
- **Plugin sandbox uses `new Function`**: Function-scope shadowing, not a
  true sandbox, but plugins are user-installed with a trust warning. See
  `apps/web/src/lib/plugins/sandbox.ts` security comment.
- **Scripting worker uses `new Function`**: User-authored macro in an
  isolated Web Worker (no DOM/fetch/network). See
  `apps/web/src/services/scripting/worker.ts` security comment.
- **MCP relay has no auth (`ws://127.0.0.1:8765`)**: By design (local
  relay). Any local process can connect. Acceptable for local threat model.
- **`proxy.ts` nonce CSP not tested with live build**: Documented in the
  file itself. Third-party components (BotIdClient, Vercel Analytics) may
  break under nonce-based CSP. Follow-up: test editor route for CSP
  console violations after deploy.
- **Collab & Share routes anonymous by design**: See section above.
- **Tauri fs plugin permissions are broad (no scope)**: The capabilities
  file grants `fs:allow-read-file`, `fs:allow-write-file`, etc. without
  directory scope restrictions. The frontend does NOT use the fs plugin
  directly (it uses custom commands with path validation), so this is not
  a direct risk. But if an attacker bypasses CSP and gains JS execution
  in the webview, they could call the fs plugin directly. Follow-up:
  restrict fs plugin scope to the user's project/media directories, or
  remove fs plugin permissions entirely if no code path uses them.
- **Tauri asset protocol scope not configured**: The frontend uses
  `convertFileSrc()` from `@tauri-apps/api/core` (not the hardened
  `file_to_asset_url` custom command) to generate `asset://localhost/`
  URLs for media files. The asset protocol scope is not set in
  `tauri.conf.json` under `app.security.assetProtocol.scope`. A
  compromised webview could use `convertFileSrc()` to load any file
  (e.g. `~/.ssh/id_rsa`) into an `<img>` tag and exfiltrate it via
  canvas. The CSP allows `asset:` in `img-src`/`media-src`. Follow-up:
  set `assetProtocol.scope` to only allow directories the user has
  explicitly selected via the file picker dialog, or implement a custom
  asset protocol handler that validates paths with `validate_user_path`.
- **Desktop CSP needs live testing**: The restrictive CSP set in
  `tauri.conf.json` may break Next.js inline bootstrap scripts. If the
  desktop app shows blank pages or CSP violations, temporarily add
  `'unsafe-inline'` to `script-src` as a fallback while investigating.
- **better-auth password policy uses library defaults**: The auth config
  in `apps/web/src/lib/auth/server.ts` enables `emailAndPassword` but
  does not set `minPasswordLength`, `requireEmailVerification`, or
  account lockout. better-auth 1.6.20 defaults to `minPasswordLength: 8`
  which is acceptable. Adding stricter policy (email verification,
  lockout after N failed attempts) is a sensitive auth change
  (PERMISSIONS.md Level 2) and requires explicit approval. Follow-up:
  evaluate adding `requireEmailVerification: true` and
  `maxRetries`/lockout for production deployments.
- **`BETTER_AUTH_SECRET` has no minimum length validation**: The zod
  schema in `apps/web/src/lib/env/web.ts` validates `BETTER_AUTH_SECRET`
  as `z.string()` with no `.min()` constraint. An empty or 1-character
  secret would pass validation but be cryptographically weak, allowing
  session forgery. The docker-compose.yml uses
  `${BETTER_AUTH_SECRET:?...}` to require it be set, but does not
  enforce length. Adding `.min(32)` to the zod schema is a sensitive
  auth change (PERMISSIONS.md Level 2) and requires explicit approval.
  Follow-up: add `BETTER_AUTH_SECRET: z.string().min(32)` to the env
  schema after approval.
