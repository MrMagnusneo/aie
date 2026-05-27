FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=artifacts/chess_move_ranker.joblib
ENV TRAIN_CONFIG=configs/train.yaml

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python -m src.train \
    --config configs/train.yaml \
    --num-games 6 \
    --max-plies 10 \
    --model-output artifacts/chess_move_ranker.joblib \
    --metrics-output artifacts/docker_metrics.json \
    --no-save-dataset

EXPOSE 8000

CMD ["uvicorn", "src.service:app", "--host", "0.0.0.0", "--port", "8000"]

