# Chess Legal Move Classifier Design

## Goal

Build an AI engineering course project that ranks only legal chess moves. The input is a board position and a candidate legal move; the output is the probability that the move is good. The final service receives a FEN position, enumerates legal moves with `python-chess`, scores each move with a trained model, and returns the best move.

## Learning Approach

The project uses the first approved approach: self-play data generation with heuristic reward shaping. It does not depend on an external chess dataset. Instead, `python-chess` generates games, legal candidate moves are scored by a domain reward function, and the model learns the classification task:

`board position + legal move -> good move probability`

This is RL-like rather than full reinforcement learning: the system generates its own experience from chess states and reward labels, but trains a supervised classifier on the generated transitions. This is intentionally chosen because it is stable, reproducible, fast enough for a student project, and easy to explain during defense.

## Architecture

- `src/chess_ai/features.py` encodes a board and candidate move into a numeric vector.
- `src/chess_ai/heuristics.py` computes reward-shaped move scores without external engines.
- `src/chess_ai/data.py` generates self-play positions and labeled legal-move examples.
- `src/chess_ai/model.py` trains, evaluates, saves, loads, and applies the classifier.
- `src/train.py` is the CLI training entry point.
- `src/service.py` exposes FastAPI endpoints `/health` and `/predict`.
- `configs/train.yaml` stores reproducible training parameters.
- `Dockerfile` builds a runnable service image and trains a demo model during image build.

## Data Flow

1. Start from the normal chess initial position.
2. Generate short self-play games with exploration.
3. For each visited board, enumerate all legal moves.
4. Score each legal move using material, check, mate, capture, promotion, castling, mobility, center control, and development signals.
5. Mark the top-scoring moves in each position as positive examples.
6. Train a classifier on encoded `(board, move)` feature vectors.
7. At inference time, enumerate legal moves for the requested FEN and rank them by predicted probability.

## Model And Baseline

The baseline is a simple heuristic ranker that uses only immediate tactical signals such as capture value, checks, promotions, and castling. The improved model is a scikit-learn classifier trained on richer board and move features generated through self-play. The report compares both by classification metrics and by top-1 legal move quality on validation positions.

## API

- `GET /health` returns service status and model metadata.
- `POST /predict` accepts:
  - `fen`: chess position in FEN notation;
  - `top_k`: number of candidate moves to return.
- `/predict` returns the best move in UCI and SAN notation, the number of legal moves, and the top ranked candidates with probabilities.

Invalid FEN strings return a 400 error. Positions with no legal moves return a valid response with no best move and an explanatory status.

## Docker

The project must run in Docker. The image installs `requirements.txt`, copies the project, trains a small reproducible demo model during build, exposes port `8000`, and runs Uvicorn serving `src.service:app`.

## Testing

Tests cover:

- feature vector shape and legal-move encoding;
- generated examples only contain legal moves and include at least one positive move per position;
- model training and inference on a tiny synthetic dataset;
- API `/health` and `/predict` behavior;
- invalid FEN error handling.

The final verification command is:

```bash
python -m pytest tests
```

Additional smoke checks:

```bash
python -m src.train --config configs/train.yaml --num-games 4 --max-plies 6 --no-save-dataset
python -m src.service
docker build -t chess-move-classifier .
```

