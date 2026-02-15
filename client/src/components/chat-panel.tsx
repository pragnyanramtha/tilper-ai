import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppContext } from "@/lib/app-context";
import type { UserProfile, Challenge } from "@shared/schema";

export function ChatPanel() {
  const { mode, chatMessages, setChatMessages, activeChallengeId } = useAppContext();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  }, [chatMessages]);

  const buildSystemPrompt = () => {
    if (mode === "plan") {
      return `You are Tilper AI, a warm, friendly AI mentor for teenage developers. You're currently in PLAN mode - your job is to have a conversation to understand what the student wants to learn.

Ask about:
- What programming topics interest them
- Their current experience level
- What projects excite them
- What language they prefer (JavaScript or Python)
- What learning style works best for them

Be conversational, encouraging, and use casual language appropriate for teens. Keep responses concise (2-4 sentences typically). Ask one question at a time.

${profile?.name ? `The student's name is ${profile.name}.` : "You don't know their name yet - feel free to ask!"}
${profile?.experience ? `Their experience level: ${profile.experience}` : ""}
${profile?.goals ? `Their goals: ${profile.goals}` : ""}

When you feel you understand what they want to learn, suggest that they click "Build my plan" to generate a personalized learning path. Don't generate the plan yourself - just suggest they use the button.`;
    }

    let buildContext = `You are Tilper AI, a friendly coding mentor for teenage developers. You're in BUILD mode - helping the student work through coding challenges.

Be encouraging but honest about errors. Give hints rather than full solutions. Use code examples when helpful. Keep responses concise.`;

    if (challenge) {
      buildContext += `\n\nCurrent challenge: "${challenge.title}"\nDescription: ${challenge.description}\nLanguage: ${challenge.language}`;
    }

    if (profile?.name) {
      buildContext += `\nStudent name: ${profile.name}`;
    }
    if (profile?.experience) {
      buildContext += `\nExperience: ${profile.experience}`;
    }

    return buildContext;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage = { role: "user" as const, content: content.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

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
    <div className="flex flex-col h-full border-l dark:bg-[#141516]/50">
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold">
          {mode === "plan" ? "Plan" : "Mentor"}
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-3 space-y-3">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1" data-testid="text-chat-title">
                {empty.title}
              </p>
              <p className="text-xs text-muted-foreground max-w-[220px]">
                {empty.subtitle}
              </p>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`chat-message-${msg.role}-${i}`}
            >
              {msg.role === "assistant" && (
                <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    AI
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
                <Avatar className="w-6 h-6 flex-shrink-0 mt-0.5">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {profile?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isStreaming && chatMessages[chatMessages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs pl-8">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
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
