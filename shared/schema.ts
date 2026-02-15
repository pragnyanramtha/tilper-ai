import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(),
  topic: text("topic").notNull(),
  starterCode: text("starter_code").notNull(),
  solution: text("solution").notNull(),
  hints: text("hints").array().notNull(),
  testCases: jsonb("test_cases").notNull(),
  order: integer("order").notNull().default(0),
});

export const insertChallengeSchema = createInsertSchema(challenges).omit({
  id: true,
});

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  challengeId: integer("challenge_id").notNull(),
  status: text("status").notNull().default("not_started"),
  userCode: text("user_code"),
  completedAt: timestamp("completed_at"),
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  completedAt: true,
});

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
