# Самопроверка проекта

| # | Критерий | Да/Нет (студент) | Где смотреть / комментарий |
|---|---|---|---|
| 1 | Сервис запускается по инструкциям из `project/README.md` и работает | ✅ | `README.md`, `src/service.py`, `Dockerfile` |
| 2 | Endpoint `/predict` использует реальную модель, а не заглушку | ✅ | `src/service.py`, `src/chess_ai/model.py`, `artifacts/chess_move_ranker.joblib` |
| 3 | Есть EDA и хотя бы один эксперимент с метриками | ✅ | `notebooks/01_eda_and_experiments.ipynb`, `artifacts/metrics.json`, `report.md` |
| 4 | Есть baseline и улучшенная модель, есть сравнение по метрикам | ✅ | `src/chess_ai/heuristics.py`, `src/chess_ai/model.py`, `report.md` |
| 5 | Код не свален в один ноутбук: есть внятная структура в `src/` | ✅ | `src/chess_ai/`, `src/train.py`, `src/service.py` |
| 6 | Есть Dockerfile или понятный сценарий развёртывания без Docker | ✅ | `Dockerfile`, раздел Docker в `README.md` |
| 7 | Есть `.env.example` и нет реальных секретов/паролей | ✅ | `.env.example`; секреты в проекте не используются |
| 8 | Реализованы логи/наблюдаемость | ✅ | `src/service.py`, `/health`, `logging` |
| 9 | В `report.md` обоснован выбор финальной модели по результатам экспериментов | ✅ | `report.md`, разделы 4-5 |
| 10 | `README.md` и `report.md` позволяют понять сценарий демонстрации | ✅ | `README.md`, `report.md`, разделы демонстрации |

Итого: **10 / 10** по самооценке.

