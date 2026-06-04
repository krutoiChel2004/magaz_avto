"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { formatPrice, pluralizeItems } from "@/lib/utils";

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCart();
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return (
    <section className="site-shell content-panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Корзина</p>
          <h1 className="page-title">ваши товары</h1>
        </div>
        <p className="lead">
          Проверьте состав заказа, количество и итоговую сумму перед оформлением.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Корзина пока пуста.</p>
          <Link href="/catalog" className="button-primary">
            Открыть каталог
          </Link>
        </div>
      ) : (
        <div className="cards-two">
          <div className="cart-list">
            {items.map((item) => (
              <article key={item.id} className="order-card">
                <div className="cart-row">
                  {(() => {
                    const isRemoteImage =
                      item.image_url.startsWith("http://") || item.image_url.startsWith("https://");
                    return (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        className="cart-thumb"
                        width={120}
                        height={95}
                        unoptimized={isRemoteImage}
                      />
                    );
                  })()}
                  <div className="cart-copy">
                    <p className="eyebrow">{item.article}</p>
                    <h2>{item.name}</h2>
                    <p className="price-main">{formatPrice(item.price)}</p>
                  </div>
                  <div className="cart-actions">
                    <div className="cart-qty">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="cart-remove"
                      onClick={() => removeItem(item.id)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary-card">
            <p className="eyebrow">Итог</p>
            <ul className="summary-list">
              <li>
                <span>Позиции</span>
                <strong>
                  {items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                  {pluralizeItems(items.reduce((sum, item) => sum + item.quantity, 0))}
                </strong>
              </li>
              <li>
                <span>Сумма</span>
                <strong>{formatPrice(total)}</strong>
              </li>
            </ul>
            <Link href="/checkout" className="button-primary">
              Оформить заказ
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
