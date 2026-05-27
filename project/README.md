# Chess Legal Move Classifier

Итоговый проект по курсу «Инженерия Искусственного Интеллекта».

## 1. Паспорт проекта

- **Название проекта:** Chess Legal Move Classifier
- **Автор:** `Рогованов Андрей Андреевич`
- **Группа:** `ИКБО-64-24`
- **Контакт:** `mr.magnusneo@gmail.com`

Проект решает задачу классификации легальных шахматных ходов. На вход подаются позиция в формате FEN и кандидатный ход, а модель возвращает вероятность того, что ход хороший. Внешний датасет не используется: данные генерируются через `python-chess` в режиме self-play, а метки строятся по reward-функции.

## 2. Структура проекта

- `src/chess_ai/features.py` - кодирование доски и хода в числовые признаки.
- `src/chess_ai/heuristics.py` - reward shaping и baseline-оценка ходов.
- `src/chess_ai/data.py` - генерация self-play примеров.
- `src/chess_ai/model.py` - обучение, метрики, сохранение и инференс модели.
- `src/train.py` - CLI для обучения.
- `src/service.py` - FastAPI-сервис с `/health` и `/predict`.
- `configs/train.yaml` - параметры генерации данных и обучения.
- `data/generated_self_play.jsonl` - сгенерированные обучающие примеры.
- `artifacts/chess_move_ranker.joblib` - сохраненная модель.
- `artifacts/metrics.json` - метрики эксперимента.
- `tests/` - pytest-проверки.
- `Dockerfile` - сборка сервиса в контейнере.

## 3. Установка

Требуется Python `>=3.10`.

```bash
cd /home/x13/VScodeProjects/aie/project
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## 4. Обучение модели

Полное обучение по конфигу:

```bash
python -m src.train --config configs/train.yaml
```

Быстрая smoke-проверка:

```bash
python -m src.train --config configs/train.yaml --num-games 4 --max-plies 6 --no-save-dataset
```

После обучения появляются:

- `artifacts/chess_move_ranker.joblib`;
- `artifacts/metrics.json`;
- `data/generated_self_play.jsonl`, если не указан `--no-save-dataset`.

## 5. Запуск сервиса

Локально:

```bash
uvicorn src.service:app --host 0.0.0.0 --port 8000
```

Проверка:

```bash
curl http://localhost:8000/health
```

Пример предсказания:

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","top_k":5}'
```

Сервис перебирает только легальные ходы из `python-chess`, оценивает их моделью и возвращает лучший ход.

## 6. Docker

Сборка:

```bash
docker build -t chess-move-classifier .
```

Запуск:

```bash
docker run --rm -p 8000:8000 chess-move-classifier
```

В Dockerfile модель обучается во время сборки на небольшом self-play наборе, поэтому контейнер сразу готов отвечать на `/predict`.

## 7. Данные

Источник данных - собственная генерация через `python-chess`, без внешнего датасета и без Stockfish. Генератор играет короткие партии self-play, на каждой позиции перебирает все легальные ходы и размечает верхнюю часть ходов по reward-функции как хорошие.

Один пример содержит:

- `position_id`;
- `fen`;
- `move_uci`;
- `label`;
- `reward`;
- `san`.

## 8. Метрики текущего эксперимента

Результаты из `artifacts/metrics.json` для конфигурации `32` игры и `24` полухода:

| Модель | Accuracy | F1 | ROC-AUC | Average Precision | Top-1 good rate |
|---|---:|---:|---:|---:|---:|
| Tactical baseline | - | - | - | - | 0.838 |
| RandomForest ranker | 0.864 | 0.718 | 0.923 | 0.811 | 0.869 |

Top-1 good rate показывает, как часто лучший выбранный ход входит в группу хороших ходов для позиции.

## 9. Тесты

```bash
python -m pytest tests
```

Тесты проверяют:

- стабильную длину feature-вектора;
- что генератор создает только легальные ходы;
- что в каждой позиции есть хотя бы один положительный пример;
- что модель обучается и выбирает легальный ход;
- что API-функции `/health` и `/predict` работают и валидируют FEN.

## 10. Демонстрация на защите

1. Показать структуру проекта: `src/`, `configs/`, `tests/`, `Dockerfile`.
2. Запустить тесты: `python -m pytest tests`.
3. Запустить сервис локально или через Docker.
4. Отправить запрос на `/predict` для стартовой позиции.
5. Показать, что сервис возвращает только легальные ходы и выбирает лучший по вероятности.
6. Открыть `report.md` и `artifacts/metrics.json`, объяснить baseline, self-play генерацию и финальную модель.

## 11. Ограничения и развитие

Это не полноценный шахматный движок и не классический RL с долгосрочным value-learning. Модель учится на reward-shaped self-play данных и приближает эвристическую оценку ходов. Дальше можно добавить MCTS, обучение value-функции, более длинные self-play партии, ELO-оценку против baseline и опциональный teacher через Stockfish.

