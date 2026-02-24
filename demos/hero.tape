# Hero demo for README.md
# Shows the two main value props: summarize anything + listen to it
# Flow: launch → paste URL → streaming summary → audio → copy → save → exit
#
# Usage: vhs demos/hero.tape
#
# Tuning: The main variables are summarization time and audio generation time.
# Run once, note how long each phase takes, and adjust Sleeps accordingly.

Output demos/hero.gif

Require tldr

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 800
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 120ms
Set PlaybackSpeed 1

# Launch interactive mode
Type "tldr"
Sleep 400ms
Enter

# Let the banner + prompt fully render
Sleep 4s

# Paste a URL — typed in segments for a natural feel
Type "https://www"
Sleep 200ms
Type ".anthropic.com"
Sleep 300ms
Type "/research"
Sleep 200ms
Type "/mapping-mind-language-model"
Sleep 2s
Enter

# Extraction phase — spinner + metadata visible
Sleep 5s

# Summarization phase — content streams in
# Adjust based on your provider (~8–20s with Claude Code, ~5–10s with API)
Sleep 18s

# Let the viewer read the summary and notice the footer shortcuts
Sleep 20s

# Generate and play audio — the standout feature
Type "a"

# "Generating audio..." spinner visible
Sleep 8s

# Audio is now playing — ♪ Playing indicator and [s] stop visible
# Let the viewer see this state
Sleep 8s

# Stop playback
Type "s"
Sleep 3s

# Copy summary to clipboard
Type "c"
Sleep 4s

# Save with audio — writes summary.md + audio.mp3
Type "w"
Sleep 6s

# Pause on the "Saved with audio" toast
Sleep 10s

# Exit cleanly
Type "q"
Sleep 2s
