#!/bin/sh
set -eu

python - <<'PY'
import socket
import time
from urllib.parse import urlparse
import os


def wait_for_tcp(host: str, port: int, name: str, timeout: int = 60) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"{name} is reachable at {host}:{port}")
                return
        except OSError:
            time.sleep(1)
    raise SystemExit(f"Timed out waiting for {name} at {host}:{port}")


database_url = os.environ["DATABASE_URL"]
db = urlparse(database_url.replace("+asyncpg", ""))
wait_for_tcp(db.hostname or "postgres", db.port or 5432, "PostgreSQL")

if os.environ.get("S3_ENABLED", "").lower() == "true":
    s3 = urlparse(os.environ["S3_ENDPOINT_URL"])
    wait_for_tcp(s3.hostname or "minio", s3.port or 9000, "MinIO")
PY

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    uv run alembic upgrade head
fi

if [ "${RUN_SEED:-true}" = "true" ]; then
    uv run python -m mcm_api.services.seed
fi

exec uv run uvicorn mcm_api.main:app --app-dir src --host 0.0.0.0 --port 8000
