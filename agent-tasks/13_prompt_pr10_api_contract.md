# PR 10 — prompt для агента: API contract docs

Ты работаешь в репозитории `opl-app`.

## Важно

Агент не запускает Docker/контейнеры. Команды для Docker только написать пользователю.

## Цель

Создай `docs/api-contract.md`.

## Содержание

Опиши человекочитаемый контракт API.

Разделы:
1. Auth
2. OPL
3. Collections
4. Tags
5. Comments
6. Photos
7. PDF/QR

Для каждого endpoint укажи:
- method;
- path;
- public/auth required;
- request body кратко;
- response кратко;
- основные ошибки.

## Особенно зафиксируй правила

- public read для OPL/list/photo/pdf/comments/collections;
- authenticated write;
- comment edit/delete только author;
- soft delete comments;
- OPL must belong to at least one collection;
- tags in collection context = global + current collection tags;
- photos stored in local storage;
- Docker/контейнеры запускает пользователь вручную.

## Ограничения

- Не меняй код.
- Не меняй README, кроме ссылки на документ, если считаешь нужным.
