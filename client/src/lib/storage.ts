/**
 * Client-side localStorage service for Tilper AI
 * Replaces backend database with browser localStorage
 */

export interface UserProfile {
  id: number;
  sessionId: string;
  name: string | null;
  age: number | null;
  experience: string | null;
  goals: string | null;
  preferredLanguage: string;
  memories: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningPlan {
  id: number;
  sessionId: string;
  title: string;
  description: string | null;
  topics: Array<{
    title: string;
    description: string;
    difficulty: string;
    language: string;
    status: string;
  }>;
  status: string;
  createdAt: Date;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  topic: string;
  starterCode: string;
  solution: string;
  hints: string[];
  testCases: Array<{ input: any; expected: any }>;
  language: string;
  order: number;
  generatedBy: string;
  sessionId: string | null;
  planId: number | null;
  createdAt: Date;
}

export interface UserProgress {
  id: number;
  sessionId: string;
  challengeId: number;
  status: string;
  userCode: string | null;
  score: number | null;
  aiFeedback: string | null;
  completedAt: Date | null;
}

export interface Conversation {
  id: number;
  sessionId: string;
  title: string;
  createdAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

class LocalStorageService {
  private storageKey = "tilper-ai-data";
  private data: {
    profiles: UserProfile[];
    plans: LearningPlan[];
    challenges: Challenge[];
    progress: UserProgress[];
    conversations: Conversation[];
    messages: Message[];
    nextIds: {
      profiles: number;
      plans: number;
      challenges: number;
      progress: number;
      conversations: number;
      messages: number;
    };
  };

  constructor() {
    this.data = this.loadData();
  }

  private loadData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return {
          ...parsed,
          profiles: parsed.profiles?.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          })) || [],
          plans: parsed.plans?.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
          })) || [],
          challenges: parsed.challenges?.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
          })) || [],
          progress: parsed.progress?.map((p: any) => ({
            ...p,
            completedAt: p.completedAt ? new Date(p.completedAt) : null,
          })) || [],
          conversations: parsed.conversations?.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
          })) || [],
          messages: parsed.messages?.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          })) || [],
        };
      }
    } catch (e) {
      console.error("Failed to load data from localStorage:", e);
    }

    // Return default structure
    return {
      profiles: [],
      plans: [],
      challenges: [],
      progress: [],
      conversations: [],
      messages: [],
      nextIds: {
        profiles: 1,
        plans: 1,
        challenges: 1,
        progress: 1,
        conversations: 1,
        messages: 1,
      },
    };
  }

  private saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
    }
  }

  // Profile methods
  getProfile(sessionId: string): UserProfile | undefined {
    return this.data.profiles.find((p) => p.sessionId === sessionId);
  }

  upsertProfile(sessionId: string, updates: Partial<UserProfile>): UserProfile {
    const existing = this.getProfile(sessionId);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };
      this.data.profiles = this.data.profiles.map((p) =>
        p.id === existing.id ? updated : p
      );
      this.saveData();
      return updated;
    }

    const newProfile: UserProfile = {
      id: this.data.nextIds.profiles++,
      sessionId,
      name: updates.name || null,
      age: updates.age || null,
      experience: updates.experience || null,
      goals: updates.goals || null,
      preferredLanguage: updates.preferredLanguage || "javascript",
      memories: updates.memories || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.data.profiles.push(newProfile);
    this.saveData();
    return newProfile;
  }

  // Learning Plan methods
  getLearningPlans(sessionId: string): LearningPlan[] {
    return this.data.plans
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getLearningPlan(id: number): LearningPlan | undefined {
    return this.data.plans.find((p) => p.id === id);
  }

  createLearningPlan(plan: Omit<LearningPlan, "id" | "createdAt">): LearningPlan {
    const newPlan: LearningPlan = {
      ...plan,
      id: this.data.nextIds.plans++,
      createdAt: new Date(),
    };
    this.data.plans.push(newPlan);
    this.saveData();
    return newPlan;
  }

  updateLearningPlan(id: number, updates: Partial<LearningPlan>): LearningPlan | undefined {
    const index = this.data.plans.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    this.data.plans[index] = {
      ...this.data.plans[index],
      ...updates,
    };
    this.saveData();
    return this.data.plans[index];
  }

  // Challenge methods
  getChallenges(): Challenge[] {
    return this.data.challenges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getChallengesBySession(sessionId: string): Challenge[] {
    return this.data.challenges
      .filter((c) => c.sessionId === sessionId || c.sessionId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getChallenge(id: number): Challenge | undefined {
    return this.data.challenges.find((c) => c.id === id);
  }

  createChallenge(challenge: Omit<Challenge, "id" | "createdAt">): Challenge {
    const newChallenge: Challenge = {
      ...challenge,
      id: this.data.nextIds.challenges++,
      createdAt: new Date(),
    };
    this.data.challenges.push(newChallenge);
    this.saveData();
    return newChallenge;
  }

  // Progress methods
  getProgress(sessionId: string): UserProgress[] {
    return this.data.progress.filter((p) => p.sessionId === sessionId);
  }

  getProgressForChallenge(sessionId: string, challengeId: number): UserProgress | undefined {
    return this.data.progress.find(
      (p) => p.sessionId === sessionId && p.challengeId === challengeId
    );
  }

  upsertProgress(
    sessionId: string,
    challengeId: number,
    status: string,
    userCode?: string,
    score?: number,
    aiFeedback?: string
  ): UserProgress {
    const existing = this.getProgressForChallenge(sessionId, challengeId);
    if (existing) {
      const updated: UserProgress = {
        ...existing,
        status,
        userCode: userCode ?? existing.userCode,
        score: score ?? existing.score,
        aiFeedback: aiFeedback ?? existing.aiFeedback,
        completedAt: status === "completed" ? new Date() : existing.completedAt,
      };
      this.data.progress = this.data.progress.map((p) =>
        p.id === existing.id ? updated : p
      );
      this.saveData();
      return updated;
    }

    const newProgress: UserProgress = {
      id: this.data.nextIds.progress++,
      sessionId,
      challengeId,
      status,
      userCode: userCode || null,
      score: score || null,
      aiFeedback: aiFeedback || null,
      completedAt: status === "completed" ? new Date() : null,
    };
    this.data.progress.push(newProgress);
    this.saveData();
    return newProgress;
  }

  // Conversation methods
  getConversations(sessionId: string): Conversation[] {
    return this.data.conversations
      .filter((c) => c.sessionId === sessionId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getConversation(id: number): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  createConversation(sessionId: string, title: string): Conversation {
    const newConv: Conversation = {
      id: this.data.nextIds.conversations++,
      sessionId,
      title,
      createdAt: new Date(),
    };
    this.data.conversations.push(newConv);
    this.saveData();
    return newConv;
  }

  // Message methods
  getMessages(conversationId: number): Message[] {
    return this.data.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  createMessage(conversationId: number, role: "user" | "assistant", content: string): Message {
    const newMsg: Message = {
      id: this.data.nextIds.messages++,
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    this.data.messages.push(newMsg);
    this.saveData();
    return newMsg;
  }

  // Clear all data (useful for testing or reset)
  clearAll() {
    this.data = {
      profiles: [],
      plans: [],
      challenges: [],
      progress: [],
      conversations: [],
      messages: [],
      nextIds: {
        profiles: 1,
        plans: 1,
        challenges: 1,
        progress: 1,
        conversations: 1,
        messages: 1,
      },
    };
    this.saveData();
  }
}

// Export singleton instance
export const localStorageService = new LocalStorageService();
