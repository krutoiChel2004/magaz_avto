from __future__ import annotations

import asyncio
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from mcm_api.core.database import get_db
from mcm_api.models.entities import Category, PriceHistory, Product
from mcm_api.schemas.catalog import (
    CategoryRead,
    HomePayload,
    PricePointRead,
    ProductCardRead,
    ProductDetailRead,
    ProductPageRead,
)
from mcm_api.services.storage import storage

router = APIRouter(tags=["catalog"])


def with_product_relations(statement: Select[tuple[Product]]) -> Select[tuple[Product]]:
    return statement.options(
        selectinload(Product.category),
        selectinload(Product.manufacturer),
        selectinload(Product.characteristic),
    )


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/categories", response_model=list[CategoryRead])
async def list_categories(db: AsyncSession = Depends(get_db)) -> list[CategoryRead]:
    categories = (await db.scalars(select(Category).order_by(Category.name))).all()
    return [CategoryRead.model_validate(item) for item in categories]


@router.get("/home", response_model=HomePayload)
async def get_home_payload(db: AsyncSession = Depends(get_db)) -> HomePayload:
    featured = (
        await db.scalars(
            with_product_relations(select(Product).where(Product.is_featured.is_(True)).order_by(Product.created_at.desc()).limit(6))
        )
    ).all()
    latest = (await db.scalars(with_product_relations(select(Product).order_by(Product.created_at.desc()).limit(6)))).all()
    categories = (await db.scalars(select(Category).order_by(Category.name))).all()
    return HomePayload(
        featured_products=await serialize_product_cards(featured),
        latest_products=await serialize_product_cards(latest),
        categories=[CategoryRead.model_validate(item) for item in categories],
    )


@router.get("/products", response_model=list[ProductCardRead])
async def list_products(
    db: AsyncSession = Depends(get_db),
    category: str | None = None,
    search: str | None = None,
    featured: bool | None = None,
    sort: str = Query(default="newest", pattern="^(newest|price_asc|price_desc)$"),
    limit: int = Query(default=24, ge=1, le=100),
) -> list[ProductCardRead]:
    statement = with_product_relations(select(Product))

    if category:
        statement = statement.join(Product.category).where(Category.slug == category)
    if search:
        pattern = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Product.name.ilike(pattern),
                Product.article.ilike(pattern),
                Product.short_description.ilike(pattern),
            )
        )
    if featured is not None:
        statement = statement.where(Product.is_featured.is_(featured))

    if sort == "price_asc":
        statement = statement.order_by(Product.price.asc())
    elif sort == "price_desc":
        statement = statement.order_by(Product.price.desc())
    else:
        statement = statement.order_by(Product.created_at.desc())

    products = (await db.scalars(statement.limit(limit))).all()
    return await serialize_product_cards(products)


@router.get("/products/{slug}", response_model=ProductPageRead)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> ProductPageRead:
    product = await db.scalar(with_product_relations(select(Product).where(Product.slug == slug)))
    if product is None:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")

    history = (
        await db.scalars(select(PriceHistory).where(PriceHistory.product_id == product.id).order_by(PriceHistory.changed_at.desc()).limit(8))
    ).all()

    return ProductPageRead(
        product=await serialize_product_detail(product),
        price_history=[PricePointRead.model_validate(point) for point in history],
    )


async def serialize_product_cards(products: list[Product]) -> list[ProductCardRead]:
    payloads = await asyncio.gather(*(build_product_card_payload(item) for item in products))
    return [ProductCardRead.model_validate(payload) for payload in payloads]


async def serialize_product_detail(product: Product) -> ProductDetailRead:
    payload = ProductDetailRead.model_validate(product).model_dump(mode="json")
    overlay = await storage.get_product_card(product.slug)
    merged = merge_product_payload(payload, overlay)
    await apply_image_overlay(merged, overlay)
    return ProductDetailRead.model_validate(merged)


async def build_product_card_payload(product: Product) -> dict[str, Any]:
    payload = ProductCardRead.model_validate(product).model_dump(mode="json")
    overlay = await storage.get_product_card(product.slug)
    merged = merge_product_payload(payload, overlay)
    await apply_image_overlay(merged, overlay)
    return merged


def merge_product_payload(base_payload: dict[str, Any], overlay: dict[str, Any] | None) -> dict[str, Any]:
    if not overlay:
        return base_payload

    result = dict(base_payload)
    editable_fields = {
        "name",
        "short_description",
        "description",
        "image_url",
        "old_price",
        "rating",
        "is_featured",
    }
    for key in editable_fields:
        if key in overlay:
            result[key] = overlay[key]

    if "price" in overlay:
        try:
            result["price"] = str(Decimal(str(overlay["price"])))
        except (InvalidOperation, ValueError):
            pass

    if "characteristic" in overlay and isinstance(result.get("characteristic"), dict):
        merged_characteristic = dict(result["characteristic"])
        characteristic_overlay = overlay["characteristic"]
        if isinstance(characteristic_overlay, dict):
            merged_characteristic.update(characteristic_overlay)
            result["characteristic"] = merged_characteristic

    return result


async def apply_image_overlay(payload: dict[str, Any], overlay: dict[str, Any] | None) -> None:
    if not overlay:
        return
    image_key = overlay.get("image_key")
    if not isinstance(image_key, str) or not image_key:
        return
    try:
        payload["image_url"] = await storage.presigned_get_url(image_key)
    except Exception:  # noqa: BLE001
        payload["image_url"] = storage.object_url(image_key)
