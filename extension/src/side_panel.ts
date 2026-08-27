/**
 * DevMind Sidebar Views — VS Code Extension
 *
 * Implements native VS Code collapsible side panel views for:
 * 1. Code Search (CodeSearchProvider)
 * 2. Generate Tests (GenerateTestsProvider)
 */

import * as vscode from "vscode";

interface SearchResult {
  filename: string;
  snippet: string;
  score: number;
  language: string;
  line_start: number;
  line_end: number;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
}

interface GenerateTestsResponse {
  test_code: string;
  framework: string;
  num_tests: number;
}

/**
 * Helper to get details of the current active editor / selection.
 */
function getActiveEditorDetails(): { filename: string; code: string; language: string; isSelection: boolean } | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !editor.document) return null;

  const selection = editor.selection;
  const isSelection = !selection.isEmpty;
  const code = isSelection
    ? editor.document.getText(selection)
    : editor.document.getText();

  const filename = editor.document.isUntitled
    ? "Untitled (" + (editor.document.languageId || "file") + ")"
    : vscode.workspace.asRelativePath(editor.document.uri);

  return {
    filename,
    code,
    language: editor.document.languageId,
    isSelection,
  };
}

// ============================================================================
// 1. Code Search Provider (Section 1 in Sidebar)
// ============================================================================

export class CodeSearchProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codeAssistant.searchView";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _backendUrl: string
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForSearch();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "search") {
        await this._performSearch(data.query);
      } else if (data.type === "copyText") {
        await vscode.env.clipboard.writeText(data.text);
        vscode.window.showInformationMessage("Code copied to clipboard!");
      }
    });
  }

  public focusWithQuery(query?: string) {
    if (this._view) {
      this._view.show?.(true);
      if (query) {
        this._view.webview.postMessage({ type: "setQueryAndSearch", query });
      }
    }
  }

  private async _performSearch(query: string) {
    if (!query || !query.trim()) return;

    this._view?.webview.postMessage({ type: "loading" });

    try {
      const response = await fetch(`${this._backendUrl}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), max_results: 5 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as SearchResponse;
      this._view?.webview.postMessage({
        type: "results",
        results: data.results,
      });
    } catch (err: any) {
      this._view?.webview.postMessage({
        type: "error",
        error: err?.message || "Could not connect to backend",
      });
    }
  }

  private _getHtmlForSearch(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 10px;
      margin: 0;
    }
    .row {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    input {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, #444);
      padding: 6px 8px;
      border-radius: 2px;
      font-size: 13px;
      outline: none;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
    }
    .chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--vscode-widget-border, #444);
      border-radius: 10px;
      padding: 2px 7px;
      font-size: 11px;
      cursor: pointer;
      opacity: 0.8;
    }
    .chip:hover { opacity: 1; border-color: var(--vscode-focusBorder); }
    .item {
      margin-bottom: 12px;
      border: 1px solid var(--vscode-widget-border, #333);
      border-radius: 3px;
      padding: 8px;
      background: var(--vscode-editor-background);
    }
    .file {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 6px;
      color: var(--vscode-textLink-foreground);
    }
    pre {
      margin: 0 0 8px 0;
      padding: 6px;
      background: var(--vscode-textCodeBlock-background, #1e1e1e);
      border-radius: 2px;
      overflow-x: auto;
      font-size: 11px;
      line-height: 1.4;
      max-height: 200px;
    }
    .status {
      font-size: 12px;
      opacity: 0.8;
      text-align: center;
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="row">
    <input type="text" id="query" placeholder="Search functions or concepts..." />
    <button id="searchBtn">Search</button>
  </div>
  <div class="chips">
    <span class="chip" onclick="setQuery('auth middleware')">auth middleware</span>
    <span class="chip" onclick="setQuery('download file from url')">download url</span>
    <span class="chip" onclick="setQuery('read statistics chassis')">statistics</span>
    <span class="chip" onclick="setQuery('load json string')">parse json</span>
  </div>
  <div id="status" class="status"></div>
  <div id="results"></div>

  <script>
    const vscode = acquireVsCodeApi();
    const queryInput = document.getElementById('query');
    const searchBtn = document.getElementById('searchBtn');
    const statusDiv = document.getElementById('status');
    const resultsDiv = document.getElementById('results');

    function setQuery(q) {
      queryInput.value = q;
      search();
    }

    function search() {
      const q = queryInput.value.trim();
      if (!q) return;
      statusDiv.textContent = 'Searching...';
      resultsDiv.innerHTML = '';
      vscode.postMessage({ type: 'search', query: q });
    }

    searchBtn.onclick = search;
    queryInput.onkeydown = (e) => { if (e.key === 'Enter') search(); };

    window.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'setQueryAndSearch') {
        queryInput.value = msg.query;
        search();
      } else if (msg.type === 'loading') {
        statusDiv.textContent = 'Searching...';
      } else if (msg.type === 'error') {
        statusDiv.textContent = 'Error: ' + msg.error;
      } else if (msg.type === 'results') {
        statusDiv.textContent = '';
        render(msg.results);
      }
    };

    function escapeHtml(t) {
      return (t || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function render(list) {
      if (!list || list.length === 0) {
        statusDiv.textContent = 'No results found.';
        return;
      }
      list.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = \`
          <div class="file">\${escapeHtml(item.filename)}</div>
          <pre><code>\${escapeHtml(item.snippet)}</code></pre>
          <button class="copy-btn">Copy</button>
        \`;
        div.querySelector('.copy-btn').onclick = () => {
          vscode.postMessage({ type: 'copyText', text: item.snippet });
        };
        resultsDiv.appendChild(div);
      });
    }
  </script>
</body>
</html>`;
  }
}

// ============================================================================
// 2. Generate Tests Provider (Section 2 in Sidebar)
// ============================================================================

export class GenerateTestsProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "codeAssistant.generateTestsView";
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _backendUrl: string
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForTests();

    vscode.window.onDidChangeActiveTextEditor(() => this._sendActiveFileInfo());
    vscode.window.onDidChangeTextEditorSelection(() => this._sendActiveFileInfo());
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._sendActiveFileInfo();
      }
    });

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "getActiveFile":
          this._sendActiveFileInfo();
          break;
        case "chooseFile":
          await this._chooseFile();
          break;
        case "generateTests":
          await this._performGenerateTests(data.code, data.language);
          break;
        case "copyText":
          await vscode.env.clipboard.writeText(data.text);
          vscode.window.showInformationMessage("Copied to clipboard!");
          break;
        case "openInNewTab":
          await this._openInNewTab(data.text, data.language || "python");
          break;
      }
    });

    setTimeout(() => this._sendActiveFileInfo(), 100);
    setTimeout(() => this._sendActiveFileInfo(), 500);
  }

  public showAndGenerate() {
    if (this._view) {
      this._view.show?.(true);
      this._sendActiveFileInfo();
    }
  }

  private _sendActiveFileInfo() {
    const details = getActiveEditorDetails();
    this._view?.webview.postMessage({
      type: "activeFile",
      hasFile: !!details,
      filename: details ? details.filename : "No active file",
      language: details ? details.language : "python",
      code: details ? details.code : "",
      isSelection: details ? details.isSelection : false,
    });
  }

  private async _chooseFile() {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: "Select file",
    });

    if (uris && uris.length > 0) {
      const uri = uris[0];
      const doc = await vscode.workspace.openTextDocument(uri);
      this._view?.webview.postMessage({
        type: "activeFile",
        hasFile: true,
        filename: vscode.workspace.asRelativePath(uri),
        language: doc.languageId,
        code: doc.getText(),
        isSelection: false,
      });
    }
  }

  private async _performGenerateTests(code: string, language: string) {
    let targetCode = code;
    let targetLang = language || "python";

    if (!targetCode) {
      const current = getActiveEditorDetails();
      if (!current || !current.code.trim()) {
        this._view?.webview.postMessage({
          type: "testError",
          error: "No code found to generate tests for. Open a file first.",
        });
        return;
      }
      targetCode = current.code;
      targetLang = current.language;
    }

    this._view?.webview.postMessage({ type: "testLoading" });

    try {
      const response = await fetch(`${this._backendUrl}/generate-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: targetCode, language: targetLang }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as GenerateTestsResponse;
      this._view?.webview.postMessage({
        type: "testResults",
        test_code: data.test_code,
        framework: data.framework,
        language: targetLang,
      });
    } catch (err: any) {
      this._view?.webview.postMessage({
        type: "testError",
        error: err?.message || "Could not connect to backend",
      });
    }
  }

  private async _openInNewTab(content: string, language: string) {
    const doc = await vscode.workspace.openTextDocument({
      content,
      language: language || "python",
    });
    await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }

  private _getHtmlForTests(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 10px;
      margin: 0;
    }
    .target-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, #333);
      padding: 8px;
      border-radius: 3px;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .row {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .btn-sec {
      background: var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.1));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    }
    .btn-sec:hover { background: var(--vscode-button-secondaryHoverBackground, rgba(255, 255, 255, 0.15)); }
    .item {
      margin-bottom: 12px;
      border: 1px solid var(--vscode-widget-border, #333);
      border-radius: 3px;
      padding: 8px;
      background: var(--vscode-editor-background);
    }
    .file {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 6px;
      color: var(--vscode-textLink-foreground);
    }
    .test-code {
      margin: 0 0 8px 0;
      padding: 6px;
      background: var(--vscode-textCodeBlock-background, #1e1e1e);
      border-radius: 2px;
      font-size: 11px;
      line-height: 1.4;
      max-height: none;
      min-height: 200px;
      height: calc(100vh - 180px);
      overflow: auto;
      white-space: pre;
    }
    .target-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      opacity: 0.7;
    }
    .refresh-link {
      cursor: pointer;
      font-size: 11px;
      color: var(--vscode-textLink-foreground);
    }
    .refresh-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="target-card">
    <div class="target-header">
      <span>Target File / Code:</span>
      <span id="refreshBtn" class="refresh-link" title="Re-detect open editor file">🔄 Refresh</span>
    </div>
    <div id="targetFilename" style="font-weight:bold; color:var(--vscode-textLink-foreground); word-break:break-all;">Detecting active file...</div>
  </div>

  <div class="row">
    <button id="generateBtn" style="flex:1;">Generate Tests</button>
    <button id="chooseFileBtn" class="btn-sec">Choose File...</button>
  </div>

  <div id="status" class="status"></div>
  <div id="results"></div>

  <script>
    const vscode = acquireVsCodeApi();

    let currentFile = { filename: '', language: 'python', code: '' };

    // Request active file immediately on webview load
    vscode.postMessage({ type: 'getActiveFile' });

    document.getElementById('refreshBtn').onclick = () => {
      document.getElementById('targetFilename').textContent = 'Detecting active file...';
      vscode.postMessage({ type: 'getActiveFile' });
    };

    document.getElementById('generateBtn').onclick = () => {
      document.getElementById('status').textContent = 'Generating tests...';
      document.getElementById('results').innerHTML = '';
      vscode.postMessage({
        type: 'generateTests',
        code: currentFile.code,
        language: currentFile.language
      });
    };

    document.getElementById('chooseFileBtn').onclick = () => {
      vscode.postMessage({ type: 'chooseFile' });
    };

    window.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'activeFile') {
        currentFile = { filename: msg.filename, language: msg.language, code: msg.code };
        if (msg.hasFile) {
          const suffix = msg.isSelection ? ' - selection' : '';
          document.getElementById('targetFilename').textContent = msg.filename + (msg.language ? ' (' + msg.language + suffix + ')' : '');
        } else {
          document.getElementById('targetFilename').textContent = 'No active file open in editor';
        }
      } else if (msg.type === 'testLoading') {
        document.getElementById('status').textContent = 'Generating tests...';
      } else if (msg.type === 'testError') {
        document.getElementById('status').textContent = 'Error: ' + msg.error;
      } else if (msg.type === 'testResults') {
        document.getElementById('status').textContent = '';
        render(msg.test_code, msg.framework, msg.language);
      }
    };

    function escapeHtml(t) {
      return (t || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function render(testCode, framework, language) {
      const container = document.getElementById('results');
      if (!testCode) return;
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = \`
        <div class="file">Generated \${escapeHtml(framework || '')} Tests</div>
        <pre class="test-code"><code>\${escapeHtml(testCode)}</code></pre>
        <div class="row" style="margin-bottom:0; margin-top:6px;">
          <button class="copy-btn" style="flex:1;">Copy Tests</button>
          <button class="open-btn btn-sec" style="flex:1;">Open in New Tab</button>
        </div>
      \`;
      div.querySelector('.copy-btn').onclick = () => {
        vscode.postMessage({ type: 'copyText', text: testCode });
      };
      div.querySelector('.open-btn').onclick = () => {
        vscode.postMessage({ type: 'openInNewTab', text: testCode, language });
      };
      container.appendChild(div);
    }
  </script>
</body>
</html>`;
  }
}

/**
 * Register both sidebar providers and commands.
 */
export function registerSidePanel(
  context: vscode.ExtensionContext,
  backendUrl: string
): { searchProvider: CodeSearchProvider; testsProvider: GenerateTestsProvider } {
  const searchProvider = new CodeSearchProvider(context.extensionUri, backendUrl);
  const testsProvider = new GenerateTestsProvider(context.extensionUri, backendUrl);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CodeSearchProvider.viewType,
      searchProvider
    )
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GenerateTestsProvider.viewType,
      testsProvider
    )
  );

  const searchCommand = vscode.commands.registerCommand(
    "codeAssistant.codeSearch",
    async () => {
      const editor = vscode.window.activeTextEditor;
      let initialQuery = "";
      if (editor && !editor.selection.isEmpty) {
        initialQuery = editor.document.getText(editor.selection).trim();
      }

      await vscode.commands.executeCommand(
        `${CodeSearchProvider.viewType}.focus`
      );

      if (initialQuery) {
        searchProvider.focusWithQuery(initialQuery);
      }
    }
  );

  context.subscriptions.push(searchCommand);

  return { searchProvider, testsProvider };
}
