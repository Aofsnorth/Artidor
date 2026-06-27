# Risks: Desktop UI Parity

## Risk: Layout restructure breaks existing panel references

- **Likelihood**: Medium
- **Impact**: Low (compile error, caught by `cargo check`)
- **Mitigation**: Verify after each patch with `cargo check`.
- **Rollback**: `git checkout -- apps/desktop/src/ui/editor_layout.rs`

## Risk: State change (active_tab) breaks serialization

- **Likelihood**: Low
- **Impact**: Low (`PanelVisibility` is not serialized — only `Project` is)
- **Mitigation**: `PanelVisibility` has no `Serialize`/`Deserialize` impl.
- **Rollback**: `git checkout -- apps/desktop/src/state/editor_state.rs`

## Risk: Removed AI copilot panel from layout

- **Likelihood**: Low
- **Impact**: Low (AI panel was hidden by default: `ai_copilot: false`)
- **Mitigation**: Re-add AI panel as a toggleable overlay in a follow-up patch.
- **Rollback**: Previous layout code is in git history.

## Risk: Color changes make UI unreadable

- **Likelihood**: Low
- **Impact**: Low (visual only, no data loss)
- **Mitigation**: Colors are direct conversions from the web Tailwind palette
  which is already production-tested.
- **Rollback**: `git checkout -- apps/desktop/src/theme.rs`

## No security risk

- No secrets, auth, API, or MCP changes.
- No user data handling changes.
- Desktop app is not in sensitive paths.

## No dependency risk

- No new crates or npm packages.
