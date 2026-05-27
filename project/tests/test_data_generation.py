import chess

from src.chess_ai.data import generate_labeled_examples, group_examples_by_position


def test_generated_examples_are_legal_and_grouped():
    examples = generate_labeled_examples(num_games=1, max_plies=4, seed=7)

    assert examples
    for example in examples:
        board = chess.Board(example.fen)
        move = chess.Move.from_uci(example.move_uci)
        assert move in board.legal_moves
        assert example.label in {0, 1}
        assert isinstance(example.reward, float)


def test_each_generated_position_has_positive_example():
    examples = generate_labeled_examples(num_games=1, max_plies=5, seed=11)
    grouped = group_examples_by_position(examples)

    assert grouped
    for position_examples in grouped.values():
        assert any(example.label == 1 for example in position_examples)

