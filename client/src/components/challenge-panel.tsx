import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronRight,
  Trophy,
  Flame,
  Lock,
  Zap,
} from "lucide-react";
import type { Challenge, UserProgress } from "@shared/schema";

interface ChallengePanelProps {
  challenges: Challenge[];
  progress: Record<number, UserProgress>;
  currentChallengeId?: number;
  onSelectChallenge: (id: number) => void;
}

function getDifficultyColor(difficulty: string): string {
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

export function ChallengePanel({
  challenges,
  progress,
  currentChallengeId,
  onSelectChallenge,
}: ChallengePanelProps) {
  const completedCount = Object.values(progress).filter(
    (p) => p.status === "completed"
  ).length;
  const totalCount = challenges.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const groupedChallenges = challenges.reduce(
    (acc, challenge) => {
      if (!acc[challenge.topic]) acc[challenge.topic] = [];
      acc[challenge.topic].push(challenge);
      return acc;
    },
    {} as Record<string, Challenge[]>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Learning Path</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedCount}/{totalCount} completed
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5" data-testid="progress-bar" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {Object.entries(groupedChallenges).map(([topic, topicChallenges]) => (
            <div key={topic}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {topic}
              </h3>
              <div className="space-y-1">
                {topicChallenges.map((challenge) => {
                  const p = progress[challenge.id];
                  const isCompleted = p?.status === "completed";
                  const isActive = challenge.id === currentChallengeId;
                  const DiffIcon = getDifficultyIcon(challenge.difficulty);

                  return (
                    <button
                      key={challenge.id}
                      onClick={() => onSelectChallenge(challenge.id)}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-md text-left transition-colors ${
                        isActive
                          ? "bg-primary/10 border border-primary/20"
                          : "hover-elevate"
                      }`}
                      data-testid={`button-challenge-${challenge.id}`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            isCompleted ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {challenge.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <DiffIcon
                            className={`w-3 h-3 ${getDifficultyColor(challenge.difficulty)}`}
                          />
                          <span
                            className={`text-xs ${getDifficultyColor(challenge.difficulty)}`}
                          >
                            {challenge.difficulty}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {challenges.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No challenges available</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ChallengeDetail({ challenge }: { challenge: Challenge }) {
  let testCases: Array<{ name: string; input: any[]; expected: any; functionName: string }> = [];
  try {
    testCases = typeof challenge.testCases === "string"
      ? JSON.parse(challenge.testCases)
      : (challenge.testCases as any[]) || [];
  } catch {
    testCases = [];
  }

  const examples = testCases.slice(0, 2);
  const functionName = examples[0]?.functionName || "solution";

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <h2 className="text-lg font-bold" data-testid="text-challenge-title">
            {challenge.title}
          </h2>
          <Badge variant="secondary" className="text-xs">
            {challenge.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {challenge.topic}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-challenge-description">
          {challenge.description}
        </p>
      </div>

      <Card className="p-3" data-testid="card-what-to-do">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
          What you need to do
        </h4>
        <p className="text-sm text-muted-foreground mb-2">
          Implement the <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{functionName}</code> function
          in {challenge.language === "python" ? "Python" : "JavaScript"}.
        </p>
        {examples.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span>It takes <strong>{examples[0].input.length}</strong> argument{examples[0].input.length !== 1 ? "s" : ""} and returns a result.</span>
          </div>
        )}
      </Card>

      {examples.length > 0 && (
        <Card className="p-3" data-testid="card-examples">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Examples
          </h4>
          <div className="space-y-3">
            {examples.map((tc: any, i: number) => (
              <div key={i} className="space-y-1.5" data-testid={`example-${i}`}>
                <p className="text-xs font-medium text-muted-foreground">Example {i + 1}: {tc.name}</p>
                <div className="bg-muted/50 rounded-md p-2.5 font-mono text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">Input: </span>
                    <span className="text-foreground">{tc.input.map((arg: any) => JSON.stringify(arg)).join(", ")}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected: </span>
                    <span className="text-green-500">{JSON.stringify(tc.expected)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {challenge.hints && challenge.hints.length > 0 && (
        <Card className="p-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Hints
          </h4>
          <ul className="space-y-1.5">
            {challenge.hints.map((hint, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary font-mono text-xs mt-0.5">{i + 1}.</span>
                {hint}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
