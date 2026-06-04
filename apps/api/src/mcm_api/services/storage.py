from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Mapping
from typing import Any
from urllib.parse import quote

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from mcm_api.core.config import settings

PRODUCT_CARD_PREFIX = "product-cards"
GENERIC_CONTENT_PREFIX = "content"
UPLOAD_PREFIX = "uploads"


class S3Storage:
    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )

    @property
    def enabled(self) -> bool:
        return settings.s3_enabled

    async def ensure_bucket(self) -> None:
        if not self.enabled:
            return
        await asyncio.to_thread(self._ensure_bucket_sync)

    async def get_product_card(self, slug: str) -> dict[str, Any] | None:
        return await self.get_json(self.product_card_key(slug))

    async def put_product_card(self, slug: str, payload: Mapping[str, Any]) -> None:
        await self.put_json(self.product_card_key(slug), payload)

    async def get_content_file(self, path: str) -> dict[str, Any] | None:
        return await self.get_json(self.generic_content_key(path))

    async def put_content_file(self, path: str, payload: Mapping[str, Any]) -> None:
        await self.put_json(self.generic_content_key(path), payload)

    async def get_json(self, key: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None

        try:
            response = await asyncio.to_thread(
                self._client.get_object,
                Bucket=settings.s3_bucket,
                Key=key,
            )
        except ClientError as error:
            code = error.response.get("Error", {}).get("Code")
            if code in {"NoSuchKey", "404"}:
                return None
            raise

        body = response["Body"].read().decode("utf-8")
        return json.loads(body)

    async def put_json(self, key: str, payload: Mapping[str, Any]) -> None:
        if not self.enabled:
            return

        encoded = json.dumps(dict(payload), ensure_ascii=False).encode("utf-8")
        await asyncio.to_thread(
            self._client.put_object,
            Bucket=settings.s3_bucket,
            Key=key,
            Body=encoded,
            ContentType="application/json; charset=utf-8",
        )

    async def upload_bytes(self, key: str, data: bytes, content_type: str | None = None) -> str:
        if not self.enabled:
            raise RuntimeError("S3 отключен")

        await asyncio.to_thread(
            self._client.put_object,
            Bucket=settings.s3_bucket,
            Key=key,
            Body=data,
            ContentType=content_type or "application/octet-stream",
        )
        return self.object_url(key)

    def object_url(self, key: str) -> str:
        base = settings.s3_public_endpoint_url.rstrip("/")
        encoded_key = quote(key, safe="/-_.~")
        return f"{base}/{settings.s3_bucket}/{encoded_key}"

    async def presigned_get_url(self, key: str) -> str:
        if not self.enabled:
            raise RuntimeError("S3 отключен")

        return self.object_url(key)

    def product_card_key(self, slug: str) -> str:
        safe_slug = slug.strip().replace("/", "")
        return f"{PRODUCT_CARD_PREFIX}/{safe_slug}.json"

    def generic_content_key(self, path: str) -> str:
        safe_path = path.strip().strip("/")
        return f"{GENERIC_CONTENT_PREFIX}/{safe_path}.json"

    def upload_key(self, filename: str, folder: str = UPLOAD_PREFIX) -> str:
        safe_name = re.sub(r"\s+", "_", filename.strip()).replace("/", "_")
        safe_folder = folder.strip().strip("/") or UPLOAD_PREFIX
        return f"{safe_folder}/{safe_name}"

    def _ensure_bucket_sync(self) -> None:
        try:
            self._client.head_bucket(Bucket=settings.s3_bucket)
        except ClientError:
            self._client.create_bucket(Bucket=settings.s3_bucket)
        self._client.put_bucket_policy(
            Bucket=settings.s3_bucket,
            Policy=json.dumps(
                {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "AllowPublicRead",
                            "Effect": "Allow",
                            "Principal": {"AWS": ["*"]},
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{settings.s3_bucket}/*"],
                        }
                    ],
                }
            ),
        )


storage = S3Storage()
