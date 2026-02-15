import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, Wrench } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "@/components/chat-input";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppContext } from "@/lib/app-context";
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
  const {
    chatMessages: messages,
    setChatMessages: setMessages,
    activeConversationId,
    setActiveConversationId
  } = useAppContext();

  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

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
  }, [messages, thinkingMessage, isStreaming]);

  // System prompt is built server-side. We just send context signals.
  const getMinimalSystemHint = () => {
    if (challengeContext) {
      return `Student is working on challenge: "${challengeContext.title}". Help them without giving full solutions.`;
    }
    return "Student is in learning mode — help them learn and grow.";
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setThinkingMessage(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let currentConvId = activeConversationId;

    try {
      const sessionId = (() => {
        let id = localStorage.getItem("codequest-session-id");
        if (!id) {
          id = Math.random().toString(36).substring(2, 11);
          localStorage.setItem("codequest-session-id", id);
        }
        return id;
      })();

      // If no active conversation, create one
      if (!currentConvId) {
        const convRes = await fetch("/api/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({
            title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          }),
        });
        if (convRes.ok) {
          const conv = await convRes.json();
          currentConvId = conv.id;
          setActiveConversationId(conv.id);
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        }
      }

      const response = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: getMinimalSystemHint(),
          mode: "learn",
          challengeContext,
          currentCode,
          conversationId: currentConvId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      let assistantMessageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.thinking) {
                setThinkingMessage(data.thinking);
              }

              if (data.content) {
                setThinkingMessage(null);
                if (!assistantMessageAdded) {
                  setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
                  assistantMessageAdded = true;
                }
                assistantContent += data.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  if (updated[updated.length - 1].role === "assistant") {
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: assistantContent,
                    };
                  }
                  return updated;
                });
              }

              if (data.done && currentConvId) {
                // Save assistant message when done
                await fetch(`/api/conversations/${currentConvId}/messages`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-session-id": sessionId,
                  },
                  body: JSON.stringify({
                    role: "assistant",
                    content: assistantContent,
                  }),
                });
                break;
              }

              if (data.toolResult) {
                if (data.toolResult.type === "challenge_created") {
                  queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
                }
              }
            } catch { }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Mentor chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setThinkingMessage(null);
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
                className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${msg.role === "user"
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

          {isStreaming && (
            <div className="flex gap-2 justify-start animate-in fade-in duration-300">
              <Avatar className={`${compact ? "w-6 h-6" : "w-7 h-7"} flex-shrink-0 mt-0.5`}>
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-md px-3 py-2 flex flex-col gap-1.5">
                {thinkingMessage && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium pb-1 border-b border-white/5">
                    <Wrench className="w-2.5 h-2.5 animate-pulse" />
                    <span>{thinkingMessage}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" />
                </div>
              </div>
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
