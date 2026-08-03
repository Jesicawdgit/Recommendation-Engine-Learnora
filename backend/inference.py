import json
import os
from typing import List, Dict, Any

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# Resolve absolute paths based on backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "learnora_finetuned_stv2")
METADATA_PATH = os.path.join(BASE_DIR, "learnora_data", "learnora_metadata_final.json")
FAISS_INDEX_PATH = os.path.join(BASE_DIR, "learnora_data", "learnora_faiss_final.index")


_model: SentenceTransformer | None = None
_index: faiss.Index | None = None
_dataset: list[dict[str, Any]] | None = None


def _load_model() -> SentenceTransformer:
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise ValueError(f"Model path not found: {MODEL_PATH}. Please ensure the model is in the correct location.")
        _model = SentenceTransformer(MODEL_PATH)
    return _model


def _load_index() -> faiss.Index:
    global _index
    if _index is None:
        if not os.path.exists(FAISS_INDEX_PATH):
            raise ValueError(f"FAISS index not found: {FAISS_INDEX_PATH}. Please ensure the index file exists.")
        _index = faiss.read_index(FAISS_INDEX_PATH)
    return _index


def _load_dataset() -> list[dict[str, Any]]:
    global _dataset
    if _dataset is None:
        if not os.path.exists(METADATA_PATH):
            raise ValueError(f"Metadata file not found: {METADATA_PATH}. Please ensure the metadata file exists.")
        with open(METADATA_PATH, "r", encoding="utf-8") as f:
            _dataset = json.load(f)
    return _dataset


def semantic_search(query: str, top_k: int = 10) -> List[Dict[str, Any]]:
    model = _load_model()
    index = _load_index()
    data = _load_dataset()

    query_embedding = model.encode(query).astype("float32").reshape(1, -1)
    distances, indices = index.search(query_embedding, top_k)

    results: List[Dict[str, Any]] = []
    for idx, distance in zip(indices[0], distances[0]):
        if idx < 0 or idx >= len(data):
            continue
        item = dict(data[idx])
        # Convert distance to similarity score (1 / (1 + distance))
        # Higher score = more similar
        similarity = 1.0 / (1.0 + float(distance))
        item["similarity_score"] = similarity
        results.append(item)
    return results


