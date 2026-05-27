# Артефакты

После обучения здесь появляются:

- `chess_move_ranker.joblib` - сохранённый `MoveRanker`;
- `metrics.json` - метрики полного эксперимента;
- `docker_metrics.json` - метрики небольшой модели, обученной во время Docker build.

Артефакты можно пересоздать:

```bash
python -m src.train --config configs/train.yaml
```

