"""add cancelled order status

Revision ID: 0003_order_cancel_status
Revises: 0002_order_status_notifications
Create Date: 2026-05-21 00:00:00.000000
"""

from __future__ import annotations

from alembic import op

revision = "0003_order_cancel_status"
down_revision = "0002_order_status_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'CANCELLED'")


def downgrade() -> None:
    pass
