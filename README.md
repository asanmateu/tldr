<div align="center">

# tldr

**Summarize anything. Understand everything.**

A CLI tool that turns articles, PDFs, videos, and more into short, clear summaries designed for how your brain actually works.

Built for people with dyslexia, ADHD, and anyone who learns better with structure.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Powered by Claude](https://img.shields.io/badge/powered%20by-Claude-blueviolet.svg)](https://claude.ai)

</div>

---

## Installation

Requires [Bun](https://bun.sh) (v1.0+) and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
git clone https://github.com/asanmateu/tldr.git
cd tldr
bun install
bun link
```

That's it. If Claude Code is installed and authenticated, `tldr` works immediately.

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

After a summary, use the keyboard shortcuts shown at the bottom: copy, listen to audio, chat about it, or start a new one.

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

By default, tldr uses Claude Code (included with your Claude Code subscription). If you'd rather use the API directly:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
tldr config set provider api
```

---

## Documentation

- [Configuration](docs/configuration.md) — config file, profiles, env vars
- [Providers](docs/providers.md) — CLI vs API setup
- [Accessibility](docs/accessibility.md) — cognitive traits, tones, summary styles
- [Audio](docs/audio.md) — text-to-speech options

---

## Development

```bash
bun install
bun run dev              # Run in development
bun run test             # Run tests
bun run typecheck        # Type check
bun run check            # Lint + format check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture and project structure.

## License

MIT
