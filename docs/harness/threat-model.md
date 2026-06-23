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
