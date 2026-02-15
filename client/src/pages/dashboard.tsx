import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/lib/app-context";
import { ChatInput, type AttachedFile } from "@/components/chat-input";
import type { Challenge, UserProfile } from "@shared/schema";

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
  } = useAppContext();

  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const buildSystemPrompt = () => {
    let prompt = `You are Tilper AI, a warm, friendly AI mentor for teenage developers. You help them learn coding through personalized guidance.

Be conversational, encouraging, and use casual language appropriate for teens. Keep responses concise but thorough. Ask questions to understand their needs.

${profile?.name ? `The student's name is ${profile.name}.` : ""}
${profile?.experience ? `Experience level: ${profile.experience}` : ""}
${profile?.goals ? `Goals: ${profile.goals}` : ""}
${profile?.preferredLanguage ? `Preferred language: ${profile.preferredLanguage}` : ""}`;

    if (mode === "plan") {
      prompt += `\n\nYou're in PLAN mode - helping the student plan their learning journey. Ask about what they want to learn, their interests, career goals, and create a roadmap.
When you have enough information, tell them you can generate a personalized learning plan - suggest they ask you to "create my plan" or similar.
If they mention career goals (like working at a specific company), think about what skills they'd need and help them plan accordingly.`;
    } else {
      prompt += `\n\nYou're in LEARN mode - helping the student learn and practice coding. You can:
- Explain concepts clearly with examples
- Help debug code
- Suggest practice problems
- Give hints rather than full solutions
When they want to practice a specific topic, suggest generating a challenge for them.`;
    }

    return prompt;
  };

  const sendMessage = async (content: string, _files?: AttachedFile[]) => {
    if (!content.trim() || isStreaming) return;

    const userMessage = { role: "user" as const, content: content.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setIsInChat(true);
    setIsStreaming(true);

    const lowerContent = content.toLowerCase();
    if (
      (lowerContent.includes("create") || lowerContent.includes("generate") || lowerContent.includes("build") || lowerContent.includes("make")) &&
      (lowerContent.includes("plan") || lowerContent.includes("roadmap") || lowerContent.includes("learning path"))
    ) {
      try {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        const allMessages = [...chatMessages, userMessage];
        const summary = allMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
        const res = await apiRequest("POST", "/api/plans/generate", { conversationSummary: summary });
        const plan = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
        const topics = (plan.topics as any[]) || [];
        const topicList = topics.map((t: any, i: number) => `${i + 1}. **${t.title}** - ${t.description}`).join("\n");
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `I've created your personalized learning plan: **${plan.title}**!\n\nHere's what we'll cover:\n${topicList}\n\nYou can find it in the sidebar. Click any topic to start a challenge, or ask me to explain any concept first!`,
          };
          return updated;
        });
      } catch {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I had trouble creating your plan. Could you tell me more about what you want to learn?",
          };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
      return;
    }

    try {
      const response = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": localStorage.getItem("codequest-session-id") || "",
        },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: buildSystemPrompt(),
          mode,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
                assistantContent += data.content;
                setChatMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
              if (data.toolResult) {
                const toolData = data.toolResult;
                if (toolData.type === "challenge_created" && toolData.challenge) {
                  queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
                  setActiveChallengeId(toolData.challenge.id);
                }
                if (toolData.type === "plan_created") {
                  queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
                }
              }
            } catch {}
          }
        }
      }
    } catch {
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
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

          <div className="flex flex-wrap items-center justify-center gap-2" data-testid="action-pills">
            {ACTION_PILLS.map((pill) => (
              <Button
                key={pill.label}
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full"
                onClick={() => handlePillClick(pill)}
                data-testid={`pill-${pill.label.toLowerCase()}`}
              >
                <pill.icon className="w-3.5 h-3.5" />
                {pill.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {isInChat && chatMessages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge variant="outline" className="gap-1.5 text-xs no-default-hover-elevate no-default-active-elevate">
                {mode === "plan" ? <Map className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                {mode === "plan" ? "Plan mode" : "Learn mode"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === "plan"
                ? "Tell me about your goals and I'll help you map out a learning journey"
                : "Ask me anything about coding - I'm here to help you learn"}
            </p>
          </div>
        </div>
      )}

      {chatMessages.length > 0 && (
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-message-${msg.role}-${i}`}
              >
                {msg.role === "assistant" && (
                  <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-md px-3.5 py-2.5 text-sm ${
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
                  <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      {profile?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isStreaming && (chatMessages[chatMessages.length - 1]?.content === "" || thinkingMessage) && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs pl-10">
                <Loader2 className="w-3 h-3 animate-spin" />
                {thinkingMessage || "Thinking..."}
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      <div className="border-t p-3">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming}
            placeholder={mode === "plan" ? "Tell me about your learning goals..." : "Ask me anything..."}
            mode={mode}
            onModeChange={handleModeChange}
            variant="inline"
          />
        </div>
      </div>
    </div>
  );
}
