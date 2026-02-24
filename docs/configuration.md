# Configuration

Settings are stored at `~/.tldr/settings.json`. Run `tldr config` to see your current settings.

Most settings are easier to change interactively with `tldr preset edit` or `/config` in interactive mode. The CLI commands below are for when you know exactly what you want.

## Summary

| Key | Values | Example |
|-----|--------|---------|
| `style` | `quick`, `standard`, `detailed`, `study-notes` | `tldr config set style quick` |
| `tone` | `casual`, `professional`, `academic`, `eli5` | `tldr config set tone professional` |
| `traits` | Comma-separated list | `tldr config set traits adhd,dyslexia` |
| `model` | Any model ID (aliases: `haiku`, `sonnet`, `opus`) | `tldr config set model sonnet` |
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
| `audio-mode` | `podcast`, `briefing`, `lecture`, `storyteller`, `study-buddy`, `calm` | `tldr config set audio-mode briefing` |
| `tts-provider` | `edge-tts`, `openai` | `tldr config set tts-provider openai` |
| `tts-model` | Any OpenAI TTS model ID | `tldr config set tts-model tts-1-hd` |
| `voice` | TTS voice name | `tldr config set voice en-US-GuyNeural` |
| `tts-speed` | Positive number | `tldr config set tts-speed 1.25` |
| `pitch` | `low`, `default`, `high` | `tldr config set pitch high` |
| `volume` | `quiet`, `normal`, `loud` | `tldr config set volume loud` |
> **Note:** Pitch and Volume only apply to Edge TTS. They are not supported by OpenAI TTS and will be hidden in the preset editor when OpenAI is selected.

See the [Audio guide](audio.md) for audio modes, voices, and save-with-audio behavior.

## Appearance

| Key | Values | Example |
|-----|--------|---------|
| `theme` | `coral`, `ocean`, `forest` | `tldr config set theme ocean` |
| `appearance` | `auto`, `dark`, `light` | `tldr config set appearance light` |

Three themes: **coral** (warm reds, default), **ocean** (cool blues), **forest** (earthy greens).

Three appearance modes: **auto** (detects system setting, default), **dark**, **light**.

## Global Settings

These are top-level settings, not preset-specific. They are not available in the interactive preset editor.

| Key | Values | Example |
|-----|--------|---------|
| `apiKey` | Your API key | `tldr config set apiKey sk-ant-...` |
| `baseUrl` | Custom API endpoint | `tldr config set baseUrl https://proxy.example.com` |
| `maxTokens` | Number | `tldr config set maxTokens 2048` |
| `output-dir` | Path | `tldr config set output-dir ~/summaries` |
| `activeProfile` | Preset name | `tldr config set activeProfile work` |

## Presets

Presets let you save different settings for different contexts. tldr ships with 7 built-in presets you can use out of the box or clone and customise.

### Built-in Presets

| Preset | Audio Mode | Style | Tone | Speed | Voice |
|--------|-----------|-------|------|-------|-------|
| **morning-brief** | briefing | quick | professional | 1.15x | Guy |
| **commute-catch-up** | podcast | standard | casual | 1.0x | Jenny |
| **deep-study** | lecture | study-notes | academic | 0.9x | Aria |
| **exam-prep** | study-buddy | study-notes | casual | 0.95x | Jenny |
| **bedtime-read** | calm | standard | casual | 0.85x | Sonia |
| **story-mode** | storyteller | detailed | casual | 1.0x | Guy |
| **team-debrief** | briefing | standard | professional | 1.0x | Jenny |

Built-in presets are read-only. To customise one, create a preset with the same name — the built-in settings are used as a starting point.

### Managing Presets

```bash
tldr preset list                  # List presets (* = active)
tldr preset create work           # Create a new preset
tldr preset use work              # Switch active preset
tldr preset edit work             # Edit preset settings (interactive)
tldr preset delete work           # Delete a preset
tldr --preset morning-brief <url> # Use a preset for one run
```

In interactive mode, type `/preset` to switch presets without leaving the TUI.

## Interactive Commands

In interactive mode, type `/` to access commands:

| Command | Description |
|---------|-------------|
| `/history` | Browse and resume past sessions |
| `/setup` | Re-run the first-time setup wizard |
| `/config` | Edit current preset settings |
| `/theme` | Change color theme |
| `/preset` | Switch between presets |
| `/help` | Show shortcuts and commands |
| `/quit` | Exit the app |

### Saving chat transcripts

Press **`Ctrl+s`** in chat view to save the conversation as `chat.md` in the session directory. After the first save, every completed assistant message auto-saves the full conversation. If the summary hasn't been saved yet, saving the chat also creates the session directory and saves the summary.

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

## Model Selection

The interactive preset editor (`tldr preset edit` / `/config`) fetches available models from your provider's API and shows them as a selectable list. If the API is unreachable or the provider doesn't support model listing, it falls back to a free-text input. CLI providers (claude-code, codex) always use a free-text input.

Model results are cached locally so subsequent edits are instant.

If you enter an invalid model ID, tldr suggests the closest match from your provider's available models.

### Anthropic Aliases

For the Anthropic provider, short aliases like `haiku`, `sonnet`, and `opus` resolve to the latest available model in that tier automatically.

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

1. CLI flags (`--model`, `--style`, `--preset`, `--provider`, `--audio-mode`)
2. Environment variables
3. Preset/profile settings in `settings.json`
4. Built-in defaults

## Defaults

| Setting | Default |
|---------|---------|
| Provider | `claude-code` (Claude Code) |
| Summary style | `standard` |
| Model | Opus (`claude-opus-4-6`) |
| Audio mode | `podcast` |
| Cognitive traits | `dyslexia` |
| Tone | `casual` |
| Voice | `en-US-JennyNeural` |
| TTS speed | `1.0x` |
| Pitch | `default` |
| Volume | `normal` |
| TTS provider | `edge-tts` |
| TTS model | `tts-1` |
| Save audio | `false` |
| Theme | `coral` |
| Appearance | `auto` |
