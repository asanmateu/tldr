import { describe, expect, it } from "vitest";
import { VALID_AUDIO_MODES, VALID_STYLES, VALID_TONES, VALID_VOICES } from "../lib/config.js";
import { BUILT_IN_PRESETS, isBuiltInPreset } from "../lib/presets.js";

const EXPECTED_PRESETS = [
  "morning-brief",
  "commute-catch-up",
  "deep-study",
  "exam-prep",
  "bedtime-read",
  "story-mode",
  "team-debrief",
];

describe("BUILT_IN_PRESETS", () => {
  it("contains all 7 presets", () => {
    expect(Object.keys(BUILT_IN_PRESETS).sort()).toEqual(EXPECTED_PRESETS.sort());
  });

  it("every preset has builtIn: true", () => {
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
      expect(preset.builtIn, `${name} should have builtIn: true`).toBe(true);
    }
  });

  it("every preset has non-empty description", () => {
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
      expect(typeof preset.description, `${name} description should be a string`).toBe("string");
      expect(preset.description.length, `${name} description should not be empty`).toBeGreaterThan(
        0,
      );
    }
  });

  it("every preset has valid audioMode", () => {
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
      expect(preset.audioMode, `${name} should have audioMode defined`).toBeDefined();
      expect(
        VALID_AUDIO_MODES.has(preset.audioMode as string),
        `${name} audioMode "${preset.audioMode}" should be valid`,
      ).toBe(true);
    }
  });

  it("every preset has valid tone", () => {
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
      expect(VALID_TONES.has(preset.tone), `${name} tone "${preset.tone}" should be valid`).toBe(
        true,
      );
    }
  });

  it("every preset has valid summaryStyle", () => {
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
      expect(
        VALID_STYLES.has(preset.summaryStyle),
        `${name} summaryStyle "${preset.summaryStyle}" should be valid`,
      ).toBe(true);
    }
  });

  it("every preset has valid voice", () => {
    for (const [name, preset] of Object.entries(BUILT_IN_PRESETS)) {
      if (preset.voice) {
        expect(
          VALID_VOICES.has(preset.voice),
          `${name} voice "${preset.voice}" should be valid`,
        ).toBe(true);
      }
    }
  });
});

describe("isBuiltInPreset", () => {
  it("returns true for built-in names", () => {
    for (const name of EXPECTED_PRESETS) {
      expect(isBuiltInPreset(name), `${name} should be built-in`).toBe(true);
    }
  });

  it("returns false for other names", () => {
    expect(isBuiltInPreset("default")).toBe(false);
    expect(isBuiltInPreset("work")).toBe(false);
    expect(isBuiltInPreset("nonexistent")).toBe(false);
  });
});
