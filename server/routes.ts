import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

function getSessionId(req: any): string {
  if (!req.headers["x-session-id"]) {
    return "default-session";
  }
  return req.headers["x-session-id"] as string;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedDatabase();

  app.get("/api/challenges", async (_req, res) => {
    try {
      const allChallenges = await storage.getChallenges();
      res.json(allChallenges);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ error: "Failed to fetch challenges" });
    }
  });

  app.get("/api/challenges/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const challenge = await storage.getChallenge(id);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json(challenge);
    } catch (error) {
      console.error("Error fetching challenge:", error);
      res.status(500).json({ error: "Failed to fetch challenge" });
    }
  });

  app.get("/api/progress", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const progress = await storage.getProgress(sessionId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  app.get("/api/progress/:challengeId", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const challengeId = parseInt(req.params.challengeId);
      const progress = await storage.getProgressForChallenge(sessionId, challengeId);
      if (!progress) {
        return res.json(null);
      }
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  const codeSchema = z.object({
    code: z.string().min(1).max(50000),
    challengeId: z.number().int().positive(),
  });

  const chatSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(10000),
    })),
    systemPrompt: z.string().max(20000),
  });

  const animationSchema = z.object({
    topic: z.string().min(1).max(200),
    title: z.string().min(1).max(500),
    description: z.string().min(1).max(2000),
  });

  app.post("/api/code/run", async (req, res) => {
    try {
      const parsed = codeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { code, challengeId } = parsed.data;
      const sessionId = getSessionId(req);

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      await storage.upsertProgress(sessionId, challengeId, "in_progress", code);

      const result = executeCode(code, challenge);
      res.json(result);
    } catch (error) {
      console.error("Error running code:", error);
      res.status(500).json({ error: "Failed to run code" });
    }
  });

  app.post("/api/code/submit", async (req, res) => {
    try {
      const parsed = codeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { code, challengeId } = parsed.data;
      const sessionId = getSessionId(req);

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      const result = executeCode(code, challenge);
      const allPassed = result.testResults.every((t: any) => t.passed);

      await storage.upsertProgress(
        sessionId,
        challengeId,
        allPassed ? "completed" : "in_progress",
        code
      );

      res.json(result);
    } catch (error) {
      console.error("Error submitting code:", error);
      res.status(500).json({ error: "Failed to submit code" });
    }
  });

  app.post("/api/mentor/chat", async (req, res) => {
    try {
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { messages, systemPrompt } = parsed.data;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: messages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const content = event.delta.text;
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in mentor chat:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to get AI response" });
      }
    }
  });

  app.post("/api/animations/generate", async (req, res) => {
    try {
      const parsed = animationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { topic, title, description } = parsed.data;

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: `Generate a visual animation sequence to explain this programming concept. Return a JSON array of animation steps.

Topic: ${topic}
Title: ${title}
Description: ${description}

Each step should be an object with:
- type: "text" | "code" | "diagram" | "highlight"
- content: the text/code/diagram-keyword to display
- duration: number of seconds (1-5)
- color: optional hex color (use #d97757 for accent)
- fontSize: optional font size for text type

For diagram type, use keywords like "array", "loop", "flow" in content.

Return ONLY a valid JSON array of 4-6 steps, no markdown wrapping.`,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      let steps;
      try {
        const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        steps = JSON.parse(cleaned);
      } catch {
        steps = [
          { type: "highlight", content: title, duration: 2, color: "#d97757" },
          { type: "text", content: description.slice(0, 80), duration: 3, fontSize: 16 },
          { type: "diagram", content: topic.toLowerCase(), duration: 4 },
          { type: "text", content: "Practice makes perfect!", duration: 2, fontSize: 18 },
        ];
      }

      res.json({ steps });
    } catch (error) {
      console.error("Error generating animation:", error);
      res.status(500).json({ error: "Failed to generate animation" });
    }
  });

  return httpServer;
}

function executeCode(code: string, challenge: any): { output: string; testResults: any[] } {
  const testCases = typeof challenge.testCases === "string"
    ? JSON.parse(challenge.testCases)
    : challenge.testCases;

  const testResults: any[] = [];
  let output = "";

  const logs: string[] = [];
  const mockConsole = {
    log: (...args: any[]) => logs.push(args.map(String).join(" ")),
  };

  try {
    const fn = new Function("console", code + "\n; return typeof helloWorld !== 'undefined' ? helloWorld : typeof add !== 'undefined' ? add : typeof isEven !== 'undefined' ? isEven : typeof reverseString !== 'undefined' ? reverseString : typeof findMax !== 'undefined' ? findMax : typeof countVowels !== 'undefined' ? countVowels : typeof fizzBuzz !== 'undefined' ? fizzBuzz : typeof isPalindrome !== 'undefined' ? isPalindrome : undefined;");

    const userFn = fn(mockConsole);
    output = logs.join("\n");

    if (userFn && typeof userFn === "function") {
      for (const test of testCases) {
        try {
          const result = userFn(...(test.input || []));

          if (test.expected === "includes_FizzBuzz") {
            const passed = Array.isArray(result) && result.includes("FizzBuzz");
            testResults.push({
              passed,
              name: test.name,
              message: passed ? "Correct" : `Expected array to include "FizzBuzz"`,
            });
          } else {
            const passed = JSON.stringify(result) === JSON.stringify(test.expected);
            testResults.push({
              passed,
              name: test.name,
              message: passed
                ? "Correct"
                : `Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`,
            });
          }
        } catch (testError: any) {
          testResults.push({
            passed: false,
            name: test.name,
            message: `Error: ${testError.message}`,
          });
        }
      }
    } else {
      for (const test of testCases) {
        testResults.push({
          passed: false,
          name: test.name,
          message: "Function not found. Make sure to define the function with the correct name.",
        });
      }
    }
  } catch (error: any) {
    output = `Error: ${error.message}`;
    for (const test of testCases) {
      testResults.push({
        passed: false,
        name: test.name,
        message: `Syntax Error: ${error.message}`,
      });
    }
  }

  return { output, testResults };
}
