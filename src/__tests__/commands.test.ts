import { describe, expect, it } from "vitest";
import { SLASH_COMMANDS, matchCommands, parseCommand } from "../lib/commands.js";

describe("matchCommands", () => {
  it("returns all commands for bare slash", () => {
    const result = matchCommands("/");
    expect(result).toEqual(SLASH_COMMANDS);
  });

  it("filters to matching commands", () => {
    const result = matchCommands("/se");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("setup");
  });

  it("returns empty array for no matches", () => {
    expect(matchCommands("/xyz")).toEqual([]);
  });

  it("returns empty array when input has no leading slash", () => {
    expect(matchCommands("no-slash")).toEqual([]);
  });

  it("matches multiple commands with shared prefix", () => {
    // /config and nothing else starts with "co"
    const result = matchCommands("/co");
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("config");
  });
});

describe("parseCommand", () => {
  it("parses a command with no args", () => {
    expect(parseCommand("/setup")).toEqual({ command: "setup", args: "" });
  });

  it("parses a command with args", () => {
    expect(parseCommand("/config foo")).toEqual({ command: "config", args: "foo" });
  });

  it("returns null for non-command input", () => {
    expect(parseCommand("not a command")).toBeNull();
  });

  it("handles extra whitespace in args", () => {
    expect(parseCommand("/help   bar  baz")).toEqual({ command: "help", args: "bar  baz" });
  });

  it("parses unknown commands without crashing", () => {
    expect(parseCommand("/clear")).toEqual({ command: "clear", args: "" });
  });
});

describe("unknown command detection", () => {
  it("recognizes known commands", () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(SLASH_COMMANDS.some((c) => c.name === cmd.name)).toBe(true);
    }
  });

  it("identifies unknown commands", () => {
    const unknowns = ["clear", "reset", "exit", "foo"];
    for (const name of unknowns) {
      expect(SLASH_COMMANDS.some((c) => c.name === name)).toBe(false);
    }
  });
});
