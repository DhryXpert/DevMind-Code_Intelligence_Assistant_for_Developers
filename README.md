# DevMind — Code Intelligence Assistant

**An AI-powered developer assistant for VS Code featuring Hybrid Semantic Code Search, Bug Detection, Code Explanation, and Automated Unit Test Generation.**

---

## Project Overview

**DevMind** is a developer productivity platform that integrates machine learning models directly into VS Code. It consists of a high-performance **FastAPI backend** (orchestrating ML models, FAISS vector search, and LLM services) and a **native VS Code extension** (providing side panel views, hover tooltips, and real-time diagnostics).

---

## Team & Milestone Status

| Team Member | Module & Responsibilities | Tech Stack | Status | Evaluation Metrics |
|---|---|---|:---:|:---:|
| **Dhairya (Lead)** | System Architecture, VS Code Extension, CI/CD Pipeline | TypeScript, VS Code API, FastAPI | **Completed** | Clean Build, 18/18 Tests Passing |
| **Student A** | Hybrid Semantic Code Search Engine | SentenceTransformers, FAISS, BM25, RRF | **Completed** | **MRR@5: 0.9000**<br>**NDCG@10: 0.9262** |
| **Student B** | Bug & Defect Detection | AST Parsing, Static Heuristics, XGBoost | In Progress | API Contract Verified (18/18 Tests) |
| **Student C** | Code Explanation & Test Generation | Fine-tuned CodeT5+, Google Gemini API | In Progress | API Contract Verified (18/18 Tests) |

---

## System Architecture

```
+-------------------------------------------------------------------------+
|                        VS Code IDE (Client Extension)                   |
|                                                                         |
|  +---------------------------+  +------------------+  +--------------+  |
|  |   DevMind Side Panel      |  |  Hover Provider  |  | Diagnostics  |  |
|  |  > Code Search            |  |  (Code Explain)  |  |  (On Save)   |  |
|  |  > Generate Tests         |  +------------------+  +--------------+  |
|  +---------------------------+                                          |
+------------------------------------+------------------------------------+
                                     |
                          HTTP JSON Requests (Port 8000)
                                     |
+------------------------------------v------------------------------------+
|                    DevMind Backend (FastAPI Microservice)               |
|                                                                         |
|  +-------------------------+  +---------------------------------------+ |
|  | API Routing (main.py)   |  | ML Services (app/services/)           | |
|  | - POST /search          |  | - Code Search: DistilRoBERTa + FAISS  | |
|  | - POST /detect-bugs     |  | - Bug Detector: AST + Classifier      | |
|  | - POST /explain         |  | - Explanation: Fine-tuned CodeT5+     | |
|  | - POST /generate-tests  |  | - Test Gen: LLM Service               | |
|  | - GET  /health          |  |                                       | |
|  +-------------------------+  +---------------------------------------+ |
+-------------------------------------------------------------------------+
```

---

## Core Features

### 1. Hybrid Semantic Code Search
- **Natural Language Querying**: Query code using functional descriptions (e.g. *"authentication middleware"*, *"download file from url"*).
- **Hybrid Dense + Sparse Engine**: Combines dense vector similarity (`st-codesearch-distilroberta-base` + FAISS) with sparse keyword matching (`BM25Okapi`) fused via **Reciprocal Rank Fusion (RRF, $k=60$)**.
- **Side Panel Interface**: Dedicated search accordion dropdown with 1-click clipboard copy.

### 2. Automated Unit Test Generation
- **Context-Aware**: Automatically detects the active file and selection in your editor (`Python` / `pytest`, `JavaScript` / `Jest`).
- **Full-Space Preview**: Interactive output container with **Copy Tests** and **Open in New Tab** actions.

### 3. Code Explanation on Hover
- **Inline Tooltips**: Hover over functions, classes, or code blocks in `.py` or `.js` files to view instant AI-generated explanations.

### 4. On-Save Bug Detection & Diagnostics
- **Real-Time Linting**: Triggers upon saving files to flag potential defects, null references, and code smells via squiggly underlines and the Problems panel.

---

## Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- VS Code 1.80.0+

---

### Step 1: Start the Backend Server

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .env
# Windows:
.\.env\Scripts\activate
# macOS / Linux:
source .env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

> **API Documentation**: Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser for Swagger UI.

---

### Step 2: Run the VS Code Extension

```bash
# Navigate to extension directory
cd extension

# Install dependencies and compile
npm install
npm run compile
```

1. Open the `extension/` folder in VS Code.
2. Press **`F5`** (or select **Run -> Start Debugging**) to launch the **Extension Development Host**.
3. In the new window, click the **DevMind icon** in the left Activity Bar or press **`Ctrl+Alt+S`** (`Cmd+Alt+S` on Mac).

---

## Testing & Quality Assurance

### 1. Backend Endpoint Contract Tests
```bash
cd backend
pytest tests/test_endpoints.py -v
```
**Result**: `18 passed in 14.23s (100% Green)`

### 2. Search Benchmark Evaluation
```bash
python devmind_code_search/eval.py
```
**Results**:
- **MRR@5**: `0.9000`
- **NDCG@10**: `0.9262`

### 3. Extension Compilation Check
```bash
cd extension
npm run compile
```
**Result**: `0 TypeScript Errors`

---

## Repository Structure

```
DevMind/
├── backend/                              ← FastAPI backend microservice (Python)
│   ├── app/
│   │   ├── main.py                       ← Entry point, CORS, and endpoint routing
│   │   ├── api/                          ← API route handlers (/search, /detect-bugs, etc.)
│   │   ├── services/                     ← ML services (code_search.py, bug_detector.py, llm_service.py)
│   │   ├── data/                         ← Pre-indexed FAISS vector store & metadata
│   │   └── models/schemas.py             ← Pydantic request/response schemas
│   ├── tests/test_endpoints.py           ← Pytest API verification suite (18 tests)
│   ├── requirements.txt                  ← Backend Python dependencies
│   ├── Dockerfile                        ← Production container specification
│   └── .dockerignore                     ← Docker build context exclusions
│
├── extension/                            ← VS Code Extension (TypeScript)
│   ├── src/
│   │   ├── extension.ts                  ← Extension lifecycle & registration
│   │   ├── side_panel.ts                 ← Side panel: Code Search & Test Generation
│   │   ├── hoverProvider.ts              ← Hover Code Explanation Provider
│   │   ├── diagnostics.ts                ← On-Save Bug Detection Diagnostics
│   │   └── commands.ts                   ← Command Palette actions
│   ├── package.json                      ← Manifest, views, menus, keybindings
│   ├── tsconfig.json                     ← TypeScript compiler configuration
│   └── README.md                         ← Extension specific documentation
│
├── devmind_code_search/                  ← Code search training & evaluation (Student A)
│   ├── build_index.py                    ← Index generation pipeline
│   ├── eval.py                           ← Evaluation benchmark script
│   └── code_search.py                    ← Core embedding search model
│
├── notebooks/                            ← Experimental Jupyter Notebooks
│   ├── A_code-search.ipynb               ← Student A: Search model exploration
│   ├── B_bug-detector.ipynb              ← Student B: Defect classification model
│   └── C_finetune-codet5.ipynb           ← Student C: CodeT5+ fine-tuning pipeline
│
└── README.md                             ← Master repository documentation
```

---

## API Specification

| Method | Endpoint | Description | Status |
|---|---|---|:---:|
| `GET` | `/health` | Server status and service health check | Production |
| `POST` | `/search` | Natural language hybrid code search | Production (Student A) |
| `POST` | `/detect-bugs` | AST defect classification and lint diagnostics | Contract Verified |
| `POST` | `/explain` | Code snippet semantic explanation | Contract Verified |
| `POST` | `/generate-tests` | Automated unit test generation | Contract Verified |

---

## License

This project is developed by **Team Outliers** under the **MIT License**.
