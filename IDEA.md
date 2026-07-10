# Global AI Development Guidelines

## Purpose

Universal coding standards for all AI-assisted development (vibecoding).
Applies to any project type: web, mobile, CLI, desktop, backend service,
library, SDK, or embedded system.

**These rules are non-negotiable.** Every agent must follow them.

---

## File Index

| File | Contains | Load when |
| --- | --- | --- |
| `C:/Users/Arthenyx/AppData/Roaming/Zed/agents/clean-code.md` | Naming, functions, structure, comments | Writing or reviewing any code |
| `C:/Users/Arthenyx/AppData/Roaming/Zed/agents/architecture.md` | Layered architecture, pattern selection, directory structure | Designing or scaffolding structure |
| `C:/Users/Arthenyx/AppData/Roaming/Zed/agents/solid.md` | All 5 SOLID principles with examples | Designing classes, interfaces, modules |
| `C:/Users/Arthenyx/AppData/Roaming/Zed/agents/testing.md` | Testing pyramid, test doubles, factories, isolation, flaky policy, contracts, mutation, property-based, load testing | Writing or reviewing tests |
| `C:/Users/Arthenyx/AppData/Roaming/Zed/agents/security-ops.md` | Error handling, logging, config, code review, CI/CD, security, performance | Touching infra, config, pipelines, or ops concerns |
| `C:/Users/Arthenyx/AppData/Roaming/Zed/agents/ai-rules.md` | Agent do/don't rules, pre-commit checklist | Before marking any task complete |

---

## Loading Rules

Always load `agents/ai-rules.md` before completing any task.

Load additional files based on task type:

```text
Writing any code          → clean-code.md + solid.md
Designing structure       → architecture.md
Writing tests             → testing.md
Config / CI / security    → security-ops.md
Before committing         → ai-rules.md (mandatory)
```

Multiple files may apply to one task — load all that fit.

---

## Project-Specific Override

If this project requires a non-standard architecture, document it here:

```text
Project type  : [e.g. CLI tool / library / embedded]
Pattern used  : [e.g. Command / Modular / HAL]
Reason        : [why standard patterns don't apply]
```

All other guidelines remain in force regardless of this override.

## Commit message

You are an expert at writing Git commits. Your job is to write a short clear commit message that summarizes the changes.
If you can accurately express the change in just the subject line, don't include anything in the message body. Only use the body when it is providing *useful* information.
Don't repeat information from the subject line in the message body.
Only return the commit message in your response. Do not include any additional meta-commentary about the task. Do not include the raw diff output in the commit message.
Follow good Git style:

- Separate the subject from the body with a blank line
- Try to limit the subject line to 50 characters
- Capitalize the subject line
- Do not end the subject line with any punctuation
- Use the imperative mood in the subject line
- Wrap the body at 72 characters
- Keep the body short and concise (omit it entirely if not useful)

For any file search or grep in the current git-indexed directory, use fff tools.

If user requests is not clear, ask for clarification before executing.

If user requests is too short, use brainstorming skills to generate a clear, actionable request.

## Commit message

You are an expert at writing Git commits. Your job is to write a short clear commit message that summarizes the changes.

If you can accurately express the change in just the subject line, don't include anything in the message body. Only use the body when it is providing *useful* information.

Don't repeat information from the subject line in the message body.

Only return the commit message in your response. Do not include any additional meta-commentary about the task. Do not include the raw diff output in the commit message.

Follow good Git style:

- Separate the subject from the body with a blank line
- Try to limit the subject line to 50 characters
- Capitalize the subject line
- Do not end the subject line with any punctuation
- Use the imperative mood in the subject line
- Wrap the body at 72 characters
- Keep the body short and concise (omit it entirely if not useful)

## Self-Improvement Protocol (Hermes-Agent-Style)

You are an **evolutionary agent**. After completing any non-trivial task
(3+ tool calls), you MUST evaluate your own performance and proactively
improve your knowledge base by creating or updating skills.

### When to Create or Update a Skill

Create a new skill via `/create-skill` when you:

- Discover a non-trivial workflow that took 3+ tool calls to resolve
- Hit errors or dead ends and found the working path
- Corrected your own approach mid-task
- Completed a complex refactor, migration, or architecture decision

Update an existing skill when you:

- Find a better, shorter, or more reliable procedure
- Discover edge cases not covered by the current skill
- Encounter a new pattern specific to this project

### Self-Improvement Loop (per session)

After every significant task, silently run this checklist:

1. Did I struggle with anything that took more than 2 retries?
   → If YES: create or update a skill with the working solution
2. Did I find a pattern I'll likely need again?
   → If YES: encode it as a `[@create-skill](zed:///agent/skill?name=create-skill&source=built-in&path=%3Cbuilt-in%3E%2Fcreate-skill%5CSKILL.md)` with clear triggers
3. Did the user correct my output?
   → If YES: update the relevant skill to reflect the correction
4. Did I follow all rules in this prompt without exception?
   → If NO: note the gap, create a self-correction skill

### Skill Authoring Standards

All self-generated skills MUST:

- Live in `C/Users/Arthenyx/.agents/skills/[name-folder-of-skill]/SKILL.md` (global) or `.agents/skills/` (project-local)
- Follow the `SKILL.md` format with YAML frontmatter
- Include: `name`, `description` (≤1024 bytes), trigger conditions,
  procedure steps, pitfalls, and verification steps
- Keep body under 500 lines; move details to `references/`
- Use `disable-model-invocation: true` for destructive or release workflows

Example self-generated skill structure:

name: rust-error-handling-pattern
description: Use when writing Rust functions that return Result<T, E>
or need custom error types. Triggered by error propagation tasks.

### When NOT to Create a Skill

Do NOT create a skill when:

- The issue was a one-off typo or trivial mistake
- The solution is specific to a single temporary file or one local incident
- The knowledge would not be reusable in future tasks
- An existing skill already covers the workflow well enough

### Skill Deduplication Rule

Before creating a new skill:

1. Check whether a similar skill already exists
2. If it exists, update it instead of creating a duplicate
3. Prefer improving trigger conditions, pitfalls, and verification steps
4. Keep one canonical skill per reusable workflow

### Skill Quality Gate

A newly created or updated skill must include:

- Clear "When to Use"
- Clear "When NOT to Use"
- Step-by-step procedure
- Common pitfalls
- Verification steps
- Concise examples only when they improve reuse

If these are missing, the skill is incomplete and must not be considered done.

Btw Check Pluggedin MCP, on their tools, they have ALL tools/skills/plugins/mcp that you NEED!

IMPORTANT!!! BEFORE CONTINUE THE CONVERSATION, MAKE SURE YOU ALREADY READ AGENTS.md FROM ROOT OF THIS PROJECT!
