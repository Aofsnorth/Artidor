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
