from __future__ import annotations

import json
import math
import random
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import chess

from .heuristics import score_move


@dataclass(frozen=True)
class MoveExample:
    position_id: str
    fen: str
    move_uci: str
    label: int
    reward: float
    san: str

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def generate_labeled_examples(
    num_games: int,
    max_plies: int,
    seed: int = 42,
    positive_fraction: float = 0.2,
    exploration_rate: float = 0.25,
) -> list[MoveExample]:
    """Generate RL-like self-play examples without external chess datasets."""
    if num_games <= 0:
        raise ValueError("num_games must be positive")
    if max_plies <= 0:
        raise ValueError("max_plies must be positive")
    if not 0 < positive_fraction <= 1:
        raise ValueError("positive_fraction must be in (0, 1]")

    rng = random.Random(seed)
    examples: list[MoveExample] = []

    for game_index in range(num_games):
        board = chess.Board()
        for ply in range(max_plies):
            if board.is_game_over(claim_draw=True):
                break

            position_id = f"g{game_index:04d}_p{ply:03d}"
            position_examples = label_position(board, position_id, positive_fraction)
            examples.extend(position_examples)

            selected = select_self_play_move(board, rng, exploration_rate)
            board.push(selected)

    return examples


def label_position(
    board: chess.Board,
    position_id: str,
    positive_fraction: float = 0.2,
) -> list[MoveExample]:
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return []

    scored = [(move, score_move(board, move)) for move in legal_moves]
    positive_count = max(1, math.ceil(len(scored) * positive_fraction))
    positive_moves = {
        move
        for move, _ in sorted(scored, key=lambda item: item[1], reverse=True)[:positive_count]
    }

    examples: list[MoveExample] = []
    fen = board.fen()
    for move, reward in scored:
        examples.append(
            MoveExample(
                position_id=position_id,
                fen=fen,
                move_uci=move.uci(),
                label=1 if move in positive_moves else 0,
                reward=float(reward),
                san=board.san(move),
            )
        )
    return examples


def select_self_play_move(
    board: chess.Board,
    rng: random.Random,
    exploration_rate: float = 0.25,
) -> chess.Move:
    legal_moves = list(board.legal_moves)
    if not legal_moves:
        raise ValueError("cannot select a move in a terminal position")

    if rng.random() < exploration_rate:
        return rng.choice(legal_moves)

    scored = sorted(
        ((move, score_move(board, move)) for move in legal_moves),
        key=lambda item: item[1],
        reverse=True,
    )
    candidate_count = min(3, len(scored))
    top_candidates = scored[:candidate_count]
    weights = [candidate_count - index for index in range(candidate_count)]
    return rng.choices([move for move, _ in top_candidates], weights=weights, k=1)[0]


def group_examples_by_position(
    examples: Iterable[MoveExample],
) -> dict[str, list[MoveExample]]:
    grouped: dict[str, list[MoveExample]] = defaultdict(list)
    for example in examples:
        grouped[example.position_id].append(example)
    return dict(grouped)


def write_examples_jsonl(examples: Iterable[MoveExample], path: str | Path) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as file:
        for example in examples:
            file.write(json.dumps(example.to_dict(), ensure_ascii=False) + "\n")

