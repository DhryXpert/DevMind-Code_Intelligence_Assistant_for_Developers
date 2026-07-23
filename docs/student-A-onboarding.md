# DevMind — Student A Onboarding: Code Search Module

**Your goal:** build a function that takes a plain English query like "sort a
list" and returns the 5 most relevant code snippets from a dataset.

---

## 1. What You're Actually Building (read this first)

Think of it like a smarter Ctrl+F. Instead of matching exact words, we convert
every code snippet into a list of numbers that represents its *meaning*
(called an "embedding"). We do the same for your search query. Then we find
which code snippets have numbers closest to your query's numbers — those are
the most relevant results.

You will NOT be training anything from scratch. You're using an already
pretrained model (CodeBERT) to generate these numbers, and a search library
(FAISS) to find the closest matches fast.

---

## 2. Environment Setup

Install Python 3.10+ if you don't have it, then run:

```bash
pip install torch transformers datasets faiss-cpu numpy fastapi uvicorn
```

If you're on Kaggle or Google Colab (recommended — free GPU, nothing to
install), just run this in a notebook cell instead:

```python
!pip install faiss-cpu
```//torch, transformers, datasets are pre-installed on Colab/Kaggle

---

## 3. Step 1 — Load a Small Slice of the Dataset

We're using CodeSearchNet, but only a small piece of it (a few thousand
examples), not the full 6 million — this keeps things fast given our timeline.

```python
from datasets import load_dataset

# Loads the Python subset of CodeSearchNet
dataset = load_dataset("code-search-net/code_search_net", "python")

# Take a small slice for speed — 2000 training examples is plenty
train_subset = dataset["train"].select(range(2000))

# Look at one example to understand the structure
print(train_subset[0])
```

You should see a dictionary with fields like `func_code_string` (the actual
code) and `func_documentation_string` (a description of what it does).

**Checkpoint:** if this runs and prints an example, you're on track. If you
get an error, check your internet connection — this downloads data.

---

## 4. Step 2 — Load CodeBERT and Generate Embeddings

```python
from transformers import AutoTokenizer, AutoModel
import torch

tokenizer = AutoTokenizer.from_pretrained("microsoft/codebert-base")
model = AutoModel.from_pretrained("microsoft/codebert-base")
model.eval()  # inference mode, not training

def embed_code(code_string: str):
    """Converts a code snippet into a vector (list of numbers)."""
    inputs = tokenizer(
        code_string,
        return_tensors="pt",
        truncation=True,
        max_length=256,
        padding=True
    )
    with torch.no_grad():
        outputs = model(**inputs)
    # Take the average of all token embeddings — a simple, effective approach
    embedding = outputs.last_hidden_state.mean(dim=1).squeeze().numpy()
    return embedding
```

Test it:
```python
test_vector = embed_code("def add(a, b): return a + b")
print(test_vector.shape)  # should print something like (768,)
```

**Checkpoint:** if `test_vector.shape` prints `(768,)`, embedding works
correctly. That number (768) is how many dimensions CodeBERT uses to
represent meaning.

---

## 5. Step 3 — Embed All Your Code Snippets and Build a FAISS Index

```python
import faiss
import numpy as np

# Embed all snippets in our subset (this takes a few minutes)
code_snippets = [ex["func_code_string"] for ex in train_subset]
embeddings = np.array([embed_code(code) for code in code_snippets]).astype("float32")

# Build the FAISS index
dimension = embeddings.shape[1]  # should be 768
index = faiss.IndexFlatL2(dimension)
index.add(embeddings)

print(f"Index built with {index.ntotal} code snippets")
```

**Checkpoint:** `index.ntotal` should equal 2000 (or however many snippets you
used). Save this index so you don't have to rebuild it every time:

```python
faiss.write_index(index, "code_search.index")

# Also save the actual code snippets so you can return them later
import json
with open("code_snippets.json", "w") as f:
    json.dump(code_snippets, f)
```

---

## 6. Step 4 — Write the Search Function

```python
def search_code(query: str, top_k: int = 5):
    """Given a natural language query, return the top_k most relevant snippets."""
    query_vector = embed_code(query).astype("float32").reshape(1, -1)
    distances, indices = index.search(query_vector, top_k)

    results = []
    for rank, idx in enumerate(indices[0]):
        results.append({
            "snippet": code_snippets[idx][:300],  # truncate for readability
            "file": f"snippet_{idx}",
            "score": float(1 / (1 + distances[0][rank]))  # convert distance to a 0-1 score
        })
    return results
```

Test it:
```python
results = search_code("function that adds two numbers")
for r in results:
    print(r["score"], r["snippet"][:80])
```

**Checkpoint:** you should see 5 results, ideally with the top one being
somewhat relevant to "add two numbers."

---

## 7. Step 5 — Wrap It in the API Contract (this is what connects to the team)

Create a file `search.py` with exactly this structure — D will plug this
directly into the shared backend:

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class SearchRequest(BaseModel):
    query: str

@router.post("/")
def search_endpoint(req: SearchRequest):
    results = search_code(req.query)
    return {"results": results}
```

**This exact response shape matters:**
```json
{
  "results": [
    { "snippet": "...", "file": "...", "score": 0.85 }
  ]
}
```
Do not change field names — D's extension/web app expects exactly these keys.

---

## 8. Optional — Evaluate How Good Your Search Is

If you have extra time, measure quality with MRR (Mean Reciprocal Rank):

```python
# For a handful of test queries where you know the "correct" snippet index,
# check what rank it appears at in your results. Lower rank = better.
# This is optional — skip if you're short on time, it's not required to demo.
```

---

## 9. What to Hand Off to D

- Your `search.py` file (the router above)
- Your `code_search.py` service file containing `embed_code()` and `search_code()`
- The saved `code_search.index` and `code_snippets.json` files
- A one-line note: "tested with X example queries, works as expected"

---

## 10. Troubleshooting

- **"CUDA out of memory"** → you're on CPU or a small GPU; reduce `max_length` to 128, or process in smaller batches
- **Download errors on `load_dataset`** → check internet, or try again — HuggingFace servers occasionally throttle
- **Embeddings all look identical / search returns garbage** → double check you're calling `.mean(dim=1)` correctly and not accidentally passing empty strings
- **Stuck for more than 30 minutes on any single step** → ping D, don't silently struggle — better to unblock early
