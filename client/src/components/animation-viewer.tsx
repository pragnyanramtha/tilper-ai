import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnimationStep {
  type: "text" | "code" | "diagram" | "highlight";
  content: string;
  duration: number;
  position?: { x: number; y: number };
  color?: string;
  fontSize?: number;
}

interface AnimationViewerProps {
  topic: string;
  animationData?: AnimationStep[];
  isLoading?: boolean;
  onRequestAnimation?: () => void;
}

function ManimCanvas({ steps, isPlaying }: { steps: AnimationStep[]; isPlaying: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const step = steps[currentStep];
      if (!step) return;

      const stepProgress = Math.min(elapsed / (step.duration * 1000), 1);
      setProgress(stepProgress);

      if (stepProgress >= 1 && currentStep < steps.length - 1) {
        setCurrentStep((prev) => prev + 1);
        startTimeRef.current = Date.now();
      }

      drawFrame(stepProgress);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, currentStep, steps]);

  const drawFrame = (stepProgress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#1a1a19" : "#f0f3f3";
    ctx.fillRect(0, 0, w, h);

    const step = steps[currentStep];
    if (!step) return;

    const eased = easeInOutCubic(stepProgress);

    ctx.globalAlpha = eased;

    if (step.type === "text") {
      const fontSize = step.fontSize || 18;
      ctx.font = `600 ${fontSize}px 'IBM Plex Sans', sans-serif`;
      ctx.fillStyle = step.color || (isDark ? "#e8e8e6" : "#1f1f1e");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const x = step.position?.x ?? w / 2;
      const y = step.position?.y ?? h / 2;

      const chars = step.content.split("");
      const charsToShow = Math.floor(chars.length * eased);
      const text = chars.slice(0, charsToShow).join("");
      ctx.fillText(text, x, y);
    } else if (step.type === "code") {
      ctx.font = `14px 'JetBrains Mono', monospace`;
      const lines = step.content.split("\n");
      const lineHeight = 22;
      const startY = h / 2 - (lines.length * lineHeight) / 2;
      const startX = 40;

      const bgPad = 16;
      const bgW = w - 80;
      const bgH = lines.length * lineHeight + bgPad * 2;

      ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
      roundRect(ctx, startX - bgPad, startY - bgPad - 4, bgW, bgH, 6);
      ctx.fill();

      const linesToShow = Math.floor(lines.length * eased);
      for (let i = 0; i <= linesToShow && i < lines.length; i++) {
        const lineProgress = i === linesToShow ? (eased * lines.length) % 1 : 1;
        const charsToShow = Math.floor(lines[i].length * lineProgress);
        const text = lines[i].slice(0, charsToShow);

        ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
        ctx.textAlign = "right";
        ctx.fillText(`${i + 1}`, startX - 8, startY + i * lineHeight);

        ctx.textAlign = "left";
        highlightSyntax(ctx, text, startX + 8, startY + i * lineHeight, isDark);
      }
    } else if (step.type === "diagram") {
      drawConceptDiagram(ctx, w, h, step.content, eased, isDark);
    } else if (step.type === "highlight") {
      const accentColor = step.color || "#d97757";
      ctx.font = `700 22px 'IBM Plex Sans', sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const scale = 0.8 + 0.2 * eased;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.fillText(step.content, 0, 0);
      ctx.restore();
    }

    ctx.globalAlpha = 1;

    for (let i = 0; i < steps.length; i++) {
      const dotX = w / 2 - (steps.length * 12) / 2 + i * 12 + 4;
      const dotY = h - 16;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle =
        i === currentStep
          ? "#d97757"
          : i < currentStep
            ? (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)")
            : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)");
      ctx.fill();
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setProgress(0);
    startTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (steps.length > 0) {
      reset();
      drawFrame(0);
    }
  }, [steps]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function highlightSyntax(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  isDark: boolean
) {
  const keywords = ["function", "const", "let", "var", "return", "if", "else", "for", "while", "class", "def", "import"];
  const words = text.split(/(\s+|[(){}[\];,.])/);
  let curX = x;

  for (const word of words) {
    if (keywords.includes(word)) {
      ctx.fillStyle = "#d97757";
    } else if (/^["'].*["']$/.test(word)) {
      ctx.fillStyle = isDark ? "#a8cc8c" : "#5a8c3c";
    } else if (/^\d+$/.test(word)) {
      ctx.fillStyle = isDark ? "#dbab79" : "#b07030";
    } else {
      ctx.fillStyle = isDark ? "#d4d4d0" : "#2a2a28";
    }
    ctx.fillText(word, curX, y);
    curX += ctx.measureText(word).width;
  }
}

function drawConceptDiagram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  concept: string,
  progress: number,
  isDark: boolean
) {
  const accentColor = "#d97757";
  const fgColor = isDark ? "#d4d4d0" : "#2a2a28";
  const mutedColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  if (concept.includes("array") || concept.includes("list")) {
    const boxW = 48;
    const boxH = 40;
    const gap = 8;
    const items = [3, 7, 1, 9, 4, 2];
    const totalW = items.length * (boxW + gap) - gap;
    const startX = w / 2 - totalW / 2;
    const y = h / 2 - boxH / 2;

    const itemsToShow = Math.floor(items.length * progress);
    for (let i = 0; i <= itemsToShow && i < items.length; i++) {
      const itemProgress = i === itemsToShow ? (progress * items.length) % 1 : 1;
      ctx.globalAlpha = itemProgress;

      const x = startX + i * (boxW + gap);
      ctx.fillStyle = mutedColor;
      roundRect(ctx, x, y, boxW, boxH, 4);
      ctx.fill();
      ctx.strokeStyle = i === Math.floor(progress * items.length) % items.length ? accentColor : mutedColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `600 16px 'IBM Plex Sans', sans-serif`;
      ctx.fillStyle = fgColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(items[i]), x + boxW / 2, y + boxH / 2);

      ctx.font = `11px 'JetBrains Mono', monospace`;
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
      ctx.fillText(String(i), x + boxW / 2, y + boxH + 16);
    }
    ctx.globalAlpha = 1;
  } else if (concept.includes("loop") || concept.includes("iteration")) {
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.25;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2 * progress);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    const angle = Math.PI * 2 * progress - Math.PI / 2;
    const dotX = cx + Math.cos(angle) * radius;
    const dotY = cy + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    const iteration = Math.floor(progress * 5);
    ctx.font = `700 28px 'IBM Plex Sans', sans-serif`;
    ctx.fillStyle = fgColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`i = ${iteration}`, cx, cy);
  } else {
    const boxes = ["Input", "Process", "Output"];
    const boxW = 100;
    const boxH = 44;
    const gap = 50;
    const totalW = boxes.length * boxW + (boxes.length - 1) * gap;
    const startX = w / 2 - totalW / 2;
    const y = h / 2 - boxH / 2;

    for (let i = 0; i < boxes.length; i++) {
      const appear = Math.min(1, progress * boxes.length - i);
      if (appear <= 0) continue;
      ctx.globalAlpha = easeInOutCubic(Math.max(0, appear));

      const x = startX + i * (boxW + gap);
      ctx.fillStyle = i === 1 ? accentColor + "20" : mutedColor;
      roundRect(ctx, x, y, boxW, boxH, 6);
      ctx.fill();
      ctx.strokeStyle = i === 1 ? accentColor : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `500 13px 'IBM Plex Sans', sans-serif`;
      ctx.fillStyle = i === 1 ? accentColor : fgColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(boxes[i], x + boxW / 2, y + boxH / 2);

      if (i < boxes.length - 1 && appear > 0.5) {
        const arrowX = x + boxW + 8;
        const arrowEndX = x + boxW + gap - 8;
        const arrowY = y + boxH / 2;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowEndX, arrowY);
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(arrowEndX - 6, arrowY - 4);
        ctx.lineTo(arrowEndX, arrowY);
        ctx.lineTo(arrowEndX - 6, arrowY + 4);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

export function AnimationViewer({
  topic,
  animationData,
  isLoading = false,
  onRequestAnimation,
}: AnimationViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [key, setKey] = useState(0);

  const defaultSteps: AnimationStep[] = [
    {
      type: "highlight",
      content: topic || "Programming Concepts",
      duration: 2,
      color: "#d97757",
    },
    {
      type: "text",
      content: "Let's visualize this concept...",
      duration: 2,
      fontSize: 16,
    },
    {
      type: "diagram",
      content: topic?.toLowerCase() || "flow",
      duration: 4,
    },
  ];

  const steps = animationData || defaultSteps;

  const handleReset = () => {
    setIsPlaying(false);
    setKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-card">
        <span className="text-xs font-medium text-muted-foreground truncate">
          Visual: {topic || "Concept"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleReset}
            data-testid="button-reset-animation"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsPlaying(!isPlaying)}
            data-testid="button-play-animation"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          {onRequestAnimation && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRequestAnimation}
              disabled={isLoading}
              data-testid="button-generate-animation"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              Generate
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Generating visualization...</p>
            </div>
          </div>
        ) : (
          <ManimCanvas key={key} steps={steps} isPlaying={isPlaying} />
        )}
      </div>
    </div>
  );
}
