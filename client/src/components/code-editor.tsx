import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "./theme-provider";
import { Play, RotateCcw, Check, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { keymap } from "@codemirror/view";
import { acceptCompletion } from "@codemirror/autocomplete";

interface EvaluationResult {
  score: number;
  testScore: number;
  qualityScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  allPassed: boolean;
}

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language?: string;
  onRun?: () => void;
  onReset?: () => void;
  onSubmit?: () => void;
  isRunning?: boolean;
  isEvaluating?: boolean;
  output?: string;
  testResults?: Array<{ passed: boolean; name: string; message?: string }>;
  pyodideReady?: boolean;
  evaluation?: EvaluationResult | null;
}

export function CodeEditor({
  code,
  onChange,
  language = "javascript",
  onRun,
  onReset,
  onSubmit,
  isRunning = false,
  isEvaluating = false,
  output = "",
  testResults,
  pyodideReady = true,
  evaluation = null,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    if (testResults && testResults.length > 0) {
      setShowOutput(true);
    }
  }, [testResults]);

  // Determine extensions based on language string
  const getExtensions = () => {
    if (language === "python") return [python()];
    if (language === "javascript" || language === "typescript" || language === "js" || language === "ts") return [javascript({ jsx: true })];
    // For other languages, we could add more dynamic imports or just return empty for plain text
    return [];
  };

  const extensions = [
    ...getExtensions(),
    keymap.of([
      { key: "Tab", run: acceptCompletion }
    ])
  ];

  const passedTests = testResults?.filter((t) => t.passed).length ?? 0;
  const totalTests = testResults?.length ?? 0;
  const allPassed = totalTests > 0 && passedTests === totalTests;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-card dark:bg-[#141516]">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono text-xs uppercase">
            {language}
          </Badge>
          {!pyodideReady && language === "python" && (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Loading Python...
            </Badge>
          )}
          {testResults && (
            <Badge variant={allPassed ? "default" : "secondary"} className="text-xs">
              {passedTests}/{totalTests} tests
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onReset && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onReset}
              data-testid="button-reset-code"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
          {onRun && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRun}
              disabled={isRunning || (!pyodideReady && language === "python")}
              data-testid="button-run-code"
            >
              {isRunning && !isEvaluating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Run
            </Button>
          )}
          {onSubmit && (
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={isRunning || (!pyodideReady && language === "python")}
              data-testid="button-submit-code"
            >
              {isEvaluating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Submit
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <CodeMirror
          value={code}
          onChange={onChange}
          extensions={extensions}
          theme={theme === "dark" ? oneDark : undefined}
          height="100%"
          style={{ height: "100%", fontSize: "14px" }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            foldGutter: true,
            indentOnInput: true,
          }}
        />
      </div>

      {(output || testResults) && (
        <div className="border-t">
          <button
            className="w-full flex items-center justify-between p-2 text-xs font-medium text-muted-foreground"
            onClick={() => setShowOutput(!showOutput)}
            data-testid="button-toggle-output"
          >
            <span>Output</span>
            <span>{showOutput ? "Hide" : "Show"}</span>
          </button>
          {showOutput && (
            <div className="p-3 max-h-48 overflow-auto bg-muted/30 dark:bg-[#141516]/60">
              {testResults && testResults.length > 0 && (
                <div className="space-y-1 mb-2">
                  {testResults.map((test, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs font-mono p-1.5 rounded-md ${test.passed
                        ? "text-green-500 bg-green-500/10"
                        : "text-red-400 bg-red-400/10"
                        }`}
                      data-testid={`test-result-${i}`}
                    >
                      {test.passed ? (
                        <Check className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <span className="text-red-400 flex-shrink-0">x</span>
                      )}
                      <span>{test.name}</span>
                      {test.message && (
                        <span className="text-muted-foreground ml-auto">{test.message}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {output && (
                <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80">
                  {output}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {evaluation && (
        <div className="border-t">
          <Card className="m-3 p-4" data-testid="card-evaluation">
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
        </div>
      )}
    </div>
  );
}
