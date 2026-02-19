# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- App exits directly when pressing Esc during extraction/summarization if launched with a positional argument (`tldr <url>`), instead of returning to the interactive prompt

## [2.0.0] - 2026-02-19

### Added

- Chat panel: bordered card in result view with `[t] start chatting` (moved from footer shortcut)
- Audio panel: persistent bordered card in result view showing audio shortcuts, playback state, and generation progress (replaces 8-second auto-dismiss hint)

### Fixed

- Exiting result view (`q`) now clears the scrollback buffer, preventing stale summary content from lingering when scrolling up
- Audio generation spinner no longer causes screen strobe on long summaries (summary pinned to Ink `<Static>` during spinner animation)
- Audio failure during save-with-audio now shown in save toast instead of silently swallowed
- Help view (`/help`) now lists `w` shortcut
- App exits directly when pressing `q` in result view if launched with a positional argument (`tldr <url>`), instead of returning to the interactive prompt

### Changed

- Cognitive traits moved to their own "Accessibility" section in the profile editor (previously grouped under "Summary")
- Save flow stays on result view; footer shows "Saved" status; single-tap `q` to exit after save
- `[t] talk` moved from footer into dedicated Chat panel
- `[w]` hidden from audio panel after save
- Audio panel is now persistent — adapts content for idle, generating, playing, and saving states
- Audio error moved inside the audio panel; audio shortcuts ([a], [w], [s]) moved from footer into panel
- Playback footer shows voice name and speed: `♪ Playing (Jenny, 1.0x)`
- Save toast differentiates "Saved" vs "Saved with audio" vs "Saved (audio failed)"
- Docs: restructure audio guide to lead with workflow narrative and explain save-with-audio
- Docs: expand README audio section to highlight cognitive-profile-aware script rewriting
- Docs: add voice personality tables and cross-links between audio, config, and provider docs

### Removed

- `save-audio` config setting and profile editor toggle — `Enter` always saves without audio, `[w]` always saves with audio

## [1.3.1] - 2026-02-18

### Fixed

- "Save & exit" in profile editor visually separated from the Appearance section

### Changed

- Docs: add missing `tts-provider` and `tts-model` keys to configuration reference
- Docs: rename "General" → "Global Settings" section with note about interactive editor
- Docs: add TTS Model subsection to audio guide with model comparison table

## [1.3.0] - 2026-02-18

### Added

- Configurable TTS model for OpenAI TTS — free-text input, defaults to `tts-1`
- `tts-model` config key: `tldr config set tts-model tts-1-hd`
- TTS Model selector in profile editor (visible only when OpenAI TTS is selected)

### Changed

- "Provider" renamed to "AI Provider" and moved from General to Summary section
- Profile editor menu reorganized into sections: Summary, Audio, Appearance
- Pitch and Volume hidden from profile editor when using OpenAI TTS (unsupported by the API)

## [1.2.0] - 2026-02-18

### Added

- App integration tests covering state machine transitions, keybindings, abort handling, and provider fallback
- GitHub URL support: blob URLs (`github.com/.../blob/...`) now fetch raw file content directly instead of scraping GitHub's HTML page
- TTS provider abstraction: choose between Edge TTS (free, default) and OpenAI TTS (high quality, requires `OPENAI_API_KEY`)
- `tts-provider` config key: `tldr config set tts-provider openai` / `edge-tts`
- TTS Provider selector in profile editor (`tldr profile edit` / `/config`)
- OpenAI TTS voices: Alloy, Echo, Fable, Onyx, Nova, Shimmer
- Voice list in profile editor now updates dynamically when switching TTS providers
- Audio hint: accent-colored "Press [a] to listen" appears for 5 seconds when a summary first appears
- Spinner animation during audio generation and save-with-audio (matches processing view style)

### Changed

- Footer reordered: `[a] audio` moved before `[c] copy` for better discoverability
- Voice validation relaxed in `config set voice` — any string is now accepted (voices are provider-dependent)

### Fixed

- GitHub blob extractor falls back to web extractor on non-2xx or HTML responses (e.g. private repos returning 404 or login redirects)
- Fixed concurrent processing when input is submitted rapidly in interactive mode (previous extraction is now aborted)
- Homebrew tap repo (`asanmateu/homebrew-tldr`) made public — `brew install` no longer prompts for GitHub credentials
- Added "Build from source" section to installation docs (`git clone` → `bun install` → `bun link`)

## [1.1.0] - 2026-02-18

### Added

- `saveAudio` profile setting: when enabled, audio is automatically generated and saved alongside the summary on Enter
- `[w]` key in result view: per-save audio override (saves with audio when `saveAudio` is off, or saves without audio when `saveAudio` is on)
- `save-audio` config key: `tldr config set save-audio true` / `false`
- Auto-save audio toggle in profile editor (`tldr profile edit` / `/config`)
- `saveAudioFile()` helper and core export for copying audio into session directories
- Double-tap `q` to discard: first press shows a warning, second press within 2s discards and returns to idle (no longer exits the process)
- Save confirmation toast: pressing Enter in the result view now shows "Saved to {path}" for 3 seconds in the idle prompt
- History entry deletion: press `d` in history view to remove an entry
- `/profile` slash command to switch between profiles without leaving interactive mode
- Voice and speed info shown in result view footer (e.g. `[a] audio (Jenny, 1.0x)`)
- Press Esc to exit chat mode (works regardless of input text)
- Export `removeEntry` and `getVoiceDisplayName` from `lib/core` for reuse by desktop sidecar

### Fixed

- Audio preview no longer creates the session directory prematurely (fixes split audio/summary directories when deduplication triggers)

## [1.0.0] - 2026-02-17

### Added

- OpenAI-compatible provider (`openai`) — works with OpenAI, Groq, Together, Fireworks, and any endpoint implementing the OpenAI chat completions API
- Gemini provider (`gemini`) — uses Google's Gemini API via `@google/genai` SDK
- Codex CLI provider (`codex`) — shells out to OpenAI's Codex CLI
- Ollama native provider (`ollama`) — direct REST API, no extra dependency
- xAI/Grok provider (`xai`) — OpenAI-compatible, uses `https://api.x.ai/v1`
- `OPENAI_API_KEY` and `OPENAI_BASE_URL` environment variable support
- `GEMINI_API_KEY`, `XAI_API_KEY`, `XAI_BASE_URL`, `OLLAMA_BASE_URL` environment variable support
- Export `compareSemver` from `lib/core` for reuse by desktop sidecar

### Changed

- **BREAKING:** Renamed provider `api` → `anthropic` and `cli` → `claude-code` — update your `settings.json` if you had `"provider": "api"` or `"provider": "cli"`
- Interactive model picker now uses a free-text input instead of a fixed Haiku/Sonnet/Opus list, supporting any model ID for any provider
- Refactored OpenAI provider into factory pattern (`createOpenAICompatibleProvider`) for reuse by xAI
- Reworked README motivation section: leads with relatable origin story before connecting to the accessibility angle
- Promoted audio as a key differentiator with dedicated README section
- Slimmed README install block to Homebrew one-liner; moved standalone binary instructions to `docs/installation.md`
- Reduced alternative provider section to a one-liner with link to providers guide
- Added installation guide link to README documentation list
- Refreshed CLI banner: replaced boxed frame with minimal `»  tl;dr` chevron style
- Merged `accessibility.md` into `configuration.md` — tones and summary styles now live alongside the settings they configure
- Grouped configuration settings by category (summary, audio, appearance, general) for easier scanning
- Streamlined README install block and added "pick your platform" guidance
- GitHub Release notes now pulled from CHANGELOG.md instead of auto-generated commit summaries

### Removed

- Standalone `docs/accessibility.md` — content folded into configuration docs and README

## [0.10.0] - 2026-02-17

### Added

- Drag-and-drop file support: paths pasted from iTerm2 (single-quoted), Terminal.app (backslash-escaped), and other emulators (double-quoted) are now correctly recognized
- File type hint below input when a dragged file is detected (PDF document, Image, or File)

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
