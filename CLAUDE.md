# CLAUDE.md — Project Conventions

## Versioning (SemVer)

This project follows [Semantic Versioning](https://semver.org/). Commit prefixes map to version bumps:

- **`feat:`** — new user-facing functionality → **minor** bump (0.x.0)
- **`fix:`** — bug fix → **patch** bump (0.0.x)
- **`refactor:`** / **`perf:`** / **`chore:`** / **`docs:`** / **`test:`** / **`ci:`** — no version bump on their own; group with the next release
- **Breaking changes** (removing or changing existing behavior in a non-backward-compatible way) → **major** bump (x.0.0). Prefix the commit with `feat!:` or `fix!:` or add `BREAKING CHANGE:` in the commit body.

When cutting a release, collect all `[Unreleased]` entries into a new version heading (e.g. `## [0.9.0] - 2026-02-17`). The version number is determined by the highest-impact change since the last release: any `feat` → minor, only `fix` → patch, breaking → major.

## After Every Task

1. **Update CHANGELOG.md** — Add entries under `[Unreleased]` for any user-facing change (Added, Fixed, Changed, Removed)
2. **Write tests** — New features and bug fixes must have corresponding tests in `src/__tests__/`
3. **Update documentation** — If behavior changes, update the relevant docs in `docs/` and `README.md`
4. **Clean up obsolete code** — Remove dead references, unused types, stale docs entries. Don't leave commented-out code or backward-compat shims for removed features.
5. **Run checks before finishing**:
   - `bun run test` — all tests pass
   - `bun run typecheck` — no type errors
   - `bun run check` — lint and format pass
