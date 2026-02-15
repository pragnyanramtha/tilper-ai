import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat-input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { UserProfile } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MentorChatProps {
  challengeContext?: {
    id: number;
    title: string;
    description: string;
    language: string;
  };
  compact?: boolean;
  currentCode?: string;
}

export function MentorChat({ challengeContext, compact = false, currentCode }: MentorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildSystemPrompt = () => {
    let prompt = `You are Tilper AI, a friendly coding mentor helping a teen developer.`;

    if (challengeContext) {
      prompt += ` The student is currently working on a coding challenge.

Challenge: "${challengeContext.title}"
Description: ${challengeContext.description}
Language: ${challengeContext.language}

Help them with:
- Understanding the problem
- Debugging their code
- Explaining concepts related to the challenge
- Giving hints (not full solutions) when they're stuck
- Encouraging them when they make progress

Be concise and conversational. Use code examples when helpful.`;
      if (currentCode) {
        prompt += `\n\nThe student's current code:\n\`\`\`${challengeContext.language}\n${currentCode}\n\`\`\``;
      }
    } else {
      prompt += ` Be conversational, encouraging, and help them learn.`;
    }

    return prompt;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": localStorage.getItem("codequest-session-id") || "",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: buildSystemPrompt(),
          mode: "learn",
          challengeContext,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className={`${compact ? "p-3 space-y-3" : "p-4 space-y-4"}`}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1" data-testid="text-mentor-title">
                {challengeContext ? "Need help with this challenge?" : "Ask your AI mentor"}
              </p>
              <p className="text-xs text-muted-foreground max-w-[240px]">
                {challengeContext
                  ? "I can explain concepts, give hints, or help you debug your code"
                  : "I'm here to help you learn and grow as a developer"}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`mentor-message-${msg.role}-${i}`}
            >
              {msg.role === "assistant" && (
                <Avatar className={`${compact ? "w-6 h-6" : "w-7 h-7"} flex-shrink-0 mt-0.5`}>
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:text-xs [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_li]:text-sm [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || "\u200B"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <Avatar className={`${compact ? "w-6 h-6" : "w-7 h-7"} flex-shrink-0 mt-0.5`}>
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {profile?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs pl-8">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          placeholder={challengeContext ? "Ask about this challenge..." : "Ask your mentor..."}
          variant="inline"
        />
      </div>
    </div>
  );
}
