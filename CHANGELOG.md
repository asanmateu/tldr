# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- MIT license
- `tldr import <file.md>` command to import existing markdown as a session
- Chat mode (`t` key in result view) for multi-turn Q&A about any summary
- `ChatMessage` type and `chat` method on Provider interface
- `chatWithSession` and `buildChatSystemPrompt` helpers
- `importMarkdown` function in core library

### Fixed

- CI audit step failing due to missing `package-lock.json`

### Removed

- Broken Pipeline and Coverage badges pointing to previous remote

## [0.5.0] - 2026-02-14

### Added

- Summarize URLs, PDFs, images, YouTube, Slack threads, Notion pages, arXiv papers, and raw text
- Learning-focused output styles: study-notes, executive, cornell, eli5
- Audio playback via edge-tts
- YouTube, Slack, and Notion extractors
- CI pipeline with GitHub Actions and coverage reporting
- Claude Code CLI as default provider with Opus model
