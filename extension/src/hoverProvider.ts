/**
 * Hover Provider — Code Explanation on Hover
 *
 * Registers a HoverProvider for Python and JavaScript/TypeScript files.
 * When the user hovers over a word, it sends the surrounding code to the
 * backend's /explain endpoint and shows the explanation in a hover tooltip.
 */

import * as vscode from "vscode";

/**
 * Call the backend /explain endpoint and return the explanation text.
 */
async function fetchExplanation(
  code: string,
  language: string,
  backendUrl: string
): Promise<string | null> {
  try {
    // Use dynamic import for the built-in fetch (available in Node 18+)
    const response = await fetch(`${backendUrl}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language }),
    });

    if (!response.ok) {
      console.error(
        `Code Assistant: /explain returned ${response.status}`
      );
      return null;
    }

    const data = (await response.json()) as {
      explanation: string;
      language_detected: string;
    };
    return data.explanation;
  } catch (error) {
    console.error("Code Assistant: Failed to fetch explanation", error);
    return null;
  }
}

/**
 * Create and return the HoverProvider instance.
 */
export function createHoverProvider(
  backendUrl: string
): vscode.HoverProvider {
  return {
    async provideHover(
      document: vscode.TextDocument,
      position: vscode.Position,
      _token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
      // Check if hover is enabled in settings
      const config = vscode.workspace.getConfiguration("codeAssistant");
      if (!config.get<boolean>("enableHover", true)) {
        return null;
      }

      // Get the word under the cursor
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) {
        return null;
      }

      // Grab a context window: the line the cursor is on plus a few
      // surrounding lines (up to 5 above and 5 below)
      const startLine = Math.max(0, position.line - 5);
      const endLine = Math.min(document.lineCount - 1, position.line + 5);
      const codeSnippet = document.getText(
        new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length)
      );

      // Detect language from the document
      const language = document.languageId;

      // Fetch explanation from the backend
      const explanation = await fetchExplanation(
        codeSnippet,
        language,
        backendUrl
      );

      if (!explanation) {
        return null;
      }

      // Build a nice markdown hover
      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;
      markdown.appendMarkdown(`### 🧠DevMind Code Intelligence made by Dhairya\n\n`);
      markdown.appendMarkdown(explanation);

      return new vscode.Hover(markdown, wordRange);
    },
  };
}

/**
 * Register the hover provider for supported languages.
 */
export function registerHoverProvider(
  context: vscode.ExtensionContext,
  backendUrl: string
): void {
  const provider = createHoverProvider(backendUrl);

  // Register for Python, JavaScript, and TypeScript
  const languages = ["python", "javascript", "typescript", "javascriptreact", "typescriptreact"];

  for (const lang of languages) {
    const disposable = vscode.languages.registerHoverProvider(
      { scheme: "file", language: lang },
      provider
    );
    context.subscriptions.push(disposable);
  }

  console.log("Code Assistant: Hover provider registered");
}
