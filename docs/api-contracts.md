# API Contracts — DevMind

This document defines the exact JSON request/response shapes for all API
endpoints. When building real service implementations, your code **must**
return data matching these schemas exactly — this ensures zero changes are
needed in the API layer or VS Code extension.

---

## `GET /health`

Health check for monitoring and readiness probes.

**Request:** None (GET with no body)

**Response `200 OK`:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "services": {
    "code_search": "operational",
    "bug_detector": "operational",
    "llm_service": "operational (mock)",
    "auth": "operational (dev-mode)"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | `"healthy"` or `"degraded"` |
| `version` | `string` | Semantic version of the API |
| `services` | `object` | Map of service name → status string |

---

## `POST /search`

Semantic code search — find code snippets matching a query.

**Request:**

```json
{
  "query": "authentication middleware",
  "max_results": 5
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | `string` | ✅ | — | Natural-language or code query |
| `max_results` | `int` | ❌ | `5` | Max results (1–50) |

**Response `200 OK`:**

```json
{
  "query": "authentication middleware",
  "results": [
    {
      "filename": "src/utils/auth.py",
      "snippet": "def verify_token(token: str) -> dict:\n    ...",
      "score": 0.95,
      "language": "python",
      "line_start": 42,
      "line_end": 48
    }
  ],
  "total_results": 5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `query` | `string` | Echo of the original query |
| `results` | `array` | List of `SearchResult` objects |
| `total_results` | `int` | Number of results returned |

**`SearchResult` object:**

| Field | Type | Description |
|-------|------|-------------|
| `filename` | `string` | File path of the matching snippet |
| `snippet` | `string` | The matched code text |
| `score` | `float` | Relevance score, 0.0–1.0 |
| `language` | `string` | Programming language |
| `line_start` | `int` | Starting line number (1-indexed) |
| `line_end` | `int` | Ending line number (1-indexed) |

---

## `POST /detect-bugs`

Static analysis / ML-based bug detection.

**Request:**

```json
{
  "code": "def foo():\n    result = None\n    result.append(1)\n",
  "language": "python",
  "filename": "app.py"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `code` | `string` | ✅ | — | Source code to analyze |
| `language` | `string` | ❌ | auto-detect | Programming language |
| `filename` | `string` | ❌ | `null` | Filename for context |

**Response `200 OK`:**

```json
{
  "bugs": [
    {
      "line": 3,
      "column": 5,
      "severity": "error",
      "message": "Potential null reference: variable 'result' may be None before use",
      "rule_id": "NULL_REF_001",
      "suggestion": "Add a null check before accessing 'result'"
    }
  ],
  "total_bugs": 1,
  "analyzed_lines": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `bugs` | `array` | List of `Bug` objects |
| `total_bugs` | `int` | Number of issues found |
| `analyzed_lines` | `int` | Lines of code analyzed |

**`Bug` object:**

| Field | Type | Description |
|-------|------|-------------|
| `line` | `int` | Line number (1-indexed) |
| `column` | `int` | Column number (1-indexed, default 1) |
| `severity` | `string` | `"error"`, `"warning"`, or `"info"` |
| `message` | `string` | Human-readable issue description |
| `rule_id` | `string` | Identifier for the detection rule |
| `suggestion` | `string\|null` | Optional suggested fix |

---

## `POST /explain`

LLM-powered code explanation.

**Request:**

```json
{
  "code": "def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)",
  "language": "python"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `code` | `string` | ✅ | — | Source code to explain |
| `language` | `string` | ❌ | auto-detect | Programming language |

**Response `200 OK`:**

```json
{
  "explanation": "This Python code defines a recursive function that calculates the factorial of a number...",
  "language_detected": "python"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `explanation` | `string` | Human-readable explanation |
| `language_detected` | `string` | Detected or provided language |

---

## `POST /generate-tests`

LLM-powered unit test generation.

**Request:**

```json
{
  "code": "def add(a, b):\n    return a + b",
  "language": "python",
  "framework": "pytest"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `code` | `string` | ✅ | — | Source code to generate tests for |
| `language` | `string` | ❌ | auto-detect | Programming language |
| `framework` | `string` | ❌ | auto-select | Test framework (e.g. `"pytest"`, `"jest"`) |

**Response `200 OK`:**

```json
{
  "test_code": "import pytest\nfrom mymodule import add\n\ndef test_add_positive():\n    assert add(2, 3) == 5\n...",
  "framework": "pytest",
  "num_tests": 3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `test_code` | `string` | Complete generated test source code |
| `framework` | `string` | Test framework used |
| `num_tests` | `int` | Number of test cases generated |
