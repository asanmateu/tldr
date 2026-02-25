# Use Cases

tldr is built to be flexible. The combination of summary styles, tones, cognitive traits, audio modes, presets, and batch processing means you can shape it to fit very different workflows. Here are some ideas, from the simplest to the most involved.

## Quick triage

You have a link someone shared and you want the gist before deciding whether to read it.

```bash
tldr "https://example.com/article"
```

That's it. Default settings give you a structured summary with key points, why it matters, and action items. Press `q` to discard or `Enter` to save.

For an even shorter output:

```bash
tldr --style quick "https://example.com/article"
```

## Explain it like I'm five

A colleague sent a dense technical paper and you want the core idea without the jargon.

```bash
tldr --tone eli5 ./whitepaper.pdf
```

Combine with `--style detailed` to get a full breakdown in plain language, complete with an analogy section:

```bash
tldr --style detailed --tone eli5 ./whitepaper.pdf
```

## Morning news briefing

Batch-process a handful of news articles with audio so you can listen while making coffee.

```bash
tldr --batch --audio \
  --preset morning-brief \
  "https://arstechnica.com/article-1" \
  "https://bbc.co.uk/news/article-2" \
  "https://theverge.com/article-3"
```

The `morning-brief` preset uses the **briefing** audio mode (analyst persona with numbered facts), **quick** style, **professional** tone, and a slightly faster speed (1.15x). Each summary and its audio are saved to `~/Documents/tldr/`.

Want to browse the results interactively after the batch finishes? Add `--browse`:

```bash
tldr --batch --audio --browse \
  --preset morning-brief \
  "https://..." "https://..." "https://..."
```

## Commute listening

Summarize a few articles before your commute, save the audio files, then transfer them to your phone or queue them in a podcast app.

```bash
tldr --batch --audio \
  --preset commute-catch-up \
  "https://..." "https://..." "https://..."
```

The `commute-catch-up` preset uses the **podcast** audio mode — conversational host with hooks and transitions. Audio files are saved as `audio.mp3` alongside each summary in `~/Documents/tldr/`.

If you want them in a specific folder:

```bash
tldr --batch --audio \
  --preset commute-catch-up \
  --output ~/Music/tldr-commute \
  "https://..." "https://..."
```

## Study sessions

Working through a textbook chapter, lecture recording, or research paper? The `deep-study` preset is designed for this.

```bash
tldr --preset deep-study ./chapter-5.pdf
```

This uses **study-notes** style (core concepts, how they connect, key facts, visual map, review questions), **lecture** audio mode (patient teacher building understanding progressively), **academic** tone, and a slower speed (0.9x). Press `a` to listen to the audio explanation, then `t` to chat about anything you didn't follow.

For exam prep specifically, the `exam-prep` preset uses the **study-buddy** audio mode, which includes quizzes and mnemonics:

```bash
tldr --preset exam-prep ./lecture-notes.pdf
```

## Bedtime wind-down

You want to catch up on a long-read but it's late and you'd rather listen than stare at a screen.

```bash
tldr --preset bedtime-read "https://example.com/long-read"
```

The `bedtime-read` preset uses the **calm** audio mode (gentle, soothing narrator), a British voice (Sonia), and a slower pace (0.85x). Press `w` to save with audio, then play the MP3 from bed.

## YouTube video summaries

Skip the 45-minute video. Get the key points in a minute.

```bash
tldr "https://www.youtube.com/watch?v=..."
```

tldr extracts the transcript and summarizes it. Works with any summary style — `study-notes` is particularly useful for educational videos:

```bash
tldr --style study-notes "https://www.youtube.com/watch?v=..."
```

Press `a` to hear it as a lecture or podcast instead of watching the original.

## Team knowledge sharing

Batch-summarize a set of articles for your team and collect the markdown output.

```bash
tldr --batch \
  --style standard \
  --tone professional \
  "https://..." "https://..." "https://..."
```

Batch mode prints summaries to stdout, so you can also pipe the output:

```bash
tldr --batch "https://..." "https://..." > team-digest.md
```

Each summary is also saved to the session directory and appears in `/history`.

## Research reading list

Working through a stack of arXiv papers? Use `detailed` style to get context, notable details, and analogies:

```bash
tldr --batch \
  --style detailed \
  --tone academic \
  "https://arxiv.org/abs/2401.00001" \
  "https://arxiv.org/abs/2401.00002" \
  "./downloaded-paper.pdf"
```

Add `--browse` to review each result interactively after the batch completes, chatting with the AI about individual papers.

## Daily automated digest

Combine `--batch` with a cron job to get a daily audio news digest without lifting a finger.

Create a script:

```bash
#!/bin/bash
# ~/scripts/daily-digest.sh

tldr --batch --audio \
  --preset morning-brief \
  --output ~/Documents/tldr/daily-digest \
  "https://news-site.com/feed-page-1" \
  "https://news-site.com/feed-page-2" \
  "https://blog.example.com/latest"
```

Schedule it with cron:

```bash
# Run at 6:30 AM every weekday
30 6 * * 1-5 ~/scripts/daily-digest.sh
```

When you wake up, the summaries and audio files are waiting in `~/Documents/tldr/daily-digest/`.

## Fully local and private

If you don't want any data leaving your machine, use Ollama:

```bash
# One-time setup
ollama pull llama3.3
tldr config set provider ollama
tldr config set model llama3.3
```

All summarization happens locally. Audio uses Edge TTS by default (which does send text to Microsoft's servers). For a fully offline setup, you'd skip audio or rely on macOS `say` as a fallback.

## Custom presets for different contexts

Create presets for the different hats you wear:

```bash
# Work: professional, quick, briefing audio
tldr preset create work
tldr preset edit work
# Set: style=quick, tone=professional, audio-mode=briefing

# Personal: casual, standard, podcast audio
tldr preset create personal
tldr preset edit personal
# Set: style=standard, tone=casual, audio-mode=podcast

# Learning: academic, study-notes, lecture audio
tldr preset create learning
tldr preset edit learning
# Set: style=study-notes, tone=academic, audio-mode=lecture
```

Switch between them:

```bash
tldr preset use work
tldr "https://..."

# Or override for a single run
tldr --preset learning "https://..."
```

In interactive mode, type `/preset` to switch without leaving the app.

## Accessibility-tuned workflows

Stack cognitive traits to shape summaries for your needs:

```bash
# ADHD + ESL: action-oriented, no filler, common vocabulary
tldr config set traits adhd,esl

# Visual thinker + Dyslexia: hierarchical layout, short sentences, bold terms
tldr config set traits visual-thinker,dyslexia
```

Traits affect both the written summary and the audio script. Pair them with a matching tone — `eli5` for maximum simplicity, `academic` for structured terminology.

## Slack and Notion catch-up

Behind on a long Slack thread or Notion page? Just paste the URL:

```bash
tldr "https://your-team.slack.com/archives/C.../p..."
tldr "https://www.notion.so/your-page-id"
```

Use `--style quick` for a fast overview, or the full `standard` style to understand the discussion before jumping in.

## Voice tuning

Fine-tune the listening experience for your preferences:

```bash
# Deeper, warmer voice at a comfortable pace
tldr config set voice en-US-GuyNeural
tldr config set pitch low
tldr config set tts-speed 0.9

# Brighter, energetic voice for morning briefings
tldr config set voice en-US-AriaNeural
tldr config set pitch high
tldr config set tts-speed 1.2
tldr config set volume loud
```

For higher quality audio, switch to OpenAI TTS:

```bash
tldr config set tts-provider openai
tldr config set voice nova          # friendly, upbeat
tldr config set tts-speed 1.1
```

## Custom instructions

Add a persistent instruction that applies to every summary:

```bash
# Always include code examples when relevant
tldr config set custom-instructions "Include code snippets and examples where applicable"

# Focus on business impact
tldr config set custom-instructions "Emphasize business implications and ROI"

# Tailor for a specific domain
tldr config set custom-instructions "I work in genomics — relate concepts to molecular biology when possible"
```

Custom instructions work alongside your chosen style, tone, and traits.
