# PR 8 — prompt для агента: split routes

Ты работаешь в репозитории `opl-app`.

## Важно

Агент не запускает Docker/контейнеры. Команды для Docker только написать пользователю.

## Цель

Разрезать большой `backend/app/api/routes/opl.py` без изменения публичных URL.

## Целевая структура в будущем

```text
backend/app/api/routes/
  auth.py
  collections.py
  opl.py
  comments.py
  photos.py
  tags.py
  exports.py
```

## Первый шаг

1. Вынеси comments endpoints в `backend/app/api/routes/comments.py`.
2. Сохрани те же URL:
   - `/api/opls/{opl_id}/comments`
   - `/api/opls/{opl_id}/comments/{comment_id}`
3. Подключи router в `backend/app/api/router.py`.
4. Не меняй frontend.
5. Не меняй response format.
6. Не меняй auth rules.
7. Убедись, что tests comments проходят, если можешь запустить без Docker.

## Второй шаг

Только если первый безопасен:

1. Вынеси photos endpoints в `backend/app/api/routes/photos.py`.
2. Сохрани те же URL.

## Ограничения

- Не выноси tags/exports в этом PR, если PR становится большим.
- Не меняй публичный контракт API.
- Не делай общий архитектурный рефакторинг.
- Не запускай контейнеры.
