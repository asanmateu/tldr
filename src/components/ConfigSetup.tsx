import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useState } from "react";
import { resolveConfig } from "../lib/config.js";
import type {
  CognitiveTrait,
  Config,
  Profile,
  SummarizationProvider,
  SummaryStyle,
  TldrSettings,
  Tone,
  TtsMode,
} from "../lib/types.js";

interface ConfigSetupProps {
  currentConfig?: Config | undefined;
  editProfile?: boolean | undefined;
  onSave: (config: Config) => void;
  onCancel: () => void;
}

type FirstRunStep = "apiKey" | "traits" | "tone" | "style";
type EditMenuItem =
  | "traits"
  | "tone"
  | "style"
  | "model"
  | "provider"
  | "voice"
  | "ttsSpeed"
  | "ttsMode"
  | "customInstructions"
  | "save";

const ALL_TRAITS: { value: CognitiveTrait; label: string }[] = [
  { value: "dyslexia", label: "Dyslexia" },
  { value: "adhd", label: "ADHD" },
  { value: "autism", label: "Autism" },
  { value: "esl", label: "ESL (English as second language)" },
  { value: "visual-thinker", label: "Visual thinker" },
];

const ALL_TONES: { value: Tone; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "professional", label: "Professional" },
  { value: "academic", label: "Academic" },
  { value: "eli5", label: "ELI5 (Explain like I'm five)" },
];

const ALL_STYLES: { value: SummaryStyle; label: string; hint: string }[] = [
  { value: "quick", label: "Quick", hint: "TL;DR + key points" },
  { value: "detailed", label: "Detailed", hint: "context + analogy + details" },
  { value: "study-notes", label: "Study Notes", hint: "concepts + connections + review" },
];

const VOICES = [
  "en-US-JennyNeural",
  "en-US-GuyNeural",
  "en-US-AriaNeural",
  "en-GB-SoniaNeural",
  "en-AU-NatashaNeural",
];

const ALL_TTS_MODES: { value: TtsMode; label: string; hint: string }[] = [
  { value: "strip", label: "Strip", hint: "fast, regex-based cleanup" },
  { value: "rewrite", label: "Rewrite", hint: "Claude rewrites as podcast script" },
];

const ALL_PROVIDERS: { value: SummarizationProvider; label: string; hint: string }[] = [
  { value: "api", label: "API", hint: "per-token, ~2s, needs API key" },
  { value: "cli", label: "CLI", hint: "free with Claude Code sub, ~5s" },
];

const EDIT_MENU_ITEMS: { key: EditMenuItem; label: string }[] = [
  { key: "traits", label: "Cognitive traits" },
  { key: "tone", label: "Tone" },
  { key: "style", label: "Summary style" },
  { key: "model", label: "Model override" },
  { key: "provider", label: "Provider" },
  { key: "voice", label: "TTS Voice" },
  { key: "ttsSpeed", label: "TTS Speed" },
  { key: "ttsMode", label: "TTS Mode" },
  { key: "customInstructions", label: "Custom instructions" },
  { key: "save", label: "Save & exit" },
];

function buildDefaultConfig(): Config {
  const settings: TldrSettings = {
    activeProfile: "default",
    profiles: {
      default: {
        cognitiveTraits: ["dyslexia"],
        tone: "casual",
        summaryStyle: "study-notes",
      },
    },
  };
  return resolveConfig(settings);
}

export function ConfigSetup({ currentConfig, editProfile, onSave, onCancel }: ConfigSetupProps) {
  const hasEnvApiKey = !!process.env.ANTHROPIC_API_KEY;
  const isFirstRun = !editProfile;

  const defaults = currentConfig ?? buildDefaultConfig();

  // Shared state for profile settings
  const [apiKey, setApiKey] = useState(defaults.apiKey);
  const [selectedTraits, setSelectedTraits] = useState<Set<CognitiveTrait>>(
    new Set(defaults.cognitiveTraits),
  );
  const [tone, setTone] = useState<Tone>(defaults.tone);
  const [toneIndex, setToneIndex] = useState(
    Math.max(
      ALL_TONES.findIndex((t) => t.value === defaults.tone),
      0,
    ),
  );
  const [style, setStyle] = useState<SummaryStyle>(defaults.summaryStyle);
  const [styleIndex, setStyleIndex] = useState(
    Math.max(
      ALL_STYLES.findIndex((s) => s.value === defaults.summaryStyle),
      0,
    ),
  );
  const [traitCursor, setTraitCursor] = useState(0);
  const [voiceIndex, setVoiceIndex] = useState(Math.max(VOICES.indexOf(defaults.voice), 0));
  const [customInstructions, setCustomInstructions] = useState(defaults.customInstructions ?? "");
  const [ttsSpeedInput, setTtsSpeedInput] = useState(String(defaults.ttsSpeed));
  const [ttsMode, setTtsMode] = useState<TtsMode>(defaults.ttsMode);
  const [ttsModeIndex, setTtsModeIndex] = useState(
    Math.max(
      ALL_TTS_MODES.findIndex((m) => m.value === defaults.ttsMode),
      0,
    ),
  );
  const [provider, setProvider] = useState<SummarizationProvider>(defaults.provider);
  const [providerIndex, setProviderIndex] = useState(
    Math.max(
      ALL_PROVIDERS.findIndex((p) => p.value === defaults.provider),
      0,
    ),
  );

  // First-run step state
  const skipApiKey = hasEnvApiKey || defaults.provider === "cli";
  const initialStep: FirstRunStep = isFirstRun && !skipApiKey ? "apiKey" : "traits";
  const [firstRunStep, setFirstRunStep] = useState<FirstRunStep>(initialStep);

  // Edit mode state
  const [editMenuIndex, setEditMenuIndex] = useState(0);
  const [editingField, setEditingField] = useState<EditMenuItem | null>(null);

  const buildConfig = useCallback((): Config => {
    const resolvedApiKey = hasEnvApiKey ? (process.env.ANTHROPIC_API_KEY ?? "") : apiKey;
    const voice = VOICES[voiceIndex] ?? "en-US-JennyNeural";
    const ttsSpeed = Number.parseFloat(ttsSpeedInput) || 1.0;

    const profile: Profile = {
      cognitiveTraits: [...selectedTraits],
      tone,
      summaryStyle: style,
      customInstructions: customInstructions || undefined,
      voice: voice !== "en-US-JennyNeural" ? voice : undefined,
      ttsSpeed: ttsSpeed !== 1.0 ? ttsSpeed : undefined,
      ttsMode: ttsMode !== "strip" ? ttsMode : undefined,
      provider: provider !== "cli" ? provider : undefined,
    };

    const settings: TldrSettings = {
      apiKey: resolvedApiKey || undefined,
      activeProfile: defaults.profileName,
      profiles: { [defaults.profileName]: profile },
    };

    return resolveConfig(settings);
  }, [
    hasEnvApiKey,
    apiKey,
    voiceIndex,
    ttsSpeedInput,
    ttsMode,
    provider,
    selectedTraits,
    tone,
    style,
    customInstructions,
    defaults.profileName,
  ]);

  const handleApiKeySubmit = useCallback((value: string) => {
    if (value.trim()) {
      setApiKey(value.trim());
      setFirstRunStep("traits");
    }
  }, []);

  useInput((ch, key) => {
    if (key.escape) {
      if (editProfile && editingField) {
        setEditingField(null);
        return;
      }
      onCancel();
      return;
    }

    // --- First-run mode ---
    if (isFirstRun && !editProfile) {
      if (firstRunStep === "traits") {
        if (key.upArrow) setTraitCursor((i) => Math.max(0, i - 1));
        if (key.downArrow) setTraitCursor((i) => Math.min(ALL_TRAITS.length - 1, i + 1));
        if (ch === " ") {
          const trait = ALL_TRAITS[traitCursor];
          if (trait) {
            setSelectedTraits((prev) => {
              const next = new Set(prev);
              if (next.has(trait.value)) {
                next.delete(trait.value);
              } else {
                next.add(trait.value);
              }
              return next;
            });
          }
        }
        if (key.return) setFirstRunStep("tone");
        return;
      }

      if (firstRunStep === "tone") {
        if (key.upArrow) setToneIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setToneIndex((i) => Math.min(ALL_TONES.length - 1, i + 1));
        if (key.return) {
          const selected = ALL_TONES[toneIndex];
          if (selected) setTone(selected.value);
          setFirstRunStep("style");
        }
        return;
      }

      if (firstRunStep === "style") {
        if (key.upArrow) setStyleIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setStyleIndex((i) => Math.min(ALL_STYLES.length - 1, i + 1));
        if (key.return) {
          const selected = ALL_STYLES[styleIndex];
          if (selected) setStyle(selected.value);
          // Done — save
          setTimeout(() => onSave(buildConfig()), 0);
        }
        return;
      }
      return;
    }

    // --- Edit profile mode ---
    if (editProfile) {
      if (!editingField) {
        if (key.upArrow) setEditMenuIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setEditMenuIndex((i) => Math.min(EDIT_MENU_ITEMS.length - 1, i + 1));
        if (key.return) {
          const item = EDIT_MENU_ITEMS[editMenuIndex];
          if (item?.key === "save") {
            onSave(buildConfig());
          } else if (item) {
            setEditingField(item.key);
          }
        }
        return;
      }

      // Editing a specific field
      if (editingField === "traits") {
        if (key.upArrow) setTraitCursor((i) => Math.max(0, i - 1));
        if (key.downArrow) setTraitCursor((i) => Math.min(ALL_TRAITS.length - 1, i + 1));
        if (ch === " ") {
          const trait = ALL_TRAITS[traitCursor];
          if (trait) {
            setSelectedTraits((prev) => {
              const next = new Set(prev);
              if (next.has(trait.value)) {
                next.delete(trait.value);
              } else {
                next.add(trait.value);
              }
              return next;
            });
          }
        }
        if (key.return) setEditingField(null);
        return;
      }

      if (editingField === "tone") {
        if (key.upArrow) setToneIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setToneIndex((i) => Math.min(ALL_TONES.length - 1, i + 1));
        if (key.return) {
          const selected = ALL_TONES[toneIndex];
          if (selected) setTone(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "style") {
        if (key.upArrow) setStyleIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setStyleIndex((i) => Math.min(ALL_STYLES.length - 1, i + 1));
        if (key.return) {
          const selected = ALL_STYLES[styleIndex];
          if (selected) setStyle(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "model") {
        // Model override is advanced — just go back for now
        if (key.return) setEditingField(null);
        return;
      }

      if (editingField === "voice") {
        if (key.upArrow) setVoiceIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setVoiceIndex((i) => Math.min(VOICES.length - 1, i + 1));
        if (key.return) setEditingField(null);
        return;
      }

      if (editingField === "ttsMode") {
        if (key.upArrow) setTtsModeIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setTtsModeIndex((i) => Math.min(ALL_TTS_MODES.length - 1, i + 1));
        if (key.return) {
          const selected = ALL_TTS_MODES[ttsModeIndex];
          if (selected) setTtsMode(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "provider") {
        if (key.upArrow) setProviderIndex((i) => Math.max(0, i - 1));
        if (key.downArrow) setProviderIndex((i) => Math.min(ALL_PROVIDERS.length - 1, i + 1));
        if (key.return) {
          const selected = ALL_PROVIDERS[providerIndex];
          if (selected) setProvider(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "ttsSpeed") {
        // Handled by TextInput onSubmit
        return;
      }

      if (editingField === "customInstructions") {
        // Handled by TextInput onSubmit
        return;
      }
    }
  });

  // --- Render: First-run mode ---
  if (isFirstRun && !editProfile) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">
          tldr Setup
        </Text>

        <Box marginTop={1} flexDirection="column">
          {firstRunStep === "apiKey" && (
            <Box flexDirection="column">
              <Text>Anthropic API Key:</Text>
              <Text dimColor>Or set ANTHROPIC_API_KEY env var</Text>
              <TextInput
                value={apiKey}
                onChange={setApiKey}
                onSubmit={handleApiKeySubmit}
                mask="*"
              />
            </Box>
          )}

          {firstRunStep === "traits" && (
            <Box flexDirection="column">
              <Text>Cognitive traits (Space to toggle, Enter to confirm):</Text>
              {ALL_TRAITS.map((t, i) => {
                const checked = selectedTraits.has(t.value);
                const cursor = i === traitCursor;
                return (
                  <Text key={t.value} {...(cursor ? { color: "cyan" } : {})}>
                    {cursor ? ">" : " "} [{checked ? "x" : " "}] {t.label}
                  </Text>
                );
              })}
              <Text dimColor>
                Selected: {selectedTraits.size > 0 ? [...selectedTraits].join(", ") : "none"}
              </Text>
            </Box>
          )}

          {firstRunStep === "tone" && (
            <Box flexDirection="column">
              <Text>Tone (Enter to confirm):</Text>
              {ALL_TONES.map((t, i) => (
                <Text key={t.value} {...(i === toneIndex ? { color: "cyan" } : {})}>
                  {i === toneIndex ? ">" : " "} {t.label}
                </Text>
              ))}
            </Box>
          )}

          {firstRunStep === "style" && (
            <Box flexDirection="column">
              <Text>Summary style (Enter to confirm):</Text>
              {ALL_STYLES.map((s, i) => (
                <Text key={s.value} {...(i === styleIndex ? { color: "cyan" } : {})}>
                  {i === styleIndex ? ">" : " "} {s.label} <Text dimColor>({s.hint})</Text>
                </Text>
              ))}
            </Box>
          )}
        </Box>

        <Box marginTop={1}>
          <Text dimColor>[Esc] cancel</Text>
        </Box>
      </Box>
    );
  }

  // --- Render: Edit profile mode ---
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="cyan">
        Edit Profile: {defaults.profileName}
      </Text>

      <Box marginTop={1} flexDirection="column">
        {!editingField &&
          EDIT_MENU_ITEMS.map((item, i) => {
            let current = "";
            if (item.key === "traits")
              current = selectedTraits.size > 0 ? [...selectedTraits].join(", ") : "none";
            if (item.key === "tone") current = tone;
            if (item.key === "style") current = style;
            if (item.key === "model") current = defaults.model;
            if (item.key === "provider") current = provider;
            if (item.key === "voice") current = VOICES[voiceIndex] ?? "";
            if (item.key === "ttsSpeed") current = `${ttsSpeedInput}x`;
            if (item.key === "ttsMode") current = ttsMode;
            if (item.key === "customInstructions")
              current = customInstructions ? `"${customInstructions.slice(0, 30)}..."` : "none";

            return (
              <Text key={item.key} {...(i === editMenuIndex ? { color: "cyan" } : {})}>
                {i === editMenuIndex ? ">" : " "} {item.label}
                {item.key !== "save" && <Text dimColor> ({current})</Text>}
              </Text>
            );
          })}

        {editingField === "traits" && (
          <Box flexDirection="column">
            <Text>Cognitive traits (Space to toggle, Enter to go back):</Text>
            {ALL_TRAITS.map((t, i) => {
              const checked = selectedTraits.has(t.value);
              const cursor = i === traitCursor;
              return (
                <Text key={t.value} {...(cursor ? { color: "cyan" } : {})}>
                  {cursor ? ">" : " "} [{checked ? "x" : " "}] {t.label}
                </Text>
              );
            })}
          </Box>
        )}

        {editingField === "tone" && (
          <Box flexDirection="column">
            <Text>Tone (Enter to confirm):</Text>
            {ALL_TONES.map((t, i) => (
              <Text key={t.value} {...(i === toneIndex ? { color: "cyan" } : {})}>
                {i === toneIndex ? ">" : " "} {t.label}
              </Text>
            ))}
          </Box>
        )}

        {editingField === "style" && (
          <Box flexDirection="column">
            <Text>Summary style (Enter to confirm):</Text>
            {ALL_STYLES.map((s, i) => (
              <Text key={s.value} {...(i === styleIndex ? { color: "cyan" } : {})}>
                {i === styleIndex ? ">" : " "} {s.label} <Text dimColor>({s.hint})</Text>
              </Text>
            ))}
          </Box>
        )}

        {editingField === "voice" && (
          <Box flexDirection="column">
            <Text>TTS Voice (Enter to confirm):</Text>
            {VOICES.map((v, i) => (
              <Text key={v} {...(i === voiceIndex ? { color: "cyan" } : {})}>
                {i === voiceIndex ? ">" : " "} {v}
              </Text>
            ))}
          </Box>
        )}

        {editingField === "ttsMode" && (
          <Box flexDirection="column">
            <Text>TTS Mode (Enter to confirm):</Text>
            {ALL_TTS_MODES.map((m, i) => (
              <Text key={m.value} {...(i === ttsModeIndex ? { color: "cyan" } : {})}>
                {i === ttsModeIndex ? ">" : " "} {m.label} <Text dimColor>({m.hint})</Text>
              </Text>
            ))}
          </Box>
        )}

        {editingField === "provider" && (
          <Box flexDirection="column">
            <Text>Provider (Enter to confirm):</Text>
            {ALL_PROVIDERS.map((p, i) => (
              <Text key={p.value} {...(i === providerIndex ? { color: "cyan" } : {})}>
                {i === providerIndex ? ">" : " "} {p.label} <Text dimColor>({p.hint})</Text>
              </Text>
            ))}
          </Box>
        )}

        {editingField === "ttsSpeed" && (
          <Box flexDirection="column">
            <Text>TTS Speed (e.g. 1.0, 1.25, 1.5):</Text>
            <TextInput
              value={ttsSpeedInput}
              onChange={setTtsSpeedInput}
              onSubmit={() => setEditingField(null)}
            />
          </Box>
        )}

        {editingField === "customInstructions" && (
          <Box flexDirection="column">
            <Text>Custom instructions (Enter to confirm):</Text>
            <TextInput
              value={customInstructions}
              onChange={setCustomInstructions}
              onSubmit={() => setEditingField(null)}
            />
          </Box>
        )}

        {editingField === "model" && (
          <Box flexDirection="column">
            <Text>Model override (set via CLI: --model sonnet):</Text>
            <Text dimColor>Current: {defaults.model}</Text>
            <Text dimColor>Press Enter to go back</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{editingField ? "[Esc] back to menu" : "[Esc] cancel"}</Text>
      </Box>
    </Box>
  );
}
