from __future__ import annotations

import chess

PIECE_VALUES: dict[int, float] = {
    chess.PAWN: 1.0,
    chess.KNIGHT: 3.2,
    chess.BISHOP: 3.3,
    chess.ROOK: 5.0,
    chess.QUEEN: 9.0,
    chess.KING: 0.0,
}

CENTER_SQUARES = {
    chess.D4,
    chess.E4,
    chess.D5,
    chess.E5,
    chess.C3,
    chess.D3,
    chess.E3,
    chess.F3,
    chess.C4,
    chess.F4,
    chess.C5,
    chess.F5,
    chess.C6,
    chess.D6,
    chess.E6,
    chess.F6,
}


def material_balance(board: chess.Board, color: chess.Color) -> float:
    """Return material balance from `color` perspective."""
    score = 0.0
    for piece in board.piece_map().values():
        value = PIECE_VALUES[piece.piece_type]
        score += value if piece.color == color else -value
    return score


def evaluate_board(board: chess.Board, color: chess.Color) -> float:
    """Evaluate a board from one side's perspective without external engines."""
    if board.is_checkmate():
        return -100.0 if board.turn == color else 100.0
    if board.is_stalemate() or board.is_insufficient_material():
        return 0.0

    material = material_balance(board, color)
    mobility = _legal_move_count(board, color) - _legal_move_count(board, not color)
    king_pressure = _king_pressure(board, not color) - _king_pressure(board, color)
    return material + 0.025 * mobility + 0.03 * king_pressure


def score_move(board: chess.Board, move: chess.Move) -> float:
    """Score a legal move using reward shaping."""
    if move not in board.legal_moves:
        raise ValueError(f"Move {move.uci()} is not legal")

    color = board.turn
    before = evaluate_board(board, color)
    immediate = baseline_score_move(board, move)

    board.push(move)
    try:
        if board.is_checkmate():
            return 100.0
        if board.is_stalemate() or board.is_insufficient_material():
            return immediate - 0.5
        after = evaluate_board(board, color)
    finally:
        board.pop()

    return (after - before) + immediate


def baseline_score_move(board: chess.Board, move: chess.Move) -> float:
    """Simpler tactical baseline used for comparison with the learned model."""
    if move not in board.legal_moves:
        raise ValueError(f"Move {move.uci()} is not legal")

    moving_piece = board.piece_at(move.from_square)
    target_piece = board.piece_at(move.to_square)
    score = 0.0

    if board.is_capture(move):
        captured_value = _captured_value(board, move, target_piece)
        moving_value = PIECE_VALUES[moving_piece.piece_type] if moving_piece else 1.0
        score += captured_value - 0.08 * moving_value

    if board.gives_check(move):
        score += 0.35

    if move.promotion:
        score += PIECE_VALUES[move.promotion]

    if board.is_castling(move):
        score += 0.35

    if move.to_square in CENTER_SQUARES:
        score += 0.08

    if _develops_minor_piece(board, move, moving_piece):
        score += 0.12

    board.push(move)
    try:
        if board.is_checkmate():
            score += 50.0
    finally:
        board.pop()

    return score


def _captured_value(
    board: chess.Board, move: chess.Move, target_piece: chess.Piece | None
) -> float:
    if target_piece is not None:
        return PIECE_VALUES[target_piece.piece_type]
    if board.is_en_passant(move):
        return PIECE_VALUES[chess.PAWN]
    return 0.0


def _develops_minor_piece(
    board: chess.Board, move: chess.Move, moving_piece: chess.Piece | None
) -> bool:
    if moving_piece is None or moving_piece.piece_type not in {chess.KNIGHT, chess.BISHOP}:
        return False
    home_rank = 0 if moving_piece.color == chess.WHITE else 7
    return chess.square_rank(move.from_square) == home_rank and move.to_square in CENTER_SQUARES


def _legal_move_count(board: chess.Board, color: chess.Color) -> int:
    probe = board.copy(stack=False)
    probe.turn = color
    try:
        return len(list(probe.legal_moves))
    except ValueError:
        return 0


def _king_pressure(board: chess.Board, color: chess.Color) -> int:
    king_square = board.king(color)
    if king_square is None:
        return 0
    opponent = not color
    return sum(1 for square in chess.SquareSet(chess.BB_KING_ATTACKS[king_square]) if board.is_attacked_by(opponent, square))

