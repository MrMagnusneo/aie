from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

import chess
import chess.svg
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, FileResponse, Response
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
    top_k: int = Field(default=5, ge=1, le=250, description="Number of ranked legal moves to return.")


class MoveRequest(BaseModel):
    fen: str = Field(..., description="Current chess position in FEN notation.")
    move_uci: str = Field(..., description="Move to make in UCI notation (e.g. e2e4).")


@app.get("/", response_class=HTMLResponse)
def read_root() -> HTMLResponse:
    static_index = Path(__file__).parent / "static" / "index.html"
    if static_index.exists():
        return HTMLResponse(content=static_index.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Chess Web GUI static files not found!</h1>", status_code=404)


@app.get("/static/{file_path:path}")
def read_static(file_path: str) -> FileResponse:
    static_file = Path(__file__).parent / "static" / file_path
    if static_file.exists():
        return FileResponse(static_file)
    raise HTTPException(status_code=404, detail="File not found")


@app.get("/board_svg")
def board_svg(
    fen: str = Query(default=chess.STARTING_FEN, description="Position in FEN notation."),
    last_move: str | None = Query(default=None, description="Last move in UCI (e.g. e2e4) to highlight."),
    best_move: str | None = Query(default=None, description="Best move in UCI to show as arrow."),
    size: int = Query(default=400, ge=100, le=800, description="Board image size in pixels."),
) -> Response:
    """Render current board position as SVG using python-chess."""
    try:
        board = chess.Board(fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {exc}") from exc

    lastmove = None
    if last_move:
        try:
            lastmove = chess.Move.from_uci(last_move)
        except Exception:
            pass

    arrows = []
    if best_move:
        try:
            mv = chess.Move.from_uci(best_move)
            arrows = [chess.svg.Arrow(mv.from_square, mv.to_square, color="#000000cc")]
        except Exception:
            pass

    check_square = None
    if board.is_check():
        check_square = board.king(board.turn)

    custom_colors = {
        "square light": "#ffffff",
        "square dark": "#e0e0e0",
        "square light lastmove": "#dcdcdc",
        "square dark lastmove": "#b8b8b8",
        "margin": "#ffffff",
        "inner border": "#111111",
        "outer border": "#111111",
        "coord": "#333333",
    }

    svg_content = chess.svg.board(
        board,
        lastmove=lastmove,
        check=check_square,
        arrows=arrows,
        size=size,
        coordinates=True,
        colors=custom_colors,
    )
    return Response(content=svg_content, media_type="image/svg+xml")



@app.post("/make_move")
def make_move(request: MoveRequest) -> dict[str, Any]:
    try:
        board = chess.Board(request.fen)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid FEN: {exc}") from exc

    # Parse and validate move
    try:
        # chess.Move.from_uci might fail or need validation
        move = chess.Move.from_uci(request.move_uci)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid UCI move format: {exc}") from exc

    if move not in board.legal_moves:
        # Check if it's a promotion move (missing promotion character in request_uci)
        # e.g., e7e8 instead of e7e8q. Automatically promote to Queen.
        promo_move = chess.Move.from_uci(f"{request.move_uci}q")
        if promo_move in board.legal_moves:
            move = promo_move
        else:
            raise HTTPException(status_code=400, detail=f"Move {request.move_uci} is illegal in this position.")

    board.push(move)
    return {
        "status": "ok",
        "fen": board.fen(),
        "is_game_over": board.is_game_over(),
        "result": board.result() if board.is_game_over() else None,
        "legal_move_count": board.legal_moves.count(),
    }


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
