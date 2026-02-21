import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "../lib/ThemeContext.js";
import { chatWithSession } from "../lib/chat.js";
import type { ChatMessage, Config } from "../lib/types.js";

interface ChatViewProps {
  config: Config;
  summaryContent: string;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  chatSaveEnabled: boolean;
  onSave: (messages: ChatMessage[]) => Promise<void>;
  onAutoSave: (messages: ChatMessage[]) => Promise<void>;
  onExit: () => void;
}

export function ChatView({
  config,
  summaryContent,
  messages,
  onMessagesChange,
  chatSaveEnabled,
  onSave,
  onAutoSave,
  onExit,
}: ChatViewProps) {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [toast, setToast] = useState<string | undefined>(undefined);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast(undefined);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const updatedMessages = [...messages, userMessage];
      onMessagesChange(updatedMessages);
      setInputValue("");
      setIsStreaming(true);
      setStreamingResponse("");

      try {
        const response = await chatWithSession(config, summaryContent, updatedMessages, (chunk) =>
          setStreamingResponse((prev) => prev + chunk),
        );

        const assistantMessage: ChatMessage = { role: "assistant", content: response };
        const newMessages = [...updatedMessages, assistantMessage];
        onMessagesChange(newMessages);

        if (chatSaveEnabled) {
          onAutoSave(newMessages);
        }
      } catch {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "Sorry, something went wrong. Try again.",
        };
        const newMessages = [...updatedMessages, errorMessage];
        onMessagesChange(newMessages);

        if (chatSaveEnabled) {
          onAutoSave(newMessages);
        }
      } finally {
        setIsStreaming(false);
        setStreamingResponse("");
      }
    },
    [messages, isStreaming, config, summaryContent, onMessagesChange, chatSaveEnabled, onAutoSave],
  );

  useInput((ch, key) => {
    if (key.escape && !isStreaming) {
      onExit();
      return;
    }
    if (key.ctrl && ch === "s" && !isStreaming) {
      onSave(messages).then(() => showToast("Chat saved"));
      return;
    }
    if (ch === "q" && !isStreaming && inputValue === "") {
      onExit();
    }
  });

  const footerHint = chatSaveEnabled
    ? "[Esc] back · [q] back (when empty) · auto-saving chat"
    : "[Esc] back · [q] back (when empty) · [Ctrl+s] save chat";

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color={theme.accent}>
          Chat — ask questions about this summary
        </Text>
      </Box>

      {messages.map((msg, i) => (
        <Box key={`msg-${i}-${msg.role}`} marginBottom={msg.role === "assistant" ? 1 : 0}>
          <Text bold color={msg.role === "user" ? theme.warning : theme.success}>
            {msg.role === "user" ? "You: " : "AI: "}
          </Text>
          <Text wrap="wrap">{msg.content}</Text>
        </Box>
      ))}

      {isStreaming && (
        <Box marginBottom={1}>
          <Text bold color={theme.success}>
            AI:{" "}
          </Text>
          <Text wrap="wrap">{streamingResponse}</Text>
          <Text color={theme.accent}>▊</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>─────────────────────────────────</Text>
      </Box>

      <Box>
        {isStreaming ? (
          <Text dimColor>Thinking...</Text>
        ) : (
          <Box>
            <Text bold color={theme.accent}>
              {"› "}
            </Text>
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
          </Box>
        )}
      </Box>

      {toast && (
        <Box>
          <Text color={theme.success}>{toast}</Text>
        </Box>
      )}

      <Box>
        <Text dimColor>{isStreaming ? "" : footerHint}</Text>
      </Box>
    </Box>
  );
}
