import type { Express } from "express";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ─── Model Routing ───
const MODELS = {
  chat: "gemini-3.1-flash-lite-preview" as const,
};

// ─── Retry Helpers ───
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isRetryableError(err: any): boolean {
  const code = err?.code ?? err?.cause?.code ?? "";
  const msg = (err?.message ?? "").toLowerCase();
  return (
    code === "ENETUNREACH" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("socket hang up")
  );
}

/**
 * Runs a single agentic round with retry+backoff.
 * Returns the accumulated text + any function calls from the stream.
 * Throws only when all retries are exhausted.
 */
async function runStreamRound(
  params: Parameters<typeof ai.models.generateContentStream>[0],
  onChunkText: (text: string) => void,
  maxRetries = 3
): Promise<{ text: string; toolCalls: any[]; hasToolUse: boolean; rawModelParts: any[] }> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContentStream(params);

      let accText = "";
      const toolCalls: any[] = [];
      const rawModelParts: any[] = [];
      let hasToolUse = false;

      for await (const chunk of response) {
        // Collect raw parts from candidates to preserve thought_signature fields
        if (chunk.candidates) {
          for (const candidate of chunk.candidates) {
            if (candidate.content?.parts) {
              for (const part of candidate.content.parts) {
                rawModelParts.push(part);
              }
            }
          }
        }
        if (chunk.text) {
          accText += chunk.text;
          onChunkText(chunk.text);
        }
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          hasToolUse = true;
          for (const call of chunk.functionCalls) {
            toolCalls.push(call);
          }
        }
      }

      return { text: accText, toolCalls, hasToolUse, rawModelParts };
    } catch (err: any) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxRetries) throw err;
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[retry] Gemini API error (attempt ${attempt + 1}/${maxRetries + 1}): ${err.code ?? err.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

async function webSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const data = await response.json();

    let results: string[] = [];
    if (data.AbstractText) {
      results.push(`Summary: ${data.AbstractText}`);
    }
    if (data.RelatedTopics) {
      const topics = data.RelatedTopics.slice(0, 5);
      for (const topic of topics) {
        if (topic.Text) {
          results.push(`- ${topic.Text}`);
        }
      }
    }

    if (results.length === 0) {
      const scrapeRes = await fetch(
        `https://api.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        { headers: { "User-Agent": "TilperAI/1.0" } }
      );
      const html = await scrapeRes.text();
      const snippets = html.match(/<a class="result__snippet"[^>]*>(.*?)<\/a>/g);
      if (snippets) {
        results = snippets.slice(0, 5).map((s) =>
          s.replace(/<[^>]+>/g, "").trim()
        );
      }
    }

    return results.length > 0
      ? results.join("\n")
      : "No specific results found. Use your own knowledge to help the student.";
  } catch {
    return "Search unavailable. Use your own knowledge to help the student.";
  }
}

const MENTOR_TOOLS: FunctionDeclaration[] = [
  {
    name: "web_search",
    description:
      "Search the web for information about programming topics, career paths, company requirements, technology trends, or any other topic the student asks about. Use this when the student asks about real-world things like jobs, companies, industry trends, or specific technical information you want to verify.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query to look up",
        },
      },
      required: ["query"],
    },
  },
];

async function handleToolCall(
  toolName: string,
  toolInput: any
): Promise<{ result: string }> {
  switch (toolName) {
    case "web_search": {
      const searchResults = await webSearch(toolInput.query);
      return { result: searchResults };
    }
    default:
      return { result: "Unknown tool" };
  }
}

function buildSystemPrompt(): string {
  return `You are an AI coding mentor for teenage developers learning to code. Your role is to:

1. **Be Encouraging & Supportive**: Use a friendly, conversational tone. Celebrate small wins and progress.

2. **Explain Concepts Clearly**: Break down complex topics into simple, understandable parts. Use analogies and examples.

3. **Ask Probing Questions**: Help students think through problems rather than just giving answers. Guide their learning.

4. **Provide Practical Examples**: Share code snippets and real-world use cases when explaining concepts.

5. **Use Available Tools**:
   - **web_search**: Look up current programming trends, job requirements, or technical information when needed.

6. **Adapt to Skill Level**: Match your explanations to the student's experience level. Start simple and build up complexity.

7. **Encourage Best Practices**: Teach good coding habits, clean code principles, and problem-solving approaches.

8. **Be Patient**: Remember that learning to code is challenging. Encourage questions and exploration.

Keep responses concise but thorough. Focus on understanding over memorization. Make coding fun and accessible!`;
}

export async function registerRoutes(app: Express): Promise<void> {
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ─── AI Chat Endpoint (SSE streaming) ───
  const chatSchema = z.object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10000),
      })
    ),
  });

  app.post("/api/mentor/chat", async (req, res) => {
    try {
      const incomingMessages = Array.isArray(req.body?.messages)
        ? req.body.messages
        : [];

      const sanitizedMessages = incomingMessages
        .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m: any) => ({ role: m.role, content: m.content.trim() }))
        .filter((m: any) => m.content.length > 0)
        .slice(-50);

      const parsed = chatSchema.safeParse({
        ...req.body,
        messages: sanitizedMessages,
      });

      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      if (sanitizedMessages.length === 0) {
        return res.status(400).json({ error: "At least one non-empty message is required" });
      }

      const { messages } = parsed.data;

      // Build the agentic system prompt
      const agenticPrompt = buildSystemPrompt();

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let currentMessages: any[] = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const MAX_TOOL_ROUNDS = 5;
      let round = 0;

      let assistantFinalContent = "";
      while (round < MAX_TOOL_ROUNDS) {
        round++;

        // Send thinking indicator on rounds after a tool call
        if (round > 1) {
          res.write(`data: ${JSON.stringify({ thinking: "Thinking..." })}\n\n`);
        }

        let roundResult: Awaited<ReturnType<typeof runStreamRound>>;
        try {
          roundResult = await runStreamRound(
            {
              model: MODELS.chat,
              contents: currentMessages,
              config: {
                systemInstruction: agenticPrompt,
                tools: [{ functionDeclarations: MENTOR_TOOLS }],
                temperature: 0.7,
                // Disable thinking to avoid thought_signature requirements in multi-turn tool calls
                thinkingConfig: { thinkingBudget: 0 },
              }
            },
            (text) => {
              assistantFinalContent += text;
              const textChunks = text.split(/(?<=\n)/g).flatMap(line => {
                if (line.length <= 200) return [line];
                return line.match(/.{1,200}/g) || [line];
              });
              for (const textChunk of textChunks) {
                res.write(`data: ${JSON.stringify({ content: textChunk })}\n\n`);
              }
            }
          );
        } catch (streamErr: any) {
          // All retries exhausted — surface error to client and bail
          console.error(`[chat] All retries failed on round ${round}:`, streamErr.code ?? streamErr.message);
          res.write(`data: ${JSON.stringify({ error: "Connection to AI failed after retries. Please try again." })}\n\n`);
          res.end();
          return;
        }

        const { toolCalls, hasToolUse } = roundResult;
        const toolResults: any[] = [];

        if (hasToolUse) {
          const getThinkingMessage = (name: string) => {
            switch (name) {
              case "web_search": return "Searching for the latest insights...";
              default: return `Thinking (${name})...`;
            }
          };

          for (const call of toolCalls) {
            res.write(`data: ${JSON.stringify({ thinking: getThinkingMessage(call.name) })}\n\n`);
            try {
              const toolResult = await handleToolCall(call.name, call.args);
              toolResults.push({
                functionResponse: { name: call.name, response: { result: toolResult.result } }
              });
            } catch (err: any) {
              toolResults.push({
                functionResponse: { name: call.name, response: { error: err.message } }
              });
            }
          }
        }

        if (!hasToolUse) break;

        // Use raw model parts (not reconstructed) to preserve thought_signature fields
        // required by the Gemini API for tool call continuations
        currentMessages.push({
          role: "model",
          parts: roundResult.rawModelParts.length > 0
            ? roundResult.rawModelParts
            : toolCalls.map(c => ({ functionCall: c })),
        });
        currentMessages.push({ role: "user", parts: toolResults });
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in mentor chat:", error);
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ error: "An error occurred" })}\n\n`
        );
        res.end();
      } else {
        res.status(500).json({ error: "Failed to get AI response" });
      }
    }
  });
}
