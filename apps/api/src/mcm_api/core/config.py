from __future__ import annotations

from functools import cached_property

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://mcm_user:mcm_password@localhost:5432/mcm_store"
    jwt_secret: str = "diploma-secret-key"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    frontend_url: str = "http://localhost:3000"
    api_prefix: str = "/api"
    s3_enabled: bool = False
    s3_endpoint_url: str = "http://localhost:9000"
    s3_public_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "mcm-content"
    s3_region: str = "us-east-1"
    s3_presigned_expire_seconds: int = 3600

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        if not value.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use PostgreSQL with the postgresql+asyncpg:// scheme")
        return value

    @cached_property
    def sync_database_url(self) -> str:
        if self.database_url.startswith("postgresql+asyncpg://"):
            return self.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
        raise ValueError("DATABASE_URL must use PostgreSQL with the postgresql+asyncpg:// scheme")


settings = Settings()
