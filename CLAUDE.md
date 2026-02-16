# CLAUDE.md — Project Conventions

## After Every Task

1. **Update CHANGELOG.md** — Add entries under `[Unreleased]` for any user-facing change (Added, Fixed, Changed, Removed)
2. **Write tests** — New features and bug fixes must have corresponding tests in `src/__tests__/`
3. **Update documentation** — If behavior changes, update the relevant docs in `docs/` and `README.md`
4. **Clean up obsolete code** — Remove dead references, unused types, stale docs entries. Don't leave commented-out code or backward-compat shims for removed features.
5. **Run checks before finishing**:
   - `bun run test` — all tests pass
   - `bun run typecheck` — no type errors
   - `bun run check` — lint and format pass
