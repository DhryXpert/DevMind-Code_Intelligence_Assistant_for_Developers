<p align="center">
  <img src="logo.png" width="128" height="128" alt="DevMind Logo" />
</p>

# DevMind — VS Code Extension

**DevMind** brings AI-powered code search, unit test generation, code explanation, and bug detection directly into your VS Code workspace.

---

## ⚡ Features Overview

### 1. 🔍 Semantic Code Search (Sidebar)
- Accessible via the **DevMind** icon in the Activity Bar or **`Ctrl+Alt+S`** (`Cmd+Alt+S` on macOS).
- Powered by Student A's hybrid search engine (**SentenceTransformers + FAISS + BM25**).
- Natural language querying with sample query chips and 1-click **Copy to Clipboard**.

### 2. 🧪 Unit Test Generation (Sidebar & Command Palette)
- Native dropdown in the DevMind sidebar that dynamically detects the active file/selection in the editor.
- Generates **`pytest`** test suites for Python and **`Jest`** test suites for JavaScript/TypeScript.
- Interactive viewer with **Copy Tests** and **Open in New Tab** actions.

### 3. 🧠 Code Explanation on Hover
- **Hover** over any function, class, or keyword in `.py` or `.js` files to view explanations inline.

### 4. 🐛 Real-Time Bug Detection on Save
- **Save** any `.py` or `.js` file to trigger AST diagnostics and defect analysis.
- Visual feedback via editor squiggly underlines and entries in the VS Code **Problems panel**.

---

## 🛠️ Prerequisites

- **Node.js** ≥ 18.0
- **VS Code** ≥ 1.80.0
- **DevMind Backend** running locally on `http://localhost:8000` (see `../backend/README.md`)

---

## 🚀 Setup & Launching

```bash
# 1. Navigate to extension directory
cd extension

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run compile
```

### Launch in Development Mode:
1. Open the `extension/` directory in VS Code.
2. Press **`F5`** (or click **Run → Start Debugging**).
3. In the new **[Extension Development Host]** window:
   - Click the **DevMind** Activity Bar icon (left sidebar).
   - Expand `∨ Code Search` to test natural language search.
   - Open a `.py` file and expand `∨ Generate Tests` to generate test cases.
   - Hover over code to test explanations.
   - Save a file to test diagnostics.

---

## ⚙️ Configuration Settings

Configure DevMind behavior via **Settings** (`Ctrl+,` / `Cmd+,` → search for `Code Assistant`):

| Setting | Default | Description |
|---|---|---|
| `codeAssistant.backendUrl` | `http://localhost:8000` | URL of the running DevMind backend microservice. |
| `codeAssistant.enableHover` | `true` | Enable/disable code explanations on hover. |
| `codeAssistant.enableDiagnostics` | `true` | Enable/disable automatic bug detection on save. |

---

## 📂 Extension Architecture

```
extension/
├── src/
│   ├── extension.ts       ← Main entry point: wires sidebar, hovers, diagnostics, commands
│   ├── side_panel.ts      ← WebviewViewProviders for Code Search and Generate Tests
│   ├── hoverProvider.ts   ← Hover provider calling POST /explain
│   ├── diagnostics.ts     ← On-save diagnostics calling POST /detect-bugs
│   └── commands.ts        ← Command palette & context menu actions
├── out/                   ← Compiled JavaScript bundle (tsc)
├── package.json           ← VS Code manifest: contributes views, commands, menus
├── tsconfig.json          ← TypeScript compiler configuration
└── README.md              ← Extension documentation
```

---

## 🔧 Troubleshooting

| Issue | Resolution |
|---|---|
| **Sidebar shows "Could not connect to backend"** | Ensure the backend server is running (`uvicorn app.main:app --reload` on port 8000). |
| **Active file not showing in Generate Tests** | Ensure an editor tab is open and active, or click the **`🔄 Refresh`** button. |
| **No hover explanations appearing** | Check that `codeAssistant.enableHover` is enabled in settings and hover over a token in a supported language (`.py`, `.js`, `.ts`). |
| **No squiggly underlines on save** | Verify that `codeAssistant.enableDiagnostics` is `true` in VS Code settings. |
