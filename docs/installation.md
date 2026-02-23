# Installation

<img src="../demos/install.gif" alt="tldr installation demo — install and verify" width="800" />

## Prerequisites

tldr works out of the box with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (the default provider). If you have it installed and authenticated, no extra setup is needed.

If you'd rather use a different provider (Anthropic API, Gemini, Ollama, etc.), you can skip Claude Code entirely — see the [Providers guide](providers.md).

## Homebrew (recommended)

```bash
brew install asanmateu/tldr/tldr-cli
```

## Standalone binary

Download from [GitHub Releases](https://github.com/asanmateu/tldr/releases). Pick your platform:

```bash
# macOS Apple Silicon
curl -fsSL https://github.com/asanmateu/tldr/releases/latest/download/tldr-darwin-arm64.tar.gz | tar xz && mv tldr-darwin-arm64 /usr/local/bin/tldr

# macOS Intel
curl -fsSL https://github.com/asanmateu/tldr/releases/latest/download/tldr-darwin-x64.tar.gz | tar xz && mv tldr-darwin-x64 /usr/local/bin/tldr

# Linux x64
curl -fsSL https://github.com/asanmateu/tldr/releases/latest/download/tldr-linux-x64.tar.gz | tar xz && mv tldr-linux-x64 /usr/local/bin/tldr

# Linux ARM64
curl -fsSL https://github.com/asanmateu/tldr/releases/latest/download/tldr-linux-arm64.tar.gz | tar xz && mv tldr-linux-arm64 /usr/local/bin/tldr
```

## Build from source

Requires [Bun](https://bun.sh) (v1.0+).

```bash
git clone https://github.com/asanmateu/tldr.git
cd tldr
bun install
bun link
```

This registers `tldr` as a global command via Bun's linker. To update later, `git pull && bun install`.

## Verify installation

```bash
tldr --version
```

---

[Back to README](../README.md)
