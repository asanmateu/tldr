# Audio demo for docs/audio.md
# Shows: interactive summarize → audio panel idle → generate → play → stop →
# save with audio
#
# Usage: vhs demos/audio.tape
#
# Tuning: Audio generation is the main variable (~5–12s for Edge TTS).

Output demos/audio.gif

Require tldr

Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 800
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 30ms
Set PlaybackSpeed 1

# Start interactive mode
Type "tldr"
Enter
Sleep 3s

# Paste a URL — DeepMind's AlphaFold breakthrough in protein structure prediction
Type "https://deepmind.google/discover/blog/alphafold-a-solution-to-a-50-year-old-grand-challenge-in-biology/"
Sleep 1.5s
Enter

# Extraction + summarization
Sleep 20s

# Let the viewer see the full result view with Audio panel in idle state
# The panel shows: [a] listen · [w] save + audio
Sleep 5s

# Press 'a' to generate and play audio
Type "a"

# "Generating audio..." spinner is visible
Sleep 6s

# Audio is now playing — ♪ Playing (Jenny Neural, 1.0x) and [s] stop
# Let the viewer see this state
Sleep 5s

# Stop playback
Type "s"
Sleep 2s

# Save with audio — writes summary.md + audio.mp3
Type "w"

# "Saving with audio..." spinner visible
Sleep 5s

# Pause on "Saved with audio to ..." toast
Sleep 4s

# Exit cleanly (single tap since saved)
Type "q"
Sleep 1.5s
