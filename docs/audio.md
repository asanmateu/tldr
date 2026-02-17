# Audio (TTS)

tldr can read summaries aloud using text-to-speech. Audio is completely free — no API key needed.

## How It Works

Audio is powered by [edge-tts](https://github.com/nickclaw/edge-tts-universal), which uses Microsoft's free public TTS service. No API key, no usage limits.

Press `a` in the result view to generate and play audio.

When you press `a`, tldr uses your configured provider (API or CLI) to rewrite the summary as an engaging, podcast-style audio script tailored to your cognitive profile. This costs one API call (or CLI invocation) but produces natural-sounding, accessible audio.

## Voice, Speed, Pitch & Volume

```bash
# Set via profile editor
tldr profile edit

# Or via CLI
tldr config set pitch low          # deeper, warmer voice
tldr config set pitch high         # brighter, more energetic
tldr config set volume loud        # more presence
tldr config set volume quiet       # softer

# Default voice: en-US-JennyNeural
# Default speed: 1.0x
# Default pitch: default
# Default volume: normal
```

Supported voices: `en-US-JennyNeural` (default), `en-US-GuyNeural`, `en-US-AriaNeural`, `en-GB-SoniaNeural`, `en-AU-NatashaNeural`. Speed is a multiplier (e.g., `1.2` for 20% faster).

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

The result view footer shows the active voice name and TTS speed next to the `[a]` shortcut (e.g. `[a] audio (Jenny, 1.0x)`).
