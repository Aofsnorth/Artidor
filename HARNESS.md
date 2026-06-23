# Artidor Harness Engineering System

A harness is the system around the AI agent that makes its work safe, repeatable, testable, and reviewable.

## Components

1. Instructions
   - `AGENTS.md`
   - `RULES.md`
   - `PERMISSIONS.md`

2. Planning
   - `features/<slug>/FEATURE.md`
   - `features/<slug>/PLAN.md`
   - `features/<slug>/RISKS.md`

3. Execution
   - small patches
   - allowed commands
   - feature branches

4. Verification
   - lint
   - typecheck
   - unit tests
   - integration tests
   - e2e tests
   - build

5. Security
   - Semgrep
   - Gitleaks
   - dependency audit
   - CodeQL
   - secret policy

6. Review Gates
   - PR template
   - CODEOWNERS
   - branch protection
   - human approval

7. Recovery
   - rollback plan
   - revert procedure
   - release notes
   - incident log

## Target

Minimum target: H5.
Mature target: H7.
