import { execSync } from "node:child_process";

type SupportedPlatform = "darwin" | "linux" | "win32";

function getPlatform(): SupportedPlatform | undefined {
  const p = process.platform;
  if (p === "darwin" || p === "linux" || p === "win32") return p;
  return undefined;
}

const WRITE_COMMANDS: Record<SupportedPlatform, string> = {
  darwin: "pbcopy",
  linux: "xclip -selection clipboard",
  win32: "clip",
};

export function writeClipboard(text: string): boolean {
  const platform = getPlatform();
  if (!platform) return false;

  try {
    execSync(WRITE_COMMANDS[platform], { input: text, encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}
