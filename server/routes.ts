import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  buildSystemPrompt,
  buildChallengeGenerationPrompt,
  buildEvaluationPrompt,
  buildPlanGenerationPrompt,
  buildAnimationPrompt,
  type StudentContext,
} from "./prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Model Routing ───
// Sonnet for complex reasoning: main chat (agentic), animation generation
// Haiku for structured output: challenge gen, evaluation, plan gen
const MODELS = {
  chat: "claude-sonnet-4-5" as const,        // Main agentic conversation — needs reasoning
  animation: "claude-sonnet-4-5" as const,   // Visual walkthrough generation — needs creativity
  challengeGen: "claude-haiku-4-5" as const,  // Structured JSON output
  evaluation: "claude-haiku-4-5" as const,    // Scoring code — structured output
  planGen: "claude-haiku-4-5" as const,       // Structured plan JSON output
};

function getSessionId(req: any): string {
  if (!req.headers["x-session-id"]) {
    return "default-session";
  }
  return req.headers["x-session-id"] as string;
}

function detectDiagramType(concept: string): string {
  const c = concept.toLowerCase();
  if (c.includes("tree") || c.includes("binary") || c.includes("bst")) return "tree";
  if (c.includes("stack") || c.includes("lifo")) return "stack";
  if (c.includes("queue") || c.includes("fifo")) return "queue";
  if (c.includes("linked") || c.includes("node")) return "linkedlist";
  if (c.includes("sort") || c.includes("bubble") || c.includes("merge")) return "sorting";
  if (c.includes("hash") || c.includes("map") || c.includes("dict")) return "hashmap";
  if (c.includes("array") || c.includes("list")) return "array";
  if (c.includes("loop") || c.includes("iteration")) return "loop";
  if (c.includes("graph") || c.includes("vertex")) return "graph";
  if (c.includes("function") || c.includes("parameter")) return "function";
  if (c.includes("condition") || c.includes("if")) return "conditional";
  if (c.includes("variable") || c.includes("type")) return "variables";
  return "flow";
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

const MENTOR_TOOLS: Anthropic.Tool[] = [
  {
    name: "web_search",
    description:
      "Search the web for information about programming topics, career paths, company requirements, technology trends, or any other topic the student asks about. Use this when the student asks about real-world things like jobs, companies, industry trends, or specific technical information you want to verify.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to look up",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "generate_challenge",
    description:
      "Generate a coding challenge for the student to practice in the IDE. Use this PROACTIVELY when: the student wants to practice, you've just finished explaining a concept, you've identified a topic they should work on, or the conversation has been theoretical for too long (3+ exchanges without hands-on coding). This creates a challenge and opens it for the student.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "The coding topic for the challenge (e.g., 'array manipulation', 'recursion', 'string parsing')",
        },
        difficulty: {
          type: "string",
          enum: ["Beginner", "Intermediate", "Advanced"],
          description: "Difficulty level based on student's experience",
        },
        language: {
          type: "string",
          description: "Programming language for the challenge (e.g. 'javascript', 'python', 'java', 'cpp', 'rust')",
        },
      },
      required: ["topic", "difficulty", "language"],
    },
  },
  {
    name: "generate_learning_plan",
    description:
      "Generate a structured learning plan based on the conversation. Use this when: you have enough information about what the student wants to learn (topics + experience level + goals), the student asks for a plan/roadmap/path, or you're in planning mode and the student is ready. Creates a personalized plan with ordered topics they can work through.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title for the learning plan — make it exciting and personal",
        },
        description: {
          type: "string",
          description: "Brief description of the plan that makes the student excited",
        },
        topics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              difficulty: {
                type: "string",
                enum: ["Beginner", "Intermediate", "Advanced"],
              },
              language: {
                type: "string",
                description: "Programming language for the topic",
              },
            },
            required: ["title", "description", "difficulty", "language"],
          },
          description: "Array of 4-8 topics in logical learning sequence",
        },
      },
      required: ["title", "description", "topics"],
    },
  },
  {
    name: "remember_about_student",
    description:
      "Save an important detail about the student for future conversations. Use this FREQUENTLY when the student shares ANYTHING meaningful: their interests, learning style, struggles, achievements, preferences, personality, career goals, hobbies, school info, or current projects. This data persists and makes you a better mentor over time.",
    input_schema: {
      type: "object" as const,
      properties: {
        memory: {
          type: "string",
          description: "A concise note about the student to remember",
        },
      },
      required: ["memory"],
    },
  },
];

/** Build full student context for the agentic prompt engine */
async function buildStudentContext(
  sessionId: string,
  mode: "plan" | "learn",
  challengeContext?: { id: number; title: string; description: string; language: string },
  currentCode?: string
): Promise<StudentContext> {
  const [profile, allPlans, progress, recentChallenges] = await Promise.all([
    storage.getProfile(sessionId),
    storage.getLearningPlans(sessionId),
    storage.getProgress(sessionId),
    storage.getChallengesBySession(sessionId),
  ]);

  const activePlan = allPlans?.find(p => p.status === "active");

  return {
    profile,
    activePlan,
    allPlans,
    recentChallenges: recentChallenges?.slice(0, 10),
    progress,
    challengeContext,
    currentCode,
    mode,
  };
}

async function handleToolCall(
  toolName: string,
  toolInput: any,
  sessionId: string
): Promise<{ result: string; metadata?: any }> {
  switch (toolName) {
    case "web_search": {
      const searchResults = await webSearch(toolInput.query);
      return { result: searchResults };
    }
    case "generate_challenge": {
      const { topic, difficulty, language } = toolInput;
      const profile = await storage.getProfile(sessionId);

      const response = await anthropic.messages.create({
        model: MODELS.challengeGen,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: buildChallengeGenerationPrompt(topic, difficulty, language, profile),
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      let challengeData;
      try {
        const cleaned = text
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        challengeData = JSON.parse(cleaned);
      } catch {
        return { result: "Failed to generate challenge. Please try again." };
      }

      const challenge = await storage.createChallenge({
        title: challengeData.title as any,
        description: challengeData.description as any,
        difficulty: difficulty as any,
        topic: topic as any,
        language: language as any,
        starterCode: challengeData.starterCode as any,
        solution: challengeData.solution as any,
        hints: (challengeData.hints || []) as any,
        testCases: (challengeData.testCases || []) as any,
        order: 0 as any,
        generatedBy: "ai" as any,
        sessionId: sessionId as any,
        planId: null as any,
      } as any);

      return {
        result: `Challenge created: "${challenge.title}" (${difficulty}, ${language === "python" ? "Python" : "JavaScript"}). The student can open it in the IDE. Tell them about it enthusiastically and include link: [Open Challenge](/ide?challenge=${challenge.id})`,
        metadata: {
          type: "challenge_created",
          challenge: { id: challenge.id, title: challenge.title },
        },
      };
    }
    case "generate_learning_plan": {
      const { title, description, topics } = toolInput;
      const formattedTopics = topics.map((t: any) => ({
        ...t,
        status: "pending",
      }));

      const plan = await storage.createLearningPlan({
        sessionId: sessionId as any,
        title: title as any,
        description: description as any,
        topics: formattedTopics as any,
        status: "active" as any,
      } as any);

      const topicList = formattedTopics
        .map((t: any, i: number) => `${i + 1}. **${t.title}** — ${t.description}`)
        .join("\n");

      return {
        result: `Learning plan "${title}" created with ${formattedTopics.length} topics:\n${topicList}\n\nThe plan is now visible in the sidebar. Walk the student through the topics and suggest starting with the first one immediately.`,
        metadata: { type: "plan_created", plan: { id: plan.id, title } },
      };
    }
    case "remember_about_student": {
      const profile = await storage.getProfile(sessionId);
      const existing = (profile?.memories as string[]) || [];
      const updated = [...existing, toolInput.memory].slice(-50);
      await storage.upsertProfile(sessionId as any, { memories: updated } as any);
      return { result: `Noted: "${toolInput.memory}". Continue the conversation naturally — don't tell the student you saved a memory.` };
    }
    default:
      return { result: "Unknown tool" };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ─── Profile Routes ───

  app.get("/api/profile", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const profile = await storage.getProfile(sessionId);
      res.json(profile || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  const profileSchema = z.object({
    name: z.string().max(100).optional(),
    age: z.number().int().min(8).max(99).optional(),
    experience: z.string().max(500).optional(),
    goals: z.string().max(1000).optional(),
    preferredLanguage: z.string().optional(),
    memories: z.array(z.string().max(500)).max(50).optional(),
  });

  app.post("/api/profile", async (req, res) => {
    try {
      const parsed = profileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const sessionId = getSessionId(req);
      const profile = await storage.upsertProfile(sessionId as any, parsed.data as any);
      res.json(profile);
    } catch (error) {
      console.error("Error saving profile:", error);
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.post("/api/profile/memories", async (req, res) => {
    try {
      const schema = z.object({ memory: z.string().min(1).max(500) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const sessionId = getSessionId(req);
      const profile = await storage.getProfile(sessionId);
      const existing = (profile?.memories as string[]) || [];
      const updated = [...existing, parsed.data.memory].slice(-50);
      const result = await storage.upsertProfile(sessionId as any, {
        memories: updated,
      } as any);
      res.json(result);
    } catch (error) {
      console.error("Error adding memory:", error);
      res.status(500).json({ error: "Failed to add memory" });
    }
  });

  // ─── Learning Plan Routes ───

  app.get("/api/plans", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const plans = await storage.getLearningPlans(sessionId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.get("/api/plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const plan = await storage.getLearningPlan(id);
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      res.json(plan);
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  });

  app.post("/api/plans/generate", async (req, res) => {
    try {
      const schema = z.object({
        conversationSummary: z.string().min(1).max(10000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const sessionId = getSessionId(req);
      const profile = await storage.getProfile(sessionId);

      const profileContext = profile
        ? `Student profile: Name: ${profile.name || "Unknown"}, Age: ${profile.age || "Unknown"}, Experience: ${profile.experience || "Unknown"}, Goals: ${profile.goals || "Unknown"}, Preferred Language: ${profile.preferredLanguage || "javascript"}`
        : "No profile info available.";

      const response = await anthropic.messages.create({
        model: MODELS.planGen,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: buildPlanGenerationPrompt(parsed.data.conversationSummary, profileContext),
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      let planData;
      try {
        const cleaned = text
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        planData = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const plan = await storage.createLearningPlan({
        sessionId,
        title: planData.title,
        description: planData.description,
        topics: planData.topics || [],
        status: "active",
      } as any);

      res.json(plan);
    } catch (error) {
      console.error("Error generating plan:", error);
      res.status(500).json({ error: "Failed to generate plan" });
    }
  });

  app.patch("/api/plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const schema = z.object({
        topics: z.array(z.any()).optional(),
        status: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const plan = await storage.updateLearningPlan(id, parsed.data as any);
      res.json(plan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  // ─── Challenge Routes ───

  app.get("/api/challenges", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const allChallenges = await storage.getChallengesBySession(sessionId);
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

  const generateSchema = z.object({
    topic: z.string().min(1).max(200),
    difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
    language: z.string(),
    planId: z.number().int().optional(),
  });

  app.post("/api/challenges/generate", async (req, res) => {
    try {
      const parsed = generateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { topic, difficulty, language, planId } = parsed.data;
      const sessionId = getSessionId(req);

      const result = await handleToolCall(
        "generate_challenge",
        { topic, difficulty, language },
        sessionId
      );

      if (result.metadata?.challenge) {
        const challenge = await storage.getChallenge(
          result.metadata.challenge.id
        );
        res.json(challenge);
      } else {
        res.status(500).json({ error: "Failed to generate challenge" });
      }
    } catch (error) {
      console.error("Error generating challenge:", error);
      res.status(500).json({ error: "Failed to generate challenge" });
    }
  });

  // ─── Progress Routes ───

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
      const progress = await storage.getProgressForChallenge(
        sessionId,
        challengeId
      );
      if (!progress) {
        return res.json(null);
      }
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  const saveProgressSchema = z.object({
    challengeId: z.number().int().positive(),
    code: z.string().max(50000),
    status: z.string(),
  });

  app.post("/api/progress/save", async (req, res) => {
    try {
      const parsed = saveProgressSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { challengeId, code, status } = parsed.data;
      const sessionId = getSessionId(req);
      const progress = await storage.upsertProgress(
        sessionId,
        challengeId,
        status,
        code
      );
      res.json(progress);
    } catch (error) {
      console.error("Error saving progress:", error);
      res.status(500).json({ error: "Failed to save progress" });
    }
  });

  // ─── Evaluation Route ───

  const evaluateSchema = z.object({
    code: z.string().min(1).max(50000),
    challengeId: z.number().int().positive(),
    language: z.string(),
  });

  app.post("/api/submissions/evaluate", async (req, res) => {
    try {
      const parsed = evaluateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { code, challengeId, language } = parsed.data;
      const sessionId = getSessionId(req);

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      // Parse test cases if they are stored as string
      const testCases = typeof challenge.testCases === "string"
        ? JSON.parse(challenge.testCases)
        : challenge.testCases;

      const challengeContext = {
        title: challenge.title,
        description: challenge.description,
        solution: challenge.solution,
        testCases: testCases || []
      };

      const response = await anthropic.messages.create({
        model: MODELS.evaluation,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: buildEvaluationPrompt(
              code,
              challengeContext,
              language
            ),
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      let evaluation;
      try {
        const cleaned = text
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        evaluation = JSON.parse(cleaned);
      } catch {
        // Fallback if JSON parsing fails
        evaluation = {
          qualityScore: 10,
          passCount: 0,
          totalCount: 0,
          feedback: "I had trouble evaluating your code completely. Please double check your syntax.",
          strengths: ["Attempted solution"],
          improvements: ["Check syntax"],
          testResults: []
        };
      }

      const passedCount = evaluation.passCount || 0;
      const totalCount = evaluation.totalCount || (testCases ? testCases.length : 0) || 1;

      const testScore = Math.round((passedCount / totalCount) * 70);
      const totalScore = Math.min(100, testScore + (evaluation.qualityScore || 0));
      const allPassed = passedCount === totalCount && totalCount > 0;

      const feedbackText = `Score: ${totalScore}/100\n${evaluation.feedback}\nStrengths: ${(evaluation.strengths || []).join(", ")}\nTo improve: ${(evaluation.improvements || []).join(", ")}`;

      await storage.upsertProgress(
        sessionId,
        challengeId,
        allPassed ? "completed" : "in_progress",
        code,
        totalScore,
        feedbackText
      );

      res.json({
        score: totalScore,
        testScore,
        qualityScore: evaluation.qualityScore || 0,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths || [],
        improvements: evaluation.improvements || [],
        allPassed,
        testResults: evaluation.testResults || []
      });
    } catch (error) {
      console.error("Error evaluating submission:", error);
      res.status(500).json({ error: "Failed to evaluate submission" });
    }
  });

  // ─── Agentic Chat Route (with tools: web search, challenge gen, plan gen, memory) ───

  const chatSchema = z.object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(10000),
      })
    ),
    systemPrompt: z.string().max(20000).optional(), // Now optional — server builds it
    mode: z.enum(["plan", "learn"]).optional(),
    challengeContext: z
      .object({
        id: z.number(),
        title: z.string(),
        description: z.string(),
        language: z.string(),
      })
      .optional(),
    currentCode: z.string().max(50000).optional(),
  });

  // Chat History Routes
  app.get("/api/conversations", async (req, res) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) return res.status(400).json({ message: "Session ID required" });
    const convs = await storage.getConversations(sessionId);
    res.json(convs);
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const id = parseInt(req.params.id);
    const msgs = await storage.getMessages(id);
    res.json(msgs);
  });

  app.post("/api/conversations", async (req, res) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (!sessionId) return res.status(400).json({ message: "Session ID required" });
    const conv = await storage.createConversation({
      sessionId: sessionId as any,
      title: (req.body.title || "New Chat") as any,
    } as any);
    res.json(conv);
  });

  // Modify /api/mentor/chat to record history if conversationId is provided
  app.post("/api/mentor/chat", async (req, res) => {
    try {
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { messages, challengeContext, currentCode } = parsed.data;
      const mode = parsed.data.mode || "learn";
      const conversationId = req.body.conversationId; // Extract conversationId from req.body

      const sessionId = getSessionId(req);

      // Save user message if conversation exists
      if (conversationId && messages.length > 0) {
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage.role === "user") {
          await storage.createMessage({
            conversationId: conversationId as any,
            role: "user" as any,
            content: lastUserMessage.content as any,
          } as any);
        }
      }

      // Build rich, journey-aware context
      const studentContext = await buildStudentContext(
        sessionId,
        mode,
        challengeContext,
        currentCode
      );

      // Build the agentic system prompt from the prompt engine
      const agenticPrompt = buildSystemPrompt(studentContext);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const MAX_TOOL_ROUNDS = 5;
      let round = 0;

      let assistantFinalContent = "";
      while (round < MAX_TOOL_ROUNDS) {
        round++;
        const response = await anthropic.messages.create({
          model: MODELS.chat,
          max_tokens: 8192,
          system: agenticPrompt,
          messages: currentMessages,
          tools: MENTOR_TOOLS,
        });

        let hasToolUse = false;
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            assistantFinalContent += block.text;
            const chunks = block.text.split(/(?<=\n)/g).flatMap(line => {
              if (line.length <= 200) return [line];
              return line.match(/.{1,200}/g) || [line];
            });
            for (const chunk of chunks) {
              res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            }
          } else if (block.type === "tool_use") {
            hasToolUse = true;
            res.write(
              `data: ${JSON.stringify({ thinking: `Using ${block.name}...` })}\n\n`
            );

            try {
              const toolResult = await handleToolCall(
                block.name,
                block.input,
                sessionId
              );

              if (toolResult.metadata) {
                res.write(
                  `data: ${JSON.stringify({ toolResult: toolResult.metadata })}\n\n`
                );
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: toolResult.result,
              });
            } catch (err: any) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: `Error: ${err.message}`,
                is_error: true,
              });
            }
          }
        }

        if (!hasToolUse) {
          break;
        }

        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ];
      }

      // Save assistant response if conversation exists
      if (conversationId && assistantFinalContent.trim()) {
        await storage.createMessage({
          conversationId: conversationId as any,
          role: "assistant" as any,
          content: assistantFinalContent as any,
        } as any);
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

  // ─── Animation Route ───

  const animationSchema = z.object({
    topic: z.string().min(1).max(200),
    title: z.string().min(1).max(500),
    description: z.string().min(1).max(2000),
  });

  app.post("/api/animations/generate", async (req, res) => {
    try {
      const parsed = animationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { topic, title, description } = parsed.data;

      console.log(`Generating animation for: ${topic}`);

      const response = await anthropic.messages.create({
        model: MODELS.animation,
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: buildAnimationPrompt(topic, title, description),
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      let steps;
      try {
        const cleaned = text
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        steps = JSON.parse(cleaned);

        // Validate steps structure
        if (!Array.isArray(steps) || steps.length === 0) {
          throw new Error("Invalid steps format");
        }

        console.log(`Generated ${steps.length} animation steps`);
      } catch (parseError) {
        console.error("Failed to parse AI animation response:", parseError);
        console.error("Raw response:", text.slice(0, 500));

        // Fallback to diagram-heavy default animation
        const diagramType = detectDiagramType(topic);
        steps = [
          {
            type: "highlight",
            content: title.slice(0, 30),
            duration: 2,
            color: "#d97757",
          },
          {
            type: "diagram",
            content: diagramType,
            duration: 6
          },
          {
            type: "diagram",
            content: diagramType,
            duration: 6
          },
          {
            type: "text",
            content: description.slice(0, 50),
            duration: 2,
            fontSize: 14,
          },
          {
            type: "diagram",
            content: diagramType,
            duration: 7
          },
          {
            type: "text",
            content: "Keep practicing!",
            duration: 2,
            fontSize: 14,
          },
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
