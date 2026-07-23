# System Design — DevMind

## Overview

The DevMind is a developer productivity tool that provides
AI-powered code intelligence directly inside VS Code. It consists of two main
components connected via HTTP:

1. **VS Code Extension** (TypeScript) — the user-facing client
2. **FastAPI Backend** (Python) — the intelligence engine

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Editor                        │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ HoverProvider│ │ Diagnostics  │ │ Commands        │ │
│  │ (on hover)   │ │ (on save)    │ │ (Command Palette│ │
│  │              │ │              │ │  + right-click)  │ │
│  └──────┬───────┘ └──────┬───────┘ └────────┬────────┘ │
│         │                │                   │          │
│         └────────────────┼───────────────────┘          │
│                          │                              │
│                   HTTP POST (JSON)                      │
│                          │                              │
└──────────────────────────┼──────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   FastAPI Backend                         │
│                   (Python, port 8000)                     │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                    API Layer                         │ │
│  │  /search  /detect-bugs  /explain  /generate-tests   │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                │
│  ┌──────────────────────┼──────────────────────────────┐ │
│  │                Service Layer (swap point)            │ │
│  │                                                     │ │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │ │
│  │  │ code_search │ │ bug_detector │ │ llm_service  │ │ │
│  │  │  .py        │ │  .py         │ │  .py         │ │ │
│  │  │             │ │              │ │              │ │ │
│  │  │ Currently:  │ │ Currently:   │ │ Currently:   │ │ │
│  │  │ Mock data   │ │ Mock data    │ │ Mock data    │ │ │
│  │  │             │ │              │ │              │ │ │
│  │  │ Future:     │ │ Future:      │ │ Future:      │ │ │
│  │  │ CodeBERT +  │ │ ML model or  │ │ OpenAI /     │ │ │
│  │  │ FAISS       │ │ static       │ │ Anthropic /  │ │ │
│  │  │ vector      │ │ analysis     │ │ local LLM    │ │ │
│  │  │ search      │ │ engine       │ │              │ │ │
│  │  └─────────────┘ └──────────────┘ └──────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Shared: schemas.py (Pydantic) + auth.py            │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Component Details

### VS Code Extension

| Module | Trigger | Backend Endpoint | Output |
|--------|---------|-----------------|--------|
| `hoverProvider.ts` | Mouse hover over a word | `POST /explain` | Markdown tooltip with explanation |
| `diagnostics.ts` | File save (Ctrl+S) | `POST /detect-bugs` | Squiggly underlines + Problems panel |
| `commands.ts` | Command Palette / right-click | `POST /generate-tests` | New editor tab with test code |

**Configuration**: The backend URL is configurable via VS Code settings
(`codeAssistant.backendUrl`, default `http://localhost:8000`).

### FastAPI Backend

The backend follows a clean **router → service** architecture:

- **API Layer** (`app/api/`): FastAPI routers that handle HTTP concerns
  (request parsing, response serialization, auth). These files should
  **never need to change** when swapping implementations.

- **Service Layer** (`app/services/`): Business logic functions that the
  API layer calls. **This is the swap point** — replace the mock functions
  in these files with real ML/LLM calls. Each service file is independent.

- **Schema Layer** (`app/models/schemas.py`): Pydantic models defining the
  exact request/response contracts. These are shared between the API layer
  and service layer and should **not change** when swapping implementations.

### Data Flow Example (Code Explanation)

```
1. User hovers over a function in VS Code
2. hoverProvider.ts extracts surrounding code (±5 lines)
3. Extension sends POST /explain { code: "...", language: "python" }
4. FastAPI routes to explain.py router
5. Router calls llm_service.explain_code(code, language)
6. Service returns { explanation: "...", language_detected: "python" }
7. Router wraps in ExplainResponse and returns JSON
8. Extension renders explanation as a Markdown hover tooltip
```

## Swapping Mock → Real Implementation

Each service file contains mock functions marked with
`# TODO: replace with real model/API call`. To add real intelligence:

| Service | What to change | Example real implementation |
|---------|---------------|---------------------------|
| `code_search.py` | `search_code()` | Embed query with CodeBERT → search FAISS index |
| `bug_detector.py` | `detect_bugs()` | Run code through fine-tuned defect detection model |
| `llm_service.py` | `explain_code()`, `generate_tests()` | Call OpenAI/Anthropic/Gemini API |

**Rules for swapping:**
1. Keep the same function signatures
2. Return the same Pydantic model types (defined in `schemas.py`)
3. No changes needed in `api/*.py`, `schemas.py`, or the extension code

## Deployment

### Development
```bash
# Backend
cd backend && uvicorn app.main:app --reload

# Extension
cd vscode-extension && npm run compile
# Then F5 in VS Code
```

### Production
```bash
# Build and run Docker container
docker build -t code-assistant-backend ./backend
docker run -p 8000:8000 code-assistant-backend
```

### CI/CD
GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:
- Python: `pytest` for backend tests
- TypeScript: `tsc` compile check for extension

## Security Considerations

- **Auth**: Currently a passthrough (`auth.py`). For production, implement
  real API key / JWT validation.
- **CORS**: Currently allows all origins (`*`). For production, restrict to
  the VS Code extension's origin.
- **Input validation**: Pydantic models enforce type checking on all inputs.
  Add size limits for the `code` field in production to prevent abuse.
