# API Contracts

Здесь фиксируются API-контракты, которые уже реализованы или планируются.

## Формат описания endpoint

```text
METHOD /path

Request:
{}

Response:
{}

Errors:
- 400
- 404
- 409
- 500
```

## Collections

### GET /api/collections/

Получить список всех коллекций.

```text
GET /api/collections/

Response:
[
  {
    "id": "...",
    "title": "...",
    "description": "...",
    "created_at": "...",
    "updated_at": "..."
  }
]
```

### POST /api/collections/

Создать коллекцию.

```text
POST /api/collections/

Request:
{
  "title": "...",
  "description": "..."
}

Response:
{
  "id": "...",
  "title": "...",
  "description": "...",
  "created_at": "...",
  "updated_at": "..."
}

Errors:
- 422 validation
```

### GET /api/collections/{collection_id}

Получить коллекцию с инструкциями внутри.

```text
GET /api/collections/{collection_id}?skip=0&limit=50

Response:
{
  "id": "...",
  "title": "...",
  "description": "...",
  "created_at": "...",
  "updated_at": "...",
  "items": [
    { "id": "...", "title": "..." }
  ]
}

Errors:
- 404
```

### PATCH /api/collections/{collection_id}

Обновить коллекцию.

```text
PATCH /api/collections/{collection_id}

Request:
{
  "title": "...",
  "description": "..."
}

Response:
{
  "id": "...",
  "title": "...",
  "description": "...",
  "created_at": "...",
  "updated_at": "..."
}

Errors:
- 404
```

### DELETE /api/collections/{collection_id}

Удалить коллекцию (инструкции сохраняются, удаляются только связи).

```text
DELETE /api/collections/{collection_id}

Response:
{ "ok": true }

Errors:
- 404
```

### POST /api/collections/{collection_id}/opls

Добавить инструкцию в коллекцию.

```text
POST /api/collections/{collection_id}/opls

Request:
{
  "opl_id": "..."
}

Response:
{
  "opl_id": "...",
  "collection_id": "..."
}

Errors:
- 404
```

### DELETE /api/collections/{collection_id}/opls/{opl_id}

Удалить инструкцию из коллекции.

```text
DELETE /api/collections/{collection_id}/opls/{opl_id}

Response:
{ "ok": true }

Errors:
- 404
```

### GET /api/collections/{collection_id}/opls-list

Получить список инструкций в коллекции (с поиском, фильтрами и пагинацией).

```text
GET /api/collections/{collection_id}/opls-list?title=...&tag_ids=...&skip=0&limit=50

Response:
{
  "items": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "created_at": "...",
      "updated_at": "...",
      "step_count": 0,
      "total_duration_sec": 0,
      "author": { "username": "...", "surname": "...", "given_name": "..." },
      "tags": [
        { "id": "...", "name": "...", "color": "..." }
      ]
    }
  ],
  "total": 10,
  "skip": 0,
  "limit": 50
}

Errors:
- 404
```

### GET /api/collections/{collection_id}/tags

Получить теги, принадлежащие коллекции.

```text
GET /api/collections/{collection_id}/tags

Response:
[
  { "id": "...", "name": "...", "color": "..." }
]

Errors:
- 404
```

### POST /api/collections/{collection_id}/tags

Создать тег в рамках коллекции.

```text
POST /api/collections/{collection_id}/tags

Request:
{
  "name": "...",
  "color": "#1976d2"
}

Response:
{ "id": "...", "name": "...", "color": "..." }

Errors:
- 400 (дубликат имени в коллекции)
- 404
```

### DELETE /api/collections/{collection_id}/tags/{tag_id}

Удалить тег коллекции.

```text
DELETE /api/collections/{collection_id}/tags/{tag_id}

Response:
{ "ok": true }

Errors:
- 404
```
