# Audio (TTS)

tldr can read summaries aloud using text-to-speech. Audio is completely free — no API key needed.

## How It Works

Audio is powered by [edge-tts](https://github.com/nickclaw/edge-tts-universal), which uses Microsoft's free public TTS service. No API key, no usage limits.

Press `a` in the result view to generate and play audio.

## TTS Modes

| Mode | Description |
|------|-------------|
| **strip** (default) | Strips markdown formatting, reads the summary as-is |
| **rewrite** | Rewrites the summary as an engaging audio script before speaking |

The `rewrite` mode uses your configured provider (API or CLI) to transform the summary into a podcast-style script. This costs one additional API call (or CLI invocation) but produces more natural-sounding audio.

```bash
tldr config set tts-mode rewrite    # Enable rewrite mode
tldr config set tts-mode strip      # Back to default
```

## Voice & Speed

```bash
# Set via profile editor
tldr profile edit

# Default voice: en-US-JennyNeural
# Default speed: 1.0x
```

The voice setting accepts any edge-tts compatible voice name. Speed is a multiplier (e.g., `1.2` for 20% faster).

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

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `a` | Generate and play audio |
| `s` | Stop audio playback |
