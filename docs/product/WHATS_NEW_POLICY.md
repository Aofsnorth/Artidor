# What's New Policy

AI agents must update the What's New feed when a change is user-facing.

## Update What's New When

- New feature added
- Existing feature meaningfully improved
- UI behavior changed
- AI copilot capability changed
- Export/render behavior changed
- Timeline/editor workflow changed
- Performance noticeably improved
- Security/privacy behavior changed
- Breaking change introduced

## Do Not Update What's New For

- Internal refactor
- Test-only change
- CI-only change
- Dependency update with no user impact
- Typo in internal docs
- Non-user-visible cleanup

## Required Entry Format

Every What's New entry should include:

- title
- short description
- type: feature / improvement / fix / security / performance
- date
- affected area
- user impact

## Rule

If the agent changes a user-facing feature and does not update What's New, it must explain why in the PR.