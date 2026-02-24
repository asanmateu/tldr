# Configuration demo for docs/configuration.md
# Shows: launch → / slash menu (pause to read all commands) → /config →
# browse settings → change tone → change style → change theme → exit
#
# Usage: vhs demos/config.tape

Output demos/config.gif

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

# Type "/" to open slash command menu
Type "/"

# Let the full menu render — all commands visible
Sleep 3.5s

# Type "config" to filter
Type "config"
Sleep 1.5s

# Tab to autocomplete
Tab
Sleep 0.5s

# Enter to open the preset editor
Enter

# Preset editor opens — let the viewer read the full settings list
Sleep 5s

# Navigate down to Tone (past Cognitive traits)
Down
Sleep 600ms
Down
Sleep 600ms

# Select Tone to open its options
Enter
Sleep 2s

# Let the viewer see the tone options (casual, professional, academic, eli5)
Sleep 2.5s

# Navigate to 'professional'
Down
Sleep 600ms

# Confirm selection
Enter
Sleep 2s

# Navigate to Summary Style
Down
Sleep 600ms

# Select it
Enter
Sleep 2s

# Let the viewer see the style options
Sleep 2.5s

# Navigate to 'study-notes' (fourth option)
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms

# Confirm
Enter
Sleep 2s

# Skip down to Theme — navigate through the remaining fields
# (AI Provider, Model, Custom instructions, Audio mode, TTS Provider,
# Voice, Speed, Pitch, Volume)
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms
Down
Sleep 500ms

# Select Theme
Enter
Sleep 2s

# Let the viewer see the theme options (coral, ocean, forest)
Sleep 2.5s

# Navigate to 'ocean'
Down
Sleep 600ms

# Confirm — the UI should repaint in ocean colors
Enter
Sleep 3s

# Let the viewer see the new theme applied
Sleep 4s

# Exit config editor
Escape
Sleep 2s

# Exit tldr
Type "q"
Sleep 1.5s
