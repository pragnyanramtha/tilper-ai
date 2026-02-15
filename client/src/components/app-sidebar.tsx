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
  Home,
  Code2,
  History,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import type { Challenge, UserProgress } from "@shared/schema";

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: challenges } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const progressMap: Record<number, UserProgress> = {};
  if (progressList) {
    for (const p of progressList) {
      progressMap[p.challengeId] = p;
    }
  }

  const recentChallenges = (challenges || []).slice(0, 8);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
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
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/"}
                  data-testid="nav-home"
                >
                  <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {recentChallenges.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Recent Challenges</SidebarGroupLabel>
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
          <span className="text-xs text-muted-foreground">Tilper AI</span>
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
