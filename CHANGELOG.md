# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- MIT license
- `tldr import <file.md>` command to import existing markdown as a session
- Chat mode (`t` key in result view) for multi-turn Q&A about any summary
- `ChatMessage` type and `chat` method on Provider interface
- `chatWithSession` and `buildChatSystemPrompt` helpers
- `importMarkdown` function in core library

### Fixed

- CI audit step failing due to missing `package-lock.json`

### Removed

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
