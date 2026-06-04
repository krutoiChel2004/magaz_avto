import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { getHomePayload } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const home = await getHomePayload().catch(() => ({
    featured_products: [],
    latest_products: [],
    categories: [],
  }));

  return (
    <>
      <section className="site-shell">
        <div className="hero-panel">
          <div className="hero-copy">
            <div className="hero-copy-flow">
              <div className="hero-copy-top">
                <p className="eyebrow">MCM Auto Store</p>
                <h1 className="hero-title">запчасти, багажные системы и автоаксессуары</h1>
                <p className="hero-lead">
                  Подберите расходники, багажники, боксы и товары для обслуживания
                  автомобиля в одном каталоге. Актуальные цены, понятный заказ и
                  быстрая сборка без лишних звонков.
                </p>
              </div>

              <ul className="hero-list">
                <li>
                  <span>Подбор по бренду, категории и артикулу</span>
                  <strong>быстрый поиск</strong>
                </li>
                <li>
                  <span>Регулярно обновляем цены и наличие</span>
                  <strong>без сюрпризов</strong>
                </li>
                <li>
                  <span>Самовывоз, доставка и сопровождение заказа</span>
                  <strong>6 дней в неделю</strong>
                </li>
              </ul>

              <div className="hero-cta">
                <Link href="/catalog" className="button-primary">
                  Открыть каталог
                </Link>
                <Link href="/account/orders" className="button-secondary">
                  Мои заказы
                </Link>
              </div>
            </div>
          </div>
          <div className="hero-side">
            <div>
              <p className="eyebrow">Сервис магазина</p>
              <h2 className="section-title">всё нужное для города, трассы и поездок</h2>
            </div>
            <div className="stats-panel">
              <ul className="summary-list">
                <li>
                  <span>Популярные позиции</span>
                  <strong>в наличии</strong>
                </li>
                <li>
                  <span>Сборка заказа</span>
                  <strong>в день обращения</strong>
                </li>
                <li>
                  <span>Для частных клиентов и СТО</span>
                  <strong>розница и опт</strong>
                </li>
              </ul>
            </div>
            <div className="callout-panel">
              <p className="eyebrow">Личный кабинет</p>
              <p className="lead">
                Авторизуйтесь, чтобы смотреть статусы заказов, сохранять контактные
                данные и быстрее оформлять повторные покупки.
              </p>
              <Link href="/login" className="button-secondary">
                Войти в аккаунт
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="site-shell category-strip">
        {home.categories.map((category) => (
          <Link
            key={category.id}
            href={`/catalog?category=${category.slug}`}
            className="link-card"
          >
            <p className="eyebrow">Категория</p>
            <strong>{category.name}</strong>
            <span className="muted-text">{category.description}</span>
          </Link>
        ))}
      </section>

      <section className="site-shell content-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Популярные товары</p>
            <h2 className="section-title">часто выбирают</h2>
          </div>
          <p className="lead">
            В подборке собраны позиции, которые чаще всего берут для регулярного
            обслуживания автомобиля, поездок и перевозки багажа.
          </p>
        </div>
        <div className="product-grid">
          {home.featured_products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!home.featured_products.length ? (
          <div className="empty-state">Раздел обновляется. Загляните немного позже.</div>
        ) : null}
      </section>

      <section className="site-shell content-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Новинки</p>
            <h2 className="section-title">свежее поступление</h2>
          </div>
          <Link href="/catalog" className="button-secondary">
            Смотреть все товары
          </Link>
        </div>
        <div className="product-grid">
          {home.latest_products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {!home.latest_products.length ? (
          <div className="empty-state">Новых товаров пока нет.</div>
        ) : null}
      </section>
    </>
  );
}
