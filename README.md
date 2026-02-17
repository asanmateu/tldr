<div align="center">

# tl;dr

**Summarize anything. Understand everything.**

A CLI tool that turns articles, PDFs, videos, and more into short, clear summaries designed for how your brain actually works.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Powered by Claude](https://img.shields.io/badge/powered%20by-Claude-blueviolet.svg)](https://claude.ai)

</div>

---

## Why this exists

I had a pile of to-reads growing at work — articles, PDFs, Slack threads, design docs — and it was overwhelming. Not because the material was hard, but because there was too much of it and it was all in the wrong format. Walls of text, dense paragraphs, key points buried halfway through.

That's when I realized: the problem isn't reading ability, it's format. And that insight goes deeper than productivity. Neurodivergent developers, students, and professionals have always been able to understand complex ideas — they just need them presented differently. Whether you have dyslexia, ADHD, are on the spectrum, or are reading in a second language, you shouldn't have to fight the format to get to the meaning.

tldr exists to fix that.

---

## Audio — not just another summarizer

Most summarizers stop at text. tldr goes further: press `a` after any summary to hear it spoken aloud. But this isn't text-to-speech bolted on — it rewrites the summary into an engaging, podcast-style script tailored to your cognitive profile, then synthesizes it with natural-sounding voices.

If you think better by listening, this changes everything. See the [Audio guide](docs/audio.md) for voice, speed, and pitch options.

---

## Installation

```bash
brew install asanmateu/tldr/tldr-cli
```

Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code) to be installed and authenticated. See [Installation guide](docs/installation.md) for standalone binaries and other methods.

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

After a summary, use the keyboard shortcuts shown at the bottom: copy, listen to audio, chat about it, or start a new one. You'll be notified in the prompt when a new version is available.

Type `/` in interactive mode to access commands like `/history`, `/setup`, `/config`, `/theme`, and `/help`.

---

## How it works

1. You give it something to read (a URL, file, or text)
2. It extracts the content automatically
3. Claude generates a structured, learning-focused summary
4. The summary is saved to `~/Documents/tldr/`

Summaries use short sentences, bullet points, bold key terms, and put the most important information first. This isn't just formatting — it's based on how people with dyslexia and ADHD process information.

---

## Configuration

tldr works out of the box with sensible defaults. If you want to customise it:

```bash
tldr config                          # Open the config editor
tldr --style quick "https://..."     # Quick summary instead of study notes
tldr --model sonnet "https://..."    # Use a different model
```

Choose from three color themes (coral, ocean, forest) and auto dark/light mode during setup, or change later with `tldr config set theme`.

You can set up profiles for different contexts (work, study, casual) with different tones, styles, and cognitive trait settings.

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

Traits stack. Enable multiple with `tldr profile edit`.

---

## Alternative provider

By default tldr uses Claude Code. To use the Anthropic API directly instead, see the [Providers guide](docs/providers.md).

---

## Documentation

- [Installation](docs/installation.md) — Homebrew, standalone binaries, prerequisites
- [Configuration](docs/configuration.md) — settings, profiles, tones, summary styles
- [Providers](docs/providers.md) — CLI vs API setup
- [Audio](docs/audio.md) — text-to-speech options

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
