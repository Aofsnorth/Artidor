# Release and Rollback

## Release Readiness

- [ ] CI passed
- [ ] E2E passed
- [ ] Security passed
- [ ] Version updated
- [ ] Changelog updated
- [ ] Manual QA done
- [ ] Rollback plan documented

## Rollback Process

For code regression:
```bash
git revert <commit>
```

For release:
1. Stop rollout.
2. Revert release commit.
3. Redeploy previous version.
4. Open incident note.
5. Add regression test.
