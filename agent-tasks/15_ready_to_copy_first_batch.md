# Готовая первая пачка для opencode

Можно дать агенту как первую задачу.

```text
Ты работаешь в репозитории opl-app.

Важно:
- Docker и контейнеры ты НЕ запускаешь.
- Контейнеры запускает пользователь вручную на удалённом сервере.
- Ты меняешь код, документацию и конфиги.
- В финале дай команды, которые пользователь должен выполнить на сервере.
- Не пиши, что проверил docker compose, если не запускал его.

Сделай два независимых изменения:

1. Создай AGENTS.md в корне проекта.
2. Подключи Alembic и создай baseline текущей схемы.

Контекст:
- backend: FastAPI + SQLAlchemy + PostgreSQL
- frontend: React + MUI + Vite
- docker-compose поднимает db/backend/frontend
- публичное чтение разрешено для OPL, collections, comments, photos, PDF
- write endpoints требуют auth
- новые изменения БД должны идти через Alembic, не через main.py

Ограничения:
- не меняй бизнес-логику API
- не меняй frontend
- не меняй публичные URL
- не добавляй новые фичи
- не делай рефакторинг routes
- не запускай docker compose

AGENTS.md должен зафиксировать:
- public read
- authenticated write
- comments only author edit/delete
- comments soft delete
- OPL must have at least one collection
- collection deletion removes links, not OPLs
- tags in collection context = global + current collection tags
- photos in local storage
- migrations via Alembic
- Docker/контейнеры запускает пользователь, не агент

Alembic:
- добавить alembic в backend/requirements.txt
- создать backend/alembic.ini
- создать backend/alembic/env.py
- создать backend/alembic/versions baseline migration
- настроить env.py на metadata моделей приложения
- обновить README или docs/development.md с командами миграций
- не добавлять новые DDL в app/main.py
- если legacy DDL в main.py есть, не удалять агрессивно без проверки

Локальные проверки:
- запусти только то, что доступно без Docker
- если зависимости недоступны, честно напиши это

Команды для пользователя на сервере:
docker compose build
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose up -d backend frontend
docker compose exec backend pytest

Финальный ответ:
- список изменённых файлов
- как запускать миграции
- что проверено локально
- что НЕ проверено, потому что контейнеры запускает пользователь
- команды для ручной проверки на сервере
- какие риски остались
```
