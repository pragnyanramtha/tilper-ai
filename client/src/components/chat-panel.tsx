import { useState, useRef, useEffect, Fragment, type KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles, Wrench, BookOpen, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppContext } from "@/lib/app-context";
import type { UserProfile, Challenge } from "@shared/schema";

type LessonEvent = { type: "plan_created"; title: string } | { type: "challenge_created"; title: string };

function LessonEventBubble({ event }: { event: LessonEvent }) {
  if (event.type === "plan_created") {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
          <BookOpen className="w-3.5 h-3.5" />
          <span>📚 Learning plan created: <strong>{event.title}</strong></span>
        </div>
      </div>
    );
  }
  if (event.type === "challenge_created") {
    return (
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Trophy className="w-3.5 h-3.5" />
          <span>⚡ Challenge dropped: <strong>{event.title}</strong></span>
        </div>
      </div>
    );
  }
  return null;
}

export function ChatPanel() {
  const { mode, chatMessages, setChatMessages, activeChallengeId, activeConversationId, setActiveConversationId, sessionId } = useAppContext();
  const [lessonEvents, setLessonEvents] = useState<Map<number, LessonEvent>>(new Map());
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinking, setThinking] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: challenge } = useQuery<Challenge>({
    queryKey: ["/api/challenges", activeChallengeId],
    enabled: !!activeChallengeId,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, thinking, isStreaming]);

  // System prompt is built server-side. Frontend sends only mode signal.
  const getMinimalSystemHint = () => {
    if (mode === "plan") {
      return "Student is in planning mode — help them design their learning journey.";
    }
    return "Student is in learning mode — help them work through coding challenges.";
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage = { role: "user" as const, content: content.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setThinking(null);

    const challengeCtx = challenge
      ? {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        language: challenge.language,
      }
      : undefined;

    let currentConvId = activeConversationId;

    try {

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
          messages: [...chatMessages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: getMinimalSystemHint(),
          challengeContext: challengeCtx,
          conversationId: currentConvId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      let assistantMessageAdded = false;
      let streamDone = false;
      let pendingLessonEvent: LessonEvent | null = null;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.thinking) {
              setThinking(data.thinking);
            }

            if (data.error) {
              // Server errored mid-stream — show friendly message
              streamDone = true;
              setThinking(null);
              setChatMessages((prev) => [
                ...prev,
                { role: "assistant", content: "⚠️ I ran into a connection issue. Please try again in a moment." },
              ]);
              break;
            }

            if (data.toolResult) {
              const { type } = data.toolResult;
              if (type === "plan_created") {
                pendingLessonEvent = { type: "plan_created", title: data.toolResult.plan?.title || "Your Plan" };
                queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
              } else if (type === "challenge_created") {
                pendingLessonEvent = { type: "challenge_created", title: data.toolResult.challenge?.title || "Challenge" };
                queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
              }
            }

            if (data.content) {
              setThinking(null);
              if (!assistantMessageAdded) {
                setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
                assistantMessageAdded = true;
              }
              assistantContent += data.content;
              setChatMessages((prev) => {
                const updated = [...prev];
                if (updated[updated.length - 1].role === "assistant") {
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                }
                return updated;
              });
            }

            if (data.done) {
              streamDone = true;
              setThinking(null);
              if (pendingLessonEvent) {
                setChatMessages((prev) => {
                  const idx = prev.length - 1;
                  setTimeout(() => setLessonEvents((m) => new Map(m).set(idx, pendingLessonEvent!)), 0);
                  return prev;
                });
              }
              break;
            }
          } catch { }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsStreaming(false);
      setThinking(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const getPlaceholder = () => {
    if (mode === "plan") return "Tell me what you'd like to learn...";
    return "Ask your mentor for help...";
  };

  const getEmptyState = () => {
    if (mode === "plan") {
      return {
        title: "Let's plan your learning",
        subtitle: profile?.name
          ? `Hey ${profile.name}! Tell me what you want to learn`
          : "I'll help you build a personalized coding journey",
      };
    }
    return {
      title: "Your AI Mentor",
      subtitle: "Ask me anything about the challenge or coding concepts",
    };
  };

  const empty = getEmptyState();

  return (
    <div className="flex flex-col h-full border-l border-white/10 dark:bg-[#141516]/50 bg-white/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 p-4 border-b border-white/10 glass sticky top-0 z-10">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 shadow-sm">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-wide">
          {mode === "plan" ? "Plan" : "Mentor"}
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4 space-y-6">
          {chatMessages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6 shadow-inner ring-1 ring-white/10">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-semibold mb-2 tracking-tight" data-testid="text-chat-title">
                {empty.title}
              </p>
              <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
                {empty.subtitle}
              </p>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <Fragment key={i}>
              <div
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                data-testid={`chat-message-${msg.role}-${i}`}
              >
                {msg.role === "assistant" && (
                  <Avatar className="w-8 h-8 flex-shrink-0 mt-1 shadow-sm ring-1 ring-white/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
                      AI
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm shadow-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "glass-panel text-foreground"
                    }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_pre]:bg-black/30 [&_pre]:backdrop-blur-md [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:text-xs [&_code]:text-xs [&_p]:leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || "\u200B"}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <Avatar className="w-8 h-8 flex-shrink-0 mt-1 shadow-sm ring-1 ring-white/20">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                      {profile?.name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              {lessonEvents.has(i) && <LessonEventBubble event={lessonEvents.get(i)!} />}
            </Fragment>
          ))}

          {isStreaming && (
            <div className="flex gap-3 justify-start animate-in fade-in duration-300">
              <Avatar className="w-8 h-8 flex-shrink-0 mt-1 shadow-sm ring-1 ring-white/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="glass-panel rounded-2xl px-5 py-3.5 flex flex-col gap-2">
                {thinking && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/80 font-medium pb-1 border-b border-white/5 mb-1">
                    <Wrench className="w-3 h-3 animate-pulse" />
                    <span>{thinking}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="resize-none text-sm min-h-[36px] max-h-[100px]"
            rows={1}
            data-testid="input-chat"
          />
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
  );
}
