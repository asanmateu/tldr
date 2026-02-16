# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

**Do not open a public issue.** Instead, use GitHub's built-in [private vulnerability reporting](https://github.com/asanmateu/tldr/security/advisories/new).

Include:
- A description of the vulnerability
- Steps to reproduce
- Any relevant logs or screenshots

You should receive a response within 72 hours. If confirmed, a fix will be prioritized and you will be credited in the release notes (unless you prefer to remain anonymous).

## Scope

This project runs locally on the user's machine. The main security concerns are:

- **API key handling** — keys are stored in `~/.tldr/settings.json` and should never be logged or transmitted beyond the configured provider
- **Input handling** — URLs and text are passed to extractors and LLM providers; injection or SSRF vectors should be reported
- **Dependencies** — vulnerabilities in upstream packages that affect this project's functionality
