# Configuration

Settings are stored at `~/.tldr/settings.json`. Run `tldr config` to see your current settings.

Most settings are easier to change interactively with `tldr profile edit` or `/config` in interactive mode. The CLI commands below are for when you know exactly what you want.

## Summary

| Key | Values | Example |
|-----|--------|---------|
| `style` | `quick`, `standard`, `detailed`, `study-notes` | `tldr config set style quick` |
| `tone` | `casual`, `professional`, `academic`, `eli5` | `tldr config set tone professional` |
| `traits` | Comma-separated list | `tldr config set traits adhd,dyslexia` |
| `model` | Tier alias or full model ID | `tldr config set model sonnet` |
| `provider` | `claude-code`, `anthropic`, `codex`, `gemini`, `ollama`, `openai`, `xai` | `tldr config set provider gemini` |
| `custom-instructions` | Freeform text | `tldr config set custom-instructions "Focus on code examples"` |

### Tones

| Tone | What it sounds like |
|------|---------------------|
| **casual** (default) | Conversational, like explaining to a colleague |
| **professional** | Clear and formal, precise and direct |
| **academic** | Analytical, references key concepts and terminology |
| **eli5** | Simple analogies, no jargon, fun and accessible |

### Summary Styles

| Style | Best for | Sections |
|-------|----------|----------|
| **quick** | Fast overview | TL;DR, Key Points, Why It Matters, Action Items |
| **standard** (default) | Understanding | TL;DR, Key Points, Why It Matters, Connections, Action Items |
| **detailed** | Deep understanding | TL;DR, Context, Key Points, Analogy, Notable Details, Action Items |
| **study-notes** | Learning & review | TL;DR, Core Concepts, How They Connect, Key Facts, Visual Map, Review Questions |

Override for a single run:

```bash
tldr --style quick "https://example.com/article"
```

## Audio

| Key | Values | Example |
|-----|--------|---------|
| `voice` | TTS voice name | `tldr config set voice en-US-GuyNeural` |
| `tts-speed` | Positive number | `tldr config set tts-speed 1.25` |
| `pitch` | `low`, `default`, `high` | `tldr config set pitch high` |
| `volume` | `quiet`, `normal`, `loud` | `tldr config set volume loud` |

## Appearance

| Key | Values | Example |
|-----|--------|---------|
| `theme` | `coral`, `ocean`, `forest` | `tldr config set theme ocean` |
| `appearance` | `auto`, `dark`, `light` | `tldr config set appearance light` |

Three themes: **coral** (warm reds, default), **ocean** (cool blues), **forest** (earthy greens).

Three appearance modes: **auto** (detects system setting, default), **dark**, **light**.

## General

| Key | Values | Example |
|-----|--------|---------|
| `apiKey` | Your API key | `tldr config set apiKey sk-ant-...` |
| `baseUrl` | Custom API endpoint | `tldr config set baseUrl https://proxy.example.com` |
| `maxTokens` | Number | `tldr config set maxTokens 2048` |
| `output-dir` | Path | `tldr config set output-dir ~/summaries` |
| `activeProfile` | Profile name | `tldr config set activeProfile work` |

## Profiles

Profiles let you save different settings for different contexts (work, study, casual).

```bash
tldr profile list                 # List profiles (* = active)
tldr profile create work          # Create a new profile
tldr profile use work             # Switch active profile
tldr profile edit work            # Edit profile settings (interactive)
tldr profile delete work          # Delete a profile
tldr --profile work <url>         # Use a profile for one run
```

## Interactive Commands

In interactive mode, type `/` to access commands:

| Command | Description |
|---------|-------------|
| `/history` | Browse and resume past sessions |
| `/setup` | Re-run the first-time setup wizard |
| `/config` | Edit current profile settings |
| `/theme` | Change color theme |
| `/help` | Show shortcuts and commands |
| `/quit` | Exit the app |

## Per-Style Model Configuration

Each summary style can use a different model. Configure in `settings.json`:

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

## Model Aliases

| Alias | Resolves to |
|-------|-------------|
| `haiku` | `claude-haiku-4-5-20251001` |
| `sonnet` | `claude-sonnet-4-5-20250929` |
| `opus` | `claude-opus-4-6` |

Any other string is passed through as-is (e.g. `gpt-4o` with a compatible API).

## Environment Variables

Environment variables override file settings:

| Variable | Overrides |
|----------|-----------|
| `ANTHROPIC_API_KEY` | `apiKey` |
| `ANTHROPIC_BASE_URL` | `baseUrl` |
| `ANTHROPIC_MODEL` | `model` |
| `OPENAI_API_KEY` | `apiKey` (if `ANTHROPIC_API_KEY` not set) |
| `OPENAI_BASE_URL` | `baseUrl` (if `ANTHROPIC_BASE_URL` not set) |
| `GEMINI_API_KEY` | API key for Gemini provider |
| `XAI_API_KEY` | API key for xAI provider |
| `XAI_BASE_URL` | Custom base URL for xAI |
| `OLLAMA_BASE_URL` | Ollama server URL (default `http://localhost:11434`) |

## Resolution Order

Settings are resolved in this order (first wins):

1. CLI flags (`--model`, `--style`, `--profile`, `--provider`)
2. Environment variables
3. Profile settings in `settings.json`
4. Built-in defaults

## Defaults

| Setting | Default |
|---------|---------|
| Provider | `claude-code` (Claude Code) |
| Summary style | `standard` |
| Model | Opus (`claude-opus-4-6`) |
| Cognitive traits | `dyslexia` |
| Tone | `casual` |
| Voice | `en-US-JennyNeural` |
| TTS speed | `1.0x` |
| Pitch | `default` |
| Volume | `normal` |
| Theme | `coral` |
| Appearance | `auto` |
