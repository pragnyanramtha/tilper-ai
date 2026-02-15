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
      const result = await storage.upsertProfile(sessionId, { memories: updated });
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
  "title": "Plan title (e.g., 'Python Fundamentals Journey')",
  "description": "1-2 sentence description of the plan",
  "topics": [
    {
      "title": "Topic title",
      "description": "What will be learned in this topic",
      "difficulty": "Beginner|Intermediate|Advanced",
      "language": "javascript|python",
      "status": "pending"
    }
  ]
}

Generate 4-8 topics in a logical learning sequence. Tailor difficulty and language to the student's profile and conversation.`,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      let planData;
      try {
        const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
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
      const profile = await storage.getProfile(sessionId);

      const langName = language === "python" ? "Python" : "JavaScript";
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
    {"name": "Test description", "input": [arg1, arg2], "expected": expectedResult, "functionName": "theFunctionName"},
    {"name": "Another test", "input": [arg1], "expected": expectedResult, "functionName": "theFunctionName"}
  ]
}

Rules:
- The starterCode must define exactly ONE function with a clear name
- Include 3-5 test cases with diverse inputs (edge cases, negatives, empty, etc.)
- Every test case MUST include "functionName" with the exact function name used in starterCode
- Test inputs should be arrays of arguments (use [] for no-arg functions)
- Expected values must be concrete (not descriptions)
- Hints should be progressive (easy to specific)
- Make it educational and engaging for teens
- For ${langName} use proper syntax`,
          },
        ],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      let challengeData;
      try {
        const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        challengeData = JSON.parse(cleaned);
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
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
        planId: planId || null,
      });

      res.json(challenge);
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
      const progress = await storage.upsertProgress(sessionId, challengeId, status, code);
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
    testResults: z.array(z.object({
      name: z.string(),
      passed: z.boolean(),
      message: z.string().optional(),
    })),
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

      const passedCount = testResults.filter(t => t.passed).length;
      const totalCount = testResults.length;
      const testScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 70) : 0;

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

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      let evaluation;
      try {
        const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        evaluation = JSON.parse(cleaned);
      } catch {
        evaluation = { qualityScore: 15, feedback: "Good attempt! Keep practicing.", strengths: ["Submitted a solution"], improvements: ["Review the failing tests"] };
      }

      const totalScore = Math.min(100, testScore + (evaluation.qualityScore || 0));
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

  // ─── Chat Route (enhanced with profile context) ───

  const chatSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(10000),
    })),
    systemPrompt: z.string().max(20000),
  });

  app.post("/api/mentor/chat", async (req, res) => {
    try {
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const { messages, systemPrompt } = parsed.data;

      const sessionId = getSessionId(req);
      const profile = await storage.getProfile(sessionId);

      let enrichedPrompt = systemPrompt;
      if (profile) {
        const profileInfo = [
          profile.name ? `Student name: ${profile.name}` : null,
          profile.age ? `Age: ${profile.age}` : null,
          profile.experience ? `Experience: ${profile.experience}` : null,
          profile.goals ? `Goals: ${profile.goals}` : null,
          profile.preferredLanguage ? `Preferred language: ${profile.preferredLanguage}` : null,
          (profile.memories as string[])?.length > 0 ? `Things to remember about this student: ${(profile.memories as string[]).join("; ")}` : null,
        ].filter(Boolean).join("\n");

        if (profileInfo) {
          enrichedPrompt = `${systemPrompt}\n\nStudent Profile:\n${profileInfo}`;
        }
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: enrichedPrompt,
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
