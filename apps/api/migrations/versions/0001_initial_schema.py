"""initial schema

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-05-21
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


userrole = postgresql.ENUM("ADMIN", "MANAGER", "CUSTOMER", name="userrole", create_type=False)
orderstatus = postgresql.ENUM("NEW", "PROCESSING", "SHIPPED", "COMPLETED", name="orderstatus", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM("ADMIN", "MANAGER", "CUSTOMER", name="userrole").create(bind, checkfirst=True)
    postgresql.ENUM("NEW", "PROCESSING", "SHIPPED", "COMPLETED", name="orderstatus").create(bind, checkfirst=True)

    op.create_table(
        "account",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("patronymic", sa.String(length=100), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", userrole, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_account_email", "account", ["email"], unique=True)

    op.create_table(
        "category",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("slug", sa.String(length=120), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.create_index("ix_category_slug", "category", ["slug"], unique=True)

    op.create_table(
        "manufacturer",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("country", sa.String(length=100), nullable=True),
    )

    op.create_table(
        "warehouse",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("address_line", sa.String(length=255), nullable=False),
    )

    op.create_table(
        "address",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("street", sa.String(length=150), nullable=False),
        sa.Column("building", sa.String(length=50), nullable=False),
        sa.Column("apartment", sa.String(length=50), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("comment", sa.String(length=255), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=True),
    )

    op.create_table(
        "product",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("article", sa.String(length=60), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("short_description", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("old_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("rating", sa.Numeric(3, 2), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("category.id"), nullable=False),
        sa.Column("manufacturer_id", sa.Integer(), sa.ForeignKey("manufacturer.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_product_article", "product", ["article"], unique=True)
    op.create_index("ix_product_slug", "product", ["slug"], unique=True)

    op.create_table(
        "product_characteristic",
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), primary_key=True),
        sa.Column("material", sa.String(length=120), nullable=True),
        sa.Column("length_cm", sa.Integer(), nullable=True),
        sa.Column("width_cm", sa.Integer(), nullable=True),
        sa.Column("height_cm", sa.Integer(), nullable=True),
        sa.Column("load_capacity_kg", sa.Integer(), nullable=True),
        sa.Column("volume_l", sa.Integer(), nullable=True),
        sa.Column("color", sa.String(length=80), nullable=True),
        sa.Column("compatibility", sa.String(length=255), nullable=True),
        sa.Column("warranty_months", sa.Integer(), nullable=True),
    )

    op.create_table(
        "product_stock",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), nullable=False),
        sa.Column("warehouse_id", sa.Integer(), sa.ForeignKey("warehouse.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("min_quantity", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "product_price",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "favorite",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("account.id"), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "cart_item",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "product_id", name="uq_cart_item_user_product"),
    )

    op.create_table(
        "order",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(length=40), nullable=False),
        sa.Column("status", orderstatus, nullable=False),
        sa.Column("customer_name", sa.String(length=180), nullable=False),
        sa.Column("customer_email", sa.String(length=255), nullable=False),
        sa.Column("customer_phone", sa.String(length=32), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("account.id"), nullable=True),
        sa.Column("address_id", sa.Integer(), sa.ForeignKey("address.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_order_number", "order", ["number"], unique=True)

    op.create_table(
        "purchase",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("order.id"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("product.id"), nullable=False),
        sa.Column("product_name_snapshot", sa.String(length=180), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("purchase")
    op.drop_index("ix_order_number", table_name="order")
    op.drop_table("order")
    op.drop_table("cart_item")
    op.drop_table("favorite")
    op.drop_table("product_price")
    op.drop_table("product_stock")
    op.drop_table("product_characteristic")
    op.drop_index("ix_product_slug", table_name="product")
    op.drop_index("ix_product_article", table_name="product")
    op.drop_table("product")
    op.drop_table("address")
    op.drop_table("warehouse")
    op.drop_table("manufacturer")
    op.drop_index("ix_category_slug", table_name="category")
    op.drop_table("category")
    op.drop_index("ix_account_email", table_name="account")
    op.drop_table("account")

    bind = op.get_bind()
    orderstatus.drop(bind, checkfirst=True)
    userrole.drop(bind, checkfirst=True)
