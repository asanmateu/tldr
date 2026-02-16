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
export type TtsMode = "strip" | "rewrite";
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
  ttsMode?: TtsMode | undefined;
  provider?: SummarizationProvider | undefined;
}

export interface TldrSettings {
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  maxTokens?: number | undefined;
  outputDir?: string | undefined;
  activeProfile: string;
  profiles: Record<string, Profile>;
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
  ttsMode: TtsMode;
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

export type AppState =
  | "idle"
  | "extracting"
  | "summarizing"
  | "result"
  | "error"
  | "config"
  | "chat";

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
  ): Promise<string>;

  rewrite(markdown: string, config: Config, systemPrompt: string): Promise<string>;

  chat(
    config: Config,
    systemPrompt: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
  ): Promise<string>;
}
