import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
      "Generate a coding challenge for the student to practice in the IDE. Use this when: the student wants to practice, you've identified a topic they should work on, or the conversation naturally leads to hands-on coding. This creates a challenge and gives the student a link to open it.",
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
          enum: ["javascript", "python"],
          description: "Programming language for the challenge",
        },
      },
      required: ["topic", "difficulty", "language"],
    },
  },
  {
    name: "generate_learning_plan",
    description:
      "Generate a structured learning plan based on the conversation. Use this when: you have enough information about what the student wants to learn, their goals, and their experience level. Creates a plan with ordered topics they can work through.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title for the learning plan",
        },
        description: {
          type: "string",
          description: "Brief description of the plan",
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
                enum: ["javascript", "python"],
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
      "Save an important detail about the student for future conversations. Use this when the student shares something meaningful about themselves: their interests, learning style, struggles, achievements, or preferences.",
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
      const langName = language === "python" ? "Python" : "JavaScript";
      const profile = await storage.getProfile(sessionId);
      const profileHint = profile?.name
        ? `The student's name is ${profile.name}${profile.experience ? `, experience level: ${profile.experience}` : ""}.`
        : "";

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Generate a coding challenge for a teenage developer learning ${langName}.
${profileHint}

Topic: ${topic}
Difficulty: ${difficulty}
Language: ${langName}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "title": "Short challenge title",
  "description": "2-3 sentence description of what to build/solve",
  "starterCode": "The starter code with function stub and example usage",
  "solution": "The complete working solution",
  "hints": ["hint1", "hint2", "hint3"],
  "testCases": [
    {"name": "Test description", "input": [arg1, arg2], "expected": expectedResult, "functionName": "theFunctionName"}
  ]
}

Rules:
- The starterCode must define exactly ONE function with a clear name
- Include 3-5 test cases with diverse inputs
- Every test case MUST include "functionName"
- Test inputs should be arrays of arguments
- Expected values must be concrete
- Hints should be progressive
- Make it educational and engaging for teens`,
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
        title: challengeData.title,
        description: challengeData.description,
        difficulty,
        topic,
        language,
        starterCode: challengeData.starterCode,
        solution: challengeData.solution,
        hints: challengeData.hints || [],
        testCases: challengeData.testCases || [],
        order: 0,
        generatedBy: "ai",
        sessionId,
        planId: null,
      });

      return {
        result: `Challenge created: "${challenge.title}" (${difficulty}, ${langName}). The student can open it in the IDE.`,
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
        sessionId,
        title,
        description,
        topics: formattedTopics,
        status: "active",
      });

      return {
        result: `Learning plan "${title}" created with ${formattedTopics.length} topics.`,
        metadata: { type: "plan_created", plan: { id: plan.id, title } },
      };
    }
    case "remember_about_student": {
      const profile = await storage.getProfile(sessionId);
      const existing = (profile?.memories as string[]) || [];
      const updated = [...existing, toolInput.memory].slice(-50);
      await storage.upsertProfile(sessionId, { memories: updated });
      return { result: `Noted: "${toolInput.memory}"` };
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
      const profile = await storage.upsertProfile(sessionId, parsed.data);
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
      const result = await storage.upsertProfile(sessionId, {
        memories: updated,
      });
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
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Based on this conversation about what a student wants to learn, generate a structured learning plan.

${profileContext}

Conversation summary:
${parsed.data.conversationSummary}

Return ONLY valid JSON (no markdown, no backticks):
{
  "title": "Plan title",
  "description": "1-2 sentence description",
  "topics": [
    {
      "title": "Topic title",
      "description": "What will be learned",
      "difficulty": "Beginner|Intermediate|Advanced",
      "language": "javascript|python",
      "status": "pending"
    }
  ]
}

Generate 4-8 topics in a logical learning sequence.`,
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
      });

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
      const plan = await storage.updateLearningPlan(id, parsed.data);
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
    language: z.enum(["javascript", "python"]),
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
    testResults: z.array(
      z.object({
        name: z.string(),
        passed: z.boolean(),
        message: z.string().optional(),
      })
    ),
    language: z.string(),
  });

  app.post("/api/submissions/evaluate", async (req, res) => {
    try {
      const parsed = evaluateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { code, challengeId, testResults, language } = parsed.data;
      const sessionId = getSessionId(req);

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }

      const passedCount = testResults.filter((t) => t.passed).length;
      const totalCount = testResults.length;
      const testScore =
        totalCount > 0 ? Math.round((passedCount / totalCount) * 70) : 0;

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Evaluate this ${language} code submission for a coding challenge. Return ONLY valid JSON (no markdown).

Challenge: ${challenge.title}
Description: ${challenge.description}
Expected solution approach: ${challenge.solution}

Student's code:
\`\`\`
${code}
\`\`\`

Test results: ${passedCount}/${totalCount} passed

Rate code quality (0-30 points) based on:
- Readability and naming (0-10)
- Efficiency (0-10)
- Best practices (0-10)

Return JSON: {"qualityScore": number, "feedback": "2-3 sentence feedback for a teen learner", "strengths": ["strength1"], "improvements": ["improvement1"]}`,
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
        evaluation = {
          qualityScore: 15,
          feedback: "Good attempt! Keep practicing.",
          strengths: ["Submitted a solution"],
          improvements: ["Review the failing tests"],
        };
      }

      const totalScore = Math.min(
        100,
        testScore + (evaluation.qualityScore || 0)
      );
      const allPassed = passedCount === totalCount;

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
    systemPrompt: z.string().max(20000),
    mode: z.enum(["plan", "learn"]).optional(),
    challengeContext: z
      .object({
        id: z.number(),
        title: z.string(),
        description: z.string(),
        language: z.string(),
      })
      .optional(),
  });

  app.post("/api/mentor/chat", async (req, res) => {
    try {
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { messages, systemPrompt, challengeContext } = parsed.data;

      const sessionId = getSessionId(req);
      const profile = await storage.getProfile(sessionId);

      let enrichedPrompt = systemPrompt;
      if (profile) {
        const profileInfo = [
          profile.name ? `Student name: ${profile.name}` : null,
          profile.age ? `Age: ${profile.age}` : null,
          profile.experience ? `Experience: ${profile.experience}` : null,
          profile.goals ? `Goals: ${profile.goals}` : null,
          profile.preferredLanguage
            ? `Preferred language: ${profile.preferredLanguage}`
            : null,
          (profile.memories as string[])?.length > 0
            ? `Things to remember about this student: ${(profile.memories as string[]).join("; ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n");

        if (profileInfo) {
          enrichedPrompt = `${systemPrompt}\n\nStudent Profile:\n${profileInfo}`;
        }
      }

      if (challengeContext) {
        enrichedPrompt += `\n\nCurrent challenge context:\nTitle: ${challengeContext.title}\nDescription: ${challengeContext.description}\nLanguage: ${challengeContext.language}`;
      }

      enrichedPrompt += `\n\nIMPORTANT TOOL USAGE GUIDELINES:
- Use web_search when the student asks about real-world topics (jobs, companies, industry, current tech trends)
- Use generate_challenge when the student is ready to practice or you want to give them a hands-on exercise
- Use generate_learning_plan when you have enough info about what they want to learn (in plan mode especially)
- Use remember_about_student to save important details about the student
- When you create a challenge, tell the student about it and include a message like "I've created a challenge for you! Click the link in the sidebar or [open it here](/ide?challenge=ID)" 
- Be proactive about creating challenges when it makes sense - don't just talk, get them coding!`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let currentMessages: Anthropic.MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const MAX_TOOL_ROUNDS = 5;
      let round = 0;

      while (round < MAX_TOOL_ROUNDS) {
        round++;
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 8192,
          system: enrichedPrompt,
          messages: currentMessages,
          tools: MENTOR_TOOLS,
        });

        let hasToolUse = false;
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type === "text" && block.text) {
            const chunks = block.text.match(/.{1,20}/g) || [block.text];
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

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: `Generate a detailed visual animation sequence to explain this programming concept. Return a JSON array of 6-10 animation steps.

Topic: ${topic}
Title: ${title}
Description: ${description}

Each step should be an object with:
- type: "text" | "code" | "diagram" | "highlight" | "comparison" | "steps"
- content: the text/code/diagram-keyword to display
- duration: number of seconds (2-5)
- color: optional hex color (use #d97757 for accent, #a8cc8c for success, #e06c75 for error)
- fontSize: optional font size for text type (14-24)
- subtitle: optional secondary text to show below main content

For diagram type, use rich keywords:
- "array" - array visualization with indices
- "linked-list" - linked list with nodes and pointers
- "stack" - stack data structure (push/pop)
- "queue" - queue data structure (enqueue/dequeue)
- "tree" - binary tree structure
- "sorting" - sorting algorithm visualization
- "loop" - loop/iteration visualization
- "recursion" - recursive call stack
- "flow" - general flowchart
- "hashmap" - hash map with key-value pairs
- "graph" - graph with nodes and edges

For "comparison" type, content should be "left_label|right_label|left_code|right_code"
For "steps" type, content should be step descriptions separated by "|"

Create an engaging, educational sequence that builds understanding progressively.
Return ONLY a valid JSON array, no markdown wrapping.`,
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
      } catch {
        steps = [
          {
            type: "highlight",
            content: title,
            duration: 2,
            color: "#d97757",
          },
          {
            type: "text",
            content: description.slice(0, 100),
            duration: 3,
            fontSize: 16,
          },
          { type: "diagram", content: topic.toLowerCase(), duration: 4 },
          {
            type: "text",
            content: "Practice makes perfect!",
            duration: 2,
            fontSize: 18,
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
