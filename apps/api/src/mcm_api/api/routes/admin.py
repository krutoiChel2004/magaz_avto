from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from mcm_api.core.database import get_db
from mcm_api.core.deps import get_staff_user
from mcm_api.api.routes.orders import confirm_order_for_payment, mark_order_as_shipped, order_statement
from mcm_api.models.entities import (
    Category,
    CartItem,
    Favorite,
    Inventory,
    Manufacturer,
    Order,
    OrderItem,
    PriceHistory,
    Product,
    ProductCharacteristic,
    User,
    Warehouse,
)
from mcm_api.schemas.catalog import (
    AdminCategoryCreate,
    AdminManufacturerCreate,
    AdminProductCreate,
    CategoryRead,
    ContentFilePayload,
    ManufacturerRead,
    AdminProductDetailRead,
    ProductCardRead,
    ProductContentPayload,
    ProductDetailRead,
    UploadedObjectRead,
)
from mcm_api.schemas.orders import DashboardMetric, DashboardPayload, OrderRead, StockAlert
from mcm_api.services.storage import storage

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/categories", response_model=list[CategoryRead])
async def list_admin_categories(
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> list[CategoryRead]:
    categories = (await db.scalars(select(Category).order_by(Category.name.asc()))).all()
    return [CategoryRead.model_validate(category) for category in categories]


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: AdminCategoryCreate,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryRead:
    slug = payload.slug or slugify(payload.name)

    existing_by_name = await db.scalar(select(Category).where(Category.name == payload.name))
    if existing_by_name is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким названием уже существует")

    existing_by_slug = await db.scalar(select(Category).where(Category.slug == slug))
    if existing_by_slug is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким slug уже существует")

    category = Category(name=payload.name, slug=slug, description=payload.description)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return CategoryRead.model_validate(category)


@router.put("/categories/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int,
    payload: AdminCategoryCreate,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryRead:
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")

    slug = payload.slug or slugify(payload.name)

    existing_by_name = await db.scalar(select(Category).where(Category.name == payload.name, Category.id != category_id))
    if existing_by_name is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким названием уже существует")

    existing_by_slug = await db.scalar(select(Category).where(Category.slug == slug, Category.id != category_id))
    if existing_by_slug is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Категория с таким slug уже существует")

    category.name = payload.name
    category.slug = slug
    category.description = payload.description
    await db.commit()
    await db.refresh(category)
    return CategoryRead.model_validate(category)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    category = await db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Категория не найдена")

    products_count = await db.scalar(select(func.count(Product.id)).where(Product.category_id == category_id))
    if products_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить категорию, пока в ней есть товары",
        )

    await db.delete(category)
    await db.commit()


@router.get("/manufacturers", response_model=list[ManufacturerRead])
async def list_admin_manufacturers(
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> list[ManufacturerRead]:
    manufacturers = (await db.scalars(select(Manufacturer).order_by(Manufacturer.name.asc()))).all()
    return [ManufacturerRead.model_validate(manufacturer) for manufacturer in manufacturers]


@router.post("/manufacturers", response_model=ManufacturerRead, status_code=status.HTTP_201_CREATED)
async def create_manufacturer(
    payload: AdminManufacturerCreate,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> ManufacturerRead:
    existing = await db.scalar(select(Manufacturer).where(Manufacturer.name == payload.name))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Производитель с таким названием уже существует")

    manufacturer = Manufacturer(name=payload.name, country=payload.country)
    db.add(manufacturer)
    await db.commit()
    await db.refresh(manufacturer)
    return ManufacturerRead.model_validate(manufacturer)


@router.put("/manufacturers/{manufacturer_id}", response_model=ManufacturerRead)
async def update_manufacturer(
    manufacturer_id: int,
    payload: AdminManufacturerCreate,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> ManufacturerRead:
    manufacturer = await db.get(Manufacturer, manufacturer_id)
    if manufacturer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Производитель не найден")

    existing = await db.scalar(
        select(Manufacturer).where(Manufacturer.name == payload.name, Manufacturer.id != manufacturer_id)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Производитель с таким названием уже существует")

    manufacturer.name = payload.name
    manufacturer.country = payload.country
    await db.commit()
    await db.refresh(manufacturer)
    return ManufacturerRead.model_validate(manufacturer)


@router.delete("/manufacturers/{manufacturer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manufacturer(
    manufacturer_id: int,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    manufacturer = await db.get(Manufacturer, manufacturer_id)
    if manufacturer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Производитель не найден")

    products_count = await db.scalar(select(func.count(Product.id)).where(Product.manufacturer_id == manufacturer_id))
    if products_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить производителя, пока к нему привязаны товары",
        )

    await db.delete(manufacturer)
    await db.commit()


@router.get("/orders", response_model=list[OrderRead])
async def list_orders(_: User = Depends(get_staff_user), db: AsyncSession = Depends(get_db)) -> list[OrderRead]:
    orders = (await db.scalars(order_statement())).all()
    return [OrderRead.model_validate(order) for order in orders]


@router.post("/orders/{order_id}/confirm", response_model=OrderRead)
async def confirm_order(
    order_id: int,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> OrderRead:
    order = await db.scalar(order_statement().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    confirmed = await confirm_order_for_payment(db, order)
    return OrderRead.model_validate(confirmed)


@router.post("/orders/{order_id}/ship", response_model=OrderRead)
async def ship_order(
    order_id: int,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> OrderRead:
    order = await db.scalar(order_statement().where(Order.id == order_id))
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")
    shipped = await mark_order_as_shipped(db, order)
    return OrderRead.model_validate(shipped)


@router.get("/dashboard", response_model=DashboardPayload)
async def get_dashboard(_: User = Depends(get_staff_user), db: AsyncSession = Depends(get_db)) -> DashboardPayload:
    orders_total = await db.scalar(select(func.count(Order.id)))
    products_total = await db.scalar(select(func.count(Product.id)))
    revenue_total = await db.scalar(select(func.coalesce(func.sum(Order.total_amount), Decimal("0.00"))))
    average_check = await db.scalar(select(func.coalesce(func.avg(Order.total_amount), Decimal("0.00"))))

    recent_orders = (
        await db.scalars(
            select(Order)
            .options(selectinload(Order.address), selectinload(Order.items))
            .order_by(Order.created_at.desc())
            .limit(5)
        )
    ).all()
    low_stock_rows = (
        await db.execute(
            select(Product.name, Product.article, Product.stock, Inventory.min_quantity)
            .join(Inventory, Inventory.product_id == Product.id)
            .where(Product.stock <= Inventory.min_quantity)
            .order_by(Product.stock.asc())
            .limit(6)
        )
    ).all()

    metrics = [
        DashboardMetric(label="Заказов", value=str(orders_total or 0), note="Всего оформлено через систему"),
        DashboardMetric(label="Товаров", value=str(products_total or 0), note="Активных SKU в каталоге"),
        DashboardMetric(label="Выручка", value=f"{Decimal(revenue_total or 0):.2f} ₽", note="Сумма всех заказов"),
        DashboardMetric(label="Средний чек", value=f"{Decimal(average_check or 0):.2f} ₽", note="Среднее значение заказа"),
    ]

    return DashboardPayload(
        metrics=metrics,
        recent_orders=[OrderRead.model_validate(order) for order in recent_orders],
        low_stock=[
            StockAlert(product_name=name, article=article, stock=stock, min_quantity=min_quantity)
            for name, article, stock, min_quantity in low_stock_rows
        ],
    )


@router.get("/content/products/{slug}")
async def get_product_content(slug: str, _: User = Depends(get_staff_user)) -> dict:
    require_s3_enabled()
    payload = await storage.get_product_card(slug)
    return payload or {}


@router.put("/content/products/{slug}")
async def update_product_content(
    slug: str,
    payload: ProductContentPayload,
    _: User = Depends(get_staff_user),
) -> dict[str, str]:
    require_s3_enabled()
    await storage.put_product_card(slug, payload.data)
    return {"status": "ok"}


@router.get("/content/files/{path:path}")
async def get_content_file(path: str, _: User = Depends(get_staff_user)) -> dict:
    require_s3_enabled()
    validate_path(path)
    payload = await storage.get_content_file(path)
    return payload or {}


@router.put("/content/files/{path:path}")
async def update_content_file(
    path: str,
    payload: ContentFilePayload,
    _: User = Depends(get_staff_user),
) -> dict[str, str]:
    require_s3_enabled()
    validate_path(path)
    await storage.put_content_file(path, payload.data)
    return {"status": "ok"}


@router.post("/storage/upload", response_model=UploadedObjectRead)
async def upload_object(
    file: UploadFile = File(...),
    folder: str = "uploads",
    _: User = Depends(get_staff_user),
) -> UploadedObjectRead:
    require_s3_enabled()
    validate_path(folder)
    raw = await file.read()
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    object_key = storage.upload_key(f"{timestamp}_{file.filename}", folder=folder)
    await storage.upload_bytes(object_key, raw, file.content_type)
    url = await storage.presigned_get_url(object_key)
    return UploadedObjectRead(
        key=object_key,
        url=url,
        content_type=file.content_type or "application/octet-stream",
        size=len(raw),
    )


def require_s3_enabled() -> None:
    if not storage.enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="S3/MinIO отключен. Установите S3_ENABLED=true",
        )


def validate_path(value: str) -> None:
    if ".." in value or value.startswith("/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректный путь")


@router.get("/products", response_model=list[ProductCardRead])
async def list_admin_products(
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProductCardRead]:
    products = (
        await db.scalars(
            select(Product)
            .options(selectinload(Product.category), selectinload(Product.manufacturer))
            .order_by(Product.created_at.desc())
        )
    ).all()
    return [ProductCardRead.model_validate(product) for product in products]


@router.get("/products/{product_id}", response_model=AdminProductDetailRead)
async def get_admin_product(
    product_id: int,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> AdminProductDetailRead:
    product = await db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.category),
            selectinload(Product.manufacturer),
            selectinload(Product.characteristic),
            selectinload(Product.inventories),
        )
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")
    payload = ProductDetailRead.model_validate(product).model_dump(mode="json")
    overlay = await storage.get_product_card(product.slug)
    image_key = overlay.get("image_key") if isinstance(overlay, dict) else None
    min_quantity = product.inventories[0].min_quantity if product.inventories else None
    image_url = storage.object_url(image_key) if isinstance(image_key, str) and image_key else payload["image_url"]
    return AdminProductDetailRead.model_validate(
        {
            **payload,
            "image_url": image_url,
            "min_quantity": min_quantity,
            "image_key": image_key if isinstance(image_key, str) else None,
        }
    )


@router.post("/products", response_model=ProductCardRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: AdminProductCreate,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> ProductCardRead:
    existing_article = await db.scalar(select(Product).where(Product.article == payload.article))
    if existing_article is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Товар с таким артикулом уже существует")

    existing_slug = await db.scalar(select(Product).where(Product.slug == payload.slug))
    if existing_slug is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Товар с таким slug уже существует")

    category = await resolve_category(db, payload.category_name, payload.category_slug)
    manufacturer = await resolve_manufacturer(db, payload.manufacturer_name, payload.manufacturer_country)

    product = Product(
        article=payload.article,
        slug=payload.slug,
        name=payload.name,
        short_description=payload.short_description,
        description=payload.description,
        image_url=resolve_product_image_url(payload),
        price=payload.price,
        old_price=payload.old_price,
        stock=payload.stock,
        is_featured=payload.is_featured,
        category_id=category.id,
        manufacturer_id=manufacturer.id,
    )
    db.add(product)
    await db.flush()

    characteristic_fields = build_characteristic_fields(payload)
    if any(value is not None for value in characteristic_fields.values()):
        db.add(ProductCharacteristic(product_id=product.id, **characteristic_fields))

    warehouse = await db.scalar(select(Warehouse).order_by(Warehouse.id.asc()))
    if warehouse is None:
        warehouse = Warehouse(name="Основной склад", city="Курган", address_line="ул. Омская, 179")
        db.add(warehouse)
        await db.flush()

    db.add(
        Inventory(
            product_id=product.id,
            warehouse_id=warehouse.id,
            quantity=payload.stock,
            min_quantity=payload.min_quantity,
        )
    )
    db.add(PriceHistory(product_id=product.id, price=payload.price))

    await db.commit()

    if storage.enabled:
        await storage.put_product_card(payload.slug, build_product_overlay(payload))

    created = await db.scalar(
        select(Product)
        .where(Product.id == product.id)
        .options(selectinload(Product.category), selectinload(Product.manufacturer))
    )
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Товар не удалось создать")

    return ProductCardRead.model_validate(created)


@router.put("/products/{product_id}", response_model=ProductCardRead)
async def update_product(
    product_id: int,
    payload: AdminProductCreate,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> ProductCardRead:
    product = await db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.characteristic),
            selectinload(Product.inventories),
            selectinload(Product.category),
            selectinload(Product.manufacturer),
        )
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")

    existing_article = await db.scalar(
        select(Product).where(Product.article == payload.article, Product.id != product_id)
    )
    if existing_article is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Товар с таким артикулом уже существует")

    existing_slug = await db.scalar(select(Product).where(Product.slug == payload.slug, Product.id != product_id))
    if existing_slug is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Товар с таким slug уже существует")

    previous_slug = product.slug
    previous_price = product.price
    category = await resolve_category(db, payload.category_name, payload.category_slug)
    manufacturer = await resolve_manufacturer(db, payload.manufacturer_name, payload.manufacturer_country)

    product.article = payload.article
    product.slug = payload.slug
    product.name = payload.name
    product.short_description = payload.short_description
    product.description = payload.description
    product.image_url = payload.image_url or resolve_product_image_url(payload) or product.image_url or "/images/products/aerobox-480.svg"
    product.price = payload.price
    product.old_price = payload.old_price
    product.stock = payload.stock
    product.is_featured = payload.is_featured
    product.category_id = category.id
    product.manufacturer_id = manufacturer.id

    characteristic_fields = build_characteristic_fields(payload)
    has_characteristics = any(value is not None for value in characteristic_fields.values())
    if has_characteristics:
        if product.characteristic is None:
            product.characteristic = ProductCharacteristic(product_id=product.id, **characteristic_fields)
        else:
            for key, value in characteristic_fields.items():
                setattr(product.characteristic, key, value)
    elif product.characteristic is not None:
        await db.delete(product.characteristic)

    inventory = product.inventories[0] if product.inventories else None
    if inventory is None:
        warehouse = await db.scalar(select(Warehouse).order_by(Warehouse.id.asc()))
        if warehouse is None:
            warehouse = Warehouse(name="Основной склад", city="Курган", address_line="ул. Омская, 179")
            db.add(warehouse)
            await db.flush()
        inventory = Inventory(
            product_id=product.id,
            warehouse_id=warehouse.id,
            quantity=payload.stock,
            min_quantity=payload.min_quantity,
        )
        db.add(inventory)
    else:
        inventory.quantity = payload.stock
        inventory.min_quantity = payload.min_quantity

    if previous_price != payload.price:
        db.add(PriceHistory(product_id=product.id, price=payload.price))

    await db.commit()

    if storage.enabled:
        await storage.put_product_card(payload.slug, build_product_overlay(payload))
        if previous_slug != payload.slug:
            await storage.put_product_card(previous_slug, {"migrated_to": payload.slug})

    updated = await db.scalar(
        select(Product)
        .where(Product.id == product.id)
        .options(selectinload(Product.category), selectinload(Product.manufacturer))
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Товар не удалось обновить")
    return ProductCardRead.model_validate(updated)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    product = await db.scalar(
        select(Product)
        .where(Product.id == product_id)
        .options(
            selectinload(Product.characteristic),
            selectinload(Product.inventories),
            selectinload(Product.price_history),
            selectinload(Product.favorites),
            selectinload(Product.cart_items),
        )
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Товар не найден")

    order_links = await db.scalar(select(func.count(OrderItem.id)).where(OrderItem.product_id == product_id))
    if order_links:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Товар нельзя удалить, потому что он уже используется в заказах",
        )

    for cart_item in list(product.cart_items):
        await db.delete(cart_item)
    for favorite in list(product.favorites):
        await db.delete(favorite)
    for inventory in list(product.inventories):
        await db.delete(inventory)
    for history_row in list(product.price_history):
        await db.delete(history_row)
    if product.characteristic is not None:
        await db.delete(product.characteristic)
    await db.delete(product)
    await db.commit()


@router.delete("/products", status_code=status.HTTP_204_NO_CONTENT)
async def clear_products(
    _: User = Depends(get_staff_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await db.execute(OrderItem.__table__.delete())
    await db.execute(Inventory.__table__.delete())
    await db.execute(PriceHistory.__table__.delete())
    await db.execute(ProductCharacteristic.__table__.delete())
    await db.execute(Product.__table__.delete())
    await db.commit()


def slugify(value: str) -> str:
    normalized = value.strip().lower().replace("ё", "е")
    normalized = re.sub(r"[^a-z0-9а-я-]+", "-", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    return normalized or "category"


def build_characteristic_fields(payload: AdminProductCreate) -> dict[str, object | None]:
    return {
        "material": payload.material,
        "length_cm": payload.length_cm,
        "width_cm": payload.width_cm,
        "height_cm": payload.height_cm,
        "load_capacity_kg": payload.load_capacity_kg,
        "volume_l": payload.volume_l,
        "color": payload.color,
        "compatibility": payload.compatibility,
        "warranty_months": payload.warranty_months,
    }


def build_product_overlay(payload: AdminProductCreate) -> dict[str, object]:
    return {
        "name": payload.name,
        "short_description": payload.short_description,
        "description": payload.description,
        "image_url": payload.image_url,
        "image_key": payload.image_key if payload.image_key else None,
        "price": str(payload.price),
        "old_price": str(payload.old_price) if payload.old_price is not None else None,
        "is_featured": payload.is_featured,
    }


def resolve_product_image_url(payload: AdminProductCreate) -> str:
    if payload.image_url:
        return payload.image_url
    if payload.image_key and storage.enabled:
        return storage.object_url(payload.image_key)
    return "/images/products/aerobox-480.svg"


async def resolve_category(db: AsyncSession, name: str, slug: str | None) -> Category:
    category_slug = slug or slugify(name)
    category = await db.scalar(select(Category).where(Category.slug == category_slug))
    if category is None:
        category = Category(name=name, slug=category_slug, description=None)
        db.add(category)
        await db.flush()
    return category


async def resolve_manufacturer(db: AsyncSession, name: str, country: str | None) -> Manufacturer:
    manufacturer = await db.scalar(select(Manufacturer).where(Manufacturer.name == name))
    if manufacturer is None:
        manufacturer = Manufacturer(name=name, country=country)
        db.add(manufacturer)
        await db.flush()
    elif country and manufacturer.country != country:
        manufacturer.country = country
        await db.flush()
    return manufacturer
