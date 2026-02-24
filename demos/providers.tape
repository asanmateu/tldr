# Providers demo for docs/providers.md
# Shows: launch → /setup wizard → pick a provider → see provider options →
# exit setup → summarize with the selected provider
#
# Usage: vhs demos/providers.tape
#
# Note: This shows the interactive setup wizard (which includes provider selection),
# then does a real summarization to prove it works.

Output demos/providers.gif

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

# Open slash command menu
Type "/"

# Let the viewer read all available commands
Sleep 3.5s

# Type "setup" to filter to /setup
Type "setup"
Sleep 1.5s

# Tab to autocomplete, Enter to run
Tab
Sleep 0.5s
Enter

# Setup wizard opens — shows provider selection
# Let the viewer read the provider list
Sleep 4s

# Navigate through providers so the viewer can see options
Down
Sleep 800ms
Down
Sleep 800ms
Down
Sleep 800ms

# Pause to let viewer read the provider descriptions
Sleep 3s

# Go back up to select the first provider
Up
Sleep 600ms
Up
Sleep 600ms
Up
Sleep 600ms

# Confirm provider selection
Enter
Sleep 3s

# Setup continues — model selection or other steps
# Let the viewer read each step
Sleep 3s

# Navigate and confirm remaining setup steps
# (These depend on which provider you selected — adjust as needed)
Enter
Sleep 2.5s
Enter
Sleep 2.5s
Enter
Sleep 2.5s

# Setup complete — back at idle prompt
Sleep 3s

# Now summarize something to show the provider in action
Type "https://www.anthropic.com/research/mapping-mind-language-model"
Sleep 1.5s
Enter

# Extraction + summarization with the new provider
Sleep 18s

# Let the viewer read the summary
Sleep 5s

# Save and exit
Enter
Sleep 2s
Type "q"
Sleep 1.5s
