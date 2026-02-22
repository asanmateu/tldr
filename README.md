<div align="center">

# tl;dr

**Summarize anything. Understand everything.**

A CLI tool that turns articles, PDFs, videos, and more into short, clear summaries designed for how your brain actually works.

[![CI](https://github.com/asanmateu/tldr/actions/workflows/ci.yml/badge.svg)](https://github.com/asanmateu/tldr/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/asanmateu/tldr/branch/main/graph/badge.svg)](https://codecov.io/gh/asanmateu/tldr)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## Why this exists

I had a pile of to-reads growing at work and it was overwhelming — not because the material was hard, but because it was all in the wrong format. That goes double if you're neurodivergent, reading in a second language, or just short on time.

---

## Audio

Summaries aren't just read aloud. They're **rewritten as spoken scripts** using a configurable audio mode — podcast, briefing, lecture, storyteller, study-buddy, or calm. Each mode has a distinct persona and delivery style. The script also adapts to your cognitive traits and tone. The result sounds natural, not robotic.

Press **`a`** to listen. Press **`w`** to save the audio alongside your summary. Use built-in presets like `morning-brief` or `bedtime-read` for curated listening experiences. Free with Edge TTS by default, or switch to OpenAI TTS for higher quality. See the [Audio guide](docs/audio.md) for modes, voices, and provider options.

---

## Installation

```bash
brew install asanmateu/tldr/tldr-cli
```

Works out of the box with [Claude Code](https://docs.anthropic.com/en/docs/claude-code), or bring your own API key (Anthropic, OpenAI, Gemini, xAI, Ollama, Codex, etc.) — see [Providers](docs/providers.md). For standalone binaries, building from source, and other install methods, see the [Installation guide](docs/installation.md).

---

## Usage

```bash
tldr "https://arstechnica.com/some-article/"     # Web article
tldr ./paper.pdf                                  # Local PDF
tldr "https://example.com/doc.pdf"                # Remote PDF
tldr "Your text to summarize here..."             # Raw text
tldr                                              # Interactive mode
```

YouTube, Slack threads, and Notion pages also work — just paste the URL.

In interactive mode, you can drag and drop files from Finder directly into the terminal — paths from iTerm2, Terminal.app, and other emulators are automatically recognized.

After a summary, use the keyboard shortcuts shown at the bottom: save, save with audio, listen, copy, chat, re-summarize, or discard. In chat mode, press `Ctrl+s` to save the conversation — subsequent messages auto-save. You'll be notified in the prompt when a new version is available.

Type `/` in interactive mode to access commands like `/history`, `/setup`, `/config`, `/theme`, and `/help`.

---

## How it works

1. You give it something to read (a URL, file, or text)
2. It extracts the content automatically
3. Your AI provider generates a structured, learning-focused summary
4. The summary is saved to `~/Documents/tldr/`

Summaries use short sentences, bullet points, bold key terms, and put the most important information first. This isn't just formatting — it's designed around cognitive accessibility research to work better for all types of readers.

---

## Configuration

tldr works out of the box with sensible defaults. If you want to customise it:

```bash
tldr config                          # Open the config editor
tldr --style quick "https://..."     # Quick summary instead of study notes
tldr --model sonnet "https://..."    # Use a different model
```

Choose from three color themes (coral, ocean, forest) and auto dark/light mode during setup, or change later with `tldr config set theme`.

Use built-in presets (morning-brief, deep-study, bedtime-read, etc.) or create your own for different contexts with different tones, styles, audio modes, and cognitive trait settings.

See the [Configuration guide](docs/configuration.md) for details.

---

## Accessibility

Cognitive accessibility is the point, not a feature. Every summary is optimised for readability by default.

| Trait | What it does |
|-------|-------------|
| **Dyslexia** (on by default) | Shorter sentences, simpler vocabulary, bold key terms |
| **ADHD** | No filler, action-oriented, most important info first |
| **Autism** | Literal language, explicit structure, no idioms |
| **ESL** | Common words only, jargon defined inline |
| **Visual thinker** | Hierarchical layout, grouped ideas, numbered steps |

Traits stack. Enable multiple with `tldr preset edit`.

---

## Alternative providers

By default tldr uses Claude Code (`claude-code`). You can also use the Anthropic API directly (`anthropic`), Google Gemini (`gemini`), xAI/Grok (`xai`), local Ollama (`ollama`), OpenAI Codex CLI (`codex`), or any OpenAI-compatible endpoint (`openai`) — see the [Providers guide](docs/providers.md).

---

## Documentation

- [Installation](docs/installation.md) — Homebrew, standalone binaries, prerequisites
- [Configuration](docs/configuration.md) — settings, presets, tones, summary styles, audio modes
- [Providers](docs/providers.md) — Claude Code, Anthropic API, Gemini, xAI, Ollama, Codex, and OpenAI-compatible setup
- [Audio](docs/audio.md) — audio modes, listening to summaries, voices, save with audio

---

## Development

Requires [Bun](https://bun.sh) (v1.0+).

```bash
git clone https://github.com/asanmateu/tldr.git
cd tldr
bun install
```

```bash
bun run dev              # Run in development
bun run test             # Run tests
bun run typecheck        # Type check
bun run check            # Lint + format check
bun link                 # Make available as `tldr` command
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture and project structure.

## License

MIT
