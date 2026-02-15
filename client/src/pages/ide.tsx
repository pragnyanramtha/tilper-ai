import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Play,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { CodeEditor } from "@/components/code-editor";
import { AnimationViewer } from "@/components/animation-viewer";
import { ChallengeDetail } from "@/components/challenge-panel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { runCode, preloadPyodide } from "@/lib/code-runner";
import { useAppContext } from "@/lib/app-context";
import type { Challenge, UserProgress } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

interface EvaluationResult {
  score: number;
  testScore: number;
  qualityScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  allPassed: boolean;
}

export default function IDEPage() {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { setActiveChallengeId, setMode } = useAppContext();

  const challengeId = parseInt(
    new URLSearchParams(window.location.search).get("challenge") || "1"
  );

  useEffect(() => {
    setActiveChallengeId(challengeId);
    setMode("learn");
  }, [challengeId]);

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<
    Array<{ passed: boolean; name: string; message?: string }>
  >([]);
  const [leftTab, setLeftTab] = useState("lesson");
  const [isAnimationLoading, setIsAnimationLoading] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);

  const { data: challenge, isLoading: challengeLoading } = useQuery<Challenge>({
    queryKey: ["/api/challenges", challengeId],
  });

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress", challengeId],
  });

  useEffect(() => {
    if (challenge) {
      if (progress?.userCode) {
        setCode(progress.userCode);
      } else {
        setCode(challenge.starterCode);
      }
    }
  }, [challenge, progress]);

  useEffect(() => {
    if (challenge?.language === "python") {
      preloadPyodide().then(() => setPyodideReady(true));
    }
  }, [challenge?.language]);

  const handleRun = async () => {
    if (!challenge) return;
    setIsRunning(true);
    setOutput("");
    setTestResults([]);
    setEvaluation(null);

    try {
      const testCases = typeof challenge.testCases === "string"
        ? JSON.parse(challenge.testCases)
        : challenge.testCases;

      const result = await runCode(code, testCases, challenge.language);
      setOutput(result.output);
      setTestResults(result.testResults);

      await apiRequest("POST", "/api/progress/save", {
        challengeId,
        code,
        status: "in_progress",
      });
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!challenge) return;
    setIsRunning(true);
    setIsEvaluating(true);
    setOutput("");
    setTestResults([]);
    setEvaluation(null);

    try {
      const testCases = typeof challenge.testCases === "string"
        ? JSON.parse(challenge.testCases)
        : challenge.testCases;

      const result = await runCode(code, testCases, challenge.language);
      setOutput(result.output);
      setTestResults(result.testResults);

      const evalRes = await apiRequest("POST", "/api/submissions/evaluate", {
        code,
        challengeId,
        testResults: result.testResults,
        language: challenge.language,
      });
      const evalData: EvaluationResult = await evalRes.json();
      setEvaluation(evalData);

      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress", challengeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    if (challenge) {
      setCode(challenge.starterCode);
      setOutput("");
      setTestResults([]);
      setEvaluation(null);
    }
  };

  const handleRequestAnimation = async () => {
    if (!challenge) return;
    setIsAnimationLoading(true);
    try {
      const res = await apiRequest("POST", "/api/animations/generate", {
        topic: challenge.topic,
        title: challenge.title,
        description: challenge.description,
      });
      const data = await res.json();
      setAnimationData(data.steps);
    } catch {
      setAnimationData(null);
    } finally {
      setIsAnimationLoading(false);
    }
  };

  if (challengeLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 p-3 border-b">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 flex">
          <Skeleton className="flex-1" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Challenge not found</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const leftContent = (
    <Tabs value={leftTab} onValueChange={setLeftTab} className="h-full flex flex-col">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent dark:bg-[#141516] p-0 h-auto">
        <TabsTrigger
          value="lesson"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-xs"
          data-testid="tab-lesson"
        >
          <BookOpen className="w-3.5 h-3.5 mr-1.5" />
          Lesson
        </TabsTrigger>
        <TabsTrigger
          value="visual"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-xs"
          data-testid="tab-visual"
        >
          <Play className="w-3.5 h-3.5 mr-1.5" />
          Visual
        </TabsTrigger>
      </TabsList>
      <TabsContent value="lesson" className="flex-1 mt-0 overflow-auto">
        <div className="p-4">
          <ChallengeDetail challenge={challenge} />
          {evaluation && (
            <Card className="p-4 mt-4" data-testid="card-evaluation">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Submission Score</h3>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl font-bold text-primary" data-testid="text-score">
                  {evaluation.score}
                </div>
                <div className="text-sm text-muted-foreground">/100</div>
              </div>
              <Progress value={evaluation.score} className="h-2 mb-3" />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-xs">
                  <span className="text-muted-foreground">Tests: </span>
                  <span className="font-medium">{evaluation.testScore}/70</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground">Quality: </span>
                  <span className="font-medium">{evaluation.qualityScore}/30</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{evaluation.feedback}</p>
              {evaluation.strengths.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-green-500 mb-1">Strengths:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i}>+ {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.improvements.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-yellow-500 mb-1">To improve:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {evaluation.improvements.map((s, i) => (
                      <li key={i}>- {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>
      </TabsContent>
      <TabsContent value="visual" className="flex-1 mt-0 min-h-0">
        <AnimationViewer
          topic={challenge.topic}
          animationData={animationData}
          isLoading={isAnimationLoading}
          onRequestAnimation={handleRequestAnimation}
        />
      </TabsContent>
    </Tabs>
  );

  const rightContent = (
    <CodeEditor
      code={code}
      onChange={setCode}
      language={challenge.language === "python" ? "python" : "javascript"}
      onRun={handleRun}
      onReset={handleReset}
      onSubmit={handleSubmit}
      isRunning={isRunning}
      isEvaluating={isEvaluating}
      output={output}
      testResults={testResults}
      pyodideReady={challenge.language === "python" ? pyodideReady : true}
    />
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b dark:bg-[#141516]">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate("/")}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm font-semibold truncate" data-testid="text-header-title">
          {challenge.title}
        </span>
        <Badge variant="outline" className="text-xs ml-auto">
          {challenge.language === "python" ? "Python" : "JavaScript"}
        </Badge>
      </div>

      <div className="flex-1 min-h-0">
        {isMobile ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 border-b">{leftContent}</div>
            <div className="h-[45%] min-h-[200px]">{rightContent}</div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={45} minSize={25}>
              {leftContent}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={55} minSize={30}>
              {rightContent}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
