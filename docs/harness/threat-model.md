# Threat Model

## Threats

### T1: Agent commits secret
Controls:
- Gitleaks
- `.gitignore`
- secret policy
- PR review

### T2: Agent edits auth/security incorrectly
Controls:
- CODEOWNERS
- branch protection
- sensitive path policy
- manual review

### T3: Agent runs destructive command
Controls:
- command denylist
- sandbox
- permission policy
- no auto-approve dangerous commands

### T4: Dependency supply-chain risk
Controls:
- Dependabot
- audit
- lockfiles
- dependency justification

### T5: AI copilot hallucinates editor command
Controls:
- typed tools
- argument validation
- MCP tool allowlist
- safe failure messages

### T6: Desktop app webview compromise (XSS → IPC → file exfiltration)
Controls:
- Content-Security-Policy in `tauri.conf.json` (no `unsafe-inline` for scripts)
- Path validation in custom Tauri commands (`validate_user_path`)
- Blocked sensitive credential directories (`.ssh`, `.aws`, `.gnupg`, etc.)
- No `shell:allow-execute` permission
- See `SECURITY.md` "Security Audit — Full Pass" section for details

### T7: Server-side fetch proxy SSRF / bandwidth abuse
Controls:
- `assertSafeProviderUrlDns` (DNS rebinding defense) on all server-side fetches
- Private IP range blocking (IPv4 + IPv6)
- Cloud metadata hostname blocklist
- Rate limiting on all proxy routes
- Response size cap (500 KB) on web fetch
- Timeout (15-30s) on all outbound fetches

