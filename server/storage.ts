import { db } from "./db";
import {
  users,
  challenges,
  userProgress,
  userProfiles,
  learningPlans,
  type User,
  type InsertUser,
  type Challenge,
  type InsertChallenge,
  type UserProgress,
  type UserProfile,
  type InsertUserProfile,
  type LearningPlan,
  type InsertLearningPlan,
} from "@shared/schema";
import { eq, and, asc, desc } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProfile(sessionId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.sessionId, sessionId));
    return profile;
  }

  async upsertProfile(sessionId: string, data: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile(sessionId);
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(userProfiles)
      .values({
        sessionId,
        ...data,
      })
      .returning();
    return created;
  }

  async getLearningPlans(sessionId: string): Promise<LearningPlan[]> {
    return db.select().from(learningPlans).where(eq(learningPlans.sessionId, sessionId)).orderBy(desc(learningPlans.createdAt));
  }

  async getLearningPlan(id: number): Promise<LearningPlan | undefined> {
    const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.id, id));
    return plan;
  }

  async createLearningPlan(plan: InsertLearningPlan): Promise<LearningPlan> {
    const [created] = await db.insert(learningPlans).values(plan).returning();
    return created;
  }

  async updateLearningPlan(id: number, data: Partial<InsertLearningPlan>): Promise<LearningPlan> {
    const [updated] = await db
      .update(learningPlans)
      .set(data)
      .where(eq(learningPlans.id, id))
      .returning();
    return updated;
  }

  async getChallenges(): Promise<Challenge[]> {
    return db.select().from(challenges).orderBy(desc(challenges.createdAt));
  }

  async getChallengesBySession(sessionId: string): Promise<Challenge[]> {
    return db.select().from(challenges).where(eq(challenges.sessionId, sessionId)).orderBy(desc(challenges.createdAt));
  }

  async getChallenge(id: number): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [created] = await db.insert(challenges).values(challenge).returning();
    return created;
  }

  async getProgress(sessionId: string): Promise<UserProgress[]> {
    return db.select().from(userProgress).where(eq(userProgress.sessionId, sessionId));
  }

  async getProgressForChallenge(sessionId: string, challengeId: number): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(and(eq(userProgress.sessionId, sessionId), eq(userProgress.challengeId, challengeId)));
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
        })
        .where(eq(userProgress.id, existing.id))
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
      })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
