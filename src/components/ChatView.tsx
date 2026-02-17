import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useState } from "react";
import { useTheme } from "../lib/ThemeContext.js";
import { chatWithSession } from "../lib/chat.js";
import type { ChatMessage, Config } from "../lib/types.js";

interface ChatViewProps {
  config: Config;
  summaryContent: string;
  onExit: () => void;
}

export function ChatView({ config, summaryContent, onExit }: ChatViewProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputValue("");
      setIsStreaming(true);
      setStreamingResponse("");

      try {
        const response = await chatWithSession(config, summaryContent, updatedMessages, (chunk) =>
          setStreamingResponse((prev) => prev + chunk),
        );

        const assistantMessage: ChatMessage = { role: "assistant", content: response };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "Sorry, something went wrong. Try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
        setStreamingResponse("");
      }
    },
    [messages, isStreaming, config, summaryContent],
  );

  useInput((ch, key) => {
    if (key.escape && !isStreaming) {
      onExit();
      return;
    }
    if (ch === "q" && !isStreaming && inputValue === "") {
      onExit();
    }
  });

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

      <Box>
        <Text dimColor>{isStreaming ? "" : "[Esc] back · [q] back (when empty)"}</Text>
      </Box>
    </Box>
  );
}
