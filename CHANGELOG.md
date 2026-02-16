# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.9.0] - 2026-02-17

### Added

- Press Esc during extraction or summarization to cancel and return to the input prompt
- Processing view shows `[Esc] cancel` hint
- Non-intrusive "update available" notification — checks GitHub Releases once per 24h, shown in idle prompt
- `--version` / `-v` flag for standard CLI version output
- Cross-platform build scripts (`build:darwin-arm64`, `build:darwin-x64`, `build:linux-x64`, `build:linux-arm64`, `build:all`)
- GitHub Release workflow that builds standalone binaries on `v*` tag push and updates Homebrew tap
- Homebrew tap distribution via `brew install asanmateu/tldr/tldr-cli`
- Standalone binary download instructions in README
- `config set` support for 6 profile settings previously only editable via `/config` UI: `tone`, `style`, `voice`, `tts-speed`, `traits`, `custom-instructions`
- Model picker in `/config` profile editor (replaces display-only view with haiku/sonnet/opus selector)
- `/history` slash command to browse and resume past sessions with navigable list, deduplication, and time-ago labels
- Interactive slash commands (`/setup`, `/config`, `/theme`, `/help`, `/quit`) with autocomplete in interactive mode
- `CLAUDE.md` with project conventions for AI assistants
- MIT license
- `tldr import <file.md>` command to import existing markdown as a session
- Chat mode (`t` key in result view) for multi-turn Q&A about any summary
- `ChatMessage` type and `chat` method on Provider interface
- `chatWithSession` and `buildChatSystemPrompt` helpers
- `importMarkdown` function in core library

### Changed

- Summaries are only saved when pressing Enter in the result view; quitting with `q` discards the session
- Result view footer updated to reflect save/discard semantics (`[Enter] save` / `[q] discard`)
- Docs now separate user installation (Homebrew/binary) from developer setup (clone + Bun)
- CONTRIBUTING.md includes "Getting started" section with development setup steps
- Version import in `Banner.tsx` switched from `createRequire` to static JSON import for compiled binary compatibility
- README installation section now lists Homebrew and standalone binary only; "From source" moved to Development section
- Added `resolveJsonModule` to `tsconfig.json`
- Added npm metadata fields (`files`, `engines`, `repository`, `keywords`, `author`, `license`) to `package.json`
- Refactored `config set` handler from if-else chain to data-driven dispatch (`configSetter.ts`)
- Extracted `<SelectionList>` component and `useListNavigation` hook from ConfigSetup
- Replaced nested ternary in speech rewriter with `TONE_HINTS` Record lookup
- Extracted `classifySlackError()` to deduplicate Slack error classification
- Merged duplicate PDF switch cases in pipeline
- Exported validation sets from `config.ts` as single source of truth (added `VALID_VOICES`)

### Fixed

- Coral theme accent color changed from cyan (#00d4ff/#0984e3) to warm gold/amber (#f9ca24/#b45309) to match its warm identity
- Forest theme accent color changed from cyan (#81ecec/#00838f) to earthy wheat/olive (#e6c57b/#5d6d1e) to match its natural identity
- Hardcoded `color="red"` in command error text now uses `theme.error` for consistency
- Added top spacing (blank line) between shell prompt and app output
- Graceful error messages for invalid file paths (e.g. `/clear` no longer shows raw ENOENT stack trace)
- Unknown slash commands now show "Unknown command" feedback instead of being silently ignored
- First-run setup wizard now correctly shows on fresh install (was skipped when provider defaulted to `cli`)
- CI audit step failing due to missing `package-lock.json`

### Removed

- Always-visible history entries below the input prompt (replaced by `/history` command)
- Obsolete `tts-mode` references in `docs/configuration.md`
- Broken Pipeline and Coverage badges pointing to previous remote

## [0.8.0] - 2026-02-16

### Added

- Condition-aware audio rewrite: speech scripts are now tailored to cognitive traits (dyslexia, ADHD, autism, ESL, visual-thinker) with trait-specific rules
- Pitch presets (`low`, `default`, `high`) for voice tuning via SSML prosody
- Volume presets (`quiet`, `normal`, `loud`) for voice tuning via SSML prosody
- `tldr config set pitch <low|default|high>` and `tldr config set volume <quiet|normal|loud>` CLI commands
- Pitch and Volume selectors in `tldr profile edit`
- Voice personality hints in profile editor (e.g. "Jenny — friendly, warm")
- TTS-specific prompt improvements: punctuation for pacing, varied rhythm, spelled-out numbers

### Fixed

- Audio not saved to session directory when user pressed `a` quickly after summarization (race condition between `setState("result")` and `setCurrentSession`)

### Removed

- `TtsMode` type and all "strip" mode plumbing — audio now always uses intelligent rewrite
- `stripMarkdownForSpeech()` function
- `ttsMode` from Profile, ResolvedConfig, CLI config display, and profile editor
- `tldr config set tts-mode` command

## [0.7.0] - 2026-02-15

### Added

- Theme system with 3 color palettes: Coral (warm reds), Ocean (cool blues), Forest (earthy greens)
- Appearance modes: auto (detect system), dark, light
- `tldr config set theme <coral|ocean|forest>` and `tldr config set appearance <auto|dark|light>` commands
- Theme and appearance selectors in first-run setup and profile editor
- Theme documentation in configuration guide and README

### Fixed

- Default summary style in docs corrected from study-notes to standard

## [0.6.0] - 2026-02-15

### Added

- `standard` summary style (key points + why it matters + connections) as the new default
- Model-generated titles for session directory names
- Installation instructions in README
- SECURITY.md and GitHub issue templates

### Changed

- Input cursor changed from `tldr` to `>` with matching banner color
- README rewritten for clarity and audience

### Fixed

- TTS synthesis timeout (15 seconds) to prevent hangs
- macOS `say` fallback when edge-tts fails
- Audio generating state indicator in result view
- Biome formatting on TTS import
- Misleading "free" references for CLI provider
- Removed incorrect "Free with Claude Code" badge
- Slack and Notion NO_TOKEN test failures
- Switched from npm to bun lockfile

## [0.5.0] - 2026-02-14

### Added

- Summarize URLs, PDFs, images, YouTube, Slack threads, Notion pages, arXiv papers, and raw text
- Learning-focused output styles: study-notes, executive, cornell, eli5
- Audio playback via edge-tts
- YouTube, Slack, and Notion extractors
- CI pipeline with GitHub Actions and coverage reporting
- Claude Code CLI as default provider with Opus model
