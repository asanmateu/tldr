# Contributing

Thanks for your interest in tldr — a summarisation tool optimised for neurodiversity.

The core functionality is in a decent place. What matters now is making it genuinely better for the people it's built for. That means trimming what doesn't earn its place, improving what goes into the pipeline, and testing with real workflows.

## Getting started

Requires [Bun](https://bun.sh) (v1.0+).

```bash
git clone https://github.com/asanmateu/tldr.git
cd tldr
bun install
```

```bash
bun run dev              # Run in development mode
bun run test             # Run tests
bun run typecheck        # Type-check without emitting
bun run check            # Lint + format check
bun link                 # Register as `tldr` command locally
```

## Where to focus

### 1. Trim what's not useful

tldr has accumulated features — summary styles, tones, cognitive traits, TTS options, provider choices. Not everything pulls its weight.

If something feels redundant, confusing, or doesn't make a summary easier to absorb, that's worth raising. The bar isn't "does it work" — it's "does it help someone understand the material faster."

Examples of useful observations:

- "The `cornell` style never produces anything I'd actually review later"
- "The difference between `casual` and `eli5` isn't clear enough to justify both"
- "I never change this setting — the default is always fine"

Removing or consolidating features is just as valuable as adding them.

### 2. Improve source extraction

The pipeline is only as good as what goes in. tldr extracts from URLs, PDFs, images, YouTube, Slack, Notion, and arXiv — but there's room to go deeper.

Questions worth exploring:

- **Missing sources** — What formats do people actually need? Podcasts, email threads, epub, local markdown wikis?
- **Lost context** — Where does extraction drop important structure? Tables in PDFs, code blocks, thread hierarchy, image captions.
- **Smarter pre-processing** — Are there better ways to chunk, clean, or prioritise content before it hits the summariser?

This is the most technical area. If you're interested, open an issue describing what you'd like to improve — we'll discuss approach before code.

### 3. Test with real neurodiverse workflows

Unit tests catch regressions. They don't catch "this summary didn't actually help me understand the paper." The most valuable feedback comes from people using tldr in their daily workflow.

If you have ADHD, dyslexia, or another cognitive profile tldr aims to support, your experience using the tool is a contribution in itself. Tell us:

- Did the summary help you grasp the material, or did you still need to read the original?
- Was the audio rewrite natural to listen to, or did it feel robotic or meandering?
- Did the cognitive trait settings (`traits`) actually change the output in a way that matched your needs?

Open an issue with what you ran, what happened, and whether it was useful. Screenshots or copied output help.

## Code contributions

Open an issue first to discuss the change. This keeps effort focused and avoids duplicate work. Bug fixes and extraction improvements are always welcome — but check that the change serves the core goal: making content easier to understand.
