# Интернет-магазин для ООО «Малые строительные машины»

Монорепозиторий дипломного проекта по теме разработки интернет-магазина автозапчастей, автоаксессуаров, багажников и боксов.

## Стек

- `apps/web`: Next.js 16, TypeScript, App Router, Tailwind CSS 4
- `apps/api`: FastAPI, SQLAlchemy 2, Alembic, JWT, PostgreSQL
- `docker-compose.yml`: PostgreSQL + MinIO (S3) + web + api

## Структура

```text
apps/
  api/    backend API, миграции, модели и сиды
  web/    клиентская витрина, корзина, оформление заказа, админка
```

## Быстрый старт через Docker

1. Поднять весь стек одной командой:

   ```bash
   docker compose up --build
   ```

2. Дождаться инициализации `postgres`, `minio`, `api` и `web`.

При старте контейнер `api` автоматически:

- ждёт доступности PostgreSQL и MinIO;
- применяет миграции Alembic;
- выполняет `seed` с демо-пользователями;
- запускает FastAPI.

После `seed` демо-товары не добавляются: каталог по умолчанию пустой, товары
создаются через админку и хранятся в БД + S3/MinIO.

### Доступные адреса

- витрина: `http://localhost:3000`
- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`
- S3 API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## Локальная разработка без Docker

1. Установить зависимости фронтенда:

   ```bash
   pnpm --dir apps/web install
   ```

2. Установить зависимости бэкенда:

   ```bash
   uv sync --directory apps/api
   ```

3. Запустить инфраструктуру:

   ```bash
   docker compose up -d postgres minio
   ```

4. Применить миграции и заполнить тестовыми данными:

   ```bash
   docker compose up -d postgres
   uv run --directory apps/api alembic upgrade head
   uv run --directory apps/api python -m mcm_api.services.seed
   ```

5. Запустить приложения:

   ```bash
   pnpm dev:web
   pnpm dev:api
   ```

## MinIO и динамический контент

Карточки товаров и другие JSON-файлы для динамического редактирования через админку
хранятся в MinIO (`S3_BUCKET`).

- S3 API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Логин/пароль по умолчанию: `minioadmin` / `minioadmin`

Admin API:

- `PUT /api/admin/content/products/{slug}` — обновить JSON карточки товара в S3
- `GET /api/admin/content/products/{slug}` — получить JSON карточки
- `POST /api/admin/storage/upload` — загрузка файла в S3 (изображения, документы)
- `PUT /api/admin/content/files/{path}` — сохранить произвольный JSON-файл в S3

## Демо-учётные записи

- Администратор: `admin@msm-auto.ru` / `Admin123!`
- Менеджер: `manager@msm-auto.ru` / `Manager123!`
- Клиент: `client@msm-auto.ru` / `Client123!`

## Основной функционал

- регистрация и авторизация пользователей;
- каталог товаров с фильтрацией;
- карточки товаров с характеристиками;
- корзина и оформление заказа;
- личный кабинет с заказами;
- админская панель с аналитикой и списком заказов;
- складские остатки и история цен на стороне API.
