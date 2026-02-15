import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Paperclip,
  X,
  FileText,
  ImageIcon,
  Map,
  GraduationCap,
  ArrowUp,
} from "lucide-react";

interface AttachedFile {
  name: string;
  type: string;
  content: string;
  preview?: string;
}

interface ChatInputProps {
  onSend: (message: string, files?: AttachedFile[]) => void;
  disabled?: boolean;
  placeholder?: string;
  mode?: "plan" | "learn" | null;
  onModeChange?: (mode: "plan" | "learn" | null) => void;
  variant?: "landing" | "inline";
  autoFocus?: boolean;
}

export type { AttachedFile };

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "How can I help you today?",
  mode = null,
  onModeChange,
  variant = "inline",
  autoFocus = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxH = variant === "landing" ? 160 : 120;
    el.style.height = Math.min(el.scrollHeight, maxH) + "px";
  }, [variant]);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || disabled) return;

    let message = input.trim();
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles
        .map((f) => {
          if (f.type.startsWith("image/")) {
            return `[Attached image: ${f.name}]`;
          }
          return `[Attached file: ${f.name}]\n\`\`\`\n${f.content}\n\`\`\``;
        })
        .join("\n\n");
      message = message ? `${message}\n\n${fileContext}` : fileContext;
    }

    onSend(message, attachedFiles);
    setInput("");
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) continue;

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type,
              content: reader.result as string,
              preview: reader.result as string,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setAttachedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            content: text.slice(0, 10000),
          },
        ]);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleMode = (newMode: "plan" | "learn") => {
    if (!onModeChange) return;
    onModeChange(mode === newMode ? null : newMode);
  };

  const isLanding = variant === "landing";

  return (
    <div className="w-full" data-testid="chat-input-container">
      <div className={`relative bg-card border border-border rounded-md ${isLanding ? "" : ""}`}>
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1.5 text-xs group"
                data-testid={`attached-file-${i}`}
              >
                {file.preview ? (
                  <img src={file.preview} alt={file.name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="ml-0.5 text-muted-foreground"
                  data-testid={`button-remove-file-${i}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full bg-transparent resize-none text-sm px-4 focus:outline-none ${
            isLanding ? "pt-3 pb-12 min-h-[80px]" : "pt-3 pb-12 min-h-[48px]"
          }`}
          rows={isLanding ? 2 : 1}
          disabled={disabled}
          data-testid={isLanding ? "input-main-chat" : "input-chat"}
        />

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.js,.ts,.py,.json,.md,.csv,.html,.css"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file-upload"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              data-testid="button-attach-file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            {onModeChange && (
              <div className="flex items-center gap-1">
                <Badge
                  variant={mode === "plan" ? "default" : "outline"}
                  className={`cursor-pointer text-xs gap-1 ${mode === "plan" ? "" : "no-default-hover-elevate no-default-active-elevate"}`}
                  onClick={() => toggleMode("plan")}
                  data-testid="badge-mode-plan"
                >
                  <Map className="w-3 h-3" />
                  Plan
                </Badge>
                <Badge
                  variant={mode === "learn" ? "default" : "outline"}
                  className={`cursor-pointer text-xs gap-1 ${mode === "learn" ? "" : "no-default-hover-elevate no-default-active-elevate"}`}
                  onClick={() => toggleMode("learn")}
                  data-testid="badge-mode-learn"
                >
                  <GraduationCap className="w-3 h-3" />
                  Learn
                </Badge>
              </div>
            )}
          </div>

          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && attachedFiles.length === 0) || disabled}
            data-testid={isLanding ? "button-send-main" : "button-send-chat"}
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
