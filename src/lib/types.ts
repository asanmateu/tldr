export type InputType =
  | "url"
  | "url:pdf"
  | "url:image"
  | "url:slack"
  | "url:youtube"
  | "url:notion"
  | "url:arxiv"
  | "file"
  | "file:pdf"
  | "file:image"
  | "text";

export interface ClassifiedInput {
  type: InputType;
  value: string;
}

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export interface ImageData {
  base64: string;
  mediaType: ImageMediaType;
  filePath?: string | undefined;
}

export interface ExtractionResult {
  title?: string | undefined;
  author?: string | undefined;
  date?: string | undefined;
  content: string;
  wordCount: number;
  source: string;
  partial?: boolean | undefined;
  image?: ImageData | undefined;
}

export interface TldrResult {
  extraction: ExtractionResult;
  summary: string;
  timestamp: number;
}

// --- Profile-based configuration ---

export type CognitiveTrait = "dyslexia" | "adhd" | "autism" | "esl" | "visual-thinker";
export type Tone = "casual" | "professional" | "academic" | "eli5";
export type SummaryStyle = "quick" | "standard" | "detailed" | "study-notes";
export type ModelTier = "haiku" | "sonnet" | "opus";
export type PitchPreset = "low" | "default" | "high";
export type VolumePreset = "quiet" | "normal" | "loud";
export type SummarizationProvider = "api" | "cli";

export interface Profile {
  cognitiveTraits: CognitiveTrait[];
  tone: Tone;
  summaryStyle: SummaryStyle;
  customInstructions?: string | undefined;
  model?: string | undefined;
  styleModels?: Partial<Record<SummaryStyle, string>> | undefined;
  voice?: string | undefined;
  ttsSpeed?: number | undefined;
  pitch?: PitchPreset | undefined;
  volume?: VolumePreset | undefined;
  provider?: SummarizationProvider | undefined;
}

export interface TldrSettings {
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  maxTokens?: number | undefined;
  outputDir?: string | undefined;
  activeProfile: string;
  profiles: Record<string, Profile>;
  theme?: ThemeConfig | undefined;
  setupCompleted?: boolean | undefined;
}

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string | undefined;
  maxTokens: number;
  profileName: string;
  cognitiveTraits: CognitiveTrait[];
  tone: Tone;
  summaryStyle: SummaryStyle;
  model: string;
  customInstructions: string | undefined;
  voice: string;
  ttsSpeed: number;
  pitch: PitchPreset;
  volume: VolumePreset;
  provider: SummarizationProvider;
  outputDir: string;
}

export type Config = ResolvedConfig;

export interface ConfigOverrides {
  profileName?: string | undefined;
  model?: string | undefined;
  style?: string | undefined;
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  provider?: string | undefined;
}

export interface SessionPaths {
  sessionDir: string;
  summaryPath: string;
  audioPath: string;
}

// --- Theme configuration ---

export type ThemeName = "coral" | "ocean" | "forest";
export type AppearanceMode = "dark" | "light" | "auto";

export interface ThemePalette {
  brand: string;
  brandBorder: string;
  brandAccent: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeConfig {
  name: ThemeName;
  appearance: AppearanceMode;
}

export type AppState =
  | "idle"
  | "extracting"
  | "summarizing"
  | "result"
  | "error"
  | "config"
  | "chat"
  | "help"
  | "history";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Provider {
  summarize(
    config: Config,
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
    image?: ImageData,
    signal?: AbortSignal,
  ): Promise<string>;

  rewrite(markdown: string, config: Config, systemPrompt: string): Promise<string>;

  chat(
    config: Config,
    systemPrompt: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
  ): Promise<string>;
}
