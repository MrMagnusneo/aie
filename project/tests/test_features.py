import chess
import numpy as np

from src.chess_ai.features import FEATURE_VECTOR_LENGTH, encode_position_move


def test_encode_position_move_has_stable_numeric_shape():
    board = chess.Board()
    move = chess.Move.from_uci("e2e4")

    features = encode_position_move(board, move)

    assert isinstance(features, np.ndarray)
    assert features.shape == (FEATURE_VECTOR_LENGTH,)
    assert features.dtype == np.float32
    assert np.isfinite(features).all()


def test_all_legal_moves_encode_to_same_shape():
    board = chess.Board("rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2")

    encoded = [encode_position_move(board, move) for move in board.legal_moves]

    assert encoded
    assert {vector.shape for vector in encoded} == {(FEATURE_VECTOR_LENGTH,)}


def test_illegal_candidate_move_is_rejected():
    board = chess.Board()
    illegal = chess.Move.from_uci("e2e5")

    try:
        encode_position_move(board, illegal)
    except ValueError as exc:
        assert "legal" in str(exc).lower()
    else:
        raise AssertionError("illegal move should raise ValueError")

