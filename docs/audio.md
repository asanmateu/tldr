# Audio

Summaries aren't just read aloud. They're **rewritten as audio scripts** by the same AI provider you use for summarizing, using a configurable **audio mode** that controls the persona and structure. The script adapts to your cognitive traits and tone setting. The result sounds like a natural spoken piece, not a screen reader.

## How audio works

Three things happen when you press `a`:

1. Your **summary** is sent to the AI provider (same one used for summarizing).
2. The AI **rewrites it as a spoken script** using your chosen **audio mode** — each mode has a distinct persona, structure, and delivery style.
3. The script is sent to a **TTS voice** (Edge TTS or OpenAI) for synthesis and playback.

### Audio modes

Audio modes control how the script is structured and delivered:

| Mode | Persona | Best for |
|------|---------|----------|
| **podcast** (default) | Conversational host with hooks and transitions | General listening |
| **briefing** | Analyst delivering concise, numbered facts | Daily catch-ups |
| **lecture** | Patient teacher building understanding progressively | Deep learning |
| **storyteller** | Narrator weaving a compelling narrative | Story-driven content |
| **study-buddy** | Study partner with quizzes and mnemonics | Exam prep, retention |
| **calm** | Gentle, soothing narrator | Relaxed / bedtime listening |

```bash
tldr config set audio-mode briefing           # Change default
tldr --audio-mode lecture "https://..."        # Override for one run
```

Built-in presets bundle an audio mode with matching style, tone, and voice settings — see [Presets](configuration.md#presets).

### Cognitive traits

The rewrite also adapts to your **cognitive traits**. These work with any audio mode:

| Trait | How the audio script changes |
|-------|------------------------------|
| **ADHD** | Leads with a hook. High energy. Mini-takeaway per segment. |
| **Dyslexia** | Short punchy sentences. Key terms repeated naturally. |
| **Autism** | Direct and precise. No idioms or implied meanings. |
| **ESL** | Common vocabulary. Specialized terms explained inline. |
| **Visual thinker** | Spatial language. Word pictures. Narrative structure. |

Traits stack — enable multiple with `tldr preset edit`. Your **tone** setting (casual, professional, academic, eli5) also shapes the script.

This costs one extra API call, which is why it sounds natural instead of robotic.

A bordered **Audio** panel is always visible in the result view, adapting its content based on audio state — showing shortcuts when idle, a spinner during generation or saving, and playback info while playing.

## Listening to a summary

1. Summary appears. A bordered Audio panel shows **`[a] listen · [w] save + audio`**.
2. Press **`a`**. A spinner shows "Generating audio..." then audio plays.
3. Press **`s`** to stop playback.
4. Press **`a`** again. Cached audio replays instantly — no re-generation.

## Saving with audio

**Why save audio?** Listen later — on a commute, at the gym, or to revisit without regenerating.

Press **`w`** instead of Enter. Saves both `summary.md` and `audio.mp3`. Press **Enter** to save the summary only.

After saving, you stay on the result view — you can still copy, chat, re-listen, or re-summarize. The footer shows "Saved" and `[q]` exits with a single tap (no confirmation needed since nothing will be lost).

## Saving chat transcripts

Press **`Ctrl+s`** in chat view to save the conversation as `chat.md` in the session directory. After the first save, every completed assistant message auto-saves the full conversation. If the summary hasn't been saved yet, saving the chat also creates the session directory and saves the summary.

- If you already pressed `a`, the cached audio is reused — no extra API call.
- Audio failures are non-fatal. The summary always saves.

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

You can also change the TTS provider in the preset editor (`tldr preset edit` / `/config`).

### TTS Model

When using OpenAI TTS, you can choose which model to use:

```bash
tldr config set tts-model tts-1-hd
```

| Model | Cost | Notes |
|-------|------|-------|
| tts-1 (default) | ~$0.01/summary | Faster, lower cost |
| tts-1-hd | ~$0.02/summary | Higher audio quality |
| gpt-4o-mini-tts | ~$0.01/summary | Newest, supports instructions |

See [Providers > TTS Model](providers.md#tts-model) for more details.

## Voices

Each TTS provider has its own set of voices.

**Edge TTS voices:**

| Voice | ID | Style |
|-------|----|-------|
| Jenny (default) | `en-US-JennyNeural` | Friendly, warm |
| Guy | `en-US-GuyNeural` | Professional, clear |
| Aria | `en-US-AriaNeural` | Positive, conversational |
| Sonia | `en-GB-SoniaNeural` | Clear, British |
| Natasha | `en-AU-NatashaNeural` | Bright, Australian |

**OpenAI TTS voices:**

| Voice | ID | Style |
|-------|----|-------|
| Alloy (default) | `alloy` | Neutral, balanced |
| Echo | `echo` | Warm, engaging |
| Fable | `fable` | Expressive, British |
| Onyx | `onyx` | Deep, authoritative |
| Nova | `nova` | Friendly, upbeat |
| Shimmer | `shimmer` | Clear, gentle |

```bash
# Set voice via CLI
tldr config set voice en-US-GuyNeural       # edge-tts voice
tldr config set voice nova                   # openai voice
```

When you switch TTS providers, the voice automatically resets to the new provider's default if your current voice doesn't belong to the new provider.

## Speed, Pitch & Volume

```bash
# Set via preset editor
tldr preset edit

# Or via CLI
tldr config set tts-speed 1.25        # 25% faster
tldr config set pitch low             # deeper, warmer voice
tldr config set pitch high            # brighter, more energetic
tldr config set volume loud           # more presence
tldr config set volume quiet          # softer
```

Speed works with both providers. Pitch and volume presets only apply to Edge TTS — they are silently ignored when using OpenAI TTS.

## Session output

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

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `a` | Generate and play audio |
| `s` | Stop audio playback |
| `Enter` | Save summary |
| `w` | Save with audio |
| `q` | Exit (single-tap after save, double-tap to discard unsaved) |
