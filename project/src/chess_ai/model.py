from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import chess
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, average_precision_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split

from .data import MoveExample, group_examples_by_position
from .features import FEATURE_VECTOR_LENGTH, encode_position_move
from .heuristics import baseline_score_move


@dataclass(frozen=True)
class MoveCandidate:
    move: chess.Move
    san: str
    probability: float
    baseline_score: float


@dataclass(frozen=True)
class MovePrediction:
    best_move: chess.Move | None
    candidates: list[MoveCandidate]
    legal_move_count: int


@dataclass
class MoveRanker:
    classifier: Any
    metadata: dict[str, Any]

    def predict_probability(self, board: chess.Board, move: chess.Move) -> float:
        vector = encode_position_move(board, move).reshape(1, -1)
        probabilities = self.classifier.predict_proba(vector)[0]
        class_to_index = {int(label): index for index, label in enumerate(self.classifier.classes_)}
        if 1 not in class_to_index:
            return 0.0
        return float(probabilities[class_to_index[1]])

    def choose_best_move(self, board: chess.Board, top_k: int = 5) -> MovePrediction:
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            return MovePrediction(best_move=None, candidates=[], legal_move_count=0)

        candidates = [
            MoveCandidate(
                move=move,
                san=board.san(move),
                probability=self.predict_probability(board, move),
                baseline_score=baseline_score_move(board, move),
            )
            for move in legal_moves
        ]
        candidates.sort(key=lambda candidate: (candidate.probability, candidate.baseline_score), reverse=True)
        limited = candidates[: max(1, min(top_k, len(candidates)))]
        return MovePrediction(
            best_move=limited[0].move,
            candidates=limited,
            legal_move_count=len(legal_moves),
        )


def train_ranker(
    examples: list[MoveExample],
    random_state: int = 42,
    validation_fraction: float = 0.25,
    n_estimators: int = 60,
    max_depth: int | None = 9,
) -> tuple[MoveRanker, dict[str, float]]:
    if not examples:
        raise ValueError("at least one training example is required")

    train_examples, validation_examples = split_examples_by_position(
        examples,
        validation_fraction=validation_fraction,
        random_state=random_state,
    )
    x_train, y_train = examples_to_arrays(train_examples)

    classifier = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        class_weight="balanced_subsample",
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=-1,
    )
    classifier.fit(x_train, y_train)

    ranker = MoveRanker(
        classifier=classifier,
        metadata={
            "feature_vector_length": FEATURE_VECTOR_LENGTH,
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "training_examples": len(train_examples),
            "validation_examples": len(validation_examples),
            "n_estimators": n_estimators,
            "max_depth": max_depth,
        },
    )
    metrics = evaluate_ranker(ranker, validation_examples)
    ranker.metadata["metrics"] = metrics
    return ranker, metrics


def split_examples_by_position(
    examples: list[MoveExample],
    validation_fraction: float,
    random_state: int,
) -> tuple[list[MoveExample], list[MoveExample]]:
    grouped = group_examples_by_position(examples)
    position_ids = sorted(grouped)
    if len(position_ids) < 2:
        return examples, examples

    train_ids, validation_ids = train_test_split(
        position_ids,
        test_size=validation_fraction,
        random_state=random_state,
        shuffle=True,
    )
    train_set = set(train_ids)
    validation_set = set(validation_ids)
    train_examples = [example for example in examples if example.position_id in train_set]
    validation_examples = [example for example in examples if example.position_id in validation_set]
    return train_examples, validation_examples


def examples_to_arrays(examples: Iterable[MoveExample]) -> tuple[np.ndarray, np.ndarray]:
    vectors: list[np.ndarray] = []
    labels: list[int] = []
    for example in examples:
        board = chess.Board(example.fen)
        move = chess.Move.from_uci(example.move_uci)
        vectors.append(encode_position_move(board, move))
        labels.append(example.label)
    return np.vstack(vectors).astype(np.float32), np.asarray(labels, dtype=np.int64)


def evaluate_ranker(ranker: MoveRanker, examples: list[MoveExample]) -> dict[str, float]:
    if not examples:
        return {
            "accuracy": 0.0,
            "f1": 0.0,
            "roc_auc": 0.0,
            "average_precision": 0.0,
            "model_top1_good_rate": 0.0,
            "baseline_top1_good_rate": 0.0,
        }

    x_val, y_val = examples_to_arrays(examples)
    probabilities = _positive_probabilities(ranker.classifier, x_val)
    predictions = (probabilities >= 0.5).astype(np.int64)
    metrics = {
        "accuracy": float(accuracy_score(y_val, predictions)),
        "f1": float(f1_score(y_val, predictions, zero_division=0)),
        "roc_auc": _safe_roc_auc(y_val, probabilities),
        "average_precision": _safe_average_precision(y_val, probabilities),
        "model_top1_good_rate": top1_good_rate(ranker, examples, use_model=True),
        "baseline_top1_good_rate": top1_good_rate(ranker, examples, use_model=False),
    }
    return metrics


def top1_good_rate(ranker: MoveRanker, examples: list[MoveExample], use_model: bool) -> float:
    grouped = group_examples_by_position(examples)
    hits = 0
    total = 0
    for position_examples in grouped.values():
        board = chess.Board(position_examples[0].fen)
        if use_model:
            scored = [
                (example, ranker.predict_probability(board, chess.Move.from_uci(example.move_uci)))
                for example in position_examples
            ]
        else:
            scored = [
                (example, baseline_score_move(board, chess.Move.from_uci(example.move_uci)))
                for example in position_examples
            ]
        best_example = max(scored, key=lambda item: item[1])[0]
        hits += int(best_example.label == 1)
        total += 1
    return hits / total if total else 0.0


def save_ranker(ranker: MoveRanker, path: str | Path) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(ranker, output)


def load_ranker(path: str | Path) -> MoveRanker:
    ranker = joblib.load(path)
    if not isinstance(ranker, MoveRanker):
        raise TypeError(f"Artifact at {path} is not a MoveRanker")
    return ranker


def write_metrics(metrics: dict[str, float], path: str | Path) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as file:
        json.dump(metrics, file, indent=2, sort_keys=True)


def _positive_probabilities(classifier: Any, features: np.ndarray) -> np.ndarray:
    probabilities = classifier.predict_proba(features)
    class_to_index = {int(label): index for index, label in enumerate(classifier.classes_)}
    if 1 not in class_to_index:
        return np.zeros(features.shape[0], dtype=np.float32)
    return probabilities[:, class_to_index[1]]


def _safe_roc_auc(labels: np.ndarray, probabilities: np.ndarray) -> float:
    if len(set(labels.tolist())) < 2:
        return 0.0
    return float(roc_auc_score(labels, probabilities))


def _safe_average_precision(labels: np.ndarray, probabilities: np.ndarray) -> float:
    if len(set(labels.tolist())) < 2:
        return 0.0
    return float(average_precision_score(labels, probabilities))

