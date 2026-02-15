declare global {
  interface Window {
    loadPyodide: any;
    pyodideInstance: any;
  }
}

let pyodideLoading: Promise<any> | null = null;

async function loadPyodideRuntime(): Promise<any> {
  if (window.pyodideInstance) return window.pyodideInstance;

  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(script);
      });
    }
    window.pyodideInstance = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
    });
    return window.pyodideInstance;
  })();

  return pyodideLoading;
}

interface TestCase {
  name: string;
  input: any[];
  expected: any;
  functionName?: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

interface RunResult {
  output: string;
  testResults: TestResult[];
}

export async function runCode(
  code: string,
  testCases: TestCase[],
  language: string
): Promise<RunResult> {
  if (language === "python") {
    return runPython(code, testCases);
  }
  return runJavaScript(code, testCases);
}

function runJavaScript(code: string, testCases: TestCase[]): RunResult {
  const logs: string[] = [];
  const mockConsole = {
    log: (...args: any[]) => logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")),
    error: (...args: any[]) => logs.push("ERROR: " + args.map(String).join(" ")),
    warn: (...args: any[]) => logs.push("WARN: " + args.map(String).join(" ")),
  };

  const testResults: TestResult[] = [];

  try {
    const fnNames = testCases
      .map(t => t.functionName)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    let returnExpr = "undefined";
    if (fnNames.length > 0) {
      returnExpr = fnNames.map(n => `typeof ${n} !== 'undefined' ? ${n} : `).join("") + "undefined";
    }

    const fn = new Function("console", code + `\n; return (${returnExpr});`);
    const userFn = fn(mockConsole);
    const output = logs.join("\n");

    if (userFn && typeof userFn === "function") {
      for (const test of testCases) {
        try {
          const result = userFn(...(test.input || []));
          const passed = JSON.stringify(result) === JSON.stringify(test.expected);
          testResults.push({
            passed,
            name: test.name,
            message: passed ? "Correct" : `Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`,
          });
        } catch (testError: any) {
          testResults.push({ passed: false, name: test.name, message: `Error: ${testError.message}` });
        }
      }
    } else {
      for (const test of testCases) {
        testResults.push({ passed: false, name: test.name, message: "Function not found. Define the function with the correct name." });
      }
    }

    return { output, testResults };
  } catch (error: any) {
    for (const test of testCases) {
      testResults.push({ passed: false, name: test.name, message: `Error: ${error.message}` });
    }
    return { output: `Error: ${error.message}`, testResults };
  }
}

async function runPython(code: string, testCases: TestCase[]): Promise<RunResult> {
  const testResults: TestResult[] = [];

  try {
    const pyodide = await loadPyodideRuntime();

    pyodide.runPython(`
import sys
from io import StringIO
_captured_output = StringIO()
sys.stdout = _captured_output
sys.stderr = _captured_output
`);

    pyodide.runPython(code);

    const output = pyodide.runPython("_captured_output.getvalue()") || "";

    pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);

    for (const test of testCases) {
      try {
        const fnName = test.functionName || "solution";
        const args = (test.input || []).map(a => JSON.stringify(a)).join(", ");
        const resultPy = pyodide.runPython(`
import json
try:
    _result = ${fnName}(${args})
    json.dumps(_result)
except Exception as e:
    json.dumps({"__error__": str(e)})
`);
        const result = JSON.parse(resultPy);

        if (result && result.__error__) {
          testResults.push({ passed: false, name: test.name, message: `Error: ${result.__error__}` });
        } else {
          const passed = JSON.stringify(result) === JSON.stringify(test.expected);
          testResults.push({
            passed,
            name: test.name,
            message: passed ? "Correct" : `Expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`,
          });
        }
      } catch (testError: any) {
        testResults.push({ passed: false, name: test.name, message: `Error: ${testError.message}` });
      }
    }

    return { output, testResults };
  } catch (error: any) {
    for (const test of testCases) {
      testResults.push({ passed: false, name: test.name, message: `Error: ${error.message}` });
    }
    return { output: `Error: ${error.message}`, testResults };
  }
}

export function isPyodideLoaded(): boolean {
  return !!window.pyodideInstance;
}

export async function preloadPyodide(): Promise<void> {
  try {
    await loadPyodideRuntime();
  } catch {
  }
}
