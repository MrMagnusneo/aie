from __future__ import annotations

from typing import Final

import chess
import numpy as np

PIECE_TYPES: Final[tuple[int, ...]] = (
    chess.PAWN,
    chess.KNIGHT,
    chess.BISHOP,
    chess.ROOK,
    chess.QUEEN,
    chess.KING,
)
PROMOTION_TYPES: Final[tuple[int | None, ...]] = (
    None,
    chess.KNIGHT,
    chess.BISHOP,
    chess.ROOK,
    chess.QUEEN,
)

BOARD_FEATURES: Final[int] = 64 * 12
STATE_FEATURES: Final[int] = 1 + 4 + 2
MOVE_SQUARE_FEATURES: Final[int] = 64 + 64
PROMOTION_FEATURES: Final[int] = len(PROMOTION_TYPES)
MOVE_FLAG_FEATURES: Final[int] = 4
PIECE_FEATURES: Final[int] = 6 + 6
GEOMETRY_FEATURES: Final[int] = 4

FEATURE_VECTOR_LENGTH: Final[int] = (
    BOARD_FEATURES
    + STATE_FEATURES
    + MOVE_SQUARE_FEATURES
    + PROMOTION_FEATURES
    + MOVE_FLAG_FEATURES
    + PIECE_FEATURES
    + GEOMETRY_FEATURES
)


def encode_position_move(board: chess.Board, move: chess.Move) -> np.ndarray:
    """Encode a legal candidate move in a board context as a dense vector."""
    if move not in board.legal_moves:
        raise ValueError(f"Move {move.uci()} is not legal in the given board position")

    features: list[float] = []
    features.extend(_encode_board(board))
    features.extend(_encode_state(board))
    features.extend(_one_hot(move.from_square, 64))
    features.extend(_one_hot(move.to_square, 64))
    features.extend(_one_hot(PROMOTION_TYPES.index(move.promotion), len(PROMOTION_TYPES)))
    features.extend(
        [
            float(board.is_capture(move)),
            float(board.gives_check(move)),
            float(board.is_castling(move)),
            float(board.is_en_passant(move)),
        ]
    )
    moving_piece = board.piece_at(move.from_square)
    captured_piece = board.piece_at(move.to_square)
    features.extend(_piece_type_one_hot(moving_piece.piece_type if moving_piece else None))
    features.extend(_piece_type_one_hot(captured_piece.piece_type if captured_piece else None))
    features.extend(_encode_geometry(move))

    vector = np.asarray(features, dtype=np.float32)
    if vector.shape != (FEATURE_VECTOR_LENGTH,):
        raise RuntimeError(f"Feature length mismatch: expected {FEATURE_VECTOR_LENGTH}, got {vector.shape}")
    return vector


def _encode_board(board: chess.Board) -> list[float]:
    values = [0.0] * BOARD_FEATURES
    for square, piece in board.piece_map().items():
        color_offset = 0 if piece.color == chess.WHITE else 6
        piece_offset = PIECE_TYPES.index(piece.piece_type)
        values[square * 12 + color_offset + piece_offset] = 1.0
    return values


def _encode_state(board: chess.Board) -> list[float]:
    return [
        1.0 if board.turn == chess.WHITE else -1.0,
        float(board.has_kingside_castling_rights(chess.WHITE)),
        float(board.has_queenside_castling_rights(chess.WHITE)),
        float(board.has_kingside_castling_rights(chess.BLACK)),
        float(board.has_queenside_castling_rights(chess.BLACK)),
        min(board.halfmove_clock, 100) / 100.0,
        min(board.fullmove_number, 100) / 100.0,
    ]


def _encode_geometry(move: chess.Move) -> list[float]:
    from_file = chess.square_file(move.from_square)
    from_rank = chess.square_rank(move.from_square)
    to_file = chess.square_file(move.to_square)
    to_rank = chess.square_rank(move.to_square)
    file_delta = to_file - from_file
    rank_delta = to_rank - from_rank
    return [
        file_delta / 7.0,
        rank_delta / 7.0,
        abs(file_delta) / 7.0,
        abs(rank_delta) / 7.0,
    ]


def _piece_type_one_hot(piece_type: int | None) -> list[float]:
    if piece_type is None:
        return [0.0] * len(PIECE_TYPES)
    return _one_hot(PIECE_TYPES.index(piece_type), len(PIECE_TYPES))


def _one_hot(index: int, length: int) -> list[float]:
    values = [0.0] * length
    values[index] = 1.0
    return values

