import { render } from "ink-testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThemePalette } from "../lib/types.js";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  readClipboard: vi.fn(),
  checkForUpdate: vi.fn(),
}));

vi.mock("../lib/clipboard.js", () => ({
  readClipboard: mocks.readClipboard,
}));
vi.mock("../lib/updateCheck.js", () => ({
  checkForUpdate: mocks.checkForUpdate,
  compareSemver: vi.fn(() => 0),
  getUpdateCommand: vi.fn(() => "brew upgrade tldr-cli"),
  isHomebrew: vi.fn(() => false),
}));

// ---------------------------------------------------------------------------
// Dynamic import AFTER mocks
// ---------------------------------------------------------------------------
const { InputPrompt } = await import("../components/InputPrompt.js");
const { ThemeProvider } = await import("../lib/ThemeContext.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PALETTE: ThemePalette = {
  brand: "#ff6b6b",
  brandBorder: "#ff8882",
  brandAccent: "#ffd6c0",
  accent: "#f9ca24",
  success: "#69db7c",
  warning: "#ffd43b",
  error: "#ff6b6b",
};

/** Render InputPrompt wrapped in ThemeProvider. */
function renderPrompt(overrides?: {
  onSubmit?: (input: string) => void;
  onSlashCommand?: (cmd: string) => void;
  onQuit?: () => void;
}) {
  const onSubmit = overrides?.onSubmit ?? vi.fn();
  const onSlashCommand = overrides?.onSlashCommand ?? vi.fn();
  const onQuit = overrides?.onQuit ?? vi.fn();

  const instance = render(
    <ThemeProvider palette={PALETTE}>
      <InputPrompt
        history={[]}
        onSubmit={onSubmit}
        onSlashCommand={onSlashCommand}
        onQuit={onQuit}
      />
    </ThemeProvider>,
  );

  return { instance, onSubmit, onSlashCommand, onQuit };
}

/** Wait for useEffect (stdin listeners) to be registered. */
const tick = () => new Promise((r) => setTimeout(r, 50));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("InputPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readClipboard.mockReturnValue("");
    mocks.checkForUpdate.mockResolvedValue(null);
  });

  describe("file path handling", () => {
    it("submits a file path via onSubmit, not onSlashCommand", async () => {
      const { instance, onSubmit, onSlashCommand } = renderPrompt();
      await tick();

      instance.stdin.write("/Users/someone/Documents/notes.md");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("notes.md");
        },
        { timeout: 2000 },
      );
      await tick();
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledWith("/Users/someone/Documents/notes.md");
        },
        { timeout: 2000 },
      );

      expect(onSlashCommand).not.toHaveBeenCalled();
      instance.unmount();
    });

    it("normalizes a dragged file path before submitting", async () => {
      const { instance, onSubmit } = renderPrompt();
      await tick();

      instance.stdin.write("/Users/foo/my\\ file.pdf");
      await vi.waitFor(
        () => {
          expect(instance.lastFrame()).toContain("file.pdf");
        },
        { timeout: 2000 },
      );
      await tick();
      instance.stdin.write("\r");

      await vi.waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledWith("/Users/foo/my file.pdf");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  describe("file hint display", () => {
    it("shows basename and type for a markdown file", async () => {
      const { instance } = renderPrompt();
      await tick();

      instance.stdin.write("/Users/someone/ai-transition-framework.md");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("ai-transition-framework.md");
          expect(frame).toContain("document");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows 'image' type for image files", async () => {
      const { instance } = renderPrompt();
      await tick();

      instance.stdin.write("/tmp/photo.jpg");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("photo.jpg");
          expect(frame).toContain("image");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });

    it("shows 'PDF document' type for PDF files", async () => {
      const { instance } = renderPrompt();
      await tick();

      instance.stdin.write("/tmp/paper.pdf");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("paper.pdf");
          expect(frame).toContain("PDF document");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });

  describe("slash menu exclusion for file paths", () => {
    it("does not show slash command menu for file paths starting with /", async () => {
      const { instance } = renderPrompt();
      await tick();

      instance.stdin.write("/home/user/file.txt");

      await vi.waitFor(
        () => {
          const frame = instance.lastFrame();
          expect(frame).toContain("file.txt");
          expect(frame).toContain("document");
          expect(frame).not.toContain("Browse and resume");
          expect(frame).not.toContain("Re-run first-time");
        },
        { timeout: 2000 },
      );

      instance.unmount();
    });
  });
});
