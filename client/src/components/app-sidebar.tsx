import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Code2,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
  Plus,
  Settings,
  BookOpen,
  MessageSquare,
  GraduationCap,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAppContext } from "@/lib/app-context";
import { localStorageService, type Challenge, type UserProgress, type LearningPlan, type Conversation } from "@/lib/storage";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const {
    setChatMessages,
    setIsInChat,
    setMode,
    activeConversationId,
    setActiveConversationId,
    sessionId,
    activePlanId,
    setActivePlanId,
  } = useAppContext();

  // Load data from localStorage
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progressList, setProgressList] = useState<UserProgress[]>([]);
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    // Load data from localStorage
    const loadData = () => {
      setChallenges(localStorageService.getChallengesBySession(sessionId));
      setProgressList(localStorageService.getProgress(sessionId));
      setPlans(localStorageService.getLearningPlans(sessionId));
      setConversations(localStorageService.getConversations(sessionId));
    };

    loadData();

    // Set up an interval to refresh data periodically (in case it changes)
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const progressMap: Record<number, UserProgress> = {};
  if (progressList) {
    for (const p of progressList) {
      progressMap[p.challengeId] = p;
    }
  }

  // Build a map from challenge id -> challenge for lookup
  const challengeMap: Record<number, Challenge> = {};
  for (const c of (challenges || [])) {
    challengeMap[c.id] = c;
  }
  const activePlans = (plans || []).filter(p => p.status === "active") as LearningPlan[];
  const chatHistory = (conversations || []) as Conversation[];

  const handleNewChat = () => {
    setChatMessages([]);
    setIsInChat(false);
    setMode("plan");
    setActiveConversationId(null);
    setActivePlanId(null);
    navigate("/");
  };

  const handleConversationClick = async (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setActivePlanId(null);
    setIsInChat(true);
    setMode("learn");

    // Load messages from localStorage
    const messages = localStorageService.getMessages(conv.id);
    setChatMessages(messages.map((m) => ({
      role: m.role,
      content: m.content
    })));

    navigate("/");
  };

  return (
    <Sidebar className="!bg-transparent glass border-r border-white/10">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/")}
            data-testid="link-home-logo"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-sm">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-base tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              Tilper <span className="text-primary">AI</span>
            </span>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          className="w-full mt-4 gap-2 justify-start glass-button font-medium shadow-md hover:shadow-lg"
          onClick={handleNewChat}
          data-testid="button-new-chat"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
            <Plus className="w-3 h-3 text-white" />
          </div>
          New chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        {chatHistory.length > 0 && (
          <SidebarGroup className="mb-4">
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase px-2 mb-2">Chat History</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chatHistory.map((conv) => {
                  const isActive = activeConversationId === conv.id;
                  return (
                    <SidebarMenuItem key={conv.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-chat-${conv.id}`}
                        className={`rounded-lg transition-all duration-200 ${isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-white/10"}`}
                        onClick={() => handleConversationClick(conv)}
                      >
                        <button className="w-full flex items-center gap-2">
                          <MessageSquare className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} />
                          <span className="truncate text-sm">{conv.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase px-2 mb-2 flex items-center gap-1.5">
            <GraduationCap className="w-3 h-3" />
            Learning Paths
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {activePlans.length === 0 ? (
              <div className="px-2 py-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                <Sparkles className="w-4 h-4 text-primary/50 mx-auto mb-1.5" />
                <p className="text-[11px] text-muted-foreground/70 leading-snug">
                  Ask the AI to generate a learning path for you!
                </p>
              </div>
            ) : (
              <SidebarMenu>
                {activePlans.map((plan) => {
                  const topics = (plan.topics as any[]) || [];
                  const isExpanded = activePlanId === plan.id;
                  return (
                    <div key={plan.id}>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isExpanded}
                          data-testid={`nav-plan-${plan.id}`}
                          className={`rounded-lg transition-all duration-200 ${
                            isExpanded ? "bg-primary/10 text-primary font-medium" : "hover:bg-white/10"
                          }`}
                          onClick={() => {
                            setActivePlanId(isExpanded ? null : plan.id);
                            navigate("/");
                          }}
                        >
                          <button className="w-full text-left flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary/80 flex-shrink-0" />
                            <span className="truncate text-sm font-medium flex-1">{plan.title}</span>
                            <ChevronRight
                              className={`w-3 h-3 text-muted-foreground/50 flex-shrink-0 transition-transform duration-200 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      {isExpanded && topics.length > 0 && (
                        <div className="ml-4 mt-0.5 mb-1 border-l border-primary/20 pl-2 space-y-0.5">
                          {topics.map((topic: any, idx: number) => {
                            const isCompleted = topic.status === "completed";
                            // Try to find a challenge for this topic
                            const linkedChallenge = Object.values(challengeMap).find(
                              c => c.planId === plan.id && (c.topic === topic.title || c.title === topic.title)
                            );
                            const isActive =
                              linkedChallenge &&
                              location === "/ide" &&
                              new URLSearchParams(window.location.search).get("challenge") ===
                                String(linkedChallenge.id);

                            return (
                              <div
                                key={idx}
                                data-testid={`nav-lesson-${plan.id}-${idx}`}
                                className={`flex items-start gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all duration-150 ${
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : isCompleted
                                    ? "text-muted-foreground/60 hover:bg-white/5"
                                    : "text-foreground/70 hover:bg-white/8"
                                }`}
                                onClick={() => {
                                  if (linkedChallenge) {
                                    navigate(`/ide?challenge=${linkedChallenge.id}`);
                                  }
                                }}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="w-3 h-3 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
                                )}
                                <span className={`leading-snug ${isCompleted ? "line-through" : ""}`}>
                                  {topic.title}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-transparent">
        <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-sm border border-black/5 dark:border-white/5">
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-xs justify-start flex-1 hover:bg-background/50 rounded-lg h-8"
            onClick={() => navigate("/settings")}
            data-testid="nav-settings"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground group-hover:text-foreground transition-colors">Settings</span>
          </Button>
          <div className="w-[1px] h-4 bg-border/50" />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-background/50 rounded-lg"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-orange-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
