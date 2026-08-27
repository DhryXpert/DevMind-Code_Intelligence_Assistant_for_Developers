/**
 * DevMind — VS Code Extension
 *
 * Main extension entry point. The activate() function wires together:
 * - Hover Provider (code explanation on hover)
 * - Diagnostics (bug detection on file save)
 * - Commands (test generation via Command Palette / right-click)
 *
 * The backend URL is read from VS Code settings (codeAssistant.backendUrl)
 * and defaults to http://localhost:8000.
 */

import * as vscode from "vscode";
import { registerHoverProvider } from "./hoverProvider";
import { registerDiagnostics } from "./diagnostics";
import { registerCommands } from "./commands";
import { registerSidePanel } from "./side_panel";

/**
 * Read the backend URL from VS Code settings.
 */
function getBackendUrl(): string {
  const config = vscode.workspace.getConfiguration("codeAssistant");
  return config.get<string>("backendUrl", "http://localhost:8000");
}

/**
 * Called when the extension is activated.
 * Activation happens when a Python, JavaScript, or TypeScript file is opened.
 */
export function activate(context: vscode.ExtensionContext): void {
  const backendUrl = getBackendUrl();

  console.log(`DevMind activated (backend: ${backendUrl})`);

  // --- Register all features ---
  registerSidePanel(context, backendUrl);
  registerHoverProvider(context, backendUrl);
  registerDiagnostics(context, backendUrl);
  registerCommands(context, backendUrl);

  // Show a brief activation message
  vscode.window.showInformationMessage(
    "DevMind - Code Intelligence Assistant is active! 🧠",
  );
}

/**
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
  console.log("DevMind deactivated");
}
