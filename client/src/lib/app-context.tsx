import { createContext, useContext, useState, useCallback } from "react";
import type { UserProfile, LearningPlan } from "@shared/schema";

type AppMode = "plan" | "build";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AppContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activePlanId: number | null;
  setActivePlanId: (id: number | null) => void;
  activeChallengeId: number | null;
  setActiveChallengeId: (id: number | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>("plan");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [activeChallengeId, setActiveChallengeId] = useState<number | null>(null);

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        chatMessages,
        setChatMessages,
        activePlanId,
        setActivePlanId,
        activeChallengeId,
        setActiveChallengeId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppContextProvider");
  return ctx;
}
