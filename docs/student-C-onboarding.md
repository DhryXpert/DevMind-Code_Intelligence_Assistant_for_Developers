# DevMind — Student C Onboarding: Explain + Test Generation Module

**Your goal:** two features —
1. Fine-tune a small AI model to explain code in plain English
2. Use Google's Gemini API to generate unit tests for code

---

## 1. What You're Actually Building (read this first)

**Part 1 — Explanation:** We take a pretrained model called CodeT5+ (already
knows a lot about code in general) and train it a little more on our own
data, so it gets better specifically at writing plain-English summaries of
code. This extra training step is called "fine-tuning."

**Part 2 — Test Generation:** Instead of training anything, we just send code
to Google's Gemini API (a large, already very powerful AI model) and ask it
to write a test for that code. No training needed for this part — just
prompting.

---

## 2. Environment Setup

**Strongly recommended: use Google Colab with a free GPU** (Runtime → Change
runtime type → GPU). Fine-tuning is much slower/harder on CPU-only.

```bash
pip install torch transformers datasets accelerate sacrebleu google-generativeai
pip install codebleu
```

---

## 3. PART 1: Fine-Tuning CodeT5+ for Explanation

### Step 1 — Load a Small Slice of Data

```python
from datasets import load_dataset

dataset = load_dataset("code-search-net/code_search_net", "python")

# Small slice — 800 train examples, 100 test examples (keeps training fast)
train_data = dataset["train"].select(range(800))
test_data = dataset["test"].select(range(100))

print(train_data[0]["func_code_string"])
print(train_data[0]["func_documentation_string"])
```

**Checkpoint:** you should see a function's code, and below it, a short
description (docstring) of what it does. That description is what we're
training the model to generate.

---

### Step 2 — Load the Pretrained Model

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_name = "Salesforce/codet5p-220m"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
```

This downloads a ~850MB model the first time — it may take a few minutes.

**Checkpoint:** no errors means the model loaded correctly.

---

### Step 3 — Prepare Data for Training

The model needs input (code) and target (docstring) turned into numbers
(tokens) it can process:

```python
def preprocess(example):
    inputs = tokenizer(
        example["func_code_string"],
        max_length=256,
        truncation=True,
        padding="max_length"
    )
    targets = tokenizer(
        example["func_documentation_string"],
        max_length=64,
        truncation=True,
        padding="max_length"
    )
    inputs["labels"] = targets["input_ids"]
    return inputs

train_tokenized = train_data.map(preprocess, remove_columns=train_data.column_names)
test_tokenized = test_data.map(preprocess, remove_columns=test_data.column_names)
```

**Checkpoint:** this may take a minute or two to run — that's normal. If it
crashes with a memory error, reduce `max_length` to 128.

---

### Step 4 — Fine-Tune the Model

```python
from transformers import Seq2SeqTrainer, Seq2SeqTrainingArguments

training_args = Seq2SeqTrainingArguments(
    output_dir="./codet5-finetuned",
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    num_train_epochs=2,          # kept low on purpose — small dataset, limited time
    logging_steps=50,
    save_strategy="epoch",
    evaluation_strategy="epoch",
    fp16=True,                   # faster training on GPU
)

trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=train_tokenized,
    eval_dataset=test_tokenized,
)

trainer.train()
```

**This will take anywhere from 20 minutes to a couple hours depending on your
GPU** — start this early, don't leave it for the last day. Let it run in the
background while you work on Part 2 below.

**Checkpoint:** training loss should generally go down over time in the
printed logs. It doesn't need to reach zero — some improvement is enough.

Save your fine-tuned model:
```python
model.save_pretrained("./codet5-finetuned-final")
tokenizer.save_pretrained("./codet5-finetuned-final")
```

---

### Step 5 — Evaluate with BLEU-4 and CodeBLEU

```python
import sacrebleu
from codebleu import calc_codebleu

def generate_explanation(code_string: str):
    inputs = tokenizer(code_string, return_tensors="pt", truncation=True, max_length=256)
    outputs = model.generate(**inputs, max_length=64)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

predictions = [generate_explanation(ex["func_code_string"]) for ex in test_data]
references = [ex["func_documentation_string"] for ex in test_data]

# BLEU-4 score
bleu = sacrebleu.corpus_bleu(predictions, [references])
print("BLEU-4:", bleu.score)

# CodeBLEU score
result = calc_codebleu(references, predictions, lang="python")
print("CodeBLEU:", result)
```

**Checkpoint:** write down these numbers — you'll report them in the final
documentation. Any non-zero, reasonable score is a valid result; this is
about demonstrating the technique, not beating a benchmark.

---

## 4. PART 2: Test Generation with Gemini API (much simpler, no training)

### Step 1 — Get a Free Gemini API Key

Go to https://aistudio.google.com/apikey and generate a free API key.

### Step 2 — Install and Configure

```python
import google.generativeai as genai

genai.configure(api_key="YOUR_API_KEY_HERE")  # never commit this key to GitHub
gemini_model = genai.GenerativeModel("gemini-1.5-flash")
```

### Step 3 — Write the Test Generation Function

```python
def generate_tests(code_string: str):
    prompt = f"""Write a complete pytest unit test for the following Python function.
Only return the test code, no explanation.

```python
{code_string}
```
"""
    response = gemini_model.generate_content(prompt)
    return response.text
```

Test it:
```python
sample = "def add(a, b):\n    return a + b"
print(generate_tests(sample))
```

**Checkpoint:** you should get back working-looking pytest code.

---

## 5. Wrap Both Features in the API Contract

Create `explain.py` with exactly this structure:

```python
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class CodeRequest(BaseModel):
    code: str

@router.post("/")
def explain_endpoint(req: CodeRequest):
    explanation = generate_explanation(req.code)
    return {"explanation": explanation}

@router.post("/generate-tests")
def tests_endpoint(req: CodeRequest):
    tests = generate_tests(req.code)
    return {"tests": tests}
```

**These exact response shapes matter:**
```json
{ "explanation": "..." }
{ "tests": "..." }
```

---

## 6. What to Hand Off to D

- Your `explain.py` router file
- Your `llm_service.py` service file with `generate_explanation()` and `generate_tests()`
- Your saved fine-tuned model folder (`codet5-finetuned-final/`)
- Your BLEU-4 and CodeBLEU scores
- **Do NOT commit your Gemini API key to GitHub** — give it to D separately so it
  can be stored securely as an environment variable on Railway

---

## 7. Troubleshooting

- **"CUDA out of memory" during training** → reduce `per_device_train_batch_size`
  to 2, or reduce `max_length` in Step 3
- **Training seems to hang** → check you enabled GPU in Colab (Runtime → Change
  runtime type)
- **CodeBLEU install fails** → try `pip install codebleu --no-deps` then
  manually install its listed dependencies, or skip CodeBLEU and report BLEU-4
  only if truly stuck — mention it as a limitation
- **Gemini API returns an error** → double check your API key is active and
  you haven't hit the free tier rate limit (wait a minute and retry)
- **Stuck for 30+ minutes on any step** → ping D, don't struggle silently —
  this is the hardest module, it's expected to need more back-and-forth
