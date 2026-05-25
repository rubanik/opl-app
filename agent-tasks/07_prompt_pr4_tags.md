# PR 4 — prompt для агента: tags

Ты работаешь в репозитории `opl-app`.

## Важно

Агент не запускает Docker/контейнеры. Команды для Docker только написать пользователю.

## Цель

Привести теги к целевому дизайну.

## Целевой дизайн

- глобальные теги отдельны от тегов коллекции;
- теги коллекции отдельны друг от друга по `collection_id`;
- в контексте коллекции показываем глобальные теги + теги текущей коллекции.

## Backend задачи

1. Через Alembic добавь/проверь индексы уникальности:
   - unique lower(name) where collection_id is null;
   - unique collection_id + lower(name) where collection_id is not null.
2. Create global tag:
   - создаёт tag с `collection_id = null`;
   - проверяет дубль только среди global tags.
3. Create collection tag:
   - требует существующий `collection_id`;
   - проверяет дубль только внутри этой коллекции.
4. GET tags:
   - если `collection_id` передан: вернуть global tags + tags текущей коллекции;
   - если `collection_id` не передан: вернуть global tags.
5. Link tag to OPL:
   - проверить, что `tag_id` существует;
   - если tag collection-scoped, проверить, что OPL находится в этой `collection_id`;
   - иначе нельзя привязать тег коллекции к OPL, которая не входит в эту коллекцию.

## Frontend задачи

- В контексте коллекции показывать global tags + current collection tags.
- При создании collection tag явно создавать его в текущей коллекции.
- Не смешивать collection tag из другой коллекции.

## Тесты

- можно создать global `Safety`;
- можно создать `Safety` внутри Collection A;
- можно создать `Safety` внутри Collection B;
- нельзя создать два `Safety` внутри одной Collection A;
- нельзя создать два global `Safety`;
- нельзя привязать tag из Collection A к OPL, которая не состоит в Collection A.

## Команды для пользователя на сервере

```bash
docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend pytest
```
