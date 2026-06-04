import Link from "next/link";
import { Tag } from "antd";
import Image from "next/image";

import { AddToCartButton } from "@/components/add-to-cart-button";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const isRemoteImage = product.image_url.startsWith("http://") || product.image_url.startsWith("https://");

  return (
    <article className="product-card">
      <div className="product-media">
        <Image
          src={product.image_url}
          alt={product.name}
          className="product-image"
          fill
          unoptimized={isRemoteImage}
          sizes="(max-width: 760px) 100vw, (max-width: 1080px) 50vw, 33vw"
        />
        <div className="product-badges">
          <Tag bordered={false}>{product.category.name}</Tag>
          <Tag bordered={false}>{product.article}</Tag>
        </div>
      </div>
      <div className="product-content">
        <div className="product-copy">
          <p className="eyebrow">{product.manufacturer.name}</p>
          <h3>{product.name}</h3>
          <p>{product.short_description}</p>
        </div>
        <div className="product-meta">
          <div>
            <p className="price-main">{formatPrice(product.price)}</p>
            {product.old_price ? (
              <p className="price-old">{formatPrice(product.old_price)}</p>
            ) : null}
          </div>
          <p className="muted-text">Остаток: {product.stock} шт.</p>
        </div>
        <div className="product-actions">
          <Link href={`/catalog/${product.slug}`} className="button-secondary ant-button-link">
            Открыть карточку
          </Link>
          <AddToCartButton product={product} className="button-primary" />
        </div>
      </div>
    </article>
  );
}
