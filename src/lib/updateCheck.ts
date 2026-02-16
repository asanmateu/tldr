import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureConfigDir, getConfigDir } from "./config.js";

export interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion: string;
  currentVersion: string;
  updateCommand: string;
}

interface UpdateCache {
  latestVersion: string;
  checkedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const GITHUB_RELEASES_URL = "https://api.github.com/repos/asanmateu/tldr/releases/latest";
const RELEASES_PAGE_URL = "https://github.com/asanmateu/tldr/releases";

export function compareSemver(a: string, b: string): number {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

export function isHomebrew(): boolean {
  const execPath = process.execPath.toLowerCase();
  return execPath.includes("/cellar/") || execPath.includes("/homebrew/");
}

export function getUpdateCommand(): string {
  return isHomebrew() ? "brew upgrade tldr-cli" : RELEASES_PAGE_URL;
}

function getCacheFile(): string {
  return join(getConfigDir(), "update-check.json");
}

export async function readCache(): Promise<UpdateCache | null> {
  try {
    const raw = await readFile(getCacheFile(), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.latestVersion === "string" && typeof parsed.checkedAt === "number") {
      return parsed as UpdateCache;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeCache(cache: UpdateCache): Promise<void> {
  try {
    await ensureConfigDir();
    await writeFile(getCacheFile(), JSON.stringify(cache), "utf-8");
  } catch {
    // Fail silently
  }
}

export async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { tag_name?: string };
    if (typeof data.tag_name !== "string") return null;
    return data.tag_name.replace(/^v/, "");
  } catch {
    return null;
  }
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult | null> {
  try {
    const cache = await readCache();
    let latestVersion: string | null = null;

    if (cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
      latestVersion = cache.latestVersion;
    } else {
      latestVersion = await fetchLatestVersion();
      if (latestVersion) {
        await writeCache({ latestVersion, checkedAt: Date.now() });
      }
    }

    if (!latestVersion) return null;
    if (compareSemver(latestVersion, currentVersion) <= 0) return null;

    return {
      updateAvailable: true,
      latestVersion,
      currentVersion,
      updateCommand: getUpdateCommand(),
    };
  } catch {
    return null;
  }
}
