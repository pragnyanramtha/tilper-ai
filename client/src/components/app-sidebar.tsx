import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAppContext } from "@/lib/app-context";
import type { Challenge, UserProgress, LearningPlan, Conversation } from "@shared/schema";

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

  const { data: challenges } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const { data: plans } = useQuery<LearningPlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations", {
        headers: { "x-session-id": sessionId }
      });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    }
  });

  const progressMap: Record<number, UserProgress> = {};
  if (progressList) {
    for (const p of progressList) {
      progressMap[p.challengeId] = p;
    }
  }

  const recentChallenges = (challenges || []).slice(0, 8) as Challenge[];
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

    // Fetch messages for this conversation
    const res = await fetch(`/api/conversations/${conv.id}/messages`);
    if (res.ok) {
      const messages = await res.json();
      setChatMessages(messages.map((m: any) => ({
        role: m.role,
        content: m.content
      })));
    }
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
        {activePlans.length > 0 && (
          <SidebarGroup className="mb-4">
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase px-2 mb-2">Learning Plans</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activePlans.map((plan) => {
                  const topics = (plan.topics as any[]) || [];
                  const completed = topics.filter(t => t.status === "completed").length;
                  return (
                    <SidebarMenuItem key={plan.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={activePlanId === plan.id}
                        data-testid={`nav-plan-${plan.id}`}
                        className="rounded-lg hover:bg-white/10 transition-all duration-200"
                        onClick={() => {
                          setActivePlanId(plan.id);
                          navigate("/");
                        }}
                      >
                        <button className="w-full text-left flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary/80" />
                          <span className="truncate text-sm font-medium">{plan.title}</span>
                          <span className="ml-auto text-xs text-muted-foreground/60 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-full">{completed}/{topics.length}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

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

        {recentChallenges.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase px-2 mb-2">Recents</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentChallenges.map((challenge) => {
                  const isCompleted = progressMap[challenge.id]?.status === "completed";
                  const isActive = location === `/ide` && new URLSearchParams(window.location.search).get("challenge") === String(challenge.id);
                  return (
                    <SidebarMenuItem key={challenge.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        data-testid={`nav-challenge-${challenge.id}`}
                        className={`rounded-lg transition-all duration-200 ${isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-white/10"}`}
                      >
                        <a
                          href={`/ide?challenge=${challenge.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/ide?challenge=${challenge.id}`);
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground/40" />
                          )}
                          <span className="truncate text-sm">{challenge.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
