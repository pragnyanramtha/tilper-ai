import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlanViewer } from "@/components/plan-viewer";
import {
  Sparkles,
  Loader2,
  Map,
  GraduationCap,
  Code2,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppContext } from "@/lib/app-context";
import { ChatInput, type AttachedFile } from "@/components/chat-input";
import { localStorageService } from "@/lib/storage";

const ACTION_PILLS = [
  { label: "Plan", icon: Map, mode: "plan" as const, hint: "Map out your learning journey" },
  { label: "Learn", icon: GraduationCap, mode: "learn" as const, hint: "Explore new concepts" },
  { label: "Code", icon: Code2, mode: "learn" as const, hint: "Practice with challenges" },
  { label: "Explain", icon: Lightbulb, mode: "learn" as const, hint: "Understand a concept" },
  { label: "Review", icon: BookOpen, mode: "learn" as const, hint: "Check your progress" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const {
    mode,
    setMode,
    chatMessages,
    setChatMessages,
    isInChat,
    setIsInChat,
    setActiveChallengeId,
    activeConversationId,
    setActiveConversationId,
    sessionId,
    activePlanId,
  } = useAppContext();

  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load profile from localStorage
  const profile = localStorageService.getProfile(sessionId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (activePlanId) {
    return <PlanViewer />;
  }

  const sendMessage = async (content: string, _files?: AttachedFile[]) => {
    if (!content.trim() || isStreaming) return;

    const userMessage = { role: "user" as const, content: content.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsInChat(true);
    setIsStreaming(true);

    let currentConvId = activeConversationId;

    try {
      // If no active conversation, create one in localStorage
      if (!currentConvId) {
        const conv = localStorageService.createConversation(
          sessionId,
          content.slice(0, 30) + (content.length > 30 ? "..." : "")
        );
        currentConvId = conv.id;
        setActiveConversationId(conv.id);
      }

      // Save user message to localStorage
      localStorageService.createMessage(currentConvId, "user", content.trim());

      const response = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
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
                  setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
                  assistantMessageAdded = true;
                }
                assistantContent += data.content;
                setChatMessages((prev) => {
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
              if (data.done) {
                // Save assistant message to localStorage
                if (currentConvId && assistantContent) {
                  localStorageService.createMessage(currentConvId, "assistant", assistantContent);
                }
                break;
              }
            } catch { }
          }
        }
      }
    } catch (error) {
      console.error("Dashboard chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setThinkingMessage(null);
    }
  };

  const handlePillClick = (pill: typeof ACTION_PILLS[number]) => {
    setMode(pill.mode);
    setIsInChat(true);
  };

  const handleModeChange = (newMode: "plan" | "learn" | null) => {
    if (newMode) setMode(newMode);
  };

  if (!isInChat && chatMessages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-7 h-7 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-greeting">
                {getGreeting()}{profile?.name ? `, ${profile.name}` : ""}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">What would you like to learn today?</p>
          </div>

          <div className="w-full max-w-xl mb-6">
            <ChatInput
              onSend={sendMessage}
              disabled={isStreaming}
              placeholder="Tell me what you want to learn..."
              mode={mode}
              onModeChange={handleModeChange}
              variant="landing"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full max-w-xl">
            {ACTION_PILLS.map((pill) => (
              <button
                key={pill.label}
                onClick={() => handlePillClick(pill)}
                className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary transition-all"
              >
                <pill.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium">{pill.label}</span>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {pill.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {chatMessages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`flex flex-col gap-1 max-w-[80%] ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
              {message.role === "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    {profile?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {thinkingMessage && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Sparkles className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-2xl">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">{thinkingMessage}</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={mode === "plan" ? "default" : "secondary"}>
              {mode === "plan" ? "Planning Mode" : "Learning Mode"}
            </Badge>
          </div>
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming}
            placeholder={
              mode === "plan"
                ? "Tell me about your goals and I'll help plan your journey..."
                : "Ask me anything or tell me what you want to practice..."
            }
            mode={mode}
            onModeChange={handleModeChange}
            variant="inline"
          />
        </div>
      </div>
    </div>
  );
}
