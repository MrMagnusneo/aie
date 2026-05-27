from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml

from .chess_ai.data import generate_labeled_examples, write_examples_jsonl
from .chess_ai.model import save_ranker, train_ranker, write_metrics


def main() -> None:
    args = parse_args()
    config = load_config(args.config)
    config = apply_overrides(config, args)

    examples = generate_labeled_examples(
        num_games=int(config["num_games"]),
        max_plies=int(config["max_plies"]),
        seed=int(config["seed"]),
        positive_fraction=float(config["positive_fraction"]),
        exploration_rate=float(config["exploration_rate"]),
    )

    if not args.no_save_dataset:
        write_examples_jsonl(examples, config["dataset_output"])

    ranker, metrics = train_ranker(
        examples,
        random_state=int(config["seed"]),
        validation_fraction=float(config["validation_fraction"]),
        n_estimators=int(config["n_estimators"]),
        max_depth=int(config["max_depth"]) if config.get("max_depth") is not None else None,
    )
    save_ranker(ranker, config["model_output"])

    summary = {
        **metrics,
        "examples": float(len(examples)),
        "num_games": float(config["num_games"]),
        "max_plies": float(config["max_plies"]),
    }
    write_metrics(summary, config["metrics_output"])
    print(json.dumps(summary, indent=2, sort_keys=True))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the chess legal move classifier.")
    parser.add_argument("--config", default="configs/train.yaml", help="Path to YAML training config.")
    parser.add_argument("--num-games", type=int, default=None, help="Override generated self-play games.")
    parser.add_argument("--max-plies", type=int, default=None, help="Override maximum plies per game.")
    parser.add_argument("--model-output", default=None, help="Override model artifact path.")
    parser.add_argument("--metrics-output", default=None, help="Override metrics JSON path.")
    parser.add_argument("--dataset-output", default=None, help="Override generated dataset JSONL path.")
    parser.add_argument("--no-save-dataset", action="store_true", help="Skip writing generated examples JSONL.")
    return parser.parse_args()


def load_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open("r", encoding="utf-8") as file:
        loaded = yaml.safe_load(file) or {}
    return dict(loaded)


def apply_overrides(config: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    updated = dict(config)
    for key, value in {
        "num_games": args.num_games,
        "max_plies": args.max_plies,
        "model_output": args.model_output,
        "metrics_output": args.metrics_output,
        "dataset_output": args.dataset_output,
    }.items():
        if value is not None:
            updated[key] = value
    return updated


if __name__ == "__main__":
    main()

