import { db } from "./db";
import {
  users,
  challenges,
  userProgress,
  userProfiles,
  learningPlans,
  conversations,
  messages,
  type User,
  type InsertUser,
  type Challenge,
  type InsertChallenge,
  type UserProgress,
  type UserProfile,
  type InsertUserProfile,
  type LearningPlan,
  type InsertLearningPlan,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { eq, and, asc, desc, or, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getProfile(sessionId: string): Promise<UserProfile | undefined>;
  upsertProfile(sessionId: string, data: Partial<InsertUserProfile>): Promise<UserProfile>;

  getLearningPlans(sessionId: string): Promise<LearningPlan[]>;
  getLearningPlan(id: number): Promise<LearningPlan | undefined>;
  createLearningPlan(plan: InsertLearningPlan): Promise<LearningPlan>;
  updateLearningPlan(id: number, data: Partial<InsertLearningPlan>): Promise<LearningPlan>;

  getChallenges(): Promise<Challenge[]>;
  getChallengesBySession(sessionId: string): Promise<Challenge[]>;
  getChallenge(id: number): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;

  getProgress(sessionId: string): Promise<UserProgress[]>;
  getProgressForChallenge(sessionId: string, challengeId: number): Promise<UserProgress | undefined>;
  upsertProgress(sessionId: string, challengeId: number, status: string, userCode?: string, score?: number, aiFeedback?: string): Promise<UserProgress>;

  // Conversation methods
  getConversations(sessionId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    return (await db.select().from(users).where(eq(users.id, id as any) as any))[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return (await db.select().from(users).where(eq(users.username, username as any) as any))[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser as any).returning();
    return user;
  }

  async getProfile(sessionId: string): Promise<UserProfile | undefined> {
    return (await db.select().from(userProfiles).where(eq(userProfiles.sessionId, sessionId as any) as any))[0];
  }

  async upsertProfile(sessionId: string, data: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile(sessionId);
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({
          ...data,
          updatedAt: new Date(),
        } as any)
        .where(eq(userProfiles.id, existing.id as any) as any)
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userProfiles)
      .values({
        sessionId,
        ...data,
      } as any)
      .returning();
    return created;
  }

  async getLearningPlans(sessionId: string): Promise<LearningPlan[]> {
    return db.select().from(learningPlans).where(eq(learningPlans.sessionId, sessionId as any) as any).orderBy(desc(learningPlans.createdAt) as any) as any;
  }

  async getLearningPlan(id: number): Promise<LearningPlan | undefined> {
    return (await db.select().from(learningPlans).where(eq(learningPlans.id, id as any) as any))[0];
  }

  async createLearningPlan(plan: InsertLearningPlan): Promise<LearningPlan> {
    const [created] = await db.insert(learningPlans).values(plan as any).returning();
    return created;
  }

  async updateLearningPlan(id: number, data: Partial<InsertLearningPlan>): Promise<LearningPlan> {
    const [updated] = await db
      .update(learningPlans)
      .set(data as any)
      .where(eq(learningPlans.id, id as any) as any)
      .returning();
    return updated;
  }

  async getChallenges(): Promise<Challenge[]> {
    return db.select().from(challenges).orderBy(desc(challenges.createdAt) as any) as any;
  }

  async getChallengesBySession(sessionId: string): Promise<Challenge[]> {
    return db
      .select()
      .from(challenges)
      .where(or(eq(challenges.sessionId, sessionId as any), isNull(challenges.sessionId)) as any)
      .orderBy(desc(challenges.createdAt) as any) as any;
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    return (await db.select().from(challenges).where(eq(challenges.id, id as any) as any))[0];
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [created] = await db.insert(challenges).values(challenge as any).returning();
    return created;
  }

  async getProgress(sessionId: string): Promise<UserProgress[]> {
    return db.select().from(userProgress).where(eq(userProgress.sessionId, sessionId as any) as any) as any;
  }

  async getProgressForChallenge(sessionId: string, challengeId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.sessionId, sessionId as any), eq(userProgress.challengeId, challengeId as any)) as any);
    return progress;
  }

  async upsertProgress(sessionId: string, challengeId: number, status: string, userCode?: string, score?: number, aiFeedback?: string): Promise<UserProgress> {
    const existing = await this.getProgressForChallenge(sessionId, challengeId);
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({
          status,
          userCode: userCode ?? existing.userCode,
          score: score ?? existing.score,
          aiFeedback: aiFeedback ?? existing.aiFeedback,
          completedAt: status === "completed" ? new Date() : existing.completedAt,
        } as any)
        .where(eq(userProgress.id, existing.id as any) as any)
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userProgress)
      .values({
        sessionId,
        challengeId,
        status,
        userCode,
        score,
        aiFeedback,
      } as any)
      .returning();
    return created;
  }

  async getConversations(sessionId: string): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.sessionId, sessionId as any) as any).orderBy(desc(conversations.createdAt) as any) as any;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return (await db.select().from(conversations).where(eq(conversations.id, id as any) as any))[0];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation as any).returning();
    return created;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId as any) as any).orderBy(asc(messages.createdAt) as any) as any;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message as any).returning();
    return created;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private userProfiles: Map<number, UserProfile>;
  private learningPlans: Map<number, LearningPlan>;
  private challenges: Map<number, Challenge>;
  private userProgress: Map<number, UserProgress>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private currentIds: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.userProfiles = new Map();
    this.learningPlans = new Map();
    this.challenges = new Map();
    this.userProgress = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentIds = { userProfiles: 1, learningPlans: 1, challenges: 1, userProgress: 1, conversations: 1, messages: 1 };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = Math.random().toString(36).substring(2, 11);
    const user: User = {
      username: insertUser.username as any,
      password: insertUser.password as any,
      id
    } as any;
    this.users.set(id, user);
    return user;
  }

  async getProfile(sessionId: string): Promise<UserProfile | undefined> {
    return Array.from(this.userProfiles.values()).find((p) => p.sessionId === sessionId);
  }

  async upsertProfile(sessionId: string, data: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile(sessionId);
    if (existing) {
      const updated = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.userProfiles.set(existing.id, updated);
      return updated;
    }
    const id = this.currentIds.userProfiles++;
    const created: UserProfile = {
      id,
      sessionId,
      name: (data.name as any) ?? null,
      age: (data.age as any) ?? null,
      experience: (data.experience as any) ?? null,
      goals: (data.goals as any) ?? null,
      preferredLanguage: (data.preferredLanguage as any) ?? "javascript",
      memories: (data.memories as any) ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userProfiles.set(id, created);
    return created;
  }

  async getLearningPlans(sessionId: string): Promise<LearningPlan[]> {
    return Array.from(this.learningPlans.values())
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getLearningPlan(id: number): Promise<LearningPlan | undefined> {
    return this.learningPlans.get(id);
  }

  async createLearningPlan(plan: InsertLearningPlan): Promise<LearningPlan> {
    const id = this.currentIds.learningPlans++;
    const created: LearningPlan = {
      id,
      sessionId: plan.sessionId as any,
      title: plan.title as any,
      description: (plan.description as any) ?? null,
      topics: (plan.topics as any) ?? [],
      status: (plan.status as any) ?? "active",
      createdAt: new Date(),
    } as any;
    this.learningPlans.set(id, created);
    return created;
  }

  async updateLearningPlan(id: number, data: Partial<InsertLearningPlan>): Promise<LearningPlan> {
    const existing = this.learningPlans.get(id);
    if (!existing) throw new Error("Plan not found");
    const updated = { ...existing, ...data };
    this.learningPlans.set(id, updated);
    return updated;
  }

  async getChallenges(): Promise<Challenge[]> {
    return Array.from(this.challenges.values()).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getChallengesBySession(sessionId: string): Promise<Challenge[]> {
    return Array.from(this.challenges.values())
      .filter((c) => c.sessionId === sessionId || c.sessionId === null)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    return this.challenges.get(id);
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const id = this.currentIds.challenges++;
    const created: Challenge = {
      id,
      title: challenge.title as any,
      description: challenge.description as any,
      difficulty: challenge.difficulty as any,
      topic: challenge.topic as any,
      starterCode: challenge.starterCode as any,
      solution: challenge.solution as any,
      hints: (challenge.hints as any) ?? [],
      testCases: (challenge.testCases as any) ?? [],
      language: (challenge.language as any) ?? "javascript",
      order: (challenge.order as any) ?? 0,
      generatedBy: (challenge.generatedBy as any) ?? "seed",
      sessionId: (challenge.sessionId as any) ?? null,
      planId: (challenge.planId as any) ?? null,
      createdAt: new Date(),
    } as any;
    this.challenges.set(id, created);
    return created;
  }

  async getProgress(sessionId: string): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter((p) => p.sessionId === sessionId);
  }

  async getProgressForChallenge(sessionId: string, challengeId: number): Promise<UserProgress | undefined> {
    return Array.from(this.userProgress.values()).find(
      (p) => p.sessionId === sessionId && p.challengeId === challengeId,
    );
  }

  async upsertProgress(sessionId: string, challengeId: number, status: string, userCode?: string, score?: number, aiFeedback?: string): Promise<UserProgress> {
    const existing = await this.getProgressForChallenge(sessionId, challengeId);
    if (existing) {
      const updated: UserProgress = {
        ...existing,
        status: status as any,
        userCode: (userCode as any) ?? existing.userCode,
        score: (score as any) ?? existing.score,
        aiFeedback: (aiFeedback as any) ?? existing.aiFeedback,
        completedAt: status === "completed" ? new Date() : existing.completedAt,
      } as any;
      this.userProgress.set(existing.id, updated);
      return updated;
    }
    const id = this.currentIds.userProgress++;
    const created: UserProgress = {
      id,
      sessionId: sessionId as any,
      challengeId: challengeId as any,
      status: status as any,
      userCode: (userCode as any) ?? null,
      score: (score as any) ?? null,
      aiFeedback: (aiFeedback as any) ?? null,
      completedAt: status === "completed" ? new Date() : null,
    } as any;
    this.userProgress.set(id, created);
    return created;
  }

  async getConversations(sessionId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((c) => c.sessionId === sessionId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentIds.conversations++;
    const created: Conversation = {
      id,
      sessionId: conversation.sessionId as any,
      title: conversation.title as any,
      createdAt: new Date(),
    } as any;
    this.conversations.set(id, created);
    return created;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentIds.messages++;
    const created: Message = {
      id,
      conversationId: message.conversationId as any,
      role: message.role as any,
      content: message.content as any,
      createdAt: new Date(),
    } as any;
    this.messages.set(id, created);
    return created;
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
