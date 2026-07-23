# DevMind — Student B Onboarding: Bug Detection Module

**Your goal:** build a function that takes a piece of code and flags lines
that look "buggy" based on its structure.

---

## 1. What You're Actually Building (read this first)

We're not reading the code's exact text/wording. Instead, we look at its
**structure** — how nested it is, how many branches (if/else) it has, how
many function calls, etc. — using something called an AST (Abstract Syntax
Tree). Then we train a simple, well-known model (XGBoost) to learn: "these
structural patterns tend to show up in buggy code."

You will train a real model, but it's a fast, simple one — not a deep neural
network. This step is very learnable even with zero ML background.

---

## 2. Environment Setup

```bash
pip install xgboost scikit-learn pandas numpy fastapi uvicorn
```

Everything else (`ast` module for parsing code structure) is built into
Python already — no install needed.

Recommended: use Google Colab or Kaggle Notebooks so you don't need to worry
about local setup at all.

---

## 3. Step 1 — Get a Small Bug-Fix Dataset

Given our timeline, we'll use a simplified approach: a small labeled dataset
of buggy vs clean Python functions. Use this dataset (small, beginner
friendly):

```python
from datasets import load_dataset

# A dataset with buggy/fixed code pairs
dataset = load_dataset("google/code_x_glue_cc_defect_detection")
train_data = dataset["train"].select(range(1500))  # small slice for speed

print(train_data[0])
```

You should see a dictionary with a `func` field (the code) and a `target`
field (1 = buggy, 0 = clean).

**Checkpoint:** if this prints correctly, move on. If the dataset name errors
out, search "defect detection dataset" on huggingface.co/datasets — pick any
similar labeled buggy/clean code dataset and adjust field names accordingly.

---

## 4. Step 2 — Understand ASTs (5-minute concept check)

An AST turns code like this:
```python
if x > 5:
    return True
```
into a tree structure describing "this is an If statement, containing a
Compare operation, containing a Return statement" — capturing the *shape* of
the logic, not the exact variable names.

Try it yourself first, just to see it:
```python
import ast

code = "if x > 5:\n    return True"
tree = ast.parse(code)
print(ast.dump(tree))
```

You'll see a nested structure — that's what we're extracting features from.

---

## 5. Step 3 — Extract Features from Code

We turn each function into a row of numbers describing its structure:

```python
import ast

def extract_features(code_string: str):
    """Converts a code string into a dictionary of structural features."""
    try:
        tree = ast.parse(code_string)
    except SyntaxError:
        # If code doesn't even parse, treat it as maximally risky
        return {
            "num_lines": len(code_string.split("\n")),
            "num_if": 0, "num_for": 0, "num_while": 0,
            "num_try": 0, "num_calls": 0, "max_depth": 0,
            "num_functions": 0
        }

    features = {
        "num_lines": len(code_string.split("\n")),
        "num_if": 0,
        "num_for": 0,
        "num_while": 0,
        "num_try": 0,
        "num_calls": 0,
        "num_functions": 0,
        "max_depth": 0
    }

    def walk(node, depth=0):
        features["max_depth"] = max(features["max_depth"], depth)
        if isinstance(node, ast.If):
            features["num_if"] += 1
        elif isinstance(node, ast.For):
            features["num_for"] += 1
        elif isinstance(node, ast.While):
            features["num_while"] += 1
        elif isinstance(node, ast.Try):
            features["num_try"] += 1
        elif isinstance(node, ast.Call):
            features["num_calls"] += 1
        elif isinstance(node, ast.FunctionDef):
            features["num_functions"] += 1
        for child in ast.iter_child_nodes(node):
            walk(child, depth + 1)

    walk(tree)
    return features
```

Test it:
```python
sample = "def f(x):\n    if x > 5:\n        for i in range(x):\n            print(i)\n    return x"
print(extract_features(sample))
```

**Checkpoint:** you should see a dictionary with numbers like
`{"num_lines": 5, "num_if": 1, "num_for": 1, ...}`.

---

## 6. Step 4 — Build Your Training Table

```python
import pandas as pd

rows = []
for example in train_data:
    feats = extract_features(example["func"])
    feats["label"] = example["target"]  # 1 = buggy, 0 = clean
    rows.append(feats)

df = pd.DataFrame(rows)
print(df.head())
print(df["label"].value_counts())  # check class balance
```

**Checkpoint:** you should have a table where each row is one function's
features + a label column.

---

## 7. Step 5 — Train XGBoost

```python
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import precision_score, recall_score, f1_score

X = df.drop(columns=["label"])
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = XGBClassifier(n_estimators=100, max_depth=4, eval_metric="logloss")
model.fit(X_train, y_train)

predictions = model.predict(X_test)
print("Precision:", precision_score(y_test, predictions))
print("Recall:", recall_score(y_test, predictions))
print("F1:", f1_score(y_test, predictions))
```

**Checkpoint:** any reasonable score (even 0.6–0.7) is fine for a first pass —
this isn't meant to be state-of-the-art, just working and demoable.

Save your model:
```python
model.save_model("bug_detector.json")
```

---

## 8. Step 6 — Write the Prediction Function

Since XGBoost gives one score per whole function (not per line), we'll keep
this simple: flag the whole function as risky if the model predicts "buggy,"
and point to line 1 as a placeholder — this is a reasonable, honest
simplification given the timeline (mention this as a known limitation in your
report).

```python
def detect_bugs(code_string: str):
    feats = extract_features(code_string)
    feats_df = pd.DataFrame([feats])
    prediction = model.predict(feats_df)[0]
    probability = model.predict_proba(feats_df)[0][1]  # confidence it's buggy

    issues = []
    if prediction == 1:
        severity = "high" if probability > 0.75 else "medium"
        issues.append({
            "line": 1,
            "severity": severity,
            "message": f"This function shows structural patterns similar to known buggy code (confidence: {probability:.2f})"
        })
    return issues
```

---

## 9. Step 7 — Wrap It in the API Contract

Create `bugs.py` with exactly this structure:

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class BugRequest(BaseModel):
    code: str
    language: str = "python"

@router.post("/")
def bugs_endpoint(req: BugRequest):
    issues = detect_bugs(req.code)
    return {"issues": issues}
```

**This exact response shape matters:**
```json
{
  "issues": [
    { "line": 1, "severity": "high", "message": "..." }
  ]
}
```

---

## 10. What to Hand Off to D

- Your `bugs.py` router file
- Your `bug_detector.py` service file with `extract_features()` and `detect_bugs()`
- Your saved `bug_detector.json` model file
- Your precision/recall/F1 scores from Step 7

---

## 11. Troubleshooting

- **Dataset won't load / wrong field names** → print `train_data[0]` first,
  adjust `example["func"]` / `example["target"]` to match whatever field
  names the actual dataset uses
- **Model predicts everything as one class** → check `df["label"].value_counts()`
  — if wildly imbalanced (e.g., 95% clean), that's expected for bug detection;
  don't panic, just report it honestly
- **Low scores (0.5-0.6)** → totally fine for a first version, mention as
  "future work: more features, larger dataset" in your report
- **Stuck for 30+ minutes** → ping D early, don't struggle silently
