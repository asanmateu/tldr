# Providers

tldr supports two summarization providers.

## Comparison

| | CLI Provider (default) | API Provider |
|---|---|---|
| **Cost** | $0 (included in subscription) | ~$0.005/summary |
| **Speed** | ~5s | ~2s |
| **Requires** | Claude Code installed + subscription | `ANTHROPIC_API_KEY` |
| **How it works** | Shells out to `claude -p` | Calls Anthropic API directly |
| **Streaming** | Yes | Yes |

## CLI Provider (Default)

tldr uses Claude Code by default. If you have it installed and authenticated, no setup is needed:

```bash
tldr "https://example.com/article"
```

If Claude Code is not installed, tldr shows setup instructions on first run. If an API key is available, it falls back to the API provider automatically.

### Installing Claude Code

```bash
npm install -g @anthropic-ai/claude-code
claude    # Authenticate
```

## API Provider

```bash
# Set your API key (one of these methods)
export ANTHROPIC_API_KEY=sk-ant-...        # Environment variable
tldr config set apiKey sk-ant-...          # Save to config file

# Switch to API provider
tldr config set provider api
```

## Switching Providers

```bash
# Permanently switch (saved to active profile)
tldr config set provider api
tldr config set provider cli

# One-time override
tldr --provider api "https://example.com/article"
tldr --provider cli "https://example.com/article"
```

## Provider for TTS Rewrite

When TTS mode is set to `rewrite`, the same provider is used to rewrite the summary as an audio script.
