# Рекомендуемый порядок PR

1. PR 0 — `AGENTS.md`: правила для агентов и продуктовые решения.
2. PR 1 — Alembic baseline: подключить Alembic, новые DDL больше не добавлять в `main.py`.
3. PR 2 — Комментарии: public GET, auth POST, author-only PATCH/DELETE, soft delete, newest-first, wrong `opl_id/comment_id` = 404.
4. PR 3 — Коллекции: OPL обязана иметь минимум одну коллекцию, удаление коллекции не оставляет OPL без коллекции.
5. PR 4 — Теги: global tags + collection-scoped tags, уникальность и проверка привязки.
6. PR 5 — Фото: новые фото через local storage, fallback на legacy `Photo.data`.
7. PR 6 — Frontend quick bugs: optimistic delete, `.sort()` mutation, comment order.
8. PR 7 — Backend tests: public read, auth write, comments, collections, tags, photos.
9. PR 8 — Разрезать `opl.py`: comments/photos/tags routes без изменения URL.
10. PR 9 — Frontend cleanup: `useUndoDelete`, возможно `useOplFilters`.
11. PR 10 — `docs/api-contract.md`.

Важно: агент не запускает Docker/контейнеры. В каждом PR он должен дать команды для ручной проверки пользователем на сервере.
