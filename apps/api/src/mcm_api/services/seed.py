from __future__ import annotations

import asyncio
from decimal import Decimal

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

print(7676)
from mcm_api.core.database import AsyncSessionLocal
from mcm_api.core.security import hash_password
from mcm_api.models.entities import (
    Category,
    Inventory,
    Manufacturer,
    PriceHistory,
    Product,
    ProductCharacteristic,
    User,
    UserRole,
    Warehouse,
)
from mcm_api.services.storage import storage

PRODUCT_IMAGE_BY_ARTICLE = {
    "BX-480": "/images/products/aerobox-480.svg",
    "RK-135": "/images/products/rack-135.svg",
    "BR-2104": "/images/products/brake-br2104.svg",
    "OF-5W30": "/images/products/oil-5w30.svg",
    "BX-620": "/images/products/aerobox-620.svg",
    "FL-221": "/images/products/filter-221.svg",
}

async def seed_database() -> None:
    if storage.enabled:
        await storage.ensure_bucket()

    async with AsyncSessionLocal() as session:
        existing_admin = await session.scalar(select(User).where(User.email == "admin@msm-auto.ru"))
        if existing_admin is None:
            users = [
                User(
                    first_name="Матвей",
                    last_name="Агафонов",
                    patronymic="Андреевич",
                    email="admin@msm-auto.ru",
                    phone="+7 (900) 000-00-01",
                    password_hash=hash_password("Admin123!"),
                    role=UserRole.ADMIN,
                ),
                User(
                    first_name="Ирина",
                    last_name="Крылова",
                    patronymic="Олеговна",
                    email="manager@msm-auto.ru",
                    phone="+7 (900) 000-00-02",
                    password_hash=hash_password("Manager123!"),
                    role=UserRole.MANAGER,
                ),
                User(
                    first_name="Алексей",
                    last_name="Петров",
                    patronymic="Сергеевич",
                    email="client@msm-auto.ru",
                    phone="+7 (900) 000-00-03",
                    password_hash=hash_password("Client123!"),
                    role=UserRole.CUSTOMER,
                ),
            ]
            session.add_all(users)
            await session.flush()

        existing_product = await session.scalar(select(Product.id).limit(1))
        if existing_product is not None:
            await sync_product_images(session)
            return

        categories = await ensure_categories(session)
        manufacturers = await ensure_manufacturers(session)
        warehouses = await ensure_warehouses(session)

        products = [
            Product(
                article="BX-480",
                slug="aerobox-trailbox-480",
                name="Аэробокс TrailBox 480",
                short_description="Жёсткий бокс 480 л для дальних поездок и коммерческих задач.",
                description="Вместительный бокс с двусторонним открытием, усиленным дном и быстросъёмными креплениями.",
                image_url="/images/products/aerobox-480.svg",
                price=Decimal("42990.00"),
                old_price=Decimal("45990.00"),
                rating=Decimal("4.90"),
                stock=8,
                is_featured=True,
                category=categories[3],
                manufacturer=manufacturers[2],
            ),
            Product(
                article="RK-135",
                slug="bagazhnik-norddrive-135",
                name="Багажник NordDrive 135",
                short_description="Алюминиевые поперечины для кроссоверов и универсалов.",
                description="Низкопрофильный багажник с антикоррозийным покрытием и комплектом замков.",
                image_url="/images/products/rack-135.svg",
                price=Decimal("16990.00"),
                old_price=Decimal("18990.00"),
                rating=Decimal("4.80"),
                stock=11,
                is_featured=True,
                category=categories[2],
                manufacturer=manufacturers[0],
            ),
            Product(
                article="BR-2104",
                slug="tormoznye-kolodki-msm-br2104",
                name="Тормозные колодки MSM BR-2104",
                short_description="Комплект передних колодок для городских и коммерческих авто.",
                description="Стабильное торможение, низкий уровень шума и улучшенный ресурс фрикционного слоя.",
                image_url="/images/products/brake-br2104.svg",
                price=Decimal("3490.00"),
                old_price=None,
                rating=Decimal("4.70"),
                stock=42,
                is_featured=False,
                category=categories[0],
                manufacturer=manufacturers[3],
            ),
            Product(
                article="OF-5W30",
                slug="maslo-sinteticheskoe-5w30-4l",
                name="Синтетическое масло 5W-30 4л",
                short_description="Моторное масло для бензиновых и дизельных двигателей.",
                description="Подходит для всесезонной эксплуатации, снижает износ и поддерживает стабильную вязкость.",
                image_url="/images/products/oil-5w30.svg",
                price=Decimal("2890.00"),
                old_price=Decimal("3190.00"),
                rating=Decimal("4.60"),
                stock=25,
                is_featured=False,
                category=categories[1],
                manufacturer=manufacturers[3],
            ),
            Product(
                article="BX-620",
                slug="aerobox-cargoline-620",
                name="Аэробокс CargoLine 620",
                short_description="Объёмный бокс 620 л для семейных и оптовых перевозок.",
                description="Усиленная фурнитура, аэродинамический профиль и защита от ультрафиолета.",
                image_url="/images/products/aerobox-620.svg",
                price=Decimal("53990.00"),
                old_price=None,
                rating=Decimal("4.95"),
                stock=4,
                is_featured=True,
                category=categories[3],
                manufacturer=manufacturers[1],
            ),
            Product(
                article="FL-221",
                slug="salonnyy-filtr-msm-221",
                name="Салонный фильтр MSM 221",
                short_description="Угольный фильтр для защиты от пыли и запахов.",
                description="Эффективно задерживает частицы пыли, пыльцу и городской смог.",
                image_url="/images/products/filter-221.svg",
                price=Decimal("990.00"),
                old_price=None,
                rating=Decimal("4.50"),
                stock=37,
                is_featured=False,
                category=categories[0],
                manufacturer=manufacturers[3],
            ),
        ]
        session.add_all(products)
        await session.flush()

        characteristics = [
            ProductCharacteristic(product_id=products[0].id, material="ABS-пластик", width_cm=90, height_cm=42, volume_l=480, color="Чёрный", load_capacity_kg=75, warranty_months=24),
            ProductCharacteristic(product_id=products[1].id, material="Алюминий", length_cm=135, load_capacity_kg=90, color="Серебристый", compatibility="Кроссоверы и универсалы", warranty_months=36),
            ProductCharacteristic(product_id=products[2].id, material="Керамический композит", compatibility="Renault / Lada / Nissan", warranty_months=12),
            ProductCharacteristic(product_id=products[3].id, material="Синтетическая база", volume_l=4, compatibility="Бензиновые и дизельные ДВС", warranty_months=24),
            ProductCharacteristic(product_id=products[4].id, material="ABS-пластик", width_cm=96, height_cm=46, volume_l=620, color="Серый графит", load_capacity_kg=75, warranty_months=36),
            ProductCharacteristic(product_id=products[5].id, material="Угольное волокно", compatibility="Hyundai / Kia / Lada", warranty_months=12),
        ]
        session.add_all(characteristics)

        inventories = [
            Inventory(product_id=products[0].id, warehouse_id=warehouses[0].id, quantity=5, min_quantity=2),
            Inventory(product_id=products[1].id, warehouse_id=warehouses[0].id, quantity=7, min_quantity=2),
            Inventory(product_id=products[2].id, warehouse_id=warehouses[0].id, quantity=24, min_quantity=8),
            Inventory(product_id=products[3].id, warehouse_id=warehouses[1].id, quantity=15, min_quantity=5),
            Inventory(product_id=products[4].id, warehouse_id=warehouses[0].id, quantity=4, min_quantity=4),
            Inventory(product_id=products[5].id, warehouse_id=warehouses[1].id, quantity=18, min_quantity=6),
        ]
        session.add_all(inventories)

        history = [
            PriceHistory(product_id=products[0].id, price=Decimal("45990.00")),
            PriceHistory(product_id=products[0].id, price=Decimal("43990.00")),
            PriceHistory(product_id=products[0].id, price=Decimal("42990.00")),
            PriceHistory(product_id=products[1].id, price=Decimal("18990.00")),
            PriceHistory(product_id=products[1].id, price=Decimal("16990.00")),
            PriceHistory(product_id=products[4].id, price=Decimal("54990.00")),
            PriceHistory(product_id=products[4].id, price=Decimal("53990.00")),
        ]
        session.add_all(history)

        await session.commit()

        if storage.enabled:
            for product in products:
                await storage.put_product_card(
                    product.slug,
                    {
                        "name": product.name,
                        "short_description": product.short_description,
                        "description": product.description,
                        "image_url": product.image_url,
                        "price": str(product.price),
                        "old_price": str(product.old_price) if product.old_price else None,
                        "rating": str(product.rating),
                        "is_featured": product.is_featured,
                    },
                )


async def ensure_categories(session: AsyncSession) -> list[Category]:
    specs = [
        ("Автозапчасти", "autoparts", "Расходники и комплектующие для регулярного обслуживания."),
        ("Автотовары", "autogoods", "Полезные аксессуары и расходные материалы для водителей."),
        ("Багажники", "racks", "Поперечины, крепления и багажные системы на крышу."),
        ("Боксы", "boxes", "Аэродинамические боксы для путешествий и коммерческих поездок."),
    ]
    return await ensure_entities(
        session,
        Category,
        [(name, {"slug": slug, "description": description}) for name, slug, description in specs],
    )


async def ensure_manufacturers(session: AsyncSession) -> list[Manufacturer]:
    return await ensure_entities(
        session,
        Manufacturer,
        [
            ("NordDrive", {"country": "Россия"}),
            ("CargoLine", {"country": "Германия"}),
            ("TrailBox", {"country": "Польша"}),
            ("MSM Parts", {"country": "Россия"}),
        ],
    )


async def ensure_warehouses(session: AsyncSession) -> list[Warehouse]:
    return await ensure_entities(
        session,
        Warehouse,
        [
            ("Центральный склад", {"city": "Курган", "address_line": "ул. Омская, 179"}),
            ("Склад выдачи", {"city": "Курган", "address_line": "ул. Бурова-Петрова, 98"}),
        ],
    )


async def ensure_entities(session: AsyncSession, model, specs: list[tuple[str, dict]]) -> list:
    entities = []
    for name, extra in specs:
        entity = await session.scalar(select(model).where(model.name == name))
        if entity is None:
            entity = model(name=name, **extra)
            session.add(entity)
            await session.flush()
        entities.append(entity)
    return entities


async def sync_product_images(session: AsyncSession) -> None:
    for article, image_url in PRODUCT_IMAGE_BY_ARTICLE.items():
        await session.execute(
            update(Product).where(Product.article == article).values(image_url=image_url)
        )
    await session.commit()


def main() -> None:
    asyncio.run(seed_database())


if __name__ == "__main__":
    main()
