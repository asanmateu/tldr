# Providers

tldr supports seven summarization providers.

## Comparison

| | Claude Code (default) | Anthropic API | OpenAI-compatible | Gemini | Codex CLI | Ollama | xAI / Grok |
|---|---|---|---|---|---|---|---|
| **Cost** | $0 (subscription) | ~$0.005/summary | Varies | Varies | Subscription | FREE (local) | Varies |
| **Speed** | ~5s | ~2s | Varies | ~2s | ~5s | Varies | ~2s |
| **Requires** | Claude Code + sub | `ANTHROPIC_API_KEY` | `OPENAI_API_KEY` | `GEMINI_API_KEY` | Codex CLI installed | Ollama running | `XAI_API_KEY` |
| **How it works** | Shells out to `claude -p` | Anthropic API | OpenAI-compatible API | Google GenAI SDK | Shells out to `codex` | Local REST API | OpenAI-compatible API |
| **Streaming** | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

## Claude Code Provider (Default)

tldr uses Claude Code by default. If you have it installed and authenticated, no setup is needed:

```bash
tldr "https://example.com/article"
```

If Claude Code is not installed, tldr shows setup instructions on first run. If an API key is available, it falls back to the Anthropic API provider automatically.

### Installing Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude    # Authenticate
```

## Anthropic API Provider

```bash
# Set your API key (one of these methods)
export ANTHROPIC_API_KEY=sk-ant-...        # Environment variable
tldr config set apiKey sk-ant-...          # Save to config file

# Switch to Anthropic API provider
tldr config set provider anthropic
```

## OpenAI-compatible Provider

Works with any endpoint that implements the OpenAI chat completions API: OpenAI, Groq, Together, Fireworks, and more.

```bash
# Set provider and API key
tldr config set provider openai
tldr config set apiKey sk-...

# Or use environment variables
export OPENAI_API_KEY=sk-...
export OPENAI_BASE_URL=https://api.openai.com/v1   # optional, defaults to OpenAI
```

Set a model that your provider supports:

```bash
tldr config set model gpt-4o
```

### Provider examples

| Provider | Base URL | Example model |
|----------|----------|---------------|
| OpenAI | (default) | `gpt-4o` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| Fireworks | `https://api.fireworks.ai/inference/v1` | `accounts/fireworks/models/llama-v3p3-70b-instruct` |

## Gemini Provider

Uses the Google Gemini API via the `@google/genai` SDK.

```bash
# Set your API key
export GEMINI_API_KEY=...
# Or save to config
tldr config set apiKey ...

# Switch to Gemini
tldr config set provider gemini
tldr config set model gemini-2.0-flash
```

### Gemini models

| Model | Notes |
|-------|-------|
| `gemini-2.0-flash` | Fast, good for quick summaries |
| `gemini-2.5-pro` | Most capable, best for detailed analysis |
| `gemini-2.5-flash` | Balanced speed and quality |

## Codex CLI Provider

Shells out to OpenAI's Codex CLI, similar to how `claude-code` shells out to Claude.

```bash
# Install Codex CLI
npm install -g @openai/codex

# Switch to Codex
tldr config set provider codex
tldr config set model o4-mini
```

Codex CLI must be installed and authenticated. If not found, tldr shows an install hint.

## Ollama Provider (Native)

Talks directly to Ollama's REST API — no extra dependency needed. Ollama must be running locally.

```bash
# Start Ollama
ollama serve

# Pull a model
ollama pull llama3.3

# Switch to Ollama
tldr config set provider ollama
tldr config set model llama3.3
```

By default, tldr connects to `http://localhost:11434`. Override with:

```bash
export OLLAMA_BASE_URL=http://my-server:11434
```

No API key needed — Ollama runs locally.

### Ollama models

| Model | Notes |
|-------|-------|
| `llama3.3` | Meta's latest, good all-around |
| `mistral` | Fast, good for quick summaries |
| `gemma2` | Google's open model |
| `qwen2.5` | Strong multilingual support |

## xAI / Grok Provider

Uses xAI's OpenAI-compatible API at `https://api.x.ai/v1`.

```bash
# Set your API key
export XAI_API_KEY=...
# Or save to config
tldr config set apiKey ...

# Switch to xAI
tldr config set provider xai
tldr config set model grok-3-mini-fast
```

### xAI models

| Model | Notes |
|-------|-------|
| `grok-3` | Most capable |
| `grok-3-mini` | Balanced speed and quality |
| `grok-3-mini-fast` | Fastest |

## Model Selection in the Interactive Editor

The profile editor (`tldr profile edit` / `/config`) uses a free-text input for the model field. Enter any model ID your provider supports — the value is passed through as-is. Anthropic aliases (`haiku`, `sonnet`, `opus`) are resolved automatically.

## Switching Providers

```bash
# Permanently switch (saved to active profile)
tldr config set provider anthropic
tldr config set provider claude-code
tldr config set provider codex
tldr config set provider gemini
tldr config set provider ollama
tldr config set provider openai
tldr config set provider xai

# One-time override
tldr --provider anthropic "https://example.com/article"
tldr --provider gemini "https://example.com/article"
tldr --provider ollama "https://example.com/article"
```

## Provider for Audio

The same provider is used to rewrite summaries as audio scripts when you press `a` in the result view.
