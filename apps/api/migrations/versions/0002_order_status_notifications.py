"""order status workflow and notifications

Revision ID: 0002_order_status_notifications
Revises: 0001_initial_schema
Create Date: 2026-05-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_order_status_notifications"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'CONFIRMED'")
    op.execute("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'PAID'")

    op.add_column("order", sa.Column("payment_token", sa.String(length=120), nullable=True))
    op.add_column("order", sa.Column("payment_url", sa.String(length=500), nullable=True))
    op.add_column("order", sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("order", sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("order", sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_order_payment_token", "order", ["payment_token"], unique=True)

    op.create_table(
        "notification",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("order.id"), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("link_url", sa.String(length=500), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("notification")
    op.drop_index("ix_order_payment_token", table_name="order")
    op.drop_column("order", "shipped_at")
    op.drop_column("order", "paid_at")
    op.drop_column("order", "confirmed_at")
    op.drop_column("order", "payment_url")
    op.drop_column("order", "payment_token")
