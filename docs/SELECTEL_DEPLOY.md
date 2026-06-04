# Деплой на VPS Selectel

Production-запуск рассчитан на VPS с Docker Compose. Входной трафик принимает
Caddy: он автоматически выпускает HTTPS-сертификат, проксирует сайт, API и
публичные файлы MinIO через один домен.

## Что должно быть готово

- VPS на Ubuntu/Debian с открытыми портами `80` и `443`.
- Домен или поддомен, A-запись которого указывает на публичный IPv4 сервера.
- Установленные `docker` и `docker compose`.
- Скопированный проект на сервер, например в `/opt/mcm-store`.

## Переменные окружения

На сервере создать файл `.env.production` из шаблона:

```bash
cp .env.production.example .env.production
```

Обязательные значения:

- `APP_DOMAIN` - домен без протокола, например `shop.example.ru`.
- `ACME_EMAIL` - email для Let's Encrypt.
- `FRONTEND_URL` - публичный адрес сайта, например `https://shop.example.ru`.
- `POSTGRES_PASSWORD` - пароль PostgreSQL.
- `DATABASE_URL` - строка подключения к PostgreSQL внутри Docker-сети.
- `JWT_SECRET` - секрет подписи JWT.
- `S3_ACCESS_KEY`, `S3_SECRET_KEY` - ключи приложения для MinIO. В текущем
  compose можно указать те же значения, что и в `MINIO_ROOT_USER`,
  `MINIO_ROOT_PASSWORD`, если отдельный MinIO-пользователь не создан.
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` - root-доступ к MinIO.

Секреты удобно генерировать так:

```bash
openssl rand -hex 32
```

Если пароль PostgreSQL содержит спецсимволы, их нужно URL-кодировать в
`DATABASE_URL`. Самый простой вариант - использовать hex-строку без спецсимволов.

## Запуск

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Проверка состояния:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f caddy api web
```

После запуска будут доступны:

- сайт: `https://APP_DOMAIN`
- API: `https://APP_DOMAIN/api`
- OpenAPI: `https://APP_DOMAIN/docs`
- публичные файлы MinIO: `https://APP_DOMAIN/s3/...`

PostgreSQL, MinIO, API и Next.js напрямую наружу не публикуются.

## Обновление проекта

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Резервная копия

Минимально нужно сохранять Docker volumes `postgres_data` и `minio_data`.
Перед обновлениями лучше делать дамп PostgreSQL:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql
```
