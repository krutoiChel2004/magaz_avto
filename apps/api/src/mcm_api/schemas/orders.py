from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from mcm_api.models.entities import OrderStatus


class AddressCreate(BaseModel):
    city: str = Field(min_length=2, max_length=120)
    street: str = Field(min_length=2, max_length=150)
    building: str = Field(min_length=1, max_length=50)
    apartment: str | None = Field(default=None, max_length=50)
    postal_code: str | None = Field(default=None, max_length=20)
    comment: str | None = Field(default=None, max_length=255)


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=999)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=180)
    customer_email: EmailStr
    customer_phone: str = Field(min_length=6, max_length=32)
    comment: str | None = Field(default=None, max_length=1000)
    address: AddressCreate
    items: list[OrderItemCreate]


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name_snapshot: str
    quantity: int
    unit_price: Decimal


class AddressRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    city: str
    street: str
    building: str
    apartment: str | None
    postal_code: str | None
    comment: str | None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    status: OrderStatus
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    comment: str | None
    total_amount: Decimal
    payment_url: str | None
    payment_token: str | None
    confirmed_at: datetime | None
    paid_at: datetime | None
    shipped_at: datetime | None
    created_at: datetime
    address: AddressRead | None
    items: list[OrderItemRead]


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    link_url: str | None
    is_read: bool
    created_at: datetime
    order_id: int | None


class DashboardMetric(BaseModel):
    label: str
    value: str
    note: str


class StockAlert(BaseModel):
    product_name: str
    article: str
    stock: int
    min_quantity: int


class DashboardPayload(BaseModel):
    metrics: list[DashboardMetric]
    recent_orders: list[OrderRead]
    low_stock: list[StockAlert]
