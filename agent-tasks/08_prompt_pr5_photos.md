# PR 5 — prompt для агента: photos local storage

Ты работаешь в репозитории `opl-app`.

## Важно

Агент не запускает Docker/контейнеры. Команды для Docker только написать пользователю.

## Цель

Перевести фото на единый local storage.

## Целевой дизайн

- новые фото не пишем в БД как LargeBinary;
- файл сохраняется в local storage через `app.services.storage`;
- в `Photo` храним id, step_id, mime_type/content_type, display_order, s3_key/storage_key;
- `data` только для legacy compatibility;
- `get_photo` и PDF export поддерживают storage key и fallback на `Photo.data`.

## Задачи

1. Найди `upload_photo` и `replace_photo`.
2. Сделай `upload_photo` аналогичным `replace_photo` по storage behavior.
3. Проверь delete photo:
   - если есть storage key, удалить файл из local storage;
   - затем удалить запись/связь в БД согласно текущему поведению.
4. Проверь PDF export:
   - изображения из local storage;
   - fallback на legacy data.
5. Добавь настройки local storage path, если сейчас они не оформлены в config.
6. Убедись на уровне кода/docker-compose файла, что local storage вынесен в volume. Не запускай контейнер сам.

## Тесты

- upload photo создаёт запись с storage key;
- get photo возвращает файл;
- replace photo меняет файл;
- delete photo удаляет файл;
- legacy `Photo.data` всё ещё читается.

## Команды для пользователя на сервере

```bash
docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head
docker compose exec backend pytest
```
