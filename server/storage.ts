import { db } from "./db";
import {
  users,
  challenges,
  userProgress,
  type User,
  type InsertUser,
  type Challenge,
  type InsertChallenge,
  type UserProgress,
  type InsertUserProgress,
} from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getChallenges(): Promise<Challenge[]>;
  getChallenge(id: number): Promise<Challenge | undefined>;
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;

  getProgress(sessionId: string): Promise<UserProgress[]>;
  getProgressForChallenge(sessionId: string, challengeId: number): Promise<UserProgress | undefined>;
  upsertProgress(sessionId: string, challengeId: number, status: string, userCode?: string): Promise<UserProgress>;
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

  async getChallenges(): Promise<Challenge[]> {
    return db.select().from(challenges).orderBy(asc(challenges.order));
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

  async upsertProgress(sessionId: string, challengeId: number, status: string, userCode?: string): Promise<UserProgress> {
    const existing = await this.getProgressForChallenge(sessionId, challengeId);
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({
          status,
          userCode: userCode ?? existing.userCode,
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
      })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
