# Audio (TTS)

tldr can read summaries aloud using text-to-speech.

## TTS Providers

tldr supports two TTS providers:

| Provider | Cost | Quality | Setup |
|----------|------|---------|-------|
| **Edge TTS** (default) | Free | Good (Microsoft Neural voices) | None |
| **OpenAI TTS** | Paid (per-character) | High quality | Requires `OPENAI_API_KEY` |

```bash
# Switch TTS provider
tldr config set tts-provider openai
tldr config set tts-provider edge-tts   # back to default
```

You can also change the TTS provider in the profile editor (`tldr profile edit` / `/config`).

## How It Works

Press `a` in the result view to generate and play audio. When a summary first appears, an accent-colored hint reminds you about this shortcut (auto-dismisses after 5 seconds).

When you press `a`, tldr uses your configured summarization provider (API or CLI) to rewrite the summary as an engaging, podcast-style audio script tailored to your cognitive profile. This costs one API call (or CLI invocation) but produces natural-sounding, accessible audio. The rewritten text is then sent to the selected TTS provider for synthesis.

## Voices

Each TTS provider has its own set of voices:

**Edge TTS voices:** `en-US-JennyNeural` (default), `en-US-GuyNeural`, `en-US-AriaNeural`, `en-GB-SoniaNeural`, `en-AU-NatashaNeural`

**OpenAI TTS voices:** `alloy` (default), `echo`, `fable`, `onyx`, `nova`, `shimmer`

```bash
# Set voice via CLI
tldr config set voice en-US-GuyNeural       # edge-tts voice
tldr config set voice nova                   # openai voice
```

When you switch TTS providers, the voice automatically resets to the new provider's default if your current voice doesn't belong to the new provider.

## Speed, Pitch & Volume

```bash
# Set via profile editor
tldr profile edit

# Or via CLI
tldr config set tts-speed 1.25        # 25% faster
tldr config set pitch low             # deeper, warmer voice
tldr config set pitch high            # brighter, more energetic
tldr config set volume loud           # more presence
tldr config set volume quiet          # softer
```

Speed works with both providers. Pitch and volume presets only apply to Edge TTS — they are silently ignored when using OpenAI TTS.

## Session Output

Audio files are saved alongside summaries in the session output directory:

```
~/Documents/tldr/
  2026-02-14-how-llms-work/
    summary.md
    audio.mp3
```

Change the output directory:

```bash
tldr config set output-dir ~/summaries
```

## Auto-save Audio

By default, pressing Enter saves only the summary. You can enable automatic audio saving:

```bash
tldr config set save-audio true
```

When `save-audio` is enabled, pressing Enter generates audio and saves both `summary.md` and `audio.mp3` to the session directory. If you've already previewed audio with `a`, the cached audio is reused (no re-generation).

You can also toggle this in the profile editor (`tldr profile edit` / `/config`).

### Per-save Override

The `[w]` key inverts the default behavior for a single save:

| `save-audio` setting | `[Enter]` | `[w]` |
|---------------------|-----------|-------|
| `false` (default) | Save summary only | Save summary + audio |
| `true` | Save summary + audio | Save summary only |

Audio failures are non-fatal — the summary is always saved even if audio generation fails.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `a` | Generate and play audio |
| `s` | Stop audio playback |
| `w` | Save with audio override (inverts `save-audio` setting) |

The result view footer shows the active voice name and TTS speed next to the `[a]` shortcut (e.g. `[a] audio (Jenny, 1.0x)`).
