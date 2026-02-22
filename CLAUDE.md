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
2. **Write tests** — New features and bug fixes must have corresponding tests in `src/__tests__/`. Do not test external libraries or vendor APIs.
3. **Update documentation** — After each feature, review `docs/` and `README.md` to ensure they reflect the current state of the product. Keep docs concise and non-redundant: prefer linking to the relevant `docs/` page over duplicating content in the README. The README should be a clean overview with a quick-start, not a full reference. A demo GIF placeholder lives at the top of the README — do not remove it.
4. **Clean up obsolete code** — Remove dead references, unused types, stale docs entries. Don't leave commented-out code or backward-compat shims for removed features.
5. **Run checks before finishing**:
   - `bun run test` — all tests pass
   - `bun run typecheck` — no type errors
   - `bun run check` — lint and format pass
6. **Test strategy**:
   - **Unit tests**: Pure functions, constants, validation. Every new type/constant/exported function.
   - **Integration tests**: Config resolution flows, save/load round-trips with temp filesystem.
   - **App-level tests**: UI behavior via ink-testing-library — keybindings, state transitions, rendered output.
7. Always keep tldr-desktop in sync, especially when inserting breaking changes and new features. After each session that introduces breaking changes, new features, or UI-affecting changes, add an entry to `claude_notes/desktop-sync-tracker.md` describing what tldr-desktop needs to catch up on.
8. Keep code clean, if possible better than you found it.
