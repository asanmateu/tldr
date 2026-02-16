# Configuration

## Config File

Settings are stored at `~/.tldr/settings.json` (permissions: owner-only, `0600`).

Run `tldr config` to see the current resolved configuration.

## Settable Keys

| Key | Values | Scope | Example |
|-----|--------|-------|---------|
| `apiKey` | Your API key | Global | `tldr config set apiKey sk-ant-...` |
| `baseUrl` | Custom API endpoint | Global | `tldr config set baseUrl https://proxy.example.com` |
| `maxTokens` | Number | Global | `tldr config set maxTokens 2048` |
| `output-dir` | Path | Global | `tldr config set output-dir ~/summaries` |
| `activeProfile` | Profile name | Global | `tldr config set activeProfile work` |
| `provider` | `cli` or `api` | Profile | `tldr config set provider api` |
| `model` | Tier alias or full model ID | Profile | `tldr config set model sonnet` |
| `tts-mode` | `strip` or `rewrite` | Profile | `tldr config set tts-mode rewrite` |
| `theme` | `coral`, `ocean`, `forest` | Global | `tldr config set theme ocean` |
| `appearance` | `auto`, `dark`, `light` | Global | `tldr config set appearance light` |

## Profile System

Profiles let you save different settings for different contexts. Each profile stores:

- Cognitive traits (dyslexia, adhd, autism, esl, visual-thinker)
- Tone (casual, professional, academic, eli5)
- Summary style (quick, detailed, study-notes)
- Per-style model overrides
- Provider (cli or api)
- Voice, TTS speed, TTS mode
- Custom instructions

### Profile Commands

```bash
tldr profile list                 # List profiles (* = active)
tldr profile create work          # Create a new profile
tldr profile use work             # Switch active profile
tldr profile edit work            # Edit profile settings (interactive)
tldr profile delete work          # Delete a profile
tldr --profile work <url>         # Use a profile for one run
```

## Theme

The color theme is selected during first-run setup (after API key, before traits). You can also change it later via `tldr profile edit` → Theme menu item, or directly with the CLI:

```bash
tldr config set theme <name>         # coral, ocean, forest
tldr config set appearance <mode>    # auto, dark, light
```

Three themes are available:

- **coral** — warm reds (default)
- **ocean** — cool blues
- **forest** — earthy greens

Three appearance modes:

- **auto** — detects system dark/light setting on macOS (default)
- **dark** — always dark background
- **light** — always light background

Theme and appearance are stored at the settings level in `settings.json`, not per-profile.

## Per-Style Model Configuration

Each summary style can use a different model. Configure this in `settings.json`:

```json
{
  "profiles": {
    "default": {
      "styleModels": {
        "quick": "haiku",
        "detailed": "sonnet",
        "study-notes": "opus"
      }
    }
  }
}
```

When no `styleModels` are configured, all styles default to Opus.

## Environment Variables

Environment variables override file settings:

| Variable | Overrides |
|----------|-----------|
| `ANTHROPIC_API_KEY` | `apiKey` |
| `ANTHROPIC_BASE_URL` | `baseUrl` |
| `ANTHROPIC_MODEL` | `model` |

## Resolution Hierarchy

Settings are resolved in this order (first wins):

1. CLI flags (`--model`, `--style`, `--profile`, `--provider`)
2. Environment variables (`ANTHROPIC_API_KEY`, etc.)
3. Profile settings (from active profile in `settings.json`)
4. Built-in defaults

### Model Resolution

Model is resolved in this order:

1. `--model` flag
2. `styleModels[currentStyle]` from profile
3. `model` from profile (blanket override)
4. Built-in default (Opus for all styles)

## Model Aliases

The `model` field accepts either tier aliases or full model IDs:

| Alias | Resolves To |
|-------|-------------|
| `haiku` | `claude-haiku-4-5-20251001` |
| `sonnet` | `claude-sonnet-4-5-20250929` |
| `opus` | `claude-opus-4-6` |

Any other string is passed through as-is:

```bash
tldr config set model sonnet              # Tier alias
tldr config set model claude-opus-4-6     # Full Claude model ID
tldr config set model gpt-4o              # Non-Claude model (with compatible API)
```

## Defaults

| Setting | Default |
|---------|---------|
| Provider | `cli` (Claude Code) |
| Summary style | `standard` |
| Model | Opus (`claude-opus-4-6`) |
| Cognitive traits | `dyslexia` |
| Tone | `casual` |
| Voice | `en-US-JennyNeural` |
| TTS speed | `1.0x` |
| TTS mode | `strip` |
| Theme | `coral` |
| Appearance | `auto` (detects system dark/light on macOS) |
