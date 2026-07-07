# Dependency and Framework Policy

This repository prefers proven frameworks, existing project patterns, and safe dependencies
over writing complex code from scratch.

AI agents and human contributors must follow this policy before adding, replacing, or upgrading
any framework, package, crate, plugin, SDK, or tool.

## Prime Rule

Do not write complex functionality from scratch when a safe, maintained, already-adopted
framework or library can solve it better.

Do not install new dependencies without checking safety, maintenance, license, and project fit.

## Existing Framework First

Before writing new code, the agent must check whether the repository already has a framework,
utility, helper, component, hook, manager, service, crate, or package that solves the problem.

The agent must prefer:

1. Existing code in the repo.
2. Existing dependencies already installed.
3. Standard platform APIs.
4. Small well-maintained libraries.
5. New framework only with explicit approval.

## Do Not Reinvent

Avoid writing custom implementations for:

* date/time handling
* validation
* parsing
* sanitization
* cryptography
* authentication
* authorization
* file handling
* caching
* state synchronization
* security-sensitive logic
* complex UI primitives
* animation engines
* drag/drop systems
* media processing
* command routing
* schema validation
* markdown/html sanitization

unless there is a strong reason and approval.

## Do Not Add Dependencies For Tiny Problems

Do not install a package for trivial logic that can be safely implemented in a few clear lines.

Bad reasons to add dependency:

* one string helper
* one simple array operation
* one CSS class helper when project already has one
* package is popular but unnecessary
* agent is unfamiliar with existing code

Good reasons to add dependency:

* security-sensitive standard implementation
* complex well-tested functionality
* framework already used in the project ecosystem
* avoids risky custom code
* improves maintainability without bloating the app

## Framework Compatibility

Before adding a framework, verify it fits the current architecture.

Artidor currently prioritizes:

* TypeScript
* React
* Next.js
* Bun
* Rust
* WGPU/WASM
* local-first behavior
* typed editor commands
* typed AI tools
* Rust core for non-UI logic

Do not introduce competing major frameworks without approval.

Examples requiring approval:

* replacing React
* replacing Next.js
* adding a second state management framework
* adding a new UI framework
* adding heavy animation framework
* adding cloud-first backend framework
* adding auth/payment framework
* adding media pipeline framework
* adding AI agent framework with broad filesystem/shell access

## Required Dependency Safety Check

Before installing a dependency, the agent must check:

### 1. Purpose

* What problem does it solve?
* Why can existing code not solve it?
* Why is a dependency better than custom code?

### 2. Project Fit

* Does it fit current architecture?
* Does it work with Bun?
* Does it work with Next.js?
* Does it work in browser/server correctly?
* Does it increase bundle size?
* Does it conflict with Rust/WASM direction?

### 3. Security

* Known vulnerabilities?
* Unsafe install scripts?
* Suspicious maintainer activity?
* Obfuscated/minified source?
* Unnecessary network access?
* Unsafe eval or shell usage?
* Untrusted transitive dependencies?
* History of supply-chain incidents?

### 4. Maintenance

* Recently maintained?
* Reasonable release history?
* Active issue resolution?
* Stable API?
* Good documentation?
* Not abandoned?

### 5. License

* License is compatible with Artidor.
* Avoid restrictive licenses unless approved.
* MIT/Apache-2.0/BSD/ISC are usually acceptable.
* GPL/AGPL/LGPL require explicit approval.

### 6. Alternatives

The agent must compare at least:

* existing repo solution
* current installed dependency
* proposed dependency
* one alternative if practical

### 7. Rollback

The agent must explain:

* how to remove the dependency
* what files are affected
* what behavior depends on it
* what test proves it works

## Required Evidence Before Install

Before installing, the agent must produce a dependency decision note:

```md
## Dependency Decision

Package:
Version:
Ecosystem: npm / cargo / GitHub Action / other

Problem:
Why existing code is insufficient:
Why this package:
Alternatives considered:

Security:
- Known vulnerabilities:
- Install scripts:
- Transitive dependency risk:
- Browser/server safety:

Maintenance:
- Last release:
- Activity:
- Docs:
- API stability:

License:
Bundle/performance impact:
Rollback plan:
Approval:
```

## Installation Commands

For npm/Bun dependencies:

```bash
bun pm view <package>
bun audit
```

For Rust crates:

```bash
cargo search <crate>
cargo audit
```

For GitHub Actions:

* use official actions when possible
* pin stable versions
* avoid unknown third-party actions
* check repository ownership and maintenance

## Dependency Lock Rule

When adding or updating dependencies, lockfile changes must be reviewed.

Review:

* `package.json`
* `bun.lock`
* `Cargo.toml`
* `Cargo.lock`
* GitHub workflow actions

Do not blindly accept large lockfile changes.

## Forbidden Without Explicit Approval

The agent must not install:

* abandoned packages
* packages with unclear license
* packages with known critical vulnerabilities
* packages requiring broad filesystem access
* packages requiring shell access
* packages with suspicious postinstall scripts
* packages that exfiltrate telemetry by default
* packages that replace core architecture
* packages that conflict with local-first principles
* packages that upload user media by default
* packages that add auth/payment/security logic
* packages that are unnecessary for the task

## Framework Use Rule

When using an existing framework, follow its official patterns and the existing project conventions.

Do not fight the framework.

Do not create custom abstractions unless they reduce complexity.

Do not wrap every framework API in unnecessary custom layers.

## Documentation Requirement

Every new dependency or framework usage must be documented.

Update at least one of:

* `docs/harness/DEPENDENCY_POLICY.md`
* `docs/harness/DEPENDENCY_DECISIONS.md`
* feature `PLAN.md`
* feature `QA.md`
* PR description
* relevant code documentation

## Done Rule

A dependency/framework change is not complete until:

* existing alternatives were checked
* security was reviewed
* license was reviewed
* maintenance was reviewed
* tests pass
* lockfile changes are reviewed
* rollback plan exists
* human approval is given for high-risk dependencies
