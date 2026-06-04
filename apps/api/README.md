# MCM API

FastAPI backend для дипломного интернет-магазина ООО «Малые строительные машины».

## Команды

```bash
uv sync
uv run alembic upgrade head
uv run python -m mcm_api.services.seed
uv run uvicorn mcm_api.main:app --app-dir src --reload
```

При включенном `S3_ENABLED=true` API создаёт bucket в MinIO на старте и
читает/записывает динамический контент карточек товаров в S3.

## PostgreSQL only

API работает только с PostgreSQL. Перед локальным запуском подними `postgres`
из `docker-compose.yml` или используй свой сервер PostgreSQL и пропиши
`DATABASE_URL` в формате `postgresql+asyncpg://...`.

Если база уже содержит старую схему или тестовые данные и нужно начать заново:

```bash
docker compose up -d postgres
uv run alembic upgrade head
uv run python -m mcm_api.services.seed
```
