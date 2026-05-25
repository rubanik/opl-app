# PR 7 — prompt для агента: backend tests

Ты работаешь в репозитории `opl-app`.

## Важно

Агент не запускает Docker/контейнеры. Команды для Docker только написать пользователю.

## Цель

Добавить backend tests на критичные правила.

## Покрыть тестами

### Public read

1. `GET /api/opls` работает без логина.
2. `GET /api/opls/{id}` работает без логина.
3. `GET /api/opls/{id}/comments` работает без логина.
4. `GET photo` работает без логина.
5. `GET pdf` работает без логина.
6. `GET collections` работает без логина.

### Authenticated write

7. `POST /api/opls` без логина запрещён.
8. `POST /api/opls` с логином разрешён.
9. `PATCH/DELETE OPL` без логина запрещены.
10. `PATCH/DELETE OPL` с логином разрешены.

### Comments

11. `POST comment` без логина запрещён.
12. `POST comment` с логином разрешён.
13. Author может редактировать comment.
14. Другой user не может редактировать comment.
15. Author может soft-delete comment.
16. После soft delete текст скрыт.
17. Wrong `opl_id/comment_id` даёт 404.

### Collections

18. Нельзя создать OPL без коллекции.
19. Можно создать OPL в нескольких коллекциях.
20. Нельзя убрать последнюю коллекцию у OPL.
21. Удаление коллекции не удаляет OPL.
22. Нельзя удалить коллекцию, если это оставит OPL без коллекции.

### Tags

23. Global tag и collection tag с одинаковым name допустимы.
24. Дубль global tag запрещён.
25. Дубль collection tag внутри одной collection запрещён.
26. Collection tag нельзя привязать к OPL не из этой коллекции.

### Photos

27. Upload photo сохраняет storage key.
28. Get photo возвращает файл.
29. Legacy `Photo.data` читается.

## Что агент может проверить локально

```bash
cd backend
pytest
```

Если для тестов нужна БД/контейнеры, агент не запускает их сам и пишет команды для пользователя.

## Команды для пользователя на сервере

```bash
docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend pytest
```
