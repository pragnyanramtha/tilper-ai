import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Code2,
  Sparkles,
  Trophy,
  Zap,
  Flame,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  Target,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import type { Challenge, UserProgress } from "@shared/schema";

function getDifficultyColor(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return "text-green-500";
    case "intermediate":
      return "text-yellow-500";
    case "advanced":
      return "text-red-400";
    default:
      return "text-muted-foreground";
  }
}

function getDifficultyBg(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return "bg-green-500/10";
    case "intermediate":
      return "bg-yellow-500/10";
    case "advanced":
      return "bg-red-400/10";
    default:
      return "bg-muted";
  }
}

function getDifficultyIcon(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return Zap;
    case "intermediate":
      return Flame;
    case "advanced":
      return Trophy;
    default:
      return Circle;
  }
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: challenges, isLoading: challengesLoading } = useQuery<Challenge[]>({
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

  const totalChallenges = challenges?.length || 0;
  const completedChallenges = Object.values(progressMap).filter(
    (p) => p.status === "completed"
  ).length;
  const progressPercent =
    totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 0;

  const nextChallenge = challenges?.find(
    (c) => !progressMap[c.id] || progressMap[c.id].status !== "completed"
  );

  const groupedByTopic = challenges?.reduce(
    (acc, c) => {
      if (!acc[c.topic]) acc[c.topic] = [];
      acc[c.topic].push(c);
      return acc;
    },
    {} as Record<string, Challenge[]>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm dark:bg-[#141516]/90">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg">
              Code<span className="text-primary">Quest</span>
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleTheme}
            data-testid="button-dashboard-theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <section className="mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Welcome to CodeQuest
              </h1>
              <p className="text-muted-foreground">
                Learn to code with interactive challenges and an AI mentor by your side
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Overall Progress</p>
                  <p className="text-xl font-bold" data-testid="text-progress-count">
                    {completedChallenges}/{totalChallenges}
                  </p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-1.5" data-testid="progress-overall" />
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold" data-testid="text-completed-count">
                    {completedChallenges}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-yellow-500/10">
                  <Flame className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-xl font-bold" data-testid="text-remaining-count">
                    {totalChallenges - completedChallenges}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {nextChallenge && (
          <section className="mb-10">
            <Card className="p-5 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Up Next
                    </p>
                    <p className="font-semibold" data-testid="text-next-challenge">
                      {nextChallenge.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">
                        {nextChallenge.topic}
                      </Badge>
                      <span className={`text-xs ${getDifficultyColor(nextChallenge.difficulty)}`}>
                        {nextChallenge.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/ide?challenge=${nextChallenge.id}`)}
                  data-testid="button-start-next"
                >
                  Start Challenge
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            All Challenges
          </h2>

          {challengesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : groupedByTopic ? (
            <div className="space-y-8">
              {Object.entries(groupedByTopic).map(([topic, topicChallenges]) => (
                <div key={topic}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {topic}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topicChallenges.map((challenge) => {
                      const p = progressMap[challenge.id];
                      const isCompleted = p?.status === "completed";
                      const DiffIcon = getDifficultyIcon(challenge.difficulty);

                      return (
                        <Card
                          key={challenge.id}
                          className="p-4 hover-elevate cursor-pointer group"
                          onClick={() =>
                            navigate(`/ide?challenge=${challenge.id}`)
                          }
                          data-testid={`card-challenge-${challenge.id}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold text-sm">
                              {challenge.title}
                            </h4>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {challenge.description}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <DiffIcon
                                className={`w-3.5 h-3.5 ${getDifficultyColor(challenge.difficulty)}`}
                              />
                              <span
                                className={`text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}
                              >
                                {challenge.difficulty}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                No challenges available yet
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t mt-16 dark:bg-[#141516]">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          CodeQuest - Learn to code with AI-powered mentoring
        </div>
      </footer>
    </div>
  );
}
