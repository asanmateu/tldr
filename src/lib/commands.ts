export interface SlashCommand {
  name: string;
  description: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "history", description: "Browse and resume past sessions" },
  { name: "setup", description: "Re-run first-time setup wizard" },
  { name: "config", description: "Edit current preset settings" },
  { name: "theme", description: "Change color theme" },
  { name: "preset", description: "Switch between presets" },
  { name: "help", description: "Show shortcuts and commands" },
  { name: "update", description: "Update to the latest version" },
  { name: "quit", description: "Exit the app" },
];

export function matchCommands(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const query = input.slice(1).toLowerCase();
  // "profile" is a hidden alias for "preset"
  if ("profile".startsWith(query) && query.length > 0) {
    const presetCmd = SLASH_COMMANDS.find((cmd) => cmd.name === "preset");
    if (presetCmd) return [presetCmd];
  }
  return SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(query));
}

export function parseCommand(input: string): { command: string; args: string } | null {
  if (!input.startsWith("/")) return null;
  const trimmed = input.slice(1).trim();
  const spaceIndex = trimmed.indexOf(" ");
  let command: string;
  let args: string;
  if (spaceIndex === -1) {
    command = trimmed;
    args = "";
  } else {
    command = trimmed.slice(0, spaceIndex);
    args = trimmed.slice(spaceIndex + 1).trim();
  }
  // Normalize alias
  if (command === "profile") command = "preset";
  return { command, args };
}
