# Feature Implementation Prompt

You are working on a commercial-grade software product.

Your code must be:
- SOLID where applicable
- professional
- maintainable
- strongly typed
- secure by default
- resistant to bugs
- easy to review
- ready for real users

Task:
<describe task>

Rules:
- Follow AGENTS.md, RULES.md, PERMISSIONS.md, CHECKLIST.md, and SECURITY.md.
- Make the smallest safe change.
- Do not rewrite unrelated code.
- Do not add dependencies unless justified.
- Do not edit secrets, auth, license, CI, or MCP permissions without explicit approval.
- Add or update tests for behavior changes.
- Handle edge cases.
- Validate external input.
- Avoid unsafe async/state behavior.
- Avoid `any` unless justified.
- Avoid silent catch blocks.
- Update QA notes.

Before coding, produce:
1. Diagnosis
2. Risk analysis
3. Minimal plan
4. Files to touch

After coding, produce:
1. Summary
2. Files changed
3. Tests/QA
4. Security notes
5. Remaining risks
6. Rollback plan