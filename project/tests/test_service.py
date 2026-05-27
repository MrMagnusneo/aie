import chess
from fastapi import HTTPException

from src.chess_ai.data import generate_labeled_examples
from src.chess_ai.model import train_ranker
from src import service


def _install_test_ranker():
    examples = generate_labeled_examples(num_games=1, max_plies=4, seed=31)
    ranker, _ = train_ranker(examples, random_state=31, n_estimators=6, max_depth=3)
    service.set_ranker_for_testing(ranker)


def test_health_endpoint_reports_model_status():
    _install_test_ranker()

    payload = service.health()

    assert payload["status"] == "ok"
    assert payload["model_loaded"] is True
    assert any(route.path == "/health" for route in service.app.routes)


def test_predict_endpoint_returns_only_legal_moves():
    _install_test_ranker()
    fen = chess.STARTING_FEN

    payload = service.predict(service.PredictRequest(fen=fen, top_k=4))

    board = chess.Board(fen)
    returned_moves = [candidate["move_uci"] for candidate in payload["candidates"]]
    assert payload["best_move_uci"] in returned_moves
    assert len(returned_moves) == 4
    assert all(chess.Move.from_uci(move) in board.legal_moves for move in returned_moves)
    assert any(route.path == "/predict" for route in service.app.routes)


def test_predict_endpoint_rejects_invalid_fen():
    _install_test_ranker()

    try:
        service.predict(service.PredictRequest(fen="not a fen"))
    except HTTPException as exc:
        assert exc.status_code == 400
        assert "invalid fen" in str(exc.detail).lower()
    else:
        raise AssertionError("invalid FEN should raise HTTPException")
