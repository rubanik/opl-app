# PR 1 — prompt для агента: Alembic baseline

Ты работаешь в репозитории `opl-app`.

## Важно

- Docker и контейнеры ты НЕ запускаешь.
- Контейнеры запускает пользователь вручную на удалённом сервере.
- Ты меняешь код, документацию и конфиги.
- В финале дай команды, которые пользователь должен выполнить на сервере.
- Не пиши, что проверил docker compose, если не запускал его.

## Цель

Подключить Alembic и сделать baseline текущей схемы.

## Ограничения

- Не меняй бизнес-логику API.
- Не меняй frontend.
- Не меняй публичные URL.
- Не добавляй новые фичи.
- Не удаляй старые данные.
- Не ломай docker-compose запуск.
- Не запускай `docker compose` сам.

## Задачи

1. Добавь `alembic` в `backend/requirements.txt`.
2. Инициализируй Alembic внутри `backend`:
   - `backend/alembic.ini`
   - `backend/alembic/env.py`
   - `backend/alembic/versions/`
3. Настрой `env.py` так, чтобы он использовал metadata SQLAlchemy моделей приложения.
4. Создай baseline migration для текущей схемы.
5. Обнови backend startup:
   - не добавляй новые DDL в `app/main.py`;
   - если текущий `main.py` содержит legacy safe DDL, не удаляй его агрессивно;
   - добавь TODO/комментарий, что новые миграции должны идти только через Alembic.
6. Обнови `README.md` или создай `docs/development.md`:
   - как создать миграцию;
   - как применить миграции;
   - как запустить backend после миграций;
   - явно укажи, что Docker-команды выполняет пользователь, а не агент.

## Что агент может проверить локально

Если зависимости доступны без Docker:

```bash
cd backend
alembic --help
python -m py_compile app/main.py
```

Если зависимости недоступны — честно указать, что локальная проверка не выполнена.

## Команды для пользователя на сервере

```bash
docker compose build
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose up -d backend frontend
docker compose exec backend pytest
```

## Acceptance criteria

- Alembic добавлен и настроен.
- Есть baseline migration.
- Приложение не требует новых DDL в `main.py`.
- Есть инструкция для ручного запуска миграций через Docker на сервере.
- Агент не утверждает, что запускал контейнеры.
