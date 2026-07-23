/**
 * Commands — Test Generation Command
 *
 * Registers the `codeAssistant.generateTests` command that:
 * 1. Takes the active editor's content (or selection)
 * 2. Sends it to the backend's /generate-tests endpoint
 * 3. Opens the generated test code in a new untitled editor tab
 */

import * as vscode from "vscode";

/** Shape of the /generate-tests response */
interface GenerateTestsResponse {
  test_code: string;
  framework: string;
  num_tests: number;
}

/**
 * Call the backend /generate-tests endpoint.
 */
async function fetchGeneratedTests(
  code: string,
  language: string,
  backendUrl: string
): Promise<GenerateTestsResponse | null> {
  try {
    const response = await fetch(`${backendUrl}/generate-tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      console.error(
        `Code Assistant: /generate-tests returned ${response.status}`
      );
      vscode.window.showErrorMessage(
        `Code Assistant: Failed to generate tests (HTTP ${response.status})`
      );
      return null;
    }

    return (await response.json()) as GenerateTestsResponse;
  } catch (error) {
    console.error("Code Assistant: Failed to generate tests", error);
    vscode.window.showErrorMessage(
      "Code Assistant: Could not connect to the backend. Is the server running?"
    );
    return null;
  }
}

/**
 * Map a document language ID to the file extension for the generated test.
 */
function getTestLanguageId(languageId: string): string {
  const map: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    typescript: "typescript",
    javascriptreact: "javascript",
    typescriptreact: "typescript",
  };
  return map[languageId] || "plaintext";
}

/**
 * Register the "Generate Tests" command.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  backendUrl: string
): void {
  const generateTestsCommand = vscode.commands.registerCommand(
    "codeAssistant.generateTests",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(
          "Code Assistant: No active editor. Open a file first."
        );
        return;
      }

      // Use selected text if available, otherwise the full document
      const selection = editor.selection;
      const code = selection.isEmpty
        ? editor.document.getText()
        : editor.document.getText(selection);

      if (!code.trim()) {
        vscode.window.showWarningMessage(
          "Code Assistant: No code to generate tests for."
        );
        return;
      }

      const language = editor.document.languageId;

      // Show progress notification
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Code Assistant: Generating tests...",
          cancellable: false,
        },
        async () => {
          const result = await fetchGeneratedTests(code, language, backendUrl);

          if (!result) {
            return;
          }

          // Open the generated test code in a new untitled editor
          const testLanguageId = getTestLanguageId(language);
          const doc = await vscode.workspace.openTextDocument({
            content: result.test_code,
            language: testLanguageId,
          });

          await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Beside,
          });

          vscode.window.showInformationMessage(
            `Code Assistant: Generated ${result.num_tests} test(s) using ${result.framework}`
          );
        }
      );
    }
  );

  context.subscriptions.push(generateTestsCommand);
  console.log("Code Assistant: Commands registered");
}
