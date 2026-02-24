# Hero demo for README.md
# Shows the core interactive flow: launch → paste URL → streaming summary →
# keyboard shortcuts → save
#
# Usage: vhs demos/hero.tape
#
# Tuning: The main variable is summarization time. Run once, note how long
# the summary takes, and adjust the Sleep after Enter accordingly.

Output demos/hero.gif

Require tldr

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 800
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 30ms
Set PlaybackSpeed 1

# Launch interactive mode
Type "tldr"
Enter

# Let the banner + prompt fully render
Sleep 3s

# Paste a URL — Anthropic's AI interpretability research
Type "https://www.anthropic.com/research/mapping-mind-language-model"
Sleep 1.5s
Enter

# Extraction phase — spinner + metadata visible
Sleep 4s

# Summarization phase — content streams in
# Adjust this based on your provider (~8–20s with Claude Code, ~5–10s with API)
Sleep 16s

# Let the viewer read the summary, audio panel, chat panel, and footer shortcuts
Sleep 15s

# Copy summary to clipboard
Type "c"
Sleep 2.5s

# Save the summary
Enter
Sleep 2s

# Pause on the "Saved" toast and [Saved] footer
Sleep 10s

# Exit cleanly (single tap since saved)
Type "q"
Sleep 1.5s
