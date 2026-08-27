"""
Code Search Service — Real Implementation (SentenceTransformers + FAISS + BM25)
Owner: Student A
"""

import json
import os
import re
from pathlib import Path
import faiss
import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from app.models.schemas import SearchResult

# Resolve paths dynamically relative to backend/app/
BASE_DIR = Path(__file__).resolve().parent.parent / "data"
INDEX_PATH = BASE_DIR / "code_search.index"
SNIPPETS_PATH = BASE_DIR / "code_snippets.json"
META_PATH = BASE_DIR / "code_snippets_meta.json"

EMBEDDING_MODEL_NAME = "flax-sentence-embeddings/st-codesearch-distilroberta-base"
RRF_K = 60
# Max possible RRF score: both rankings agree on rank 0. Used to scale the
# fused score into SearchResult's 0.0-1.0 range so a perfect match reads as
# confidence ~1.0 instead of capping out around ~0.33.
_MAX_RRF_SCORE = 2.0 / (RRF_K + 1)
_TOKEN_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")

# Global lazy state
_model = None
_index = None
_code_snippets = None
_code_snippets_meta = None
_bm25 = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model


def _tokenize(text: str):
    return _TOKEN_RE.findall(text.lower())


def embed_code(code_string: str) -> np.ndarray:
    """Converts a code snippet or query into an L2-normalized vector."""
    model = _get_model()
    return model.encode(code_string, normalize_embeddings=True)


def load_index():
    """Loads FAISS index, code snippets, metadata, and initializes BM25 into memory."""
    global _index, _code_snippets, _code_snippets_meta, _bm25
    if not INDEX_PATH.exists() or not SNIPPETS_PATH.exists() or not META_PATH.exists():
        raise FileNotFoundError(
            f"Index files not found at {INDEX_PATH} / {SNIPPETS_PATH} / {META_PATH}."
        )
    _index = faiss.read_index(str(INDEX_PATH))
    with open(SNIPPETS_PATH, "r", encoding="utf-8") as f:
        _code_snippets = json.load(f)
    with open(META_PATH, "r", encoding="utf-8") as f:
        _code_snippets_meta = json.load(f)
    _bm25 = BM25Okapi([_tokenize(snippet) for snippet in _code_snippets])


def search_code(query: str, max_results: int = 5) -> list[SearchResult]:
    """
    Search for code snippets matching the given query using Hybrid Search
    (SentenceTransformers + FAISS semantic search fused with BM25 via RRF).
    """
    global _index, _code_snippets, _code_snippets_meta, _bm25
    if _index is None or _code_snippets is None or _code_snippets_meta is None or _bm25 is None:
        load_index()

    n = len(_code_snippets)

    # 1. Semantic Search
    query_vector = embed_code(query).astype("float32").reshape(1, -1)
    _, semantic_order = _index.search(query_vector, n)
    semantic_rank = {int(idx): rank for rank, idx in enumerate(semantic_order[0])}

    # 2. Lexical / Keyword Search (BM25)
    bm25_scores = _bm25.get_scores(_tokenize(query))
    bm25_order = np.argsort(bm25_scores)[::-1]
    bm25_rank = {int(idx): rank for rank, idx in enumerate(bm25_order)}

    # 3. Reciprocal Rank Fusion (RRF)
    fused = [
        (
            idx,
            1.0 / (RRF_K + semantic_rank[idx] + 1)
            + 1.0 / (RRF_K + bm25_rank[idx] + 1),
        )
        for idx in range(n)
    ]
    fused.sort(key=lambda pair: pair[1], reverse=True)

    results = []
    for idx, score in fused[:max_results]:
        snippet_text = _code_snippets[idx]
        meta = _code_snippets_meta[idx]
        results.append(
            SearchResult(
                filename=meta["filename"],
                snippet=snippet_text[:500],
                score=float(min(1.0, score / _MAX_RRF_SCORE)),  # scale RRF score to 0.0-1.0 confidence
                language=meta["language"],
                line_start=meta["line_start"],
                line_end=meta["line_end"],
            )
        )
    return results
