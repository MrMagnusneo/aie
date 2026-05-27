# Chess Move Classifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Dockerized chess move ranking project that trains a model from self-play legal-move examples and serves `/predict`.

**Architecture:** The project is a small Python package under `src/`. `python-chess` owns chess rules and legal moves, a reward-shaped generator creates labels, scikit-learn trains a classifier, and FastAPI exposes inference.

**Tech Stack:** Python 3.10+, python-chess, numpy, scikit-learn, joblib, PyYAML, FastAPI, Uvicorn, pytest, Docker.

---

### Task 1: Project Configuration And Tests Skeleton

**Files:**
- Modify: `requirements.txt`
- Create: `.env.example`
- Create: `.dockerignore`
- Create: `configs/train.yaml`
- Create: `src/__init__.py`
- Create: `src/chess_ai/__init__.py`
- Create: `tests/test_features.py`
- Create: `tests/test_data_generation.py`
- Create: `tests/test_model.py`
- Create: `tests/test_service.py`

- [ ] **Step 1: Write failing tests**

Create tests that import the future modules and assert feature shape, legal data generation, model inference, and API behavior.

- [ ] **Step 2: Verify tests fail for missing modules**

Run:

```bash
python -m pytest tests
```

Expected: import failures for `src.chess_ai`.

- [ ] **Step 3: Add dependencies and config**

Fill `requirements.txt`, `.env.example`, `.dockerignore`, and `configs/train.yaml`.

### Task 2: Feature Encoding

**Files:**
- Create: `src/chess_ai/features.py`
- Test: `tests/test_features.py`

- [ ] **Step 1: Implement constants and `encode_position_move(board, move)`**

Encode board pieces, side to move, castling rights, move origin, destination, promotion, capture, check, castling, en passant, moving piece, captured piece, and move geometry.

- [ ] **Step 2: Run feature tests**

Run:

```bash
python -m pytest tests/test_features.py -v
```

Expected: all feature tests pass.

### Task 3: Heuristic Rewards And Self-Play Data

**Files:**
- Create: `src/chess_ai/heuristics.py`
- Create: `src/chess_ai/data.py`
- Test: `tests/test_data_generation.py`

- [ ] **Step 1: Implement reward scoring**

Create material values, board evaluation, shaped move scoring, and a simpler baseline score.

- [ ] **Step 2: Implement generated examples**

Create `generate_labeled_examples(...)` that returns examples with `position_id`, `fen`, `move_uci`, `label`, and `reward`. Ensure every generated position has at least one positive label.

- [ ] **Step 3: Run data tests**

Run:

```bash
python -m pytest tests/test_data_generation.py -v
```

Expected: generated moves are legal and labels are usable.

### Task 4: Model Training And Inference

**Files:**
- Create: `src/chess_ai/model.py`
- Create: `src/train.py`
- Test: `tests/test_model.py`

- [ ] **Step 1: Implement classifier training**

Train a scikit-learn classifier on generated examples and compute validation metrics, including baseline top-1 and model top-1 good move rates.

- [ ] **Step 2: Implement model persistence**

Save and load a `MoveRanker` bundle with classifier, metadata, and metrics through joblib.

- [ ] **Step 3: Implement CLI training**

Add `python -m src.train --config configs/train.yaml` with overrides for fast tests and Docker build.

- [ ] **Step 4: Run model tests**

Run:

```bash
python -m pytest tests/test_model.py -v
```

Expected: a tiny generated dataset trains and returns a legal move probability.

### Task 5: FastAPI Service

**Files:**
- Create: `src/service.py`
- Test: `tests/test_service.py`

- [ ] **Step 1: Implement `/health` and `/predict`**

Load the trained artifact lazily. If the artifact is absent, train a small bootstrap model so the Docker service and local service still use a real model.

- [ ] **Step 2: Handle API errors**

Return HTTP 400 for invalid FEN and a valid terminal-position response when no legal moves exist.

- [ ] **Step 3: Run service tests**

Run:

```bash
python -m pytest tests/test_service.py -v
```

Expected: endpoints respond correctly and `/predict` returns only legal moves.

### Task 6: Docker And Documentation

**Files:**
- Create: `Dockerfile`
- Modify: `README.md`
- Modify: `report.md`
- Modify: `self-checklist.md`
- Modify: `data/README.md`
- Modify: `notebooks/README.md`
- Create: `notebooks/01_eda_and_experiments.ipynb`

- [ ] **Step 1: Add Dockerfile**

Build from `python:3.11-slim`, install dependencies, train a demo model during build, expose `8000`, and run Uvicorn.

- [ ] **Step 2: Fill course documentation**

Document task statement, data generation, experiments, service endpoints, Docker commands, limitations, and defense scenario.

- [ ] **Step 3: Run full verification**

Run:

```bash
python -m pytest tests
python -m src.train --config configs/train.yaml --num-games 4 --max-plies 6 --no-save-dataset
docker build -t chess-move-classifier .
```

Expected: tests pass, training smoke test writes model and metrics, Docker image builds.

