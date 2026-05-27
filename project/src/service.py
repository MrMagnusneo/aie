from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import chess
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .chess_ai.data import generate_labeled_examples
from .chess_ai.model import MoveRanker, load_ranker, save_ranker, train_ranker

logger = logging.getLogger(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

MODEL_PATH = Path(os.getenv("MODEL_PATH", "artifacts/chess_move_ranker.joblib"))
_ranker: MoveRanker | None = None

app = FastAPI(
    title="Chess Legal Move Classifier",
    description="Ranks legal chess moves with a model trained from self-play reward labels.",
    version="1.0.0",
)


class PredictRequest(BaseModel):
    fen: str = Field(default=chess.STARTING_FEN, description="Chess position in FEN notation.")
    top_k: int = Field(default=5, ge=1, le=50, description="Number of ranked legal moves to return.")


@app.get("/health")
def health() -> dict[str, Any]:
    ranker = get_ranker()
    return {
        "status": "ok",
        "model_loaded": ranker is not None,
        "model_path": str(MODEL_PATH),
        "artifact_exists": MODEL_PATH.exists(),
        "metadata": ranker.metadata if ranker is not None else None,
    }


@app.post("/predict")
def predict(request: PredictRequest) -> dict[str, Any]:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {exc}") from exc

    ranker = get_ranker()
    prediction = ranker.choose_best_move(board, top_k=request.top_k)
    if prediction.best_move is None:
        return {
            "status": "no_legal_moves",
            "fen": board.fen(),
            "legal_move_count": 0,
            "best_move_uci": None,
            "best_move_san": None,
            "candidates": [],
        }

    return {
        "status": "ok",
        "fen": board.fen(),
        "legal_move_count": prediction.legal_move_count,
        "best_move_uci": prediction.best_move.uci(),
        "best_move_san": board.san(prediction.best_move),
        "candidates": [
            {
                "move_uci": candidate.move.uci(),
                "move_san": candidate.san,
                "probability": round(candidate.probability, 6),
                "baseline_score": round(candidate.baseline_score, 6),
            }
            for candidate in prediction.candidates
        ],
    }


def get_ranker() -> MoveRanker:
    global _ranker
    if _ranker is not None:
        return _ranker

    if MODEL_PATH.exists():
        logger.info("Loading model from %s", MODEL_PATH)
        _ranker = load_ranker(MODEL_PATH)
        return _ranker

    logger.warning("Model artifact %s not found; training a small bootstrap model", MODEL_PATH)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    examples = generate_labeled_examples(num_games=4, max_plies=6, seed=2026)
    _ranker, _ = train_ranker(examples, random_state=2026, n_estimators=12, max_depth=5)
    save_ranker(_ranker, MODEL_PATH)
    return _ranker


def set_ranker_for_testing(ranker: MoveRanker | None) -> None:
    global _ranker
    _ranker = ranker


if __name__ == "__main__":
    uvicorn.run("src.service:app", host="0.0.0.0", port=8000, reload=False)
