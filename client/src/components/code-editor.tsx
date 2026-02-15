import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "./theme-provider";
import { Play, RotateCcw, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language?: "javascript" | "python";
  onRun?: () => void;
  onReset?: () => void;
  onSubmit?: () => void;
  isRunning?: boolean;
  output?: string;
  testResults?: Array<{ passed: boolean; name: string; message?: string }>;
}

export function CodeEditor({
  code,
  onChange,
  language = "javascript",
  onRun,
  onReset,
  onSubmit,
  isRunning = false,
  output = "",
  testResults,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const [showOutput, setShowOutput] = useState(false);

  const extensions = language === "python" ? [python()] : [javascript({ jsx: true })];

  const passedTests = testResults?.filter((t) => t.passed).length ?? 0;
  const totalTests = testResults?.length ?? 0;
  const allPassed = totalTests > 0 && passedTests === totalTests;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-card">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono text-xs">
            {language === "javascript" ? "JS" : "PY"}
          </Badge>
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
              disabled={isRunning}
              data-testid="button-run-code"
            >
              {isRunning ? (
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
              disabled={isRunning}
              data-testid="button-submit-code"
            >
              <Check className="w-4 h-4 mr-1" />
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
            <div className="p-3 max-h-48 overflow-auto bg-muted/30">
              {testResults && testResults.length > 0 && (
                <div className="space-y-1 mb-2">
                  {testResults.map((test, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs font-mono p-1.5 rounded-md ${
                        test.passed
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
    </div>
  );
}
