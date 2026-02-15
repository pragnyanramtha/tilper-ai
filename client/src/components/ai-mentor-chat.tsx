import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Lightbulb, HelpCircle, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIMentorChatProps {
  challengeTitle?: string;
  challengeDescription?: string;
  userCode?: string;
  onSuggestCode?: (code: string) => void;
}

export function AIMentorChat({
  challengeTitle,
  challengeDescription,
  userCode,
}: AIMentorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const systemContext = `You are CodeQuest Mentor, a friendly and encouraging AI coding tutor for teenage developers. You adapt your explanations to the student's level.${
      challengeTitle ? `\n\nCurrent challenge: "${challengeTitle}"\n${challengeDescription || ""}` : ""
    }${userCode ? `\n\nStudent's current code:\n\`\`\`\n${userCode}\n\`\`\`` : ""}

Keep responses concise and educational. Use code examples when helpful. Be encouraging but honest about errors.`;

    try {
      const response = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt: systemContext,
        }),
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
            } catch {
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
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

  const quickActions = [
    { label: "Hint", icon: Lightbulb, prompt: "Can you give me a hint for this challenge?" },
    { label: "Explain", icon: HelpCircle, prompt: "Can you explain what this challenge is asking me to do?" },
    { label: "Debug", icon: Bug, prompt: "Can you help me find the bug in my code?" },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Mentor</h3>
          <p className="text-xs text-muted-foreground">Powered by Claude</p>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-3 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Ready to help</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Ask me anything about the challenge or coding concepts
              </p>
              <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant="outline"
                    onClick={() => sendMessage(action.prompt)}
                    data-testid={`button-quick-${action.label.toLowerCase()}`}
                    className="text-xs"
                  >
                    <action.icon className="w-3 h-3 mr-1" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
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
                    U
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

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your mentor..."
            className="resize-none text-sm min-h-[36px] max-h-[100px]"
            rows={1}
            data-testid="input-mentor-chat"
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
