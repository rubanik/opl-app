# OPL Agent Tasks v2

Архив с заданиями для агентов по проекту `opl-app`.

## Главное отличие v2

Агент **не запускает Docker/контейнеры**.

Контейнеры запускает пользователь вручную на удалённом сервере.

Агент должен:
- менять код;
- менять документацию;
- делать доступные локальные проверки;
- давать пользователю команды для ручной проверки;
- честно писать, что через Docker он не проверял.

## Как использовать

1. Распаковать архив рядом с проектом или в отдельную папку.
2. Открывать markdown-файлы по порядку.
3. Для opencode копировать содержимое нужного prompt-файла.
4. Не давать агенту сразу все PR одновременно.

## Рекомендуемый порядок

1. `03_prompt_pr0_agents_md.md`
2. `04_prompt_pr1_alembic.md`
3. `05_prompt_pr2_comments.md`
4. `06_prompt_pr3_collections.md`
5. `07_prompt_pr4_tags.md`
6. `08_prompt_pr5_photos.md`
7. `09_prompt_pr6_frontend_bugs.md`
8. `10_prompt_pr7_backend_tests.md`
9. `11_prompt_pr8_split_routes.md`
10. `12_prompt_pr9_frontend_cleanup.md`
11. `13_prompt_pr10_api_contract.md`
