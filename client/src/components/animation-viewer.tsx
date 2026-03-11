import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, SkipForward, SkipBack, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnimationStep {
  type: "text" | "code" | "diagram" | "highlight" | "custom";
  content: string;
  duration: number;
  position?: { x: number; y: number };
  color?: string;
  fontSize?: number;
  script?: string;
}

interface AnimationViewerProps {
  topic: string;
  animationData?: AnimationStep[];
  isLoading?: boolean;
  onRequestAnimation?: () => void;
}

const ACCENT = "#d97757";
const ACCENT2 = "#5b9bd5";
const GREEN = "#6bc46d";
const YELLOW = "#e5c07b";
const RED = "#e06c75";

function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, headSize = 6) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6));
  ctx.strokeStyle = color;
  ctx.stroke();
}

function detectDiagramType(concept: string): string {
  const c = concept.toLowerCase();
  if (c.includes("tree") || c.includes("binary") || c.includes("bst") || c.includes("traversal")) return "tree";
  if (c.includes("stack") || c.includes("push") || c.includes("pop") || c.includes("lifo")) return "stack";
  if (c.includes("queue") || c.includes("fifo") || c.includes("enqueue") || c.includes("dequeue")) return "queue";
  if (c.includes("linked") || c.includes("node") || c.includes("pointer")) return "linkedlist";
  if (c.includes("sort") || c.includes("bubble") || c.includes("merge") || c.includes("quick") || c.includes("insertion") || c.includes("selection")) return "sorting";
  if (c.includes("hash") || c.includes("map") || c.includes("dict") || c.includes("key")) return "hashmap";
  if (c.includes("array") || c.includes("list") || c.includes("index") || c.includes("data type")) return "array";
  if (c.includes("loop") || c.includes("iteration") || c.includes("for") || c.includes("while") || c.includes("recursion")) return "loop";
  if (c.includes("graph") || c.includes("vertex") || c.includes("edge") || c.includes("bfs") || c.includes("dfs")) return "graph";
  if (c.includes("variable") || c.includes("type") || c.includes("string") || c.includes("int") || c.includes("float") || c.includes("boolean")) return "variables";
  if (c.includes("function") || c.includes("parameter") || c.includes("argument") || c.includes("return")) return "function";
  if (c.includes("class") || c.includes("object") || c.includes("oop") || c.includes("inherit")) return "class";
  if (c.includes("condition") || c.includes("if") || c.includes("else") || c.includes("branch")) return "conditional";
  return "flow";
}

function drawTree(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const muted = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const nodeRadius = 20;
  const values = [8, 4, 12, 2, 6, 10, 14];

  const positions = [
    { x: w / 2, y: h * 0.18 },
    { x: w / 2 - w * 0.18, y: h * 0.4 },
    { x: w / 2 + w * 0.18, y: h * 0.4 },
    { x: w / 2 - w * 0.27, y: h * 0.62 },
    { x: w / 2 - w * 0.09, y: h * 0.62 },
    { x: w / 2 + w * 0.09, y: h * 0.62 },
    { x: w / 2 + w * 0.27, y: h * 0.62 },
  ];

  const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  const showCount = Math.floor(progress * values.length) + 1;

  for (const [from, to] of edges) {
    if (from < showCount && to < showCount) {
      const p1 = positions[from];
      const p2 = positions[to];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y + nodeRadius);
      ctx.lineTo(p2.x, p2.y - nodeRadius);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  for (let i = 0; i < Math.min(showCount, values.length); i++) {
    const nodeP = i === showCount - 1 ? ease((progress * values.length) % 1) : 1;
    const pos = positions[i];
    const r = nodeRadius * nodeP;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = i === showCount - 1 ? ACCENT + "30" : muted;
    ctx.fill();
    ctx.strokeStyle = i === showCount - 1 ? ACCENT : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)");
    ctx.lineWidth = i === showCount - 1 ? 2 : 1;
    ctx.stroke();

    if (nodeP > 0.5) {
      ctx.globalAlpha = (nodeP - 0.5) * 2;
      ctx.font = `600 14px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = i === showCount - 1 ? ACCENT : fg;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(values[i]), pos.x, pos.y);
      ctx.globalAlpha = 1;
    }
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("Binary Search Tree", w / 2, h * 0.82);
}

function drawStack(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const items = ["main()", "calculate()", "helper()", "process()"];
  const boxW = 140;
  const boxH = 34;
  const gap = 4;
  const baseY = h * 0.72;
  const cx = w / 2;

  const showCount = Math.floor(progress * (items.length + 1));
  const popping = progress > 0.85;

  for (let i = 0; i < Math.min(showCount, items.length); i++) {
    const y = baseY - i * (boxH + gap);
    const isTop = i === Math.min(showCount, items.length) - 1;
    let alpha = 1;

    if (popping && isTop) {
      alpha = 1 - (progress - 0.85) / 0.15;
    }
    if (i === showCount - 1 && !popping) {
      alpha = ease((progress * (items.length + 1)) % 1);
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = isTop ? ACCENT + "20" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)");
    roundRect(ctx, cx - boxW / 2, y, boxW, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = isTop ? ACCENT : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
    ctx.lineWidth = isTop ? 2 : 1;
    ctx.stroke();

    ctx.font = `500 12px 'JetBrains Mono', monospace`;
    ctx.fillStyle = isTop ? ACCENT : fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(items[i], cx, y + boxH / 2);
    ctx.globalAlpha = 1;
  }

  if (showCount > 0) {
    const topIdx = Math.min(showCount, items.length) - 1;
    const topY = baseY - topIdx * (boxH + gap);
    drawArrow(ctx, cx + boxW / 2 + 16, topY + boxH / 2, cx + boxW / 2 + 4, topY + boxH / 2, ACCENT);
    ctx.font = `500 10px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = ACCENT;
    ctx.textAlign = "left";
    ctx.fillText("TOP", cx + boxW / 2 + 20, topY + boxH / 2 + 1);
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("Call Stack (LIFO)", cx, h * 0.15);
}

function drawQueue(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const items = ["A", "B", "C", "D", "E"];
  const boxW = 44;
  const boxH = 44;
  const gap = 6;
  const totalW = items.length * (boxW + gap) - gap;
  const startX = w / 2 - totalW / 2;
  const cy = h / 2;

  const showCount = Math.floor(progress * items.length) + 1;

  for (let i = 0; i < Math.min(showCount, items.length); i++) {
    const isHead = i === 0;
    const isTail = i === Math.min(showCount, items.length) - 1;
    let alpha = 1;
    if (i === showCount - 1) alpha = ease((progress * items.length) % 1);

    ctx.globalAlpha = alpha;
    const x = startX + i * (boxW + gap);
    ctx.fillStyle = isHead ? GREEN + "20" : isTail ? ACCENT + "20" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)");
    roundRect(ctx, x, cy - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = isHead ? GREEN : isTail ? ACCENT : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
    ctx.lineWidth = (isHead || isTail) ? 2 : 1;
    ctx.stroke();

    ctx.font = `600 16px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isHead ? GREEN : isTail ? ACCENT : fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(items[i], x + boxW / 2, cy);

    if (i < Math.min(showCount, items.length) - 1) {
      drawArrow(ctx, x + boxW + 2, cy, x + boxW + gap - 2, cy, isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)");
    }
    ctx.globalAlpha = 1;
  }

  ctx.font = `500 10px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = GREEN;
  ctx.textAlign = "center";
  ctx.fillText("FRONT (dequeue)", startX + boxW / 2, cy + boxH / 2 + 18);
  if (showCount > 1) {
    const tailX = startX + (Math.min(showCount, items.length) - 1) * (boxW + gap);
    ctx.fillStyle = ACCENT;
    ctx.fillText("REAR (enqueue)", tailX + boxW / 2, cy + boxH / 2 + 18);
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.fillText("Queue (FIFO)", w / 2, h * 0.15);
}

function drawLinkedList(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const values = [10, 20, 30, 40];
  const nodeW = 70;
  const nodeH = 36;
  const gap = 36;
  const totalW = values.length * nodeW + (values.length - 1) * gap;
  const startX = w / 2 - totalW / 2;
  const cy = h / 2;

  const showCount = Math.floor(progress * values.length) + 1;

  ctx.font = `500 10px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = ACCENT;
  ctx.textAlign = "left";
  if (progress > 0.05) {
    drawArrow(ctx, startX - 30, cy, startX - 4, cy, ACCENT);
    ctx.fillText("HEAD", startX - 40, cy - 14);
  }

  for (let i = 0; i < Math.min(showCount, values.length); i++) {
    let alpha = 1;
    if (i === showCount - 1) alpha = ease((progress * values.length) % 1);
    ctx.globalAlpha = alpha;

    const x = startX + i * (nodeW + gap);

    const dataW = nodeW * 0.6;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
    roundRect(ctx, x, cy - nodeH / 2, dataW, nodeH, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const ptrW = nodeW * 0.4;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
    roundRect(ctx, x + dataW, cy - nodeH / 2, ptrW, nodeH, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
    ctx.stroke();

    ctx.font = `600 14px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(values[i]), x + dataW / 2, cy);

    if (i < values.length - 1 && i < showCount - 1) {
      const arrowStartX = x + nodeW + 2;
      const arrowEndX = x + nodeW + gap - 2;
      drawArrow(ctx, arrowStartX, cy, arrowEndX, cy, ACCENT2);
    }

    if (i === values.length - 1) {
      ctx.font = `500 9px 'JetBrains Mono', monospace`;
      ctx.fillStyle = RED;
      ctx.fillText("null", x + dataW + ptrW / 2, cy);
    }

    ctx.globalAlpha = 1;
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("Singly Linked List", w / 2, h * 0.15);
}

function drawSorting(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const original = [5, 2, 8, 1, 9, 3, 7, 4, 6];
  const sorted = [...original].sort((a, b) => a - b);
  const barW = 28;
  const gap = 4;
  const totalW = original.length * (barW + gap) - gap;
  const startX = w / 2 - totalW / 2;
  const maxH = h * 0.5;
  const baseY = h * 0.78;
  const maxVal = Math.max(...original);

  const swapProgress = progress;

  for (let i = 0; i < original.length; i++) {
    const currentVal = Math.round(lerp(original[i], sorted[i], ease(swapProgress)));
    const barH = (currentVal / maxVal) * maxH;
    const x = startX + i * (barW + gap);
    const y = baseY - barH;

    const isMoving = original[i] !== sorted[i] && progress < 1;
    ctx.fillStyle = isMoving
      ? (progress > 0.5 ? GREEN + "80" : ACCENT + "60")
      : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)");
    roundRect(ctx, x, y, barW, barH, 3);
    ctx.fill();
    ctx.strokeStyle = isMoving
      ? (progress > 0.5 ? GREEN : ACCENT)
      : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `600 11px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isMoving ? (progress > 0.5 ? GREEN : ACCENT) : fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(String(currentVal), x + barW / 2, y - 4);
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText(progress < 0.5 ? "Unsorted" : "Sorted", w / 2, h * 0.12);
}

function drawHashMap(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const entries = [
    { key: '"name"', val: '"Alex"', bucket: 0 },
    { key: '"age"', val: "17", bucket: 2 },
    { key: '"lang"', val: '"Python"', bucket: 1 },
    { key: '"level"', val: '"Mid"', bucket: 3 },
  ];

  const bucketH = 34;
  const bucketW = 40;
  const entryW = 120;
  const gap = 8;
  const bucketCount = 4;
  const totalH = bucketCount * (bucketH + gap) - gap;
  const startY = h / 2 - totalH / 2;
  const bucketX = w * 0.2;
  const entryX = bucketX + bucketW + 30;
  const showCount = Math.floor(progress * entries.length) + 1;

  for (let i = 0; i < bucketCount; i++) {
    const y = startY + i * (bucketH + gap);
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
    roundRect(ctx, bucketX, y, bucketW, bucketH, 4);
    ctx.fill();
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `600 12px 'JetBrains Mono', monospace`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i), bucketX + bucketW / 2, y + bucketH / 2);
  }

  for (let i = 0; i < Math.min(showCount, entries.length); i++) {
    const entry = entries[i];
    let alpha = 1;
    if (i === showCount - 1) alpha = ease((progress * entries.length) % 1);
    ctx.globalAlpha = alpha;

    const y = startY + entry.bucket * (bucketH + gap);

    drawArrow(ctx, bucketX + bucketW + 2, y + bucketH / 2, entryX - 2, y + bucketH / 2, ACCENT2);

    ctx.fillStyle = ACCENT + "15";
    roundRect(ctx, entryX, y, entryW, bucketH, 4);
    ctx.fill();
    ctx.strokeStyle = ACCENT + "40";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `500 11px 'JetBrains Mono', monospace`;
    ctx.fillStyle = ACCENT;
    ctx.textAlign = "left";
    ctx.fillText(entry.key, entryX + 8, y + bucketH / 2 - 1);

    ctx.fillStyle = fg;
    ctx.textAlign = "right";
    ctx.fillText(entry.val, entryX + entryW - 8, y + bucketH / 2 - 1);
    ctx.globalAlpha = 1;
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("Hash Map / Dictionary", w / 2, h * 0.1);
}

function drawArray(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const muted = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const items = [3, 7, 1, 9, 4, 2, 8];
  const boxW = 48;
  const boxH = 42;
  const gap = 6;
  const totalW = items.length * (boxW + gap) - gap;
  const startX = w / 2 - totalW / 2;
  const cy = h / 2;

  const showCount = Math.floor(items.length * progress) + 1;

  for (let i = 0; i < Math.min(showCount, items.length); i++) {
    let alpha = 1;
    if (i === showCount - 1) alpha = ease((progress * items.length) % 1);
    ctx.globalAlpha = alpha;

    const x = startX + i * (boxW + gap);
    const isActive = i === showCount - 1;

    ctx.fillStyle = isActive ? ACCENT + "20" : muted;
    roundRect(ctx, x, cy - boxH / 2, boxW, boxH, 4);
    ctx.fill();
    ctx.strokeStyle = isActive ? ACCENT : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();

    ctx.font = `600 16px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isActive ? ACCENT : fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(items[i]), x + boxW / 2, cy);

    ctx.font = `500 10px 'JetBrains Mono', monospace`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
    ctx.fillText(`[${i}]`, x + boxW / 2, cy + boxH / 2 + 14);
    ctx.globalAlpha = 1;
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("Array / List", w / 2, h * 0.15);
}

function drawLoop(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.22;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.stroke();

  const angle = -Math.PI / 2 + Math.PI * 2 * progress;
  const dotX = cx + Math.cos(angle) * radius;
  const dotY = cy + Math.sin(angle) * radius;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 7, 0, Math.PI * 2);
  ctx.fillStyle = ACCENT;
  ctx.fill();

  const iteration = Math.floor(progress * 5);
  ctx.font = `700 28px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`i = ${iteration}`, cx, cy);

  const labels = ["Init", "Check", "Execute", "Update"];
  for (let i = 0; i < labels.length; i++) {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / labels.length;
    const lx = cx + Math.cos(a) * (radius + 28);
    const ly = cy + Math.sin(a) * (radius + 28);
    ctx.font = `500 10px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labels[i], lx, ly);
  }
}

function drawVariables(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const types = [
    { name: "int", example: "42", color: ACCENT2 },
    { name: "str", example: '"hello"', color: GREEN },
    { name: "float", example: "3.14", color: YELLOW },
    { name: "bool", example: "True", color: ACCENT },
  ];

  const boxW = 120;
  const boxH = 50;
  const gap = 12;
  const cols = 2;
  const rows = 2;
  const gridW = cols * boxW + (cols - 1) * gap;
  const gridH = rows * boxH + (rows - 1) * gap;
  const startX = w / 2 - gridW / 2;
  const startY = h / 2 - gridH / 2;

  const showCount = Math.floor(progress * types.length) + 1;

  for (let i = 0; i < Math.min(showCount, types.length); i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    let alpha = 1;
    if (i === showCount - 1) alpha = ease((progress * types.length) % 1);
    ctx.globalAlpha = alpha;

    const x = startX + col * (boxW + gap);
    const y = startY + row * (boxH + gap);
    const t = types[i];

    ctx.fillStyle = t.color + "12";
    roundRect(ctx, x, y, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = t.color + "40";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `600 11px 'JetBrains Mono', monospace`;
    ctx.fillStyle = t.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t.name, x + boxW / 2, y + 16);

    ctx.font = `500 13px 'JetBrains Mono', monospace`;
    ctx.fillStyle = fg;
    ctx.fillText(t.example, x + boxW / 2, y + 35);
    ctx.globalAlpha = 1;
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("Data Types", w / 2, h * 0.1);
}

function drawFunction(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const cx = w / 2;

  const boxW = 200;
  const boxH = 80;
  const boxY = h / 2 - boxH / 2;
  const inputX = cx - boxW / 2 - 60;
  const outputX = cx + boxW / 2 + 20;

  const p1 = Math.min(1, progress * 3);
  const p2 = Math.max(0, Math.min(1, (progress - 0.33) * 3));
  const p3 = Math.max(0, Math.min(1, (progress - 0.66) * 3));

  if (p1 > 0) {
    ctx.globalAlpha = ease(p1);
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
    roundRect(ctx, cx - boxW / 2, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.strokeStyle = ACCENT + "50";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `600 14px 'JetBrains Mono', monospace`;
    ctx.fillStyle = ACCENT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("add(a, b)", cx, h / 2 - 10);

    ctx.font = `500 11px 'JetBrains Mono', monospace`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
    ctx.fillText("return a + b", cx, h / 2 + 12);
    ctx.globalAlpha = 1;
  }

  if (p2 > 0) {
    ctx.globalAlpha = ease(p2);
    ctx.font = `600 13px 'JetBrains Mono', monospace`;
    ctx.fillStyle = ACCENT2;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("3, 5", inputX, h / 2);
    drawArrow(ctx, inputX + 8, h / 2, cx - boxW / 2 - 4, h / 2, ACCENT2);

    ctx.font = `500 10px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
    ctx.textAlign = "center";
    ctx.fillText("input", inputX - 10, h / 2 - 16);
    ctx.globalAlpha = 1;
  }

  if (p3 > 0) {
    ctx.globalAlpha = ease(p3);
    drawArrow(ctx, cx + boxW / 2 + 4, h / 2, outputX - 4, h / 2, GREEN);

    ctx.font = `600 13px 'JetBrains Mono', monospace`;
    ctx.fillStyle = GREEN;
    ctx.textAlign = "left";
    ctx.fillText("8", outputX, h / 2);

    ctx.font = `500 10px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
    ctx.textAlign = "center";
    ctx.fillText("output", outputX + 10, h / 2 - 16);
    ctx.globalAlpha = 1;
  }
}

function drawConditional(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const cx = w / 2;

  const diamondSize = 40;
  const dY = h * 0.3;

  const p1 = Math.min(1, progress * 2.5);
  const p2 = Math.max(0, Math.min(1, (progress - 0.4) * 2.5));

  if (p1 > 0) {
    ctx.globalAlpha = ease(p1);
    ctx.save();
    ctx.translate(cx, dY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = ACCENT + "20";
    roundRect(ctx, -diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize, 4);
    ctx.fill();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.font = `600 11px 'JetBrains Mono', monospace`;
    ctx.fillStyle = ACCENT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("x > 5?", cx, dY);
    ctx.globalAlpha = 1;
  }

  if (p2 > 0) {
    ctx.globalAlpha = ease(p2);
    const trueX = cx - 80;
    const falseX = cx + 80;
    const branchY = h * 0.62;

    ctx.beginPath();
    ctx.moveTo(cx - diamondSize * 0.4, dY + diamondSize * 0.4);
    ctx.lineTo(trueX, branchY - 18);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = GREEN + "20";
    roundRect(ctx, trueX - 50, branchY - 18, 100, 36, 6);
    ctx.fill();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `500 11px 'JetBrains Mono', monospace`;
    ctx.fillStyle = GREEN;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("True block", trueX, branchY);

    ctx.font = `600 9px 'Space Grotesk', sans-serif`;
    ctx.fillText("YES", cx - diamondSize * 0.4 - 14, dY + diamondSize * 0.4 + 4);

    ctx.beginPath();
    ctx.moveTo(cx + diamondSize * 0.4, dY + diamondSize * 0.4);
    ctx.lineTo(falseX, branchY - 18);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = RED + "20";
    roundRect(ctx, falseX - 50, branchY - 18, 100, 36, 6);
    ctx.fill();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `500 11px 'JetBrains Mono', monospace`;
    ctx.fillStyle = RED;
    ctx.fillText("False block", falseX, branchY);

    ctx.font = `600 9px 'Space Grotesk', sans-serif`;
    ctx.fillText("NO", cx + diamondSize * 0.4 + 14, dY + diamondSize * 0.4 + 4);
    ctx.globalAlpha = 1;
  }
}

function drawGraph(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const r = 18;
  const nodes = [
    { label: "A", x: w * 0.3, y: h * 0.25 },
    { label: "B", x: w * 0.6, y: h * 0.2 },
    { label: "C", x: w * 0.75, y: h * 0.5 },
    { label: "D", x: w * 0.5, y: h * 0.65 },
    { label: "E", x: w * 0.25, y: h * 0.55 },
  ];
  const edges = [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4], [1, 3]];
  const showCount = Math.floor(progress * nodes.length) + 1;

  for (const [from, to] of edges) {
    if (from < showCount && to < showCount) {
      ctx.beginPath();
      ctx.moveTo(nodes[from].x, nodes[from].y);
      ctx.lineTo(nodes[to].x, nodes[to].y);
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  for (let i = 0; i < Math.min(showCount, nodes.length); i++) {
    let alpha = 1;
    if (i === showCount - 1) alpha = ease((progress * nodes.length) % 1);
    ctx.globalAlpha = alpha;

    const n = nodes[i];
    const isActive = i === showCount - 1;

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? ACCENT + "25" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)");
    ctx.fill();
    ctx.strokeStyle = isActive ? ACCENT : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)");
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();

    ctx.font = `600 13px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = isActive ? ACCENT : fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(n.label, n.x, n.y);
    ctx.globalAlpha = 1;
  }

  ctx.font = `500 11px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
  ctx.textAlign = "center";
  ctx.fillText("Graph", w / 2, h * 0.9);
}

function drawFlow(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number, isDark: boolean) {
  const fg = isDark ? "#d4d4d0" : "#2a2a28";
  const muted = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";
  const boxes = ["Input", "Process", "Output"];
  const boxW = 100;
  const boxH = 44;
  const gap = 50;
  const totalW = boxes.length * boxW + (boxes.length - 1) * gap;
  const startX = w / 2 - totalW / 2;
  const cy = h / 2;

  for (let i = 0; i < boxes.length; i++) {
    const appear = Math.min(1, progress * boxes.length - i);
    if (appear <= 0) continue;
    ctx.globalAlpha = ease(Math.max(0, appear));

    const x = startX + i * (boxW + gap);
    ctx.fillStyle = i === 1 ? ACCENT + "20" : muted;
    roundRect(ctx, x, cy - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = i === 1 ? ACCENT : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)");
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = `500 13px 'Space Grotesk', sans-serif`;
    ctx.fillStyle = i === 1 ? ACCENT : fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(boxes[i], x + boxW / 2, cy);

    if (i < boxes.length - 1 && appear > 0.5) {
      drawArrow(ctx, x + boxW + 8, cy, x + boxW + gap - 8, cy, isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)");
    }
  }
  ctx.globalAlpha = 1;
}

function drawConceptDiagram(ctx: CanvasRenderingContext2D, w: number, h: number, concept: string, progress: number, isDark: boolean) {
  // The AI may pass the exact type name directly (e.g. "function", "loop", "conditional")
  // OR a descriptive phrase like "binary search tree" — handle both.
  const KNOWN_TYPES = new Set(["tree", "stack", "queue", "linkedlist", "sorting", "hashmap", "array", "loop", "graph", "function", "conditional", "class", "variables", "flow"]);
  const type = KNOWN_TYPES.has(concept.toLowerCase()) ? concept.toLowerCase() : detectDiagramType(concept);
  switch (type) {
    case "tree": return drawTree(ctx, w, h, progress, isDark);
    case "stack": return drawStack(ctx, w, h, progress, isDark);
    case "queue": return drawQueue(ctx, w, h, progress, isDark);
    case "linkedlist": return drawLinkedList(ctx, w, h, progress, isDark);
    case "sorting": return drawSorting(ctx, w, h, progress, isDark);
    case "hashmap": return drawHashMap(ctx, w, h, progress, isDark);
    case "array": return drawArray(ctx, w, h, progress, isDark);
    case "variables": return drawVariables(ctx, w, h, progress, isDark);
    case "loop": return drawLoop(ctx, w, h, progress, isDark);
    case "graph": return drawGraph(ctx, w, h, progress, isDark);
    case "function": case "class": return drawFunction(ctx, w, h, progress, isDark);
    case "conditional": return drawConditional(ctx, w, h, progress, isDark);
    default: return drawFlow(ctx, w, h, progress, isDark);
  }
}

function highlightSyntax(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, isDark: boolean) {
  const keywords = ["function", "const", "let", "var", "return", "if", "else", "for", "while", "class", "def", "import", "from", "in", "True", "False", "None", "print"];
  const words = text.split(/(\s+|[(){}[\];,.:=+\-*/<>!])/);
  let curX = x;
  for (const word of words) {
    if (keywords.includes(word)) {
      ctx.fillStyle = ACCENT;
    } else if (/^["'].*["']$/.test(word)) {
      ctx.fillStyle = isDark ? "#a8cc8c" : "#5a8c3c";
    } else if (/^\d+$/.test(word)) {
      ctx.fillStyle = isDark ? "#dbab79" : "#b07030";
    } else if (/^[(){}[\];,.:=+\-*/<>!]$/.test(word)) {
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
    } else {
      ctx.fillStyle = isDark ? "#d4d4d0" : "#2a2a28";
    }
    ctx.fillText(word, curX, y);
    curX += ctx.measureText(word).width;
  }
}

function ManimCanvas({ steps, isPlaying, onStepChange }: { steps: AnimationStep[]; isPlaying: boolean; onStepChange?: (step: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const animFrameRef = useRef<number>(0);
  const animationStartRef = useRef<number>(0);

  // Calculate total duration and step timings
  const timeline = useMemo(() => {
    const TRANSITION_DURATION = 0.8; // seconds
    let currentTime = 0;
    const stepTimings = steps.map((step, index) => {
      const startTime = currentTime;
      const transitionIn = index === 0 ? 0 : TRANSITION_DURATION;
      const holdTime = step.duration;
      const transitionInEnd = startTime + transitionIn;
      const holdEnd = transitionInEnd + holdTime;
      const endTime = holdEnd; // The next step starts immediately after this hold

      // The total time assigned to this step is its hold + transition in
      // but Step i's transition in IS effectively Step i-1's transition out.
      currentTime = endTime;

      return {
        startTime,
        transitionIn,
        transitionInEnd,
        holdEnd,
        endTime,
        step
      };
    });

    return {
      stepTimings,
      totalDuration: currentTime,
      transitionDuration: TRANSITION_DURATION
    };
  }, [steps]);

  const lastNotifiedStepRef = useRef(0);

  const drawFrame = useCallback((globalProgress: number) => {
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

    // Clear canvas
    ctx.fillStyle = isDark ? "#1a1a19" : "#f0f3f3";
    ctx.fillRect(0, 0, w, h);

    const currentTime = globalProgress * timeline.totalDuration;

    // Find current active step
    let activeStepIdx = 0;
    for (let i = 0; i < timeline.stepTimings.length; i++) {
      if (currentTime < timeline.stepTimings[i].endTime) {
        activeStepIdx = i;
        break;
      }
      if (i === timeline.stepTimings.length - 1) {
        activeStepIdx = i;
      }
    }

    // Update current step for progress dots and parent notification
    if (activeStepIdx !== lastNotifiedStepRef.current) {
      lastNotifiedStepRef.current = activeStepIdx;
      setCurrentStep(activeStepIdx);
    }

    const timing = timeline.stepTimings[activeStepIdx];

    if (currentTime < timing.transitionInEnd && activeStepIdx > 0) {
      // Transition phase: blend from previous step to current
      const prevTiming = timeline.stepTimings[activeStepIdx - 1];
      const transitionProgress = (currentTime - timing.startTime) / timeline.transitionDuration;
      const blendFactor = ease(Math.min(1, Math.max(0, transitionProgress)));

      // Draw previous step fading out
      ctx.globalAlpha = 1 - blendFactor;
      drawStepContent(ctx, prevTiming.step, w, h, 1, isDark);

      // Draw current step fading in
      ctx.globalAlpha = blendFactor;
      drawStepContent(ctx, timing.step, w, h, 0, isDark);
    } else {
      // Hold phase: draw current step at full opacity with its own progress
      const holdProgress = timing.step.duration === 0
        ? 1
        : (currentTime - timing.transitionInEnd) / timing.step.duration;

      ctx.globalAlpha = 1;
      drawStepContent(ctx, timing.step, w, h, Math.min(1, Math.max(0, holdProgress)), isDark);
    }

    // Draw progress dots
    ctx.globalAlpha = 1;
    const dotSpacing = 12;
    const totalDotsW = (steps.length - 1) * dotSpacing;
    const startX = w / 2 - totalDotsW / 2;
    const dotY = h - 20;

    for (let i = 0; i < steps.length; i++) {
      const dotX = startX + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = i === activeStepIdx
        ? ACCENT
        : i < activeStepIdx
          ? (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)")
          : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)");
      ctx.fill();
    }
  }, [steps, timeline]); // Stable dependencies: removed currentStep

  const drawStepContent = useCallback((
    ctx: CanvasRenderingContext2D,
    step: AnimationStep,
    w: number,
    h: number,
    progress: number,
    isDark: boolean
  ) => {
    if (step.type === "text") {
      const fontSize = step.fontSize || 18;
      ctx.font = `600 ${fontSize}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = step.color || (isDark ? "#e8e8e6" : "#1f1f1e");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const x = step.position?.x ?? w / 2;
      const y = step.position?.y ?? h / 2;
      ctx.fillText(step.content, x, y);
    } else if (step.type === "code") {
      ctx.font = `14px 'JetBrains Mono', monospace`;
      const lines = step.content.split("\n");
      const lineHeight = 22;
      const startY = h / 2 - (lines.length * lineHeight) / 2;
      const startX = 40;
      const bgPad = 16;

      ctx.fillStyle = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
      roundRect(ctx, startX - bgPad, startY - bgPad - 4, w - 80, lines.length * lineHeight + bgPad * 2, 6);
      ctx.fill();

      const linesToShow = Math.floor(lines.length * progress);
      for (let i = 0; i <= linesToShow && i < lines.length; i++) {
        const lineProgress = i === linesToShow ? (progress * lines.length) % 1 : 1;
        const charsToShow = Math.floor(lines[i].length * lineProgress);
        const text = lines[i].slice(0, charsToShow);
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
        ctx.textAlign = "right";
        ctx.fillText(`${i + 1}`, startX - 8, startY + i * lineHeight);
        ctx.textAlign = "left";
        highlightSyntax(ctx, text, startX + 8, startY + i * lineHeight, isDark);
      }
    } else if (step.type === "diagram") {
      drawConceptDiagram(ctx, w, h, step.content, progress, isDark);
      // Show a caption at bottom so user knows what concept is being illustrated
      const DIAGRAM_LABELS: Record<string, string> = {
        tree: "Tree Traversal", stack: "Stack (LIFO)", queue: "Queue (FIFO)",
        linkedlist: "Linked List", sorting: "Sorting", hashmap: "Hash Map",
        array: "Array", variables: "Data Types", loop: "Loop Iteration",
        graph: "Graph", function: "Function Flow", conditional: "If/Else Logic",
        class: "Class Structure", flow: "Program Flow",
      };
      const KNOWN = new Set(Object.keys(DIAGRAM_LABELS));
      const resolvedType = KNOWN.has(step.content.toLowerCase()) ? step.content.toLowerCase() : detectDiagramType(step.content);
      const label = DIAGRAM_LABELS[resolvedType] || step.content;
      const alpha = Math.min(1, progress * 4);
      ctx.globalAlpha = alpha;
      ctx.font = `600 11px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = ACCENT;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(`◆ ${label}`, w / 2, h - 6);
      ctx.globalAlpha = 1;
    } else if (step.type === "highlight") {
      const accentColor = step.color || ACCENT;
      ctx.font = `700 22px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = accentColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const scale = 0.8 + 0.2 * progress;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.fillText(step.content, 0, 0);
      ctx.restore();
    } else if (step.type === "custom" && step.script) {
      try {
        const fn = new Function(
          "ctx", "w", "h", "progress", "isDark", "ease", "lerp", "roundRect", "drawArrow", "ACCENT", "ACCENT2", "GREEN", "YELLOW", "RED",
          step.script
        );
        fn(ctx, w, h, progress, isDark, ease, lerp, roundRect, drawArrow, ACCENT, ACCENT2, GREEN, YELLOW, RED);
      } catch (err) {
        console.error("Custom animation script error:", err, step.script);
        ctx.font = `600 12px 'Space Grotesk', sans-serif`;
        ctx.fillStyle = RED;
        ctx.textAlign = "center";
        ctx.fillText("Failed to render custom visualization", w / 2, h / 2);
      }
    }

  }, []);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    animationStartRef.current = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - animationStartRef.current) / 1000; // seconds
      const globalProgress = Math.min(elapsed / timeline.totalDuration, 1);

      drawFrame(globalProgress);

      if (globalProgress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - draw final frame
        drawFrame(1);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, timeline, drawFrame]);

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    // Draw initial frame when steps load
    if (steps.length > 0) {
      drawFrame(0);
    }
  }, [steps, drawFrame]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />;
}

export function AnimationViewer({ topic, animationData, isLoading = false, onRequestAnimation }: AnimationViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [key, setKey] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const defaultSteps: AnimationStep[] = [
    { type: "highlight", content: topic || "Programming Concepts", duration: 2, color: ACCENT },
    { type: "text", content: "Let's visualize this concept...", duration: 2, fontSize: 16 },
    { type: "diagram", content: topic?.toLowerCase() || "flow", duration: 4 },
  ];

  const steps = animationData || defaultSteps;

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setKey((k) => k + 1);
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
    setKey((k) => k + 1);
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
    setKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-card">
        <span className="text-xs font-medium text-muted-foreground truncate">
          Visual: {topic || "Concept"}
        </span>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={handlePrev} data-testid="button-prev-step">
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleReset} data-testid="button-reset-animation">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setIsPlaying(!isPlaying)} data-testid="button-play-animation">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={handleNext} data-testid="button-next-step">
            <SkipForward className="w-4 h-4" />
          </Button>
          {onRequestAnimation && (
            <Button size="sm" variant="secondary" onClick={onRequestAnimation} disabled={isLoading} data-testid="button-generate-animation">
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
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
          <ManimCanvas key={key} steps={steps} isPlaying={isPlaying} onStepChange={setCurrentStep} />
        )}
      </div>
    </div>
  );
}
