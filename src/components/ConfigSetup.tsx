import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useMemo, useState } from "react";
import { useListNavigation } from "../hooks/useListNavigation.js";
import { useTheme } from "../lib/ThemeContext.js";
import { resolveConfig } from "../lib/config.js";
import { getVoicesForProvider } from "../lib/tts/voices.js";
import type {
  AppearanceMode,
  CognitiveTrait,
  Config,
  PitchPreset,
  Profile,
  SummarizationProvider,
  SummaryStyle,
  ThemeConfig,
  ThemeName,
  TldrSettings,
  Tone,
  TtsProvider,
  VolumePreset,
} from "../lib/types.js";
import { SelectionList } from "./SelectionList.js";

interface ConfigSetupProps {
  currentConfig?: Config | undefined;
  editProfile?: boolean | undefined;
  themeConfig?: ThemeConfig | undefined;
  onThemeChange?: (theme: ThemeConfig) => void;
  onSave: (config: Config) => void;
  onCancel: () => void;
}

type FirstRunStep = "apiKey" | "theme" | "traits" | "tone" | "style";
type EditMenuItem =
  | "theme"
  | "traits"
  | "tone"
  | "style"
  | "model"
  | "provider"
  | "ttsProvider"
  | "ttsModel"
  | "voice"
  | "ttsSpeed"
  | "pitch"
  | "volume"
  | "saveAudio"
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
  { value: "standard", label: "Standard", hint: "key points + why it matters + connections" },
  { value: "detailed", label: "Detailed", hint: "context + analogy + details" },
  { value: "study-notes", label: "Study Notes", hint: "concepts + review questions" },
];

const ALL_TTS_PROVIDERS: { value: TtsProvider; label: string; hint: string }[] = [
  { value: "edge-tts", label: "Edge TTS", hint: "free, Microsoft Neural voices" },
  { value: "openai", label: "OpenAI TTS", hint: "high quality, requires OPENAI_API_KEY" },
];

const ALL_PITCHES: { value: PitchPreset; label: string; hint: string }[] = [
  { value: "low", label: "Low", hint: "deeper, warmer" },
  { value: "default", label: "Default", hint: "standard" },
  { value: "high", label: "High", hint: "brighter, more energetic" },
];

const ALL_VOLUMES: { value: VolumePreset; label: string; hint: string }[] = [
  { value: "quiet", label: "Quiet", hint: "softer" },
  { value: "normal", label: "Normal", hint: "standard" },
  { value: "loud", label: "Loud", hint: "louder, more presence" },
];

const ALL_PROVIDERS: { value: SummarizationProvider; label: string; hint: string }[] = [
  { value: "anthropic", label: "Anthropic", hint: "Anthropic API, per-token, ~2s" },
  { value: "claude-code", label: "Claude Code", hint: "requires Claude Code sub, ~5s" },
  { value: "codex", label: "Codex CLI", hint: "OpenAI Codex CLI, requires codex installed" },
  { value: "gemini", label: "Gemini", hint: "Google Gemini API, needs GEMINI_API_KEY" },
  { value: "ollama", label: "Ollama", hint: "Local Ollama instance, no API key" },
  { value: "openai", label: "OpenAI-compatible", hint: "OpenAI, Groq, Together, etc." },
  { value: "xai", label: "xAI / Grok", hint: "xAI API, needs XAI_API_KEY" },
];

const ALL_THEME_NAMES: { value: ThemeName; label: string; hint: string }[] = [
  { value: "coral", label: "Coral", hint: "warm reds & oranges" },
  { value: "ocean", label: "Ocean", hint: "cool blues & teals" },
  { value: "forest", label: "Forest", hint: "earthy greens" },
];

const ALL_APPEARANCES: { value: AppearanceMode; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "detect from system" },
  { value: "dark", label: "Dark", hint: "always dark palette" },
  { value: "light", label: "Light", hint: "always light palette" },
];

const EDIT_MENU_ITEMS: { key: EditMenuItem; label: string; section: string }[] = [
  // Summary
  { key: "tone", label: "Tone", section: "Summary" },
  { key: "style", label: "Summary style", section: "Summary" },
  { key: "traits", label: "Cognitive traits", section: "Summary" },
  { key: "provider", label: "AI Provider", section: "Summary" },
  { key: "model", label: "Model", section: "Summary" },
  { key: "customInstructions", label: "Custom instructions", section: "Summary" },
  // Audio
  { key: "ttsProvider", label: "TTS Provider", section: "Audio" },
  { key: "ttsModel", label: "TTS Model", section: "Audio" },
  { key: "voice", label: "Voice", section: "Audio" },
  { key: "ttsSpeed", label: "Speed", section: "Audio" },
  { key: "pitch", label: "Pitch", section: "Audio" },
  { key: "volume", label: "Volume", section: "Audio" },
  { key: "saveAudio", label: "Auto-save audio", section: "Audio" },
  // Appearance
  { key: "theme", label: "Theme", section: "Appearance" },
  // ---
  { key: "save", label: "Save & exit", section: "" },
];

function buildDefaultConfig(): Config {
  const settings: TldrSettings = {
    activeProfile: "default",
    profiles: {
      default: {
        cognitiveTraits: ["dyslexia"],
        tone: "casual",
        summaryStyle: "standard",
      },
    },
  };
  return resolveConfig(settings);
}

export function ConfigSetup({
  currentConfig,
  editProfile,
  themeConfig,
  onThemeChange,
  onSave,
  onCancel,
}: ConfigSetupProps) {
  const theme = useTheme();
  const hasEnvApiKey = !!process.env.ANTHROPIC_API_KEY;
  const isFirstRun = !editProfile;

  const defaults = currentConfig ?? buildDefaultConfig();

  // Shared state for profile settings
  const [apiKey, setApiKey] = useState(defaults.apiKey);
  const [selectedTraits, setSelectedTraits] = useState<Set<CognitiveTrait>>(
    new Set(defaults.cognitiveTraits),
  );
  const [tone, setTone] = useState<Tone>(defaults.tone);
  const [style, setStyle] = useState<SummaryStyle>(defaults.summaryStyle);
  const [customInstructions, setCustomInstructions] = useState(defaults.customInstructions ?? "");
  const [ttsSpeedInput, setTtsSpeedInput] = useState(String(defaults.ttsSpeed));
  const [pitch, setPitch] = useState<PitchPreset>(defaults.pitch);
  const [volume, setVolume] = useState<VolumePreset>(defaults.volume);
  const [provider, setProvider] = useState<SummarizationProvider>(defaults.provider);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>(defaults.ttsProvider);
  const [saveAudio, setSaveAudio] = useState(defaults.saveAudio);

  // Model state — free-text input, pre-filled with current model
  const [modelInput, setModelInput] = useState(defaults.model);
  const [selectedModel, setSelectedModel] = useState(defaults.model);

  // TTS model state — free-text input, pre-filled with current ttsModel
  const [ttsModelInput, setTtsModelInput] = useState(defaults.ttsModel);
  const [selectedTtsModel, setSelectedTtsModel] = useState(defaults.ttsModel);

  // Theme state
  const [themeName, setThemeName] = useState<ThemeName>(themeConfig?.name ?? "coral");
  const [appearance, setAppearance] = useState<AppearanceMode>(themeConfig?.appearance ?? "auto");
  const [themeSubStep, setThemeSubStep] = useState<"name" | "appearance">("name");

  // Navigation hooks
  const toneNav = useListNavigation({
    itemCount: ALL_TONES.length,
    initialIndex: Math.max(
      ALL_TONES.findIndex((t) => t.value === defaults.tone),
      0,
    ),
  });
  const styleNav = useListNavigation({
    itemCount: ALL_STYLES.length,
    initialIndex: Math.max(
      ALL_STYLES.findIndex((s) => s.value === defaults.summaryStyle),
      0,
    ),
  });
  const traitNav = useListNavigation({ itemCount: ALL_TRAITS.length });

  // Compute voices dynamically based on selected TTS provider
  const voices = getVoicesForProvider(ttsProvider).map((v) => ({
    value: v.id,
    label: v.label,
    hint: v.hint,
  }));
  const voiceNav = useListNavigation({
    itemCount: voices.length,
    initialIndex: Math.max(
      voices.findIndex((v) => v.value === defaults.voice),
      0,
    ),
  });
  const pitchNav = useListNavigation({
    itemCount: ALL_PITCHES.length,
    initialIndex: Math.max(
      ALL_PITCHES.findIndex((p) => p.value === defaults.pitch),
      0,
    ),
  });
  const volumeNav = useListNavigation({
    itemCount: ALL_VOLUMES.length,
    initialIndex: Math.max(
      ALL_VOLUMES.findIndex((v) => v.value === defaults.volume),
      0,
    ),
  });
  const providerNav = useListNavigation({
    itemCount: ALL_PROVIDERS.length,
    initialIndex: Math.max(
      ALL_PROVIDERS.findIndex((p) => p.value === defaults.provider),
      0,
    ),
  });
  const ttsProviderNav = useListNavigation({
    itemCount: ALL_TTS_PROVIDERS.length,
    initialIndex: Math.max(
      ALL_TTS_PROVIDERS.findIndex((p) => p.value === defaults.ttsProvider),
      0,
    ),
  });
  const themeNameNav = useListNavigation({
    itemCount: ALL_THEME_NAMES.length,
    initialIndex: Math.max(
      ALL_THEME_NAMES.findIndex((t) => t.value === (themeConfig?.name ?? "coral")),
      0,
    ),
  });
  const appearanceNav = useListNavigation({
    itemCount: ALL_APPEARANCES.length,
    initialIndex: Math.max(
      ALL_APPEARANCES.findIndex((a) => a.value === (themeConfig?.appearance ?? "auto")),
      0,
    ),
  });
  // Hide pitch/volume when OpenAI TTS is selected (unsupported by the API)
  // Hide ttsModel when not using OpenAI TTS (only OpenAI supports model selection)
  const editMenuItems = useMemo(
    () =>
      ttsProvider === "openai"
        ? EDIT_MENU_ITEMS.filter((item) => item.key !== "pitch" && item.key !== "volume")
        : EDIT_MENU_ITEMS.filter((item) => item.key !== "ttsModel"),
    [ttsProvider],
  );
  const editMenuNav = useListNavigation({ itemCount: editMenuItems.length });

  // First-run step state
  const skipApiKey = hasEnvApiKey || defaults.provider === "claude-code";
  const initialStep: FirstRunStep = isFirstRun && !skipApiKey ? "apiKey" : "theme";
  const [firstRunStep, setFirstRunStep] = useState<FirstRunStep>(initialStep);

  // Edit mode state
  const [editingField, setEditingField] = useState<EditMenuItem | null>(null);

  const buildConfig = useCallback((): Config => {
    const resolvedApiKey = hasEnvApiKey ? (process.env.ANTHROPIC_API_KEY ?? "") : apiKey;
    const voice =
      voices[voiceNav.index]?.value ?? (ttsProvider === "openai" ? "alloy" : "en-US-JennyNeural");
    const ttsSpeed = Number.parseFloat(ttsSpeedInput) || 1.0;
    const defaultVoice = ttsProvider === "openai" ? "alloy" : "en-US-JennyNeural";

    const profile: Profile = {
      cognitiveTraits: [...selectedTraits],
      tone,
      summaryStyle: style,
      customInstructions: customInstructions || undefined,
      model: selectedModel || undefined,
      voice: voice !== defaultVoice ? voice : undefined,
      ttsSpeed: ttsSpeed !== 1.0 ? ttsSpeed : undefined,
      pitch: pitch !== "default" ? pitch : undefined,
      volume: volume !== "normal" ? volume : undefined,
      provider: provider !== "claude-code" ? provider : undefined,
      ttsProvider: ttsProvider !== "edge-tts" ? ttsProvider : undefined,
      ttsModel: selectedTtsModel !== "tts-1" ? selectedTtsModel : undefined,
      saveAudio: saveAudio || undefined,
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
    voices,
    voiceNav.index,
    ttsSpeedInput,
    pitch,
    volume,
    provider,
    ttsProvider,
    selectedModel,
    selectedTtsModel,
    selectedTraits,
    tone,
    style,
    customInstructions,
    saveAudio,
    defaults.profileName,
  ]);

  const handleApiKeySubmit = useCallback((value: string) => {
    if (value.trim()) {
      setApiKey(value.trim());
      setFirstRunStep("traits");
    }
  }, []);

  const toggleTrait = useCallback(() => {
    const trait = ALL_TRAITS[traitNav.index];
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
  }, [traitNav.index]);

  const handleThemeNameSelect = useCallback(() => {
    const selected = ALL_THEME_NAMES[themeNameNav.index];
    if (selected) {
      setThemeName(selected.value);
      onThemeChange?.({ name: selected.value, appearance });
    }
    setThemeSubStep("appearance");
  }, [themeNameNav.index, appearance, onThemeChange]);

  const handleAppearanceSelect = useCallback(
    (nextStep: "traits" | null) => {
      const selected = ALL_APPEARANCES[appearanceNav.index];
      if (selected) {
        setAppearance(selected.value);
        onThemeChange?.({ name: themeName, appearance: selected.value });
      }
      setThemeSubStep("name");
      if (nextStep === "traits") {
        setFirstRunStep("traits");
      } else {
        setEditingField(null);
      }
    },
    [appearanceNav.index, themeName, onThemeChange],
  );

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
      if (firstRunStep === "theme") {
        if (themeSubStep === "name") {
          if (key.upArrow) themeNameNav.handleUp();
          if (key.downArrow) themeNameNav.handleDown();
          if (key.return) handleThemeNameSelect();
        } else {
          if (key.upArrow) appearanceNav.handleUp();
          if (key.downArrow) appearanceNav.handleDown();
          if (key.return) handleAppearanceSelect("traits");
        }
        return;
      }

      if (firstRunStep === "traits") {
        if (key.upArrow) traitNav.handleUp();
        if (key.downArrow) traitNav.handleDown();
        if (ch === " ") toggleTrait();
        if (key.return) setFirstRunStep("tone");
        return;
      }

      if (firstRunStep === "tone") {
        if (key.upArrow) toneNav.handleUp();
        if (key.downArrow) toneNav.handleDown();
        if (key.return) {
          const selected = ALL_TONES[toneNav.index];
          if (selected) setTone(selected.value);
          setFirstRunStep("style");
        }
        return;
      }

      if (firstRunStep === "style") {
        if (key.upArrow) styleNav.handleUp();
        if (key.downArrow) styleNav.handleDown();
        if (key.return) {
          const selected = ALL_STYLES[styleNav.index];
          if (selected) setStyle(selected.value);
          setTimeout(() => onSave(buildConfig()), 0);
        }
        return;
      }
      return;
    }

    // --- Edit profile mode ---
    if (editProfile) {
      if (!editingField) {
        if (key.upArrow) editMenuNav.handleUp();
        if (key.downArrow) editMenuNav.handleDown();
        if (key.return) {
          const item = editMenuItems[editMenuNav.index];
          if (item?.key === "save") {
            onSave(buildConfig());
          } else if (item) {
            setEditingField(item.key);
          }
        }
        return;
      }

      if (editingField === "theme") {
        if (themeSubStep === "name") {
          if (key.upArrow) themeNameNav.handleUp();
          if (key.downArrow) themeNameNav.handleDown();
          if (key.return) handleThemeNameSelect();
        } else {
          if (key.upArrow) appearanceNav.handleUp();
          if (key.downArrow) appearanceNav.handleDown();
          if (key.return) handleAppearanceSelect(null);
        }
        return;
      }

      if (editingField === "traits") {
        if (key.upArrow) traitNav.handleUp();
        if (key.downArrow) traitNav.handleDown();
        if (ch === " ") toggleTrait();
        if (key.return) setEditingField(null);
        return;
      }

      if (editingField === "tone") {
        if (key.upArrow) toneNav.handleUp();
        if (key.downArrow) toneNav.handleDown();
        if (key.return) {
          const selected = ALL_TONES[toneNav.index];
          if (selected) setTone(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "style") {
        if (key.upArrow) styleNav.handleUp();
        if (key.downArrow) styleNav.handleDown();
        if (key.return) {
          const selected = ALL_STYLES[styleNav.index];
          if (selected) setStyle(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "voice") {
        if (key.upArrow) voiceNav.handleUp();
        if (key.downArrow) voiceNav.handleDown();
        if (key.return) setEditingField(null);
        return;
      }

      if (editingField === "pitch") {
        if (key.upArrow) pitchNav.handleUp();
        if (key.downArrow) pitchNav.handleDown();
        if (key.return) {
          const selected = ALL_PITCHES[pitchNav.index];
          if (selected) setPitch(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "volume") {
        if (key.upArrow) volumeNav.handleUp();
        if (key.downArrow) volumeNav.handleDown();
        if (key.return) {
          const selected = ALL_VOLUMES[volumeNav.index];
          if (selected) setVolume(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "provider") {
        if (key.upArrow) providerNav.handleUp();
        if (key.downArrow) providerNav.handleDown();
        if (key.return) {
          const selected = ALL_PROVIDERS[providerNav.index];
          if (selected) setProvider(selected.value);
          setEditingField(null);
        }
        return;
      }

      if (editingField === "ttsProvider") {
        if (key.upArrow) ttsProviderNav.handleUp();
        if (key.downArrow) ttsProviderNav.handleDown();
        if (key.return) {
          const selected = ALL_TTS_PROVIDERS[ttsProviderNav.index];
          if (selected) {
            setTtsProvider(selected.value);
            // Reset voice index when switching TTS providers
            voiceNav.setIndex(0);
            // Reset pitch/volume to defaults when switching to OpenAI (unsupported)
            if (selected.value === "openai") {
              setPitch("default");
              setVolume("normal");
            }
          }
          setEditingField(null);
        }
        return;
      }

      if (editingField === "saveAudio") {
        if (key.return) {
          setSaveAudio((prev) => !prev);
          setEditingField(null);
        }
        return;
      }

      if (
        editingField === "model" ||
        editingField === "ttsModel" ||
        editingField === "ttsSpeed" ||
        editingField === "customInstructions"
      ) {
        // Handled by TextInput onSubmit
        return;
      }
    }
  });

  // --- Render: First-run mode ---
  if (isFirstRun && !editProfile) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold color={theme.accent}>
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

          {firstRunStep === "theme" && themeSubStep === "name" && (
            <SelectionList
              title="Color theme (Enter to confirm):"
              items={ALL_THEME_NAMES}
              selectedIndex={themeNameNav.index}
            />
          )}

          {firstRunStep === "theme" && themeSubStep === "appearance" && (
            <SelectionList
              title="Appearance mode (Enter to confirm):"
              items={ALL_APPEARANCES}
              selectedIndex={appearanceNav.index}
            />
          )}

          {firstRunStep === "traits" && (
            <>
              <SelectionList
                title="Cognitive traits (Space to toggle, Enter to confirm):"
                items={ALL_TRAITS}
                selectedIndex={traitNav.index}
                checkedValues={selectedTraits as unknown as Set<string>}
              />
              <Text dimColor>
                Selected: {selectedTraits.size > 0 ? [...selectedTraits].join(", ") : "none"}
              </Text>
            </>
          )}

          {firstRunStep === "tone" && (
            <SelectionList
              title="Tone (Enter to confirm):"
              items={ALL_TONES}
              selectedIndex={toneNav.index}
            />
          )}

          {firstRunStep === "style" && (
            <SelectionList
              title="Summary style (Enter to confirm):"
              items={ALL_STYLES}
              selectedIndex={styleNav.index}
            />
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
      <Text bold color={theme.accent}>
        Edit Profile: {defaults.profileName}
      </Text>

      <Box marginTop={1} flexDirection="column">
        {!editingField &&
          editMenuItems.map((item, i) => {
            const prevSection = i > 0 ? editMenuItems[i - 1]?.section : undefined;
            const showHeader = item.section && item.section !== prevSection;

            let current = "";
            if (item.key === "theme") current = `${themeName} / ${appearance}`;
            if (item.key === "traits")
              current = selectedTraits.size > 0 ? [...selectedTraits].join(", ") : "none";
            if (item.key === "tone") current = tone;
            if (item.key === "style") current = style;
            if (item.key === "model") current = selectedModel;
            if (item.key === "provider") current = provider;
            if (item.key === "ttsProvider") current = ttsProvider;
            if (item.key === "ttsModel") current = selectedTtsModel;
            if (item.key === "voice") current = voices[voiceNav.index]?.label ?? "";
            if (item.key === "ttsSpeed") current = `${ttsSpeedInput}x`;
            if (item.key === "pitch") current = pitch;
            if (item.key === "volume") current = volume;
            if (item.key === "saveAudio") current = saveAudio ? "on" : "off";
            if (item.key === "customInstructions")
              current = customInstructions ? `"${customInstructions.slice(0, 30)}..."` : "none";

            return (
              <Box key={item.key} flexDirection="column">
                {showHeader && item.section && (
                  <Text bold color={theme.brand}>
                    {i > 0 ? "\n" : ""}
                    {item.section}
                  </Text>
                )}
                <Text {...(i === editMenuNav.index ? { color: theme.accent } : {})}>
                  {!item.section && i > 0 ? "\n" : ""}
                  {i === editMenuNav.index ? ">" : " "} {item.label}
                  {item.key !== "save" && <Text dimColor> ({current})</Text>}
                </Text>
              </Box>
            );
          })}

        {editingField === "theme" && themeSubStep === "name" && (
          <SelectionList
            title="Color theme (Enter to confirm):"
            items={ALL_THEME_NAMES}
            selectedIndex={themeNameNav.index}
          />
        )}

        {editingField === "theme" && themeSubStep === "appearance" && (
          <SelectionList
            title="Appearance mode (Enter to confirm):"
            items={ALL_APPEARANCES}
            selectedIndex={appearanceNav.index}
          />
        )}

        {editingField === "traits" && (
          <SelectionList
            title="Cognitive traits (Space to toggle, Enter to go back):"
            items={ALL_TRAITS}
            selectedIndex={traitNav.index}
            checkedValues={selectedTraits as unknown as Set<string>}
          />
        )}

        {editingField === "tone" && (
          <SelectionList
            title="Tone (Enter to confirm):"
            items={ALL_TONES}
            selectedIndex={toneNav.index}
          />
        )}

        {editingField === "style" && (
          <SelectionList
            title="Summary style (Enter to confirm):"
            items={ALL_STYLES}
            selectedIndex={styleNav.index}
          />
        )}

        {editingField === "ttsProvider" && (
          <SelectionList
            title="TTS Provider (Enter to confirm):"
            items={ALL_TTS_PROVIDERS}
            selectedIndex={ttsProviderNav.index}
          />
        )}

        {editingField === "ttsModel" && (
          <Box flexDirection="column">
            <Text>TTS Model (Enter to confirm):</Text>
            <Text dimColor>e.g. tts-1, tts-1-hd, gpt-4o-mini-tts</Text>
            <TextInput
              value={ttsModelInput}
              onChange={setTtsModelInput}
              onSubmit={(value) => {
                if (value.trim()) setSelectedTtsModel(value.trim());
                setEditingField(null);
              }}
            />
          </Box>
        )}

        {editingField === "voice" && (
          <SelectionList
            title="TTS Voice (Enter to confirm):"
            items={voices}
            selectedIndex={voiceNav.index}
          />
        )}

        {editingField === "pitch" && (
          <SelectionList
            title="Pitch (Enter to confirm):"
            items={ALL_PITCHES}
            selectedIndex={pitchNav.index}
          />
        )}

        {editingField === "volume" && (
          <SelectionList
            title="Volume (Enter to confirm):"
            items={ALL_VOLUMES}
            selectedIndex={volumeNav.index}
          />
        )}

        {editingField === "provider" && (
          <SelectionList
            title="Provider (Enter to confirm):"
            items={ALL_PROVIDERS}
            selectedIndex={providerNav.index}
          />
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

        {editingField === "saveAudio" && (
          <Box flexDirection="column">
            <Text>Auto-save audio: {saveAudio ? "on" : "off"}</Text>
            <Text dimColor>Press Enter to toggle {saveAudio ? "off" : "on"}</Text>
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
            <Text>Model (Enter to confirm):</Text>
            <Text dimColor>Alias (e.g. haiku, sonnet, opus) or full model ID</Text>
            <TextInput
              value={modelInput}
              onChange={setModelInput}
              onSubmit={(value) => {
                if (value.trim()) setSelectedModel(value.trim());
                setEditingField(null);
              }}
            />
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{editingField ? "[Esc] back to menu" : "[Esc] cancel"}</Text>
      </Box>
    </Box>
  );
}
