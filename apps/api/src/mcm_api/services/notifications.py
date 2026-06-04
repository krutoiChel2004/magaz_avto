from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from mcm_api.models.entities import Notification


async def create_notification(
    db: AsyncSession,
    *,
    user_id: int,
    title: str,
    message: str,
    link_url: str | None = None,
    order_id: int | None = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        order_id=order_id,
        title=title,
        message=message,
        link_url=link_url,
    )
    db.add(notification)
    await db.flush()
    return notification
