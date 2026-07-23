# DevMind — Student D Documentation: Integration & Deployment Module

This doc mirrors the format of the A/B/C onboarding docs for consistency in
the project's documentation set. Owner: Dhairya Khatri.

**Role:** Combine A, B, and C's individual modules into one deployed system —
a FastAPI backend, a VS Code extension, and a web IDE companion — with
production-grade deployment and CI/CD.

---

## 1. What This Module Actually Does

While A, B, and C each build one isolated piece of logic (search, bug
detection, explain/tests), none of their work is independently usable by a
developer. This module is the glue: it defines the shared API contracts
upfront, assembles all three modules into one backend, builds the client
(VS Code extension + web companion) that developers actually interact with,
and ships the whole system to a public URL with automated testing and
deployment.

---

## 2. Environment Setup

```bash
# Backend
pip install fastapi uvicorn pydantic python-dotenv

# Extension
npm install -g yo generator-code @vscode/vsce
npm install -g typescript

# Web companion
npm install -g vite
```

Accounts needed: GitHub, Railway, HuggingFace Hub (for hosting C's fine-tuned
model weights).

---

## 3. Step 1 — Define API Contracts (before anyone starts building)

This is the first deliverable, produced in Week 1, before A/B/C write any
real logic — they build against these contracts using mock data.

```python
# schemas.py
from pydantic import BaseModel
from typing import List

class SearchRequest(BaseModel):
    query: str

class SearchResult(BaseModel):
    snippet: str
    file: str
    score: float

class BugRequest(BaseModel):
    code: str
    language: str = "python"

class BugIssue(BaseModel):
    line: int
    severity: str
    message: str

class CodeRequest(BaseModel):
    code: str
```

**Checkpoint:** these four request/response shapes are shared with A, B, and
C on Day 1 — they are the spec everyone builds to.

---

## 4. Step 2 — Build the Backend Skeleton with Mock Data

Before any real ML logic exists, build a fully working backend using fake
data matching the contracts above, so the team is never blocked waiting on
each other.

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import search, bugs, explain, health

app = FastAPI(title="DevMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(search.router, prefix="/search", tags=["Search"])
app.include_router(bugs.router, prefix="/detect-bugs", tags=["Bugs"])
app.include_router(explain.router, prefix="/explain", tags=["Explain"])
```

**Checkpoint:** run `uvicorn app.main:app --reload`, confirm `/docs` shows all
four route groups responding with mock data matching the contracts.

---

## 5. Step 3 — Swap Mock → Real, One Module at a Time

As each teammate hands off their `service.py` file, replace the mock function
body with their real implementation — keeping the exact same function
signature and return shape.

```
Order: C's explain logic → B's bug detector → A's search
(easiest-to-verify-working first, based on team's actual completion pace)
```

After each swap: re-run the existing test suite. If it passes, the contract
held and nothing else in the system needs to change.

**Checkpoint:** after every swap, hit the live `/docs` page manually and
confirm real output looks sane before moving to the extension.

---

## 6. Step 4 — Build the VS Code Extension

```bash
yo code   # choose "New Extension (TypeScript)"
```

Three features, three VS Code API hooks:

```typescript
// hoverProvider.ts — calls /explain
vscode.languages.registerHoverProvider('python', {
  provideHover(document, position) {
    const word = document.getText(document.getWordRangeAtPosition(position));
    // fetch(`${BACKEND_URL}/explain`, {...}) → return new vscode.Hover(text)
  }
});

// diagnostics.ts — calls /detect-bugs
const diagnostics = vscode.languages.createDiagnosticCollection("devmind");
// on save: fetch bugs, map to vscode.Diagnostic[], diagnostics.set(uri, issues)

// commands.ts — calls /generate-tests
vscode.commands.registerCommand('devmind.generateTests', async () => {
  // fetch(`${BACKEND_URL}/explain/generate-tests`, {...}) → open in new editor tab
});
```

**Checkpoint:** press F5, confirm hover/diagnostics/command all work against
the locally running backend before moving to deployment.

---

## 7. Step 5 — Build the Web IDE Companion

Vite + React app with Monaco Editor, calling the same four backend endpoints
as the extension — see `web-ide-companion/` folder structure. No new backend
routes required; this is purely a second client.

**Checkpoint:** `npm run dev`, confirm all four actions (search, bugs,
explain, tests) return and render correctly against the mock or real backend.

---

## 8. Step 6 — Containerize with Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Model weights (C's fine-tuned CodeT5+) are hosted on HuggingFace Hub and
downloaded at container startup — not baked into the image, to keep builds
fast and within free-tier storage limits.

**Checkpoint:** `docker build` and `docker run` locally, confirm the
containerized backend responds identically to the non-Dockerized version.

---

## 9. Step 7 — Set Up GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD
on: [push]
jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/
      - name: Deploy to Railway
        if: success()
        run: railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Checkpoint:** push a small change, confirm the Actions tab shows tests
running, and deployment only triggers if tests pass.

---

## 10. Step 8 — Deploy and Package

- Connect Railway to the GitHub repo, confirm the live URL responds at `/health`
- Update `BACKEND_URL` default in the extension's `package.json` settings to
  the live Railway URL
- Package: `vsce package` → produces one `devmind-x.x.x.vsix` file
- Test the packaged `.vsix` on a clean install before submission

**Checkpoint:** install the `.vsix` fresh, confirm it hits the live backend
(not localhost) with no local setup required.

---

## 11. What I Hand Off / Own for Final Submission

- Fully deployed backend on Railway (live URL)
- Working `.vsix` extension file
- Working web IDE companion (deployed to Vercel/Netlify, or run instructions)
- `docs/api-contracts.md` and `docs/system-design.md`
- CI/CD pipeline visible in GitHub Actions tab
- Dockerfile and MLflow/experiment logs (compiled from A/B/C's individual runs)

---

## 12. Troubleshooting Notes (for the record)

- **CORS errors from extension/web app** → confirm `CORSMiddleware` is added
  before routers are mounted in `main.py`
- **Railway container fails to start** → check logs for missing environment
  variables (`GEMINI_API_KEY`, `HF_MODEL_REPO`)
- **Extension works locally but not when packaged** → almost always a
  hardcoded `localhost` URL that wasn't switched to the production default
  before running `vsce package`
- **Free-tier cold start delay during live demo** → hit `/health` a minute
  before demoing to warm up the container
