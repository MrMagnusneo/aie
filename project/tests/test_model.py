import chess

from src.chess_ai.data import generate_labeled_examples
from src.chess_ai.model import MoveRanker, train_ranker


def test_train_ranker_returns_metrics_and_predicts_legal_move():
    examples = generate_labeled_examples(num_games=2, max_plies=5, seed=19)

    ranker, metrics = train_ranker(examples, random_state=19, n_estimators=8, max_depth=4)
    board = chess.Board()
    prediction = ranker.choose_best_move(board, top_k=3)

    assert isinstance(ranker, MoveRanker)
    assert 0.0 <= metrics["model_top1_good_rate"] <= 1.0
    assert 0.0 <= metrics["baseline_top1_good_rate"] <= 1.0
    assert prediction.best_move in board.legal_moves
    assert len(prediction.candidates) == 3
    assert all(0.0 <= candidate.probability <= 1.0 for candidate in prediction.candidates)


def test_ranker_handles_terminal_position_without_legal_moves():
    examples = generate_labeled_examples(num_games=1, max_plies=4, seed=23)
    ranker, _ = train_ranker(examples, random_state=23, n_estimators=6, max_depth=3)
    board = chess.Board("7k/5Q2/7K/8/8/8/8/8 b - - 0 1")

    prediction = ranker.choose_best_move(board, top_k=5)

    assert prediction.best_move is None
    assert prediction.candidates == []

