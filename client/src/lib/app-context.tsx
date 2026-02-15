import { createContext, useContext, useState } from "react";

type AppMode = "plan" | "learn";

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
  activeConversationId: number | null;
  setActiveConversationId: (id: number | null) => void;
  isInChat: boolean;
  setIsInChat: (v: boolean) => void;
  sessionId: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>("plan");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activePlanId, setActivePlanId] = useState<number | null>(null);
  const [activeChallengeId, setActiveChallengeId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isInChat, setIsInChat] = useState(false);
  const [sessionId] = useState(() => {
    let id = localStorage.getItem("codequest-session-id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 11);
      localStorage.setItem("codequest-session-id", id);
    }
    return id;
  });

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
        activeConversationId,
        setActiveConversationId,
        isInChat,
        setIsInChat,
        sessionId,
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
