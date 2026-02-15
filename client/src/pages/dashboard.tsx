import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Loader2,
  ArrowRight,
  Binary,
  Braces,
  GitBranch,
  Layers,
  FileCode,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Challenge, UserProgress } from "@shared/schema";

const TOPICS = [
  { label: "Variables & Types", icon: Binary, topic: "Variables and Data Types" },
  { label: "Functions", icon: Braces, topic: "Functions" },
  { label: "Arrays & Lists", icon: Layers, topic: "Arrays and Lists" },
  { label: "Loops", icon: GitBranch, topic: "Loops and Iteration" },
  { label: "Strings", icon: FileCode, topic: "String Manipulation" },
  { label: "Logic", icon: Code2, topic: "Conditional Logic" },
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
const LANGUAGES = [
  { label: "JavaScript", value: "javascript" as const },
  { label: "Python", value: "python" as const },
];

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
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Beginner");
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "python">("javascript");

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

  const generateMutation = useMutation({
    mutationFn: async (params: { topic: string; difficulty: string; language: string }) => {
      const res = await apiRequest("POST", "/api/challenges/generate", params);
      return res.json();
    },
    onSuccess: (data: Challenge) => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      navigate(`/ide?challenge=${data.id}`);
    },
  });

  const completedCount = Object.values(progressMap).filter(p => p.status === "completed").length;
  const totalCount = challenges?.length || 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10 mt-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-greeting">
              {getGreeting()}, ready to code?
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Pick a topic and difficulty to generate a new challenge
          </p>
        </div>

        <div className="w-full mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Language</span>
          </div>
          <div className="flex gap-2 mb-5">
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.value}
                variant={selectedLanguage === lang.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedLanguage(lang.value)}
                data-testid={`button-lang-${lang.value}`}
              >
                {lang.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Difficulty</span>
          </div>
          <div className="flex gap-2 mb-5">
            {DIFFICULTIES.map((diff) => {
              const DiffIcon = getDifficultyIcon(diff);
              return (
                <Button
                  key={diff}
                  variant={selectedDifficulty === diff ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDifficulty(diff)}
                  data-testid={`button-diff-${diff.toLowerCase()}`}
                >
                  <DiffIcon className="w-3.5 h-3.5 mr-1" />
                  {diff}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Topic</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TOPICS.map((t) => (
              <Button
                key={t.topic}
                variant="outline"
                className="justify-start gap-2 h-auto py-3 px-4"
                onClick={() =>
                  generateMutation.mutate({
                    topic: t.topic,
                    difficulty: selectedDifficulty,
                    language: selectedLanguage,
                  })
                }
                disabled={generateMutation.isPending}
                data-testid={`button-topic-${t.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {generateMutation.isPending &&
                generateMutation.variables?.topic === t.topic ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                ) : (
                  <t.icon className="w-4 h-4 flex-shrink-0 text-primary" />
                )}
                <span className="text-sm truncate">{t.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {(challenges && challenges.length > 0) && (
          <div className="w-full mt-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Your Challenges
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {completedCount}/{totalCount}
                  </Badge>
                )}
              </h2>
            </div>

            {challengesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-3">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {challenges.map((challenge) => {
                  const p = progressMap[challenge.id];
                  const isCompleted = p?.status === "completed";
                  const DiffIcon = getDifficultyIcon(challenge.difficulty);
                  const score = p?.score;

                  return (
                    <Card
                      key={challenge.id}
                      className="p-3 hover-elevate cursor-pointer group"
                      onClick={() => navigate(`/ide?challenge=${challenge.id}`)}
                      data-testid={`card-challenge-${challenge.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="font-medium text-sm truncate">{challenge.title}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {score !== null && score !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {score}/100
                            </Badge>
                          )}
                          {isCompleted && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {challenge.description}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {challenge.language === "python" ? "Python" : "JS"}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <DiffIcon className={`w-3 h-3 ${getDifficultyColor(challenge.difficulty)}`} />
                            <span className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}>
                              {challenge.difficulty}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
