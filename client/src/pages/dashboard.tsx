import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  Loader2,
  Map,
  GraduationCap,
  Code2,
  BookOpen,
  Lightbulb,
  Rocket,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/lib/app-context";
import type { Challenge, UserProfile, LearningPlan } from "@shared/schema";

const ACTION_PILLS = [
  { label: "Plan", icon: Map, mode: "plan" as const, prompt: "Help me create a learning plan for coding" },
  { label: "Learn", icon: GraduationCap, mode: "learn" as const, prompt: "I want to learn something new" },
  { label: "Code", icon: Code2, mode: "learn" as const, prompt: "Give me a coding challenge to practice" },
  { label: "Explain", icon: Lightbulb, mode: "learn" as const, prompt: "Explain a programming concept to me" },
  { label: "Review", icon: BookOpen, mode: "learn" as const, prompt: "Review my recent progress and suggest next steps" },
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

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: challenge } = useQuery<Challenge>({
    queryKey: ["/api/challenges", null],
    enabled: false,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const generateChallengeMutation = useMutation({
    mutationFn: async (params: { topic: string; difficulty: string; language: string }) => {
      const res = await apiRequest("POST", "/api/challenges/generate", params);
      return res.json();
    },
    onSuccess: (data: Challenge) => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setActiveChallengeId(data.id);
      navigate(`/ide?challenge=${data.id}`);
    },
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const summary = chatMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const res = await apiRequest("POST", "/api/plans/generate", {
        conversationSummary: summary,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
    },
  });

  const buildSystemPrompt = () => {
    let prompt = `You are Tilper AI, a warm, friendly AI mentor for teenage developers. You help them learn coding through personalized guidance.

Be conversational, encouraging, and use casual language appropriate for teens. Keep responses concise (2-4 sentences typically). Ask one question at a time to understand their needs.

${profile?.name ? `The student's name is ${profile.name}.` : ""}
${profile?.experience ? `Experience level: ${profile.experience}` : ""}
${profile?.goals ? `Goals: ${profile.goals}` : ""}
${profile?.preferredLanguage ? `Preferred language: ${profile.preferredLanguage}` : ""}`;

    if (mode === "plan") {
      prompt += `\n\nYou're helping the student plan their learning journey. Ask about what they want to learn, their interests, and create a roadmap.
When you have enough information about what they want to learn, tell them you can generate a personalized learning plan - suggest they ask you to "create my plan" or similar.`;
    } else {
      prompt += `\n\nYou're helping the student learn and practice coding. You can:
- Explain concepts clearly with examples
- Help debug code
- Suggest practice problems
- Give hints rather than full solutions
When they want to practice a specific topic, suggest generating a challenge for them.`;
    }

    return prompt;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage = { role: "user" as const, content: content.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setInput("");
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
              if (data.content) {
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handlePillClick = (pill: typeof ACTION_PILLS[number]) => {
    setMode(pill.mode);
    sendMessage(pill.prompt);
  };

  const handleNewChat = () => {
    setChatMessages([]);
    setIsInChat(false);
    setMode("plan");
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
          </div>

          <div className="w-full max-w-xl mb-6">
            <div className="relative bg-card border border-border rounded-md">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How can I help you today?"
                className="w-full bg-transparent resize-none text-sm px-4 pt-3 pb-10 min-h-[80px] focus:outline-none"
                rows={2}
                data-testid="input-main-chat"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  data-testid="button-send-main"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-background/50 [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:text-xs [&_code]:text-xs [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || "\u200B"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
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

          {isStreaming && chatMessages[chatMessages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs pl-10">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-card border border-border rounded-md">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="w-full bg-transparent resize-none text-sm px-4 pt-3 pb-10 min-h-[56px] focus:outline-none"
              rows={1}
              data-testid="input-chat"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <Button
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                data-testid="button-send-chat"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
