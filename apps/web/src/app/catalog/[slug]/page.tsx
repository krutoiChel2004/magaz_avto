import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/add-to-cart-button";
import { ApiRequestError, getProduct } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  let payload = null;

  try {
    payload = await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status !== 404) {
      return (
        <section className="site-shell content-panel">
          <div className="empty-state">
            <p>Карточка товара временно недоступна.</p>
            <Link href="/catalog" className="button-primary">
              Вернуться в каталог
            </Link>
          </div>
        </section>
      );
    }

    throw error;
  }

  if (!payload) {
    notFound();
  }

  const { product, price_history } = payload;
  const isRemoteImage =
    product.image_url.startsWith("http://") || product.image_url.startsWith("https://");
  const specs = [
    ["Артикул", product.article],
    ["Категория", product.category.name],
    ["Производитель", product.manufacturer.name],
    ["Материал", product.characteristic?.material ?? "Не указано"],
    ["Совместимость", product.characteristic?.compatibility ?? "Универсально"],
    ["Гарантия", product.characteristic?.warranty_months ? `${product.characteristic.warranty_months} мес.` : "Не указана"],
  ];

  return (
    <section className="site-shell content-panel product-detail-panel">
      <div className="detail-grid product-detail-grid">
        <div className="product-detail-media">
          <Image
            src={product.image_url}
            alt={product.name}
            className="detail-image product-detail-image"
            fill
            unoptimized={isRemoteImage}
            sizes="(max-width: 1080px) 100vw, 58vw"
            priority
          />
        </div>
        <div className="summary-card product-detail-summary">
          <p className="eyebrow">{product.category.name}</p>
          <h1 className="page-title">{product.name}</h1>
          <p className="lead">{product.short_description}</p>
          <div className="button-row">
            <p className="price-main">{formatPrice(product.price)}</p>
            {product.old_price ? (
              <p className="price-old">{formatPrice(product.old_price)}</p>
            ) : null}
          </div>
          <p className="muted-text">Остаток на складе: {product.stock} шт.</p>
          <div className="button-row">
            <AddToCartButton product={product} />
            <Link href="/checkout" className="button-secondary">
              Перейти к оформлению
            </Link>
          </div>
          <p>{product.description}</p>
        </div>
      </div>

      <div className="cards-two product-detail-meta">
        <article className="summary-card product-detail-card">
          <p className="eyebrow">Характеристики</p>
          <ul className="spec-list">
            {specs.map(([label, value]) => (
              <li key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </li>
            ))}
          </ul>
        </article>
        <article className="summary-card product-detail-card">
          <p className="eyebrow">Динамика цены</p>
          <ul className="spec-list">
            {price_history.map((point) => (
              <li key={`${point.changed_at}-${point.price}`}>
                <span>{new Date(point.changed_at).toLocaleDateString("ru-RU")}</span>
                <strong>{formatPrice(point.price)}</strong>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
