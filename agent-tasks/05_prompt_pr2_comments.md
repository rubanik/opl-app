# PR 2 — prompt для агента: comments

Ты работаешь в репозитории `opl-app`.

## Важно

Агент не запускает Docker/контейнеры. Команды для Docker только написать пользователю.

## Цель

Привести комментарии к целевому дизайну.

## Целевой дизайн

- комментарии публично читаются;
- писать может только залогиненный пользователь;
- редактировать может только автор;
- удалять может только автор;
- удаление soft delete;
- комментарии плоские;
- новые сверху;
- админа пока нет.

## Backend задачи

1. Найди модель `Comment`.
2. Через Alembic добавь поля, если их нет:
   - `deleted_at nullable datetime`;
   - `is_deleted boolean`, если в проекте удобнее boolean.
   Можно использовать только `deleted_at`, но API должен возвращать `is_deleted`.
3. `GET /api/opls/{opl_id}/comments`:
   - публичный;
   - newest-first;
   - удалённые комментарии не отдают исходный `text`;
   - для удалённых комментариев вернуть `is_deleted=true`.
4. `POST /api/opls/{opl_id}/comments` требует auth.
5. `PATCH /api/opls/{opl_id}/comments/{comment_id}`:
   - требует auth;
   - проверяет `comment.opl_id == opl_id`;
   - mismatch = 404;
   - не автор = 403;
   - soft-deleted comment = 400 или 404.
6. `DELETE /api/opls/{opl_id}/comments/{comment_id}`:
   - требует auth;
   - проверяет `comment.opl_id == opl_id`;
   - mismatch = 404;
   - не автор = 403;
   - выставляет `deleted_at`, не удаляет строку физически.

## Frontend задачи

- `CommentsDrawer`: новые комментарии добавлять в начало списка.
- Soft-deleted комментарий отображать как “Комментарий удалён”.
- Edit/delete показывать только автору, если такая информация есть в response.

## Тесты

- публичный GET comments работает без логина;
- POST без логина запрещён;
- author может редактировать свой комментарий;
- другой пользователь не может редактировать чужой;
- author может soft-delete свой комментарий;
- после soft delete текст не возвращается;
- нельзя обновить/удалить комментарий через wrong `opl_id`.

## Команды для пользователя на сервере

```bash
docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend pytest
```
