FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY apps/api /app

RUN uv sync --frozen || uv sync
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

CMD ["./docker-entrypoint.sh"]
