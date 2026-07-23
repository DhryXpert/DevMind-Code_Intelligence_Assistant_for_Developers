# DevMind

AI-powered developer tools providing **code search**, **bug detection**, **code explanation**, and **unit test generation** — all inside VS Code.

Built with a **FastAPI backend** and a **VS Code extension**, using mock data so the entire system is runnable immediately without trained models or API keys.

---

## Quick Start

### 1. Run the Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000**. Open http://localhost:8000/docs for interactive Swagger documentation.

### 2. Run the VS Code Extension

```bash
cd extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

Then:
1. Open the `extension/` folder in VS Code
2. Press **F5** to launch the Extension Development Host
3. Open any `.py` or `.js` file to activate the extension

### 3. Try It Out

| Feature | How to trigger | What happens |
|---------|---------------|--------------|
| 🧠 Code Explanation | **Hover** over any word in a `.py`/`.js` file | Tooltip with AI explanation |
| 🐛 Bug Detection | **Save** any `.py`/`.js` file | Squiggly underlines + Problems panel |
| 🧪 Test Generation | **Ctrl+Shift+P** → "Code Assistant: Generate Tests" | New tab with generated tests |

---

## Project Structure

```
DevMind/
├── backend/                      ← FastAPI backend (Python)
│   ├── app/
│   │   ├── main.py               ← App entry point + CORS + router wiring
│   │   ├── api/                  ← HTTP endpoint routers
│   │   │   ├── search.py         ← POST /search
│   │   │   ├── bugs.py           ← POST /detect-bugs
│   │   │   ├── explain.py        ← POST /explain + POST /generate-tests
│   │   │   └── health.py         ← GET /health
│   │   ├── services/             ← Business logic (★ swap point for real ML)
│   │   │   ├── code_search.py    ← Mock semantic code search
│   │   │   ├── bug_detector.py   ← Mock bug detection
│   │   │   ├── llm_service.py    ← Mock code explanation + test generation
│   │   │   └── auth.py           ← Placeholder authentication
│   │   └── models/
│   │       └── schemas.py        ← Pydantic request/response contracts
│   ├── tests/
│   │   └── test_endpoints.py     ← Endpoint tests (pytest + httpx)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── notebooks/                    ← Jupyter Notebooks for ML model training
│   ├── A_code-search.ipynb       ← Code search embedding & indexing
│   ├── B_bug-detector.ipynb      ← Bug detection model training
│   └── C_finetune-codet5.ipynb   ← CodeT5+ fine-tuning
│
├── extension/                    ← VS Code extension (TypeScript)
│   ├── src/
│   │   ├── extension.ts          ← Entry point: activate() wires features
│   │   ├── hoverProvider.ts      ← Hover → POST /explain
│   │   ├── diagnostics.ts        ← On save → POST /detect-bugs
│   │   └── commands.ts           ← Command → POST /generate-tests
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── .github/workflows/
│   └── ci.yml                    ← GitHub Actions: pytest + tsc
│
├── docs/
│   ├── api-contracts.md          ← Exact JSON schemas for all endpoints
│   └── system-design.md          ← Architecture description
│
└── README.md                     ← This file
```

---

## Running Tests

### Backend Tests
```bash
cd backend
pip install anyio pytest-anyio    # async test support
pytest tests/ -v
```

### Extension Compilation Check
```bash
cd extension
npm run compile
```

---

## Docker

```bash
# Build
docker build -t code-assistant-backend ./backend

# Run
docker run -p 8000:8000 code-assistant-backend
```

---

## Configuration

The extension's backend URL is configurable via VS Code settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `codeAssistant.backendUrl` | `http://localhost:8000` | Backend server URL |
| `codeAssistant.enableHover` | `true` | Enable/disable hover explanations |
| `codeAssistant.enableDiagnostics` | `true` | Enable/disable bug detection |

---

## Next Steps: Replace Mock Functions with Real Logic

The project is designed so that swapping mock → real is a **single-file change per module**. Each mock function in `backend/app/services/` is marked with `# TODO: replace with real model/API call`.

### What to swap

| File | Function(s) | Replace with |
|------|------------|-------------|
| `services/code_search.py` | `search_code()` | CodeBERT embeddings + FAISS/Pinecone vector search |
| `services/bug_detector.py` | `detect_bugs()` | Fine-tuned defect detection model or static analysis |
| `services/llm_service.py` | `explain_code()`, `generate_tests()` | OpenAI / Anthropic / Gemini / local LLM API calls |
| `services/auth.py` | `verify_api_key()` | Real API key or JWT validation |

### Rules for swapping
1. **Keep the same function signatures** — the API routers call these directly
2. **Return the same types** — use the Pydantic models from `schemas.py`
3. **No changes needed** in `api/*.py`, `schemas.py`, or the VS Code extension

See [docs/api-contracts.md](docs/api-contracts.md) for the exact JSON shapes your implementations must match.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/search` | Semantic code search |
| `POST` | `/detect-bugs` | Bug / code smell detection |
| `POST` | `/explain` | Code explanation |
| `POST` | `/generate-tests` | Unit test generation |

Full API docs available at http://localhost:8000/docs when the backend is running.

---

## License

MIT
