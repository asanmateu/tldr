# Accessibility

tldr is designed with cognitive accessibility as a core feature, not an afterthought. Every summary is learning-focused by default.

## Learning-First Approach

All summaries are generated with a learning-focused system prompt. The goal is to help you **understand and retain** the material — not just skim it. The AI explains concepts clearly, connects ideas, and surfaces the "why" behind facts.

## Base Formatting

Every summary, regardless of trait settings, follows these rules:

- Bullet points over paragraphs
- Bold key terms
- Sentences under 20 words
- Most important information first
- Tables for comparisons, numbered lists for steps

## Cognitive Traits

Optional traits customize output for specific needs. Dyslexia is enabled by default. Manage traits via `tldr profile edit`.

| Trait | What It Does | Example Adjustment |
|-------|-------------|-------------------|
| **Dyslexia** (default) | Shorter sentences, simpler vocabulary | Max 20 words per sentence, bold key terms |
| **ADHD** | No filler, action-oriented takeaways | Most important info first, no hedging |
| **Autism** | Literal language, explicit structure | No idioms or sarcasm, flag ambiguity |
| **ESL** | Common words only, jargon defined inline | Common 3000 words, no phrasal verbs |
| **Visual thinker** | Hierarchical layout, numbered steps | Group related ideas with headers |

Traits stack — you can enable multiple traits at once. Their rules are combined in the system prompt.

## Tone Options

| Tone | Description |
|------|-------------|
| **casual** (default) | Conversational, like explaining to a colleague |
| **professional** | Clear and formal, precise and direct |
| **academic** | Analytical, references key concepts and terminology |
| **eli5** | Simple analogies, no jargon, fun and accessible |

## Summary Styles

| Style | Best For | Sections |
|-------|----------|----------|
| **quick** | Fast overview | TL;DR, Key Points, Why It Matters, Action Items |
| **detailed** | Deep understanding | TL;DR, Context, Key Points, Analogy, Notable Details, Action Items |
| **study-notes** (default) | Learning & review | TL;DR, Core Concepts, How They Connect, Key Facts, Visual Map, Review Questions |

All styles default to Opus. You can configure a different model per style — see [Configuration](configuration.md#per-style-model-configuration).

Override the style for a single run:

```bash
tldr --style quick "https://example.com/article"
```
