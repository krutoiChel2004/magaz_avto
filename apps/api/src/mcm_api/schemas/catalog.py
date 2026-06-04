from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None


class ManufacturerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    country: str | None


class ProductCharacteristicRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    material: str | None
    length_cm: int | None
    width_cm: int | None
    height_cm: int | None
    load_capacity_kg: int | None
    volume_l: int | None
    color: str | None
    compatibility: str | None
    warranty_months: int | None


class ProductCardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    article: str
    slug: str
    name: str
    short_description: str
    image_url: str
    price: Decimal
    old_price: Decimal | None
    rating: Decimal
    stock: int
    is_featured: bool
    created_at: datetime
    category: CategoryRead
    manufacturer: ManufacturerRead


class ProductDetailRead(ProductCardRead):
    description: str
    characteristic: ProductCharacteristicRead | None


class PricePointRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    changed_at: datetime
    price: Decimal


class ProductPageRead(BaseModel):
    product: ProductDetailRead
    price_history: list[PricePointRead]


class AdminProductDetailRead(ProductDetailRead):
    min_quantity: int | None = None
    image_key: str | None = None


class HomePayload(BaseModel):
    featured_products: list[ProductCardRead]
    latest_products: list[ProductCardRead]
    categories: list[CategoryRead]


class ProductContentPayload(BaseModel):
    data: dict


class ContentFilePayload(BaseModel):
    data: dict


class UploadedObjectRead(BaseModel):
    key: str
    url: str
    content_type: str
    size: int


class AdminCategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str | None = Field(default=None, max_length=120)
    description: str | None = None


class AdminManufacturerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    country: str | None = Field(default=None, max_length=100)


class AdminProductCreate(BaseModel):
    article: str = Field(min_length=2, max_length=60)
    slug: str = Field(min_length=2, max_length=180)
    name: str = Field(min_length=2, max_length=180)
    short_description: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=2)
    price: Decimal
    old_price: Decimal | None = None
    stock: int = Field(default=0, ge=0)
    is_featured: bool = False
    category_name: str = Field(min_length=2, max_length=120)
    category_slug: str | None = Field(default=None, max_length=120)
    manufacturer_name: str = Field(min_length=2, max_length=120)
    manufacturer_country: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=255)
    image_key: str | None = Field(default=None, max_length=255)
    material: str | None = Field(default=None, max_length=120)
    length_cm: int | None = None
    width_cm: int | None = None
    height_cm: int | None = None
    load_capacity_kg: int | None = None
    volume_l: int | None = None
    color: str | None = Field(default=None, max_length=80)
    compatibility: str | None = Field(default=None, max_length=255)
    warranty_months: int | None = None
    min_quantity: int = Field(default=3, ge=0)
