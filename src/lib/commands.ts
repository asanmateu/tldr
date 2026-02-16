export interface SlashCommand {
  name: string;
  description: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: "setup", description: "Re-run first-time setup wizard" },
  { name: "config", description: "Edit current profile settings" },
  { name: "theme", description: "Change color theme" },
  { name: "help", description: "Show shortcuts and commands" },
  { name: "quit", description: "Exit the app" },
];

export function matchCommands(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const query = input.slice(1).toLowerCase();
  return SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(query));
}

export function parseCommand(input: string): { command: string; args: string } | null {
  if (!input.startsWith("/")) return null;
  const trimmed = input.slice(1).trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { command: trimmed, args: "" };
  }
  return {
    command: trimmed.slice(0, spaceIndex),
    args: trimmed.slice(spaceIndex + 1).trim(),
  };
}
