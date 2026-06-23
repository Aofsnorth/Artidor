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
