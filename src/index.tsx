#!/usr/bin/env bun
import { render } from "ink";
import { App } from "./App.js";
import {
  createProfile,
  deleteProfile,
  listProfiles,
  loadConfig,
  loadSettings,
  setActiveProfile,
} from "./lib/config.js";
import { ConfigSetError, applyConfigSet } from "./lib/configSetter.js";
import * as fmt from "./lib/fmt.js";
import { importMarkdown } from "./lib/import.js";
import { resolveTheme } from "./lib/theme.js";
import type { ConfigOverrides } from "./lib/types.js";

const args = process.argv.slice(2);

function getFlag(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

// Load theme for CLI output (non-interactive commands)
{
  const settings = await loadSettings();
  fmt.initTheme(resolveTheme(settings.theme));
}

if (args.includes("--version") || args.includes("-v")) {
  const { version } = await import("../package.json");
  console.log(version);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  ${fmt.brand("tldr")} — Summarize anything, fast.

  ${fmt.label("Usage:")}
    tldr <url|file|text>              Summarize with active profile
    tldr --style quick <url>          Override style for this run
    tldr --model sonnet <url>         Override model for this run
    tldr --profile work <url>         Use specific profile for this run
    tldr --provider openai <url>      Use OpenAI-compatible endpoint
    tldr --provider gemini <url>      Use Google Gemini API
    tldr --provider ollama <url>      Use local Ollama instance
    tldr --provider xai <url>         Use xAI / Grok API
    tldr --provider codex <url>       Use OpenAI Codex CLI
    tldr                              Interactive mode

  ${fmt.label("Configuration:")}
    tldr config                       Show current resolved config
    tldr config set <key> <value>     Set a setting
    tldr config set provider <provider>   Set provider (anthropic/claude-code/codex/gemini/ollama/openai/xai)
    tldr config set model <tier|id>        Set model (haiku/sonnet/opus or full ID)
    tldr config set tone <tone>            Set tone (casual/professional/academic/eli5)
    tldr config set style <style>          Set summary style (quick/standard/detailed/study-notes)
    tldr config set voice <voice>          Set TTS voice (e.g. en-US-JennyNeural)
    tldr config set tts-speed <number>     Set TTS speed (e.g. 1.0, 1.25)
    tldr config set traits <list>          Set cognitive traits (comma-separated)
    tldr config set custom-instructions <text>  Set custom instructions
    tldr config set output-dir <path>      Set session output directory
    tldr config set theme <name>           Set color theme (coral/ocean/forest)
    tldr config set appearance <mode>      Set appearance (auto/dark/light)
    tldr config setup                 Re-run first-time setup flow

  ${fmt.label("Import:")}
    tldr import <file.md>             Import existing markdown as a session

  ${fmt.label("Profiles:")}
    tldr profile list                 List profiles (* marks active)
    tldr profile create <name>        Create a new profile
    tldr profile delete <name>        Delete a profile
    tldr profile use <name>           Set active profile
    tldr profile edit [name]          Edit profile settings

  ${fmt.label("Keyboard shortcuts (result view):")}
    Enter   New summary
    c       Copy summary to clipboard
    a       Play audio (TTS)
    s       Stop audio
    t       Chat about this summary
    r       Re-summarize
    q       Quit

  ${fmt.label("Environment variables:")}
    OPENAI_API_KEY            API key for OpenAI-compatible providers
    OPENAI_BASE_URL           Custom base URL for OpenAI-compatible providers
    GEMINI_API_KEY            API key for Google Gemini
    XAI_API_KEY               API key for xAI / Grok
    XAI_BASE_URL              Custom base URL for xAI
    OLLAMA_BASE_URL           Ollama server URL (default: http://localhost:11434)
    SLACK_TOKEN               Slack Bot/User token for thread extraction
    NOTION_TOKEN              Notion integration token for page extraction

  ${fmt.label("Costs:")}
    Audio (TTS)              FREE    (edge-tts, no API key needed)
    Summaries (claude-code)  Included with Claude Code subscription
    Summaries (anthropic)    ~$0.005/summary (needs ANTHROPIC_API_KEY)
    Summaries (openai)       Varies by provider (needs OPENAI_API_KEY)
    Summaries (gemini)       Varies by model (needs GEMINI_API_KEY)
    Summaries (codex)        Requires OpenAI Codex CLI subscription
    Summaries (ollama)       FREE    (local models, no API key)
    Summaries (xai)          Varies by model (needs XAI_API_KEY)
`);
  process.exit(0);
}

async function handleConfig() {
  const sub = args[1];

  if (!sub || sub === "show") {
    const config = await loadConfig();
    const settings = await loadSettings();
    console.log(`\n${fmt.brand("  Resolved Configuration")}\n`);
    console.log(
      `  ${fmt.label("Theme:")}       ${settings.theme?.name ?? "coral"} / ${settings.theme?.appearance ?? "auto"}`,
    );
    console.log(`  ${fmt.label("Profile:")}     ${config.profileName}`);
    console.log(`  ${fmt.label("Provider:")}    ${config.provider}`);
    console.log(
      `  ${fmt.label("API Key:")}     ${config.apiKey ? `${config.apiKey.slice(0, 12)}...` : fmt.warn("not set")}`,
    );
    if (config.baseUrl) console.log(`  ${fmt.label("Base URL:")}    ${config.baseUrl}`);
    console.log(`  ${fmt.label("Model:")}       ${config.model}`);
    console.log(`  ${fmt.label("Max Tokens:")}  ${config.maxTokens}`);
    console.log(
      `  ${fmt.label("Traits:")}      ${config.cognitiveTraits.length > 0 ? config.cognitiveTraits.join(", ") : "none"}`,
    );
    console.log(`  ${fmt.label("Tone:")}        ${config.tone}`);
    console.log(`  ${fmt.label("Style:")}       ${config.summaryStyle}`);
    console.log(`  ${fmt.label("Voice:")}       ${config.voice}`);
    console.log(`  ${fmt.label("TTS Speed:")}   ${config.ttsSpeed}x`);
    console.log(`  ${fmt.label("Pitch:")}       ${config.pitch}`);
    console.log(`  ${fmt.label("Volume:")}      ${config.volume}`);
    console.log(`  ${fmt.label("Output Dir:")}  ${config.outputDir}`);
    if (config.customInstructions)
      console.log(`  ${fmt.label("Custom:")}      ${config.customInstructions}`);

    const envHints: string[] = [];
    if (process.env.ANTHROPIC_API_KEY) envHints.push("ANTHROPIC_API_KEY");
    if (process.env.ANTHROPIC_BASE_URL) envHints.push("ANTHROPIC_BASE_URL");
    if (process.env.ANTHROPIC_MODEL) envHints.push("ANTHROPIC_MODEL");
    if (process.env.OPENAI_API_KEY) envHints.push("OPENAI_API_KEY");
    if (process.env.OPENAI_BASE_URL) envHints.push("OPENAI_BASE_URL");
    if (process.env.GEMINI_API_KEY) envHints.push("GEMINI_API_KEY");
    if (process.env.XAI_API_KEY) envHints.push("XAI_API_KEY");
    if (process.env.XAI_BASE_URL) envHints.push("XAI_BASE_URL");
    if (process.env.OLLAMA_BASE_URL) envHints.push("OLLAMA_BASE_URL");
    if (process.env.SLACK_TOKEN) envHints.push("SLACK_TOKEN");
    if (process.env.NOTION_TOKEN) envHints.push("NOTION_TOKEN");
    if (envHints.length > 0) {
      console.log(`\n  ${fmt.dim(`Env overrides: ${envHints.join(", ")}`)}`);
    }
    console.log();
    process.exit(0);
  }

  if (sub === "set") {
    const key = args[2];
    const value = args[3];
    if (!key || !value) {
      console.error("Usage: tldr config set <key> <value>");
      process.exit(1);
    }

    try {
      const message = await applyConfigSet(key, value, args);
      console.log(message);
    } catch (err) {
      if (err instanceof ConfigSetError) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    }
    process.exit(0);
  }

  if (sub === "setup") {
    render(<App showConfig={true} />);
    return;
  }

  console.error(`Unknown config subcommand: ${sub}`);
  process.exit(1);
}

async function handleProfile() {
  const sub = args[1];

  if (!sub) {
    console.error("Usage: tldr profile <list|create|delete|use|edit>");
    process.exit(1);
  }

  if (sub === "list") {
    const profiles = await listProfiles();
    console.log("\nProfiles:\n");
    for (const p of profiles) {
      const marker = p.active ? fmt.green("*") : " ";
      const name = p.active ? p.name : fmt.dim(p.name);
      console.log(`  ${marker} ${name}`);
    }
    console.log();
    process.exit(0);
  }

  if (sub === "create") {
    const name = args[2];
    if (!name) {
      console.error("Usage: tldr profile create <name>");
      process.exit(1);
    }
    try {
      await createProfile(name);
      console.log(`Created profile "${name}".`);
      console.log(`Run "tldr profile edit ${name}" to configure it.`);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    process.exit(0);
  }

  if (sub === "delete") {
    const name = args[2];
    if (!name) {
      console.error("Usage: tldr profile delete <name>");
      process.exit(1);
    }
    try {
      await deleteProfile(name);
      console.log(`Deleted profile "${name}".`);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    process.exit(0);
  }

  if (sub === "use") {
    const name = args[2];
    if (!name) {
      console.error("Usage: tldr profile use <name>");
      process.exit(1);
    }
    try {
      await setActiveProfile(name);
      console.log(`Active profile set to "${name}".`);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    process.exit(0);
  }

  if (sub === "edit") {
    const name = args[2];
    const overrides: ConfigOverrides = {};
    if (name) overrides.profileName = name;
    render(<App showConfig={true} editProfile={true} overrides={overrides} />);
    return;
  }

  console.error(`Unknown profile subcommand: ${sub}`);
  process.exit(1);
}

async function handleImport() {
  const filePath = args[1];
  if (!filePath) {
    console.error("Usage: tldr import <file.md>");
    process.exit(1);
  }

  try {
    const config = await loadConfig();
    const result = await importMarkdown(filePath, { outputDir: config.outputDir });
    console.log(`\n  ${fmt.success("Imported!")} ${result.tldrResult.extraction.title}`);
    console.log(`  ${fmt.dim(`Saved to ${result.sessionPaths.sessionDir}`)}\n`);
  } catch (err) {
    console.error(`Import failed: ${(err as Error).message}`);
    process.exit(1);
  }
  process.exit(0);
}

const command = args[0];

if (command === "config") {
  handleConfig();
} else if (command === "import") {
  handleImport();
} else if (command === "profile") {
  handleProfile();
} else {
  // Summarization mode — parse --model, --profile, --provider flags
  const overrides: ConfigOverrides = {};
  const modelFlag = getFlag("model");
  if (modelFlag) overrides.model = modelFlag;
  const styleFlag = getFlag("style");
  if (styleFlag) overrides.style = styleFlag;
  const profileFlag = getFlag("profile");
  if (profileFlag) overrides.profileName = profileFlag;
  const providerFlag = getFlag("provider");
  if (providerFlag) overrides.provider = providerFlag;

  // Legacy --config flag
  const showConfig = hasFlag("config");

  // Find positional input (not a flag or flag value)
  const flagNames = new Set(["model", "style", "profile", "provider"]);
  const skipNext = new Set<number>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith("--")) {
      const name = arg.slice(2);
      if (flagNames.has(name)) {
        skipNext.add(i + 1);
      }
    }
  }
  const initialInput = args.find(
    (a, i) => !a.startsWith("--") && !skipNext.has(i) && a !== "config" && a !== "profile",
  );

  render(<App initialInput={initialInput} showConfig={showConfig} overrides={overrides} />);
}
