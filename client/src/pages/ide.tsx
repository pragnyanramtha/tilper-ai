import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Code2,
  MessageSquare,
  Play,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { CodeEditor } from "@/components/code-editor";
import { AIMentorChat } from "@/components/ai-mentor-chat";
import { AnimationViewer } from "@/components/animation-viewer";
import { ChallengeDetail } from "@/components/challenge-panel";
import { useTheme } from "@/components/theme-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Challenge, UserProgress } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

export default function IDEPage() {
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();

  const challengeId = parseInt(
    new URLSearchParams(window.location.search).get("challenge") || "1"
  );

  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<
    Array<{ passed: boolean; name: string; message?: string }>
  >([]);
  const [leftTab, setLeftTab] = useState("lesson");
  const [isAnimationLoading, setIsAnimationLoading] = useState(false);
  const [animationData, setAnimationData] = useState<any>(null);

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

  const runCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/code/run", {
        code,
        challengeId,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setOutput(data.output || "");
      setTestResults(data.testResults || []);
    },
    onError: (err: Error) => {
      setOutput(`Error: ${err.message}`);
    },
  });

  const submitCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/code/submit", {
        code,
        challengeId,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setOutput(data.output || "");
      setTestResults(data.testResults || []);
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress", challengeId] });
    },
    onError: (err: Error) => {
      setOutput(`Error: ${err.message}`);
    },
  });

  const handleRun = () => {
    setIsRunning(true);
    setOutput("");
    setTestResults([]);
    runCodeMutation.mutate(undefined, {
      onSettled: () => setIsRunning(false),
    });
  };

  const handleSubmit = () => {
    setIsRunning(true);
    setOutput("");
    setTestResults([]);
    submitCodeMutation.mutate(undefined, {
      onSettled: () => setIsRunning(false),
    });
  };

  const handleReset = () => {
    if (challenge) {
      setCode(challenge.starterCode);
      setOutput("");
      setTestResults([]);
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
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center gap-2 p-2 border-b">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 flex">
          <Skeleton className="flex-1" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Challenge not found</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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
        <TabsTrigger
          value="mentor"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2.5 text-xs"
          data-testid="tab-mentor"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
          Mentor
        </TabsTrigger>
      </TabsList>
      <TabsContent value="lesson" className="flex-1 mt-0 overflow-auto">
        <div className="p-4">
          <ChallengeDetail challenge={challenge} />
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
      <TabsContent value="mentor" className="flex-1 mt-0 min-h-0">
        <AIMentorChat
          challengeTitle={challenge.title}
          challengeDescription={challenge.description}
          userCode={code}
        />
      </TabsContent>
    </Tabs>
  );

  const rightContent = (
    <CodeEditor
      code={code}
      onChange={setCode}
      language="javascript"
      onRun={handleRun}
      onReset={handleReset}
      onSubmit={handleSubmit}
      isRunning={isRunning}
      output={output}
      testResults={testResults}
    />
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between gap-2 px-3 py-1.5 border-b bg-card/50 dark:bg-[#141516]">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/")}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-semibold truncate" data-testid="text-header-title">
              {challenge.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
      </header>

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
