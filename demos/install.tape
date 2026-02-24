# Installation verification demo for docs/installation.md
# Shows: version check → launch interactive mode → slash menu → /help →
# read all shortcuts → close
#
# Usage: vhs demos/install.tape

Output demos/install.gif

Require tldr

Set Shell "bash"
Set FontSize 13
Set Width 1400
Set Height 800
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 30ms
Set PlaybackSpeed 1

# Verify installation
Type "tldr --version"
Enter
Sleep 2.5s

# Launch interactive mode
Type "tldr"
Enter

# Let the banner + prompt fully render
Sleep 3s

# Open the slash command menu
Type "/"

# Let the full menu render so the viewer can read all commands
Sleep 4s

# Type "help" to filter
Type "help"
Sleep 1.5s

# Tab + Enter to open help
Tab
Sleep 0.5s
Enter

# Help screen visible — let the viewer read all sections
Sleep 8s

# Close help
Enter
Sleep 2s

# Exit
Type "q"
Sleep 1.5s
