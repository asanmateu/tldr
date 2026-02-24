# Demo GIFs

Terminal recordings for the README and docs, built with [VHS](https://github.com/charmbracelet/vhs).

## Prerequisites

```bash
brew install vhs
```

VHS also needs [ttyd](https://github.com/tsl0922/ttyd) and [ffmpeg](https://ffmpeg.org/), which Homebrew installs automatically as dependencies.

## Generate all GIFs

```bash
./demos/generate.sh
```

Or generate a single one:

```bash
vhs demos/hero.tape
```

## Tapes

All tapes use interactive mode. Each one is self-contained — launch tldr, do the thing, exit.

| Tape | What it shows | Used in |
|------|--------------|---------|
| `hero.tape` | Paste URL → streaming summary → copy → save | README.md |
| `audio.tape` | Summarize → audio panel idle → generate → play → stop → save with audio | docs/audio.md |
| `config.tape` | Slash menu → `/config` editor → change tone, style, theme | docs/configuration.md |
| `providers.tape` | Slash menu → `/setup` wizard → browse providers → summarize | docs/providers.md |
| `install.tape` | Version check → launch → slash menu → `/help` screen | docs/installation.md |

## Tuning

The tapes are deliberately slow — generous pauses let viewers read each screen. You'll still need to adjust API response times after the first run:

- **Summarization**: `Sleep 18s` (Claude Code is ~15–20s, direct API ~5–10s)
- **Audio generation**: `Sleep 6s` for Edge TTS, ~10s for OpenAI TTS
- **TypingSpeed**: `50ms` per character — realistic without being tedious
- **UI pauses**: 3–6s for menus/options, 5–8s for full-screen content

### Demo URLs

The tapes use two science/IT articles:

- **Hero + Providers**: [Mapping the Mind of a Large Language Model](https://www.anthropic.com/research/mapping-mind-language-model) — Anthropic's AI interpretability research (~3000 words)
- **Audio**: [AlphaFold: a solution to a 50-year-old grand challenge in biology](https://deepmind.google/discover/blog/alphafold-a-solution-to-a-50-year-old-grand-challenge-in-biology/) — DeepMind's protein folding breakthrough (~3500 words)

Swap these for whatever best represents your use case. Shorter articles (~1000 words) produce tighter demos.

### File size

GitHub renders GIFs up to 10 MB inline. If a GIF is too large:

1. Increase `PlaybackSpeed` to `1.5` or `2`
2. Trim `Sleep` durations (but keep menus readable)
3. Reduce `Set Height`
4. Use shorter articles
5. Host on GitHub releases and link with a raw URL
