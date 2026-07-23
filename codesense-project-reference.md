# DevMind — Project Reference Document

This file is the single source of truth for the project. Feed this to Antigravity
(or any AI coding agent) alongside the build prompt so it has full context on
what's being built, why, and how every piece fits together.

---

## 1. Project Identity

- **Product name:** DevMind
- **Tagline:** A code intelligence assistant that explains, protects, and tests your code as you write it.
- **Based on:** Project 8 — "Code Intelligence Assistant for Developers" (AI/ML Final Year Placement Edition brief, Parul University × TelcoLearn)
- **Domain:** Developer Tools / LLM Engineering
- **Placement target:** ML Engineer roles at dev tools companies (JetBrains, GitHub, GitLab, Sourcegraph), AI-assisted development teams

---

## 2. One-Line Problem → Solution

**Problem:** Developers waste time context-switching to search docs, catch bugs late, and manually write repetitive unit tests.

**Solution:** DevMind is a VS Code extension that gives developers instant code search, inline bug detection, hover explanations, and auto-generated unit tests — all powered by one backend API combining classical ML, a fine-tuned transformer, and an LLM.

---

## 3. Team & Ownership

| Role                    | Person             | Owns                                                                                             |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| Team Lead / Integration | Dhairya Khatri (D) | FastAPI app assembly, VS Code extension, Docker, CI/CD, deployment                               |
| Student A               | —                 | Code search: CodeBERT embeddings + FAISS index                                                   |
| Student B               | —                 | Bug detection: AST feature extraction + XGBoost classifier                                       |
| Student C               | —                 | Explanation + test generation: fine-tuned CodeT5+ (summarization) + Gemini API (test generation) |

**Principle:** each teammate builds an isolated, independently testable module.
Nobody needs to understand anyone else's code. D integrates everything.

---

## 4. Architecture Overview

```
VS Code Extension (TypeScript)
        │  HTTP calls
        ▼
   Single FastAPI Backend (Python)
        │
   ┌────┼─────────┬──────────┐
   ▼    ▼         ▼          ▼
Search  Bugs   Explain    Tests
(A)     (B)    (C - CodeT5+) (C - Gemini API)
```

- One deployed backend, one base URL
- Each feature is a separate route group (`/search`, `/detect-bugs`, `/explain`, `/generate-tests`)
- Extension calls these routes to power hover text, diagnostics squiggles, and a command palette action

---

## 5. Repository Structure

```
DevMind/
├── backend/
│   ├── app/
│   │   ├── main.py                 # mounts all routers
│   │   ├── api/
│   │   │   ├── search.py           # Student A's route
│   │   │   ├── bugs.py             # Student B's route
│   │   │   ├── explain.py          # Student C's route (explain + generate-tests)
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── code_search.py      # FAISS + CodeBERT logic
│   │   │   ├── bug_detector.py     # AST + XGBoost logic
│   │   │   ├── llm_service.py      # fine-tuned CodeT5+ + Gemini calls
│   │   │   └── auth.py             # JWT
│   │   └── models/schemas.py       # shared Pydantic request/response contracts
│   ├── tests/test_endpoints.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── mlflow/ (or dvc.yaml)
│
├── notebooks/
│   ├── A_code-search.ipynb
│   ├── B_bug-detector.ipynb
│   └── C_finetune-codet5.ipynb
│
├── extension/
│   ├── src/
│   │   ├── extension.ts
│   │   ├── hoverProvider.ts
│   │   ├── diagnostics.ts
│   │   └── commands.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .vscodeignore
│
├── web-ide-companion/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── BugsPanel.jsx
│   │   │   ├── ExplainPanel.jsx
│   │   │   └── TestsPanel.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── .github/workflows/ci.yml
├── docs/
│   ├── system-design.md
│   └── api-contracts.md
└── README.md
```

---

## 6. Tech Stack

| Layer                    | Technology                                         |
| ------------------------ | -------------------------------------------------- |
| Backend framework        | FastAPI (Python), Pydantic validation              |
| Search                   | CodeBERT embeddings + FAISS                        |
| Bug detection            | Python`ast` module + XGBoost                     |
| Explanation              | Fine-tuned CodeT5+ (220M)                          |
| Test generation          | Gemini 1.5 Flash API                               |
| Experiment tracking      | MLflow (or DVC)                                    |
| Extension                | TypeScript, VS Code Extension API                  |
| Containerization         | Docker                                             |
| CI/CD                    | GitHub Actions                                     |
| Hosting                  | Railway (backend), HuggingFace Hub (model weights) |
| Database (audit logging) | PostgreSQL (Railway addon)                         |

---

## 7. API Contracts (summary — full detail in `docs/api-contracts.md`)

| Endpoint            | Method | Input                                | Output                                                               |
| ------------------- | ------ | ------------------------------------ | -------------------------------------------------------------------- |
| `/search`         | POST   | `{ "query": str }`                 | `{ "results": [{ "snippet": str, "file": str, "score": float }] }` |
| `/detect-bugs`    | POST   | `{ "code": str, "language": str }` | `{ "issues": [{ "line": int, "severity": str, "message": str }] }` |
| `/explain`        | POST   | `{ "code": str }`                  | `{ "explanation": str }`                                           |
| `/generate-tests` | POST   | `{ "code": str }`                  | `{ "tests": str }`                                                 |

All endpoints validated via Pydantic. All mock functions during development return
data matching these exact shapes so real logic can be swapped in without touching
the API layer or the extension.

---

## 8. Development Approach: Mock-First

1. Build the entire backend + extension with mock functions returning realistic
   fake data matching the contracts above — system is fully runnable/demoable
   from day one.
2. Each teammate independently builds their real logic in a notebook.
3. Swap mock → real one module at a time; re-run `pytest` after each swap to
   confirm the contract held.
4. System is never fully broken during integration — mock and real coexist
   per-module during the transition.

---

## 9. ML/LLM Component Details

- **Student A (Search):** Extract CodeBERT embeddings from CodeSearchNet snippets, index with FAISS, retrieve top-5 nearest neighbors for a natural language query. Evaluate with MRR@5 / NDCG@10.
- **Student B (Bugs):** Parse Python code into ASTs, extract structural features, train XGBoost as a binary buggy/clean classifier using GitHub bug-fix commit data.
- **Student C (Explain + Tests):**
  - Fine-tune `Salesforce/codet5p-220m` on CodeSearchNet (code → docstring pairs) for summarization/explanation. Evaluate with BLEU-4 and CodeBLEU on a held-out test subset. Track experiment in MLflow.
  - Use Gemini 1.5 Flash API for test generation (not fine-tuned — kept as an LLM call since fine-tuning for test generation is out of scope for team skill level; documented as a deliberate architecture decision).

---

## 10. Deployment

- **Backend:** Dockerized, deployed to Railway (free tier). Model weights (CodeT5+) hosted on HuggingFace Hub, downloaded at container startup rather than baked into the image.
- **CI/CD:** GitHub Actions runs `pytest` on every push; deployment to Railway only triggers if tests pass (test-then-deploy gate, not just auto-deploy on push).
- **Extension:** Packaged as a `.vsix` via `vsce package` for direct install — not published to the public Marketplace (not required for academic submission). `BACKEND_URL` defaults to the live Railway URL, configurable via VS Code settings.

---

## 11. Evaluation Deliverables Checklist (per program requirements)

- [ ] Deployed production application (Docker + CI/CD on GitHub Actions)
- [ ] MLflow/DVC experiment tracking dashboard
- [ ] 2-page system design document (architecture, API contracts, DB schema, scalability)
- [ ] 6-page IEEE-format technical report with ablation study and error analysis
- [ ] GitHub repo with clean commits, README, environment file, unit tests
- [ ] 3-minute startup-style pitch video (problem, solution, demo, impact metrics)

---

## 12. Timeline (8 Weeks)

| Week | Milestone                                                                               |
| ---- | --------------------------------------------------------------------------------------- |
| 1    | Backend + extension skeleton with mock data, fully runnable                             |
| 2    | A/B/C start building real logic independently in notebooks                              |
| 3–4 | A: search index built · B: bug model trained · C: CodeT5+ fine-tuning + Gemini wiring |
| 5    | Swap mock → real, one module at a time, re-test after each                             |
| 6    | Full end-to-end integration testing                                                     |
| 7    | Docker + Railway deployment, GitHub Actions CI/CD live                                  |
| 8    | Polish, demo video, IEEE report, final submission                                       |

---

## 13. Constraints for Any AI Agent Working on This Repo

- Do not require paid API keys for the system to run out of the box — mock mode must always work
- Keep mock function outputs identical in shape to real outputs — this is the contract everything else depends on
- Prefer plain, readable code — this repo will be maintained by teammates with limited ML/backend experience
- Verify each phase actually builds/runs before moving to the next — do not skip verification
