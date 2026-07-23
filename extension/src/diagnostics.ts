/**
 * Diagnostics — Bug Detection on File Save
 *
 * On file save, sends the document text to the backend's /detect-bugs
 * endpoint and renders the results as vscode.Diagnostic squiggles
 * in the editor and entries in the Problems panel.
 */

import * as vscode from "vscode";

/** Shape of a single bug from the backend response */
interface BugItem {
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
  rule_id: string;
  suggestion?: string;
}

/** Shape of the /detect-bugs response */
interface BugDetectResponse {
  bugs: BugItem[];
  total_bugs: number;
  analyzed_lines: number;
}

/**
 * Map backend severity strings to VS Code DiagnosticSeverity.
 */
function mapSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "info":
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

/**
 * Call the backend /detect-bugs endpoint.
 */
async function fetchBugs(
  code: string,
  language: string,
  filename: string,
  backendUrl: string
): Promise<BugDetectResponse | null> {
  try {
    const response = await fetch(`${backendUrl}/detect-bugs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language, filename }),
    });

    if (!response.ok) {
      console.error(
        `Code Assistant: /detect-bugs returned ${response.status}`
      );
      return null;
    }

    return (await response.json()) as BugDetectResponse;
  } catch (error) {
    console.error("Code Assistant: Failed to fetch bug detection", error);
    return null;
  }
}

/**
 * Convert backend bugs to VS Code diagnostics.
 */
function bugsToDiagnostics(
  bugs: BugItem[],
  document: vscode.TextDocument
): vscode.Diagnostic[] {
  return bugs.map((bug) => {
    // Backend lines are 1-indexed, VS Code is 0-indexed
    const lineIndex = Math.min(bug.line - 1, document.lineCount - 1);
    const line = document.lineAt(Math.max(0, lineIndex));

    const range = new vscode.Range(
      lineIndex,
      Math.max(0, bug.column - 1),
      lineIndex,
      line.text.length
    );

    const diagnostic = new vscode.Diagnostic(
      range,
      bug.message,
      mapSeverity(bug.severity)
    );

    diagnostic.source = "Code Assistant";
    diagnostic.code = bug.rule_id;

    // Add suggestion as related information if available
    if (bug.suggestion) {
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          `💡 Suggestion: ${bug.suggestion}`
        ),
      ];
    }

    return diagnostic;
  });
}

/**
 * Run bug detection on a document and update diagnostics.
 */
async function analyzeDocument(
  document: vscode.TextDocument,
  diagnosticCollection: vscode.DiagnosticCollection,
  backendUrl: string
): Promise<void> {
  // Check if diagnostics are enabled in settings
  const config = vscode.workspace.getConfiguration("codeAssistant");
  if (!config.get<boolean>("enableDiagnostics", true)) {
    return;
  }

  // Only analyze supported languages
  const supportedLanguages = [
    "python",
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact",
  ];

  if (!supportedLanguages.includes(document.languageId)) {
    return;
  }

  const code = document.getText();
  const language = document.languageId;
  const filename = document.fileName;

  const result = await fetchBugs(code, language, filename, backendUrl);

  if (!result) {
    return;
  }

  const diagnostics = bugsToDiagnostics(result.bugs, document);
  diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * Register the diagnostics system — analyzes files on save.
 */
export function registerDiagnostics(
  context: vscode.ExtensionContext,
  backendUrl: string
): vscode.DiagnosticCollection {
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("codeAssistant");

  context.subscriptions.push(diagnosticCollection);

  // Analyze on file save
  const onSave = vscode.workspace.onDidSaveTextDocument((document) => {
    analyzeDocument(document, diagnosticCollection, backendUrl);
  });
  context.subscriptions.push(onSave);

  // Clear diagnostics when a file is closed
  const onClose = vscode.workspace.onDidCloseTextDocument((document) => {
    diagnosticCollection.delete(document.uri);
  });
  context.subscriptions.push(onClose);

  console.log("Code Assistant: Diagnostics registered (triggers on save)");

  return diagnosticCollection;
}
