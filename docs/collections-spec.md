# Коллекции (OPL Collections) — Требования и задачи

## 1. Контекст и цели

### Проблема
При большом количестве инструкций плоский список с тегами становится неуправляемым. Производство разделено на отделы/участки, и люди должны видеть только релевантные им инструкции.

### Решение
Ввести сущность **Коллекция** (папка/раздел). Каждая инструкция принадлежит ровно одной коллекции. Теги локальны для коллекции — тег «Станок» в сборке не конфликтует с «Станок» в покраске.

### Принятые решения
- Одна инструкция → одна коллекция (без many-to-many)
- Теги локальны для коллекции (без глобальных тегов на старте)
- Любой авторизованный может создать коллекцию
- «Общие» — дефолтная коллекция, всегда доступна
- Пользователь подписывается на коллекции, чтобы видеть их

---

## 2. Текущее состояние системы

| Компонент | Статус |
|---|---|
| БД | PostgreSQL 16, авто-миграции через `main.py` (без Alembic) |
| Бэкенд | FastAPI + SQLAlchemy, `backend/app/` |
| Фронтенд | React + MUI, `frontend/src/` |
| Авторизация | Cookie-based JWT (LDAP + local), `get_current_user` для write-эндпоинтов |
| Теги | Глобальные (`opl_tags`), many-to-many через `opl_tag_links` |
| Инструкции | `opls` таблица, без `collection_id` |

### Ключевые файлы

| Файл | Роль |
|---|---|
| `backend/app/models/opl.py` | SQLAlchemy-модели OPL/Step/Photo/Tag |
| `backend/app/models/user.py` | Модель User |
| `backend/app/api/routes/opl.py` | Все REST-эндпоинты OPL |
| `backend/app/schemas/opl.py` | Pydantic-схемы |
| `backend/app/main.py` | Auto-migrations |
| `frontend/src/components/opl/OplList.jsx` | Список инструкций, поиск, теги |
| `frontend/src/components/opl/OplDetail.jsx` | Просмотр/редактирование инструкции |
| `frontend/src/components/opl/OplCard.jsx` | Карточка инструкции |
| `frontend/src/components/opl/CreateDialog.jsx` | Диалог создания инструкции |
| `frontend/src/components/opl/TagManagerDialog.jsx` | Управление тегами |
| `frontend/src/components/auth/AuthProvider.jsx` | Auth context, checkAuth |
| `frontend/src/hooks/useApi.jsx` | API-хук с 401-обработкой |

---

## 3. Схема БД

### Новые таблицы

```sql
-- Коллекции
CREATE TABLE opl_collections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT now()
);

-- Подписки пользователей на коллекции
CREATE TABLE user_collection_links (
    user_id         UUID NOT NULL REFERENCES users(id),
    collection_id   UUID NOT NULL REFERENCES opl_collections(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, collection_id)
);

-- Индекс: теги теперь привязаны к коллекции
ALTER TABLE opl_tags ADD COLUMN collection_id UUID REFERENCES opl_collections(id) ON DELETE CASCADE;

-- Инструкции привязаны к коллекции
ALTER TABLE opls ADD COLUMN collection_id UUID REFERENCES opl_collections(id) ON DELETE SET NULL;
```

### Изменения в существующих таблицах

| Таблица | Изменение | Детали |
|---|---|---|
| `opls` | +`collection_id` FK | Nullable, по умолчанию → «Общие» |
| `opl_tags` | +`collection_id` FK | Nullable на время миграции, затем NOT NULL |
| — | новая таблица | `opl_collections` |
| — | новая таблица | `user_collection_links` |

### Миграционные данные

1. Создать коллекцию «Общие» (`name = 'Общие'`)
2. Все существующие `opls` → `collection_id` = «Общие»
3. Все существующие `opl_tags` → `collection_id` = «Общие»
4. Все существующие `users` → подписка на «Общие» через `user_collection_links`

---

## 4. Бэкенд — задачи

### 4.1 Модели (`backend/app/models/opl.py`)

- [ ] **TASK-1** Добавить класс `OplCollection` с relationship на `User.created_by`, `Opl.collection_id`, `OplTag.collection_id`
- [ ] **TASK-2** Добавить класс `UserCollectionLink` (composite PK: user_id, collection_id)
- [ ] **TASK-3** Добавить `collection_id` в `Opl` (FK, nullable) + relationship на `OplCollection`
- [ ] **TASK-4** Добавить `collection_id` в `OplTag` (FK, nullable) + relationship на `OplCollection`
- [ ] **TASK-5** Добавить relationship `User.collections` в `backend/app/models/user.py`

### 4.2 Auto-миграции (`backend/app/main.py`)

- [ ] **TASK-6** Создать таблицу `opl_collections` (try/except)
- [ ] **TASK-7** Создать таблицу `user_collection_links` (try/except)
- [ ] **TASK-8** Добавить `collection_id` в `opls` (try/except)
- [ ] **TASK-9** Добавить `collection_id` в `opl_tags` (try/except)
- [ ] **TASK-10** Создать коллекцию «Общие» (если не существует)
- [ ] **TASK-11** Мигрировать все `opls.collection_id` → «Общие»
- [ ] **TASK-12** Мигрировать все `opl_tags.collection_id` → «Общие»
- [ ] **TASK-13** Подписать всех `users` на «Общие»

### 4.3 Схемы (`backend/app/schemas/opl.py`)

- [ ] **TASK-14** `OplCollectionOut` — id, name, description, created_by → AuthorOut, created_at
- [ ] **TASK-15** `OplCollectionCreate` — name, description?
- [ ] **TASK-16** `OplCollectionListOut` — id, name, opl_count
- [ ] **TASK-17** `OplCreate` добавить `collection_id: UUID`
- [ ] **TASK-18** `OplOut`, `OplListOut` добавить `collection: OplCollectionOut`

### 4.4 Эндпоинты (новый файл `backend/app/api/routes/collection.py`)

- [ ] **TASK-19** `GET /api/collections/` — список коллекций текущего юзера + счётчик OPL
- [ ] **TASK-20** `GET /api/collections/{id}` — детальная информация
- [ ] **TASK-21** `POST /api/collections/` — создать коллекцию (auth required)
- [ ] **TASK-22** `PATCH /api/collections/{id}` — обновить name/description (создатель)
- [ ] **TASK-23** `DELETE /api/collections/{id}` — удалить (перенести OPL в «Общие», удалить теги)
- [ ] **TASK-24** `POST /api/collections/{id}/subscribe` — подписаться
- [ ] **TASK-25** `DELETE /api/collections/{id}/unsubscribe` — отписаться
- [ ] **TASK-26** `GET /api/collections/{id}/tags` — теги коллекции
- [ ] **TASK-27** `POST /api/collections/{id}/tags` — создать тег в коллекции
- [ ] **TASK-28** `DELETE /api/collections/{id}/tags/{tag_id}` — удалить тег
- [ ] **TASK-29** Зарегистрировать роутер в `backend/app/api/router.py`

### 4.5 Изменения в `backend/app/api/routes/opl.py`

- [ ] **TASK-30** `GET /opls/` — добавить фильтр `collection_id` (query param). Если `collection_id` задан — фильтровать. Если `collection_id=all` — только коллекции юзера. Без параметра — backward compat (все).
- [ ] **TASK-31** `POST /opls/` — требовать `collection_id` в body
- [ ] **TASK-32** `GET /opls/tags` — переименовать или добавить `collection_id` фильтр (теги только коллекции)
- [ ] **TASK-33** `GET /opls/{id}` — вернуть `collection` в ответе
- [ ] **TASK-34** `PATCH /opls/{id}` — запретить изменение `collection_id` (или разрешить с проверкой)
- [ ] **TASK-35** `POST /opls/{id}/tags` — проверять что теги принадлежат той же коллекции

### 4.6 Auth-эндпоинты (`backend/app/api/routes/auth.py`)

- [ ] **TASK-36** `GET /api/auth/me` — вернуть список коллекций юзера

---

## 5. Фронтенд — задачи

### 5.1 Новая структура

```
frontend/src/
├── components/
│   ├── opl/
│   │   ├── OplList.jsx          ← изменение: фильтр по коллекции
│   │   ├── OplDetail.jsx        ← изменение: показать коллекцию
│   │   ├── OplCard.jsx          ← изменение: показать коллекцию
│   │   ├── CreateDialog.jsx     ← изменение: выбор коллекции
│   │   ├── TagManagerDialog.jsx ← изменение: привязка к коллекции
│   │   ├── CollectionSidebar.jsx    ← новый: сайдбар коллекций
│   │   └── CollectionManagerDialog.jsx  ← новый: управление коллекциями
│   └── common/
│       └── ...
├── hooks/
│   └── useCollections.jsx       ← новый: хук для коллекций
└── ...
```

### 5.2 Хук `useCollections.jsx`

- [ ] **TASK-37** Загрузить список коллекций при монтировании (`GET /api/collections/`)
- [ ] **TASK-38** State: `collections`, `activeCollectionId` (из URL `?collection=...`)
- [ ] **TASK-39** Функции: `createCollection`, `deleteCollection`, `subscribe`, `unsubscribe`
- [ ] **TASK-40** URL-синхронизация: `?collection={id}` ↔ state

### 5.3 `CollectionSidebar.jsx`

- [ ] **TASK-41** Список коллекций с иконкой и счётчиком инструкций
- [ ] **TASK-42** Активная коллекция выделена
- [ ] **TASK-43** «+ Новая» кнопка (только для авторизованных)
- [ ] **TASK-44** Кнопка «⚙ Управление» → открывает CollectionManagerDialog
- [ ] **TASK-45** Мобильная версия: dropdown в шапке вместо сайдбара

### 5.4 `CollectionManagerDialog.jsx`

- [ ] **TASK-46** Список коллекций: имя, счётчик OPL, создатель
- [ ] **TASK-47** Создание новой коллекции (имя + описание)
- [ ] **TASK-48** Удаление коллекции (подтверждение + перенос OPL в «Общие»)
- [ ] **TASK-49** Кнопка «Тег» на каждую коллекцию → открывает TagManagerDialog для этой коллекции

### 5.5 `OplList.jsx` — изменения

- [ ] **TASK-50** Обернуть в `CollectionSidebar` (desktop: layout с sidebar, mobile: dropdown)
- [ ] **TASK-51** При загрузке OPL добавлять `collection_id` в query params (если активна коллекция)
- [ ] **TASK-52** Теги фильтруются по `collection_id` (загрузка `/api/collections/{id}/tags`)
- [ ] **TASK-53** Поиск ограничивается активной коллекцией
- [ ] **TASK-54** URL-фильтр `?collection=...` обрабатывается при маунте
- [ ] **TASK-55** Share-ссылка включает `collection` параметр

### 5.6 `OplDetail.jsx` — изменения

- [ ] **TASK-56** Отображать название коллекции в хлебных крошках
- [ ] **TASK-57** При редактировании — коллекция не меняется (readonly)

### 5.7 `OplCard.jsx` — изменения

- [ ] **TASK-58** Показывать имя коллекции мелким шрифтом (опционально, если не в текущей коллекции)

### 5.8 `CreateDialog.jsx` — изменения

- [ ] **TASK-59** Добавить выбор коллекции перед заполнением формы
- [ ] **TASK-60** Теги загружаются по выбранной коллекции
- [ ] **TASK-61** Отправить `collection_id` при создании

### 5.9 `TagManagerDialog.jsx` — изменения

- [ ] **TASK-62** Принимать `collectionId` prop
- [ ] **TASK-63** Загружать теги через `/api/collections/{id}/tags`
- [ ] **TASK-64** CRUD через эндпоинты коллекции

### 5.10 Auth-обновления

- [ ] **TASK-65** `AuthProvider` — при логине загрузить коллекции
- [ ] **TASK-66** `OplList` — для гостей показать только «Общие» (если есть публичные)

---

## 6. URL-схема

| URL | Описание |
|---|---|
| `/` | Все коллекции юзера (или «Общие» для гостя) |
| `/?collection={id}` | Конкретная коллекция |
| `/?collection={id}&tag=NAME` | Коллекция + тег |
| `/?collection={id}&q=QUERY` | Коллекция + поиск |
| `/opl/{id}` | Инструкция (не зависит от коллекции) |

---

## 7. Порядок реализации

### Фаза 1: Бэкенд (TASK-1 → TASK-36)
1. Модели + миграции
2. Схемы
3. Эндпоинты коллекций
4. Изменения в OPL-эндпоинтах

### Фаза 2: Фронтенд-база (TASK-37 → TASK-45)
1. Хук `useCollections`
2. `CollectionSidebar`
3. `CollectionManagerDialog`

### Фаза 3: Интеграция (TASK-46 → TASK-66)
1. Изменения в `OplList`, `OplDetail`, `OplCard`
2. `CreateDialog` с выбором коллекции
3. `TagManagerDialog` с привязкой к коллекции
4. Auth-обновления

---

## 8. Границы и ограничения

- **Нет иерархии коллекций** (parent-child) на старте
- **Нет глобальных тегов** — все теги принадлежат коллекции
- **Нет разграничения прав внутри коллекции** — любой подписанный может редактировать
- **Удаление коллекции** — перенос OPL в «Общие», удаление тегов
- **Миграция существующих данных** — автоматическая при первом запуске
