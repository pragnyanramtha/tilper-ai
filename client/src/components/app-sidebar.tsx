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
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAppContext } from "@/lib/app-context";
import type { Challenge, UserProgress, LearningPlan } from "@shared/schema";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { setChatMessages, setIsInChat, setMode } = useAppContext();

  const { data: challenges } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const { data: plans } = useQuery<LearningPlan[]>({
    queryKey: ["/api/plans"],
  });

  const progressMap: Record<number, UserProgress> = {};
  if (progressList) {
    for (const p of progressList) {
      progressMap[p.challengeId] = p;
    }
  }

  const recentChallenges = (challenges || []).slice(0, 8);
  const activePlans = (plans || []).filter(p => p.status === "active");

  const handleNewChat = () => {
    setChatMessages([]);
    setIsInChat(false);
    setMode("plan");
    navigate("/");
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
            data-testid="link-home-logo"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
              <Code2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-sm">
              Tilper <span className="text-primary">AI</span>
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 gap-1.5 justify-start"
          onClick={handleNewChat}
          data-testid="button-new-chat"
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        {activePlans.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Learning Plans</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {activePlans.map((plan) => {
                  const topics = (plan.topics as any[]) || [];
                  const completed = topics.filter(t => t.status === "completed").length;
                  return (
                    <SidebarMenuItem key={plan.id}>
                      <SidebarMenuButton
                        asChild
                        data-testid={`nav-plan-${plan.id}`}
                      >
                        <a
                          href="/"
                          onClick={(e) => {
                            e.preventDefault();
                            navigate("/");
                          }}
                        >
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          <span className="truncate text-xs">{plan.title}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{completed}/{topics.length}</span>
                        </a>
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
            <SidebarGroupLabel>Recents</SidebarGroupLabel>
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
                      >
                        <a
                          href={`/ide?challenge=${challenge.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/ide?challenge=${challenge.id}`);
                          }}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
                          )}
                          <span className="truncate text-xs">{challenge.title}</span>
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

      <SidebarFooter className="p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs justify-start flex-1"
            onClick={() => navigate("/settings")}
            data-testid="nav-settings"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
