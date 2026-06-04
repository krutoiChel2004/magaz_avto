from __future__ import annotations

import secrets
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from mcm_api.core.config import settings
from mcm_api.core.database import get_db
from mcm_api.core.deps import get_current_user, get_optional_user
from mcm_api.models.entities import Address, Inventory, Notification, Order, OrderItem, OrderStatus, Product, User
from mcm_api.schemas.orders import NotificationRead, OrderCreate, OrderRead
from mcm_api.services.notifications import create_notification

router = APIRouter(prefix="/orders", tags=["orders"])


def order_statement() -> select[tuple[Order]]:
    return select(Order).options(selectinload(Order.address), selectinload(Order.items)).order_by(Order.created_at.desc())


async def restore_order_stock(db: AsyncSession, order: Order) -> None:
    product_ids = {item.product_id for item in order.items}
    if not product_ids:
        return

    products = (
        await db.scalars(
            select(Product)
            .where(Product.id.in_(product_ids))
            .options(selectinload(Product.inventories))
        )
    ).all()
    product_map = {product.id: product for product in products}

    for item in order.items:
        product = product_map.get(item.product_id)
        if product is None:
            continue

        product.stock += item.quantity
        if product.inventories:
            primary_inventory: Inventory = product.inventories[0]
            primary_inventory.quantity += item.quantity


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> OrderRead:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Корзина пуста")

    product_ids = {item.product_id for item in payload.items}
    products = (
        await db.scalars(
            select(Product)
            .where(Product.id.in_(product_ids))
            .options(selectinload(Product.inventories))
        )
    ).all()

    if len(products) != len(product_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Часть товаров не найдена")

    product_map = {product.id: product for product in products}

    address = Address(
        city=payload.address.city,
        street=payload.address.street,
        building=payload.address.building,
        apartment=payload.address.apartment,
        postal_code=payload.address.postal_code,
        comment=payload.address.comment,
        user_id=user.id if user else None,
    )
    db.add(address)
    await db.flush()

    order = Order(
        number=f"MCM-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}",
        customer_name=payload.customer_name,
        customer_email=str(payload.customer_email),
        customer_phone=payload.customer_phone,
        comment=payload.comment,
        user_id=user.id if user else None,
        address_id=address.id,
        total_amount=Decimal("0.00"),
    )
    db.add(order)
    await db.flush()

    total = Decimal("0.00")
    for item in payload.items:
        product = product_map[item.product_id]
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Недостаточно товара на складе: {product.name}",
            )

        product.stock -= item.quantity
        total += product.price * item.quantity

        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name_snapshot=product.name,
            quantity=item.quantity,
            unit_price=product.price,
        )
        db.add(order_item)

        if product.inventories:
            primary_inventory: Inventory = product.inventories[0]
            primary_inventory.quantity = max(primary_inventory.quantity - item.quantity, 0)

    order.total_amount = total

    if user is not None:
        await create_notification(
            db,
            user_id=user.id,
            order_id=order.id,
            title="Заказ оформлен",
            message=f"Заказ {order.number} принят и ожидает подтверждения.",
            link_url="/account/orders",
        )

    await db.commit()
    created_order = await db.scalar(order_statement().where(Order.id == order.id))
    if created_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Заказ не удалось создать")

    return OrderRead.model_validate(created_order)


@router.get("/me", response_model=list[OrderRead])
async def my_orders(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[OrderRead]:
    orders = (await db.scalars(order_statement().where(Order.user_id == current_user.id))).all()
    return [OrderRead.model_validate(order) for order in orders]


@router.post("/{order_id}/cancel", response_model=OrderRead)
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderRead:
    order = await db.scalar(
        order_statement().where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Заказ не найден")

    if order.status not in {OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PROCESSING}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Отменить можно только заказ до оплаты",
        )

    await restore_order_stock(db, order)
    order.status = OrderStatus.CANCELLED
    order.payment_token = None
    order.payment_url = None

    await create_notification(
        db,
        user_id=current_user.id,
        order_id=order.id,
        title="Заказ отменён",
        message=f"Заказ {order.number} отменён, товар возвращён в остатки.",
        link_url="/account/orders",
    )
    await db.commit()

    cancelled_order = await db.scalar(order_statement().where(Order.id == order.id))
    if cancelled_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось обновить заказ")
    return OrderRead.model_validate(cancelled_order)


@router.get("/notifications/me", response_model=list[NotificationRead])
async def my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NotificationRead]:
    notifications = (
        await db.scalars(
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc())
        )
    ).all()
    return [NotificationRead.model_validate(item) for item in notifications]


@router.post("/notifications/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationRead:
    notification = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Уведомление не найдено")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return NotificationRead.model_validate(notification)


@router.post("/payments/{payment_token}/complete", response_model=OrderRead)
async def complete_payment(
    payment_token: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OrderRead:
    order = await db.scalar(
        order_statement().where(
            Order.payment_token == payment_token,
            Order.user_id == current_user.id,
        )
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ссылка на оплату не найдена")

    if order.status not in {OrderStatus.CONFIRMED, OrderStatus.PROCESSING}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот заказ сейчас недоступен для оплаты",
        )

    order.status = OrderStatus.PAID
    order.paid_at = datetime.now(UTC)
    await create_notification(
        db,
        user_id=current_user.id,
        order_id=order.id,
        title="Оплата получена",
        message=f"Заказ {order.number} оплачен и готовится к отправке.",
        link_url="/account/orders",
    )
    await db.commit()

    paid_order = await db.scalar(order_statement().where(Order.id == order.id))
    if paid_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось обновить заказ")
    return OrderRead.model_validate(paid_order)


def build_payment_path(payment_token: str) -> str:
    return f"/account/orders?pay={payment_token}"


def build_payment_url(order: Order) -> str:
    return f"{settings.frontend_url.rstrip('/')}{build_payment_path(order.payment_token or '')}"


async def confirm_order_for_payment(db: AsyncSession, order: Order) -> Order:
    if order.status not in {OrderStatus.NEW, OrderStatus.PROCESSING}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Подтвердить можно только новый заказ",
        )

    if not order.payment_token:
        order.payment_token = secrets.token_urlsafe(24)
    order.payment_url = build_payment_url(order)
    order.status = OrderStatus.CONFIRMED
    order.confirmed_at = datetime.now(UTC)

    if order.user_id is not None:
        await create_notification(
            db,
            user_id=order.user_id,
            order_id=order.id,
            title="Заказ подтверждён",
            message=f"Заказ {order.number} подтверждён. Перейдите к оплате по ссылке в уведомлении.",
            link_url=build_payment_path(order.payment_token),
        )

    await db.commit()
    confirmed_order = await db.scalar(order_statement().where(Order.id == order.id))
    if confirmed_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось обновить заказ")
    return confirmed_order


async def mark_order_as_shipped(db: AsyncSession, order: Order) -> Order:
    if order.status != OrderStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Отправка доступна только для оплаченного заказа",
        )

    order.status = OrderStatus.SHIPPED
    order.shipped_at = datetime.now(UTC)
    if order.user_id is not None:
        await create_notification(
            db,
            user_id=order.user_id,
            order_id=order.id,
            title="Заказ отправлен",
            message=f"Заказ {order.number} передан в доставку.",
            link_url="/account/orders",
        )

    await db.commit()
    shipped_order = await db.scalar(order_statement().where(Order.id == order.id))
    if shipped_order is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Не удалось обновить заказ")
    return shipped_order
