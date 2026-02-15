import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Trophy,
  Zap,
  Flame,
  ChevronRight,
  CheckCircle2,
  Circle,
  BookOpen,
  Loader2,
  Binary,
  Braces,
  GitBranch,
  Layers,
  FileCode,
  Code2,
  Rocket,
  Map,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppContext } from "@/lib/app-context";
import type { Challenge, UserProgress, LearningPlan, UserProfile } from "@shared/schema";

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
    case "beginner": return "text-green-500";
    case "intermediate": return "text-yellow-500";
    case "advanced": return "text-red-400";
    default: return "text-muted-foreground";
  }
}

function getDifficultyIcon(difficulty: string) {
  switch (difficulty.toLowerCase()) {
    case "beginner": return Zap;
    case "intermediate": return Flame;
    case "advanced": return Trophy;
    default: return Circle;
  }
}

function PlanModeView() {
  const { chatMessages, setMode } = useAppContext();
  const [, navigate] = useLocation();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: plans } = useQuery<LearningPlan[]>({
    queryKey: ["/api/plans"],
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const summary = chatMessages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const res = await apiRequest("POST", "/api/plans/generate", {
        conversationSummary: summary,
      });
      return res.json();
    },
    onSuccess: (data: LearningPlan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setMode("build");
    },
  });

  const activePlans = (plans || []).filter(p => p.status === "active");
  const hasConversation = chatMessages.length >= 2;

  return (
    <div className="flex flex-col items-center justify-start px-4 py-8 max-w-2xl mx-auto w-full">
      <div className="text-center mb-8 mt-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Map className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-plan-heading">
            {profile?.name ? `Hey ${profile.name}, let's plan` : "Let's plan your journey"}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Chat with your AI mentor on the right to tell them what you want to learn.
          When you're ready, generate a personalized learning plan.
        </p>
      </div>

      {hasConversation && (
        <Button
          size="lg"
          className="mb-8 gap-2"
          onClick={() => generatePlanMutation.mutate()}
          disabled={generatePlanMutation.isPending}
          data-testid="button-generate-plan"
        >
          {generatePlanMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          Build my learning plan
        </Button>
      )}

      {!hasConversation && (
        <Card className="p-6 text-center w-full max-w-sm">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Start chatting</p>
          <p className="text-xs text-muted-foreground">
            Tell your AI mentor about your coding interests and goals using the chat panel on the right
          </p>
        </Card>
      )}

      {activePlans.length > 0 && (
        <div className="w-full mt-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-primary" />
            Your Learning Plans
          </h2>
          <div className="space-y-3">
            {activePlans.map((plan) => {
              const topics = (plan.topics as any[]) || [];
              const completed = topics.filter(t => t.status === "completed").length;
              const pct = topics.length > 0 ? (completed / topics.length) * 100 : 0;

              return (
                <Card
                  key={plan.id}
                  className="p-4 hover-elevate cursor-pointer"
                  onClick={() => setMode("build")}
                  data-testid={`card-plan-${plan.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-sm">{plan.title}</h3>
                    <Badge variant="secondary" className="text-xs">{completed}/{topics.length}</Badge>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mb-2">{plan.description}</p>
                  )}
                  <Progress value={pct} className="h-1.5" />
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BuildModeView() {
  const [, navigate] = useLocation();
  const { setActiveChallengeId } = useAppContext();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("Beginner");
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "python">("javascript");

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: challenges, isLoading: challengesLoading } = useQuery<Challenge[]>({
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

  const generateMutation = useMutation({
    mutationFn: async (params: { topic: string; difficulty: string; language: string; planId?: number }) => {
      const res = await apiRequest("POST", "/api/challenges/generate", params);
      return res.json();
    },
    onSuccess: (data: Challenge) => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setActiveChallengeId(data.id);
      navigate(`/ide?challenge=${data.id}`);
    },
  });

  const activePlans = (plans || []).filter(p => p.status === "active");
  const activePlan = activePlans[0];

  return (
    <div className="flex flex-col items-center justify-start px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="text-center mb-6 mt-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold" data-testid="text-build-heading">
            {profile?.name ? `Let's build, ${profile.name}` : "Let's build"}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Pick a topic or follow your learning plan
        </p>
      </div>

      {activePlan && (
        <div className="w-full mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">{activePlan.title}</h2>
          </div>
          <div className="space-y-2">
            {((activePlan.topics as any[]) || []).map((topic: any, idx: number) => {
              const isCompleted = topic.status === "completed";
              const DiffIcon = getDifficultyIcon(topic.difficulty);
              return (
                <Card
                  key={idx}
                  className={`p-3 hover-elevate cursor-pointer ${isCompleted ? "opacity-60" : ""}`}
                  onClick={() => {
                    if (topic.challengeId) {
                      setActiveChallengeId(topic.challengeId);
                      navigate(`/ide?challenge=${topic.challengeId}`);
                    } else {
                      generateMutation.mutate({
                        topic: topic.title,
                        difficulty: topic.difficulty,
                        language: topic.language || selectedLanguage,
                        planId: activePlan.id,
                      });
                    }
                  }}
                  data-testid={`card-plan-topic-${idx}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : generateMutation.isPending && generateMutation.variables?.topic === topic.title ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{topic.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <DiffIcon className={`w-3 h-3 ${getDifficultyColor(topic.difficulty)}`} />
                      <Badge variant="outline" className="text-xs">
                        {topic.language === "python" ? "PY" : "JS"}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Challenge</span>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TOPICS.map((t) => (
            <Button
              key={t.topic}
              variant="outline"
              className="justify-start gap-2 h-auto py-2.5 px-3"
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
              {generateMutation.isPending && generateMutation.variables?.topic === t.topic ? (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <t.icon className="w-4 h-4 flex-shrink-0 text-primary" />
              )}
              <span className="text-xs truncate">{t.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {challenges && challenges.length > 0 && (
        <div className="w-full mt-6">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-primary" />
            Recent Challenges
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {challenges.slice(0, 6).map((challenge) => {
              const p = progressMap[challenge.id];
              const isCompleted = p?.status === "completed";
              const score = p?.score;
              const DiffIcon = getDifficultyIcon(challenge.difficulty);

              return (
                <Card
                  key={challenge.id}
                  className="p-3 hover-elevate cursor-pointer group"
                  onClick={() => {
                    setActiveChallengeId(challenge.id);
                    navigate(`/ide?challenge=${challenge.id}`);
                  }}
                  data-testid={`card-challenge-${challenge.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-xs truncate">{challenge.title}</h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {score !== null && score !== undefined && (
                        <Badge variant="secondary" className="text-xs">{score}/100</Badge>
                      )}
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {challenge.language === "python" ? "PY" : "JS"}
                      </Badge>
                      <DiffIcon className={`w-3 h-3 ${getDifficultyColor(challenge.difficulty)}`} />
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { mode } = useAppContext();

  return (
    <div className="h-full">
      {mode === "plan" ? <PlanModeView /> : <BuildModeView />}
    </div>
  );
}
