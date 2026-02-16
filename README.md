<div align="center">

# tldr

**Summarize anything. Understand everything.**

Learning-focused summaries built for how your brain actually works.

URLs · PDFs · Images · YouTube · Slack · Notion · arXiv · Raw Text

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Powered by Claude](https://img.shields.io/badge/powered%20by-Claude-blueviolet.svg)](https://claude.ai)

</div>

---

## Quick Start

```bash
tldr "https://arstechnica.com/some-article/"     # Summarize a URL
tldr "https://arxiv.org/pdf/2401.12345.pdf"       # Summarize a PDF
tldr ./local-file.pdf                              # Local PDF
tldr "Your text to summarize here..."              # Raw text
tldr import ./notes.md                             # Import existing markdown
tldr                                               # Interactive mode
```

No setup required if you have [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated. tldr uses it by default.

---

## Pricing

| What | Cost | Need API Key? |
|------|------|---------------|
| **Audio (TTS)** | **FREE** | No |
| **Summaries (CLI provider)** | Included with Claude Code subscription | No |
| **Summaries (API provider)** | ~$0.005/summary | Yes |

Audio uses [edge-tts](https://github.com/nickclaw/edge-tts-universal) (Microsoft's free public TTS). No API key, no limits.

---

## Setup

### Default (Claude Code)

If you have Claude Code installed, tldr works out of the box:

```bash
tldr "https://example.com/article"
```

If Claude Code isn't installed, tldr will tell you how to set it up.

### Alternative: API Provider

```bash
export ANTHROPIC_API_KEY=sk-ant-...
tldr --provider api "https://example.com/article"

# Or set it permanently:
tldr config set provider api
```

### Optional: Platform Tokens

```bash
export SLACK_TOKEN=xoxb-...     # Slack Bot/User token for thread extraction
export NOTION_TOKEN=ntn_...     # Notion integration token for page extraction
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | New summary |
| **c** | Copy to clipboard |
| **a** | Play audio (TTS) |
| **s** | Stop audio |
| **t** | Chat about this summary |
| **r** | Re-summarize |
| **q** | Quit |

---

## Supported Inputs

| Input | Status |
|-------|--------|
| Web URLs | Supported |
| PDF files (local & remote) | Supported |
| arXiv papers | Supported |
| Raw text | Supported |
| Images | Supported |
| YouTube | Supported (transcripts) |
| Slack | Supported (needs `SLACK_TOKEN`) |
| Notion | Supported (needs `NOTION_TOKEN`) |

Handles long content up to ~100k words using Claude's 200k context window.

---

## CLI Flags

```bash
tldr --style quick <url>          # Override summary style for this run
tldr --model sonnet <url>         # Override model for this run
tldr --profile work <url>         # Use a specific profile for this run
tldr --provider api <url>         # Override provider for this run
```

---

## Documentation

| Guide | Topics |
|-------|--------|
| [Configuration](docs/configuration.md) | Config file, settable keys, profiles, env vars, resolution hierarchy |
| [Providers](docs/providers.md) | CLI vs API comparison, setup, switching, overrides |
| [Accessibility](docs/accessibility.md) | Cognitive traits, tone options, summary styles |
| [Audio](docs/audio.md) | TTS overview, modes, voice/speed config, session output |

---

## Development

```bash
bun install
bun run dev              # Run in development
bun run test             # Run tests
bun run typecheck        # Type check
bun run check            # Lint + format check
```

## Architecture

```
src/
  index.tsx              Entry point, arg parsing, CLI commands
  App.tsx                State machine (idle -> extracting -> summarizing -> result)
  pipeline.ts            Router -> extractor dispatch
  components/
    ChatView.tsx         Multi-turn chat interface
    ConfigSetup.tsx      Profile editor
    ErrorView.tsx        Error display
    InputPrompt.tsx      Interactive input
    ProcessingView.tsx   Extraction/summarization progress
    SummaryView.tsx      Result display
  extractors/
    router.ts            Input classification
    web.ts               Web page extraction (Readability)
    pdf.ts               PDF extraction (unpdf)
    image.ts             Image encoding for vision
    fetch.ts             HTTP fetching with SSRF protection
    youtube.ts           YouTube transcript extraction
    slack.ts             Slack thread extraction
    notion.ts            Notion page extraction
  lib/
    chat.ts              Session Q&A helper
    config.ts            Settings load/save/resolve
    fmt.ts               ANSI color helpers
    import.ts            Markdown import
    summarizer.ts        Provider dispatcher
    providers/
      api.ts             Anthropic SDK provider
      cli.ts             Claude Code CLI provider (claude -p)
    prompts.ts           System/user prompt building
    session.ts           Session folder creation + summary saving
    tts.ts               Text-to-speech (edge-tts)
    clipboard.ts         Clipboard integration
    history.ts           Summary history
    types.ts             TypeScript types
    paths.ts             Path utilities
docs/
  configuration.md       Config & profiles guide
  providers.md           CLI vs API provider guide
  accessibility.md       Cognitive traits & learning guide
  audio.md               TTS & audio guide
```

## License

MIT
