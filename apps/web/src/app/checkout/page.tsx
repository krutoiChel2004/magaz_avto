"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";
import type { Order } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const { token, user } = useAuth();
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const [status, setStatus] = useState<string>("");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  async function readErrorMessage(response: Response, fallback: string) {
    try {
      const payload = (await response.json()) as { detail?: string };
      return payload.detail || fallback;
    } catch {
      return fallback;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatedOrder(null);

    if (!items.length) {
      setStatus("Сначала добавьте товары в корзину.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      customer_name: String(formData.get("customer_name")),
      customer_email: String(formData.get("customer_email")),
      customer_phone: String(formData.get("customer_phone")),
      comment: String(formData.get("comment") ?? ""),
      address: {
        city: String(formData.get("city")),
        street: String(formData.get("street")),
        building: String(formData.get("building")),
        apartment: String(formData.get("apartment") ?? ""),
        postal_code: String(formData.get("postal_code") ?? ""),
        comment: String(formData.get("address_comment") ?? ""),
      },
      items: items.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
      })),
    };

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Не удалось отправить заказ"));
      }
      const order = (await response.json()) as Order;
      clearCart();
      setCreatedOrder(order);
      setStatus(`Заказ ${order.number} принят. Остатки на складе обновлены сразу после оформления.`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Не удалось отправить заказ. Попробуйте ещё раз или свяжитесь с магазином.",
      );
    }
  }

  return (
    <section className="site-shell content-panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Оформление</p>
          <h1 className="page-title">контакты и доставка</h1>
        </div>
        <p className="lead">
          Укажите получателя и адрес, чтобы мы быстро собрали и передали заказ.
        </p>
      </div>

      <div className="checkout-grid">
        <form className="form-card field-grid" onSubmit={handleSubmit}>
          <label>
            ФИО
            <input
              name="customer_name"
              className="input"
              defaultValue={user ? `${user.last_name} ${user.first_name}` : ""}
              required
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              name="customer_email"
              className="input"
              defaultValue={user?.email ?? ""}
              required
            />
          </label>
          <label>
            Телефон
            <input
              name="customer_phone"
              className="input"
              defaultValue={user?.phone ?? ""}
              required
            />
          </label>
          <label>
            Город
            <input name="city" className="input" defaultValue="Курган" required />
          </label>
          <label>
            Улица
            <input name="street" className="input" required />
          </label>
          <label>
            Дом
            <input name="building" className="input" required />
          </label>
          <label>
            Квартира / офис
            <input name="apartment" className="input" />
          </label>
          <label>
            Индекс
            <input name="postal_code" className="input" />
          </label>
          <label>
            Комментарий к заказу
            <textarea name="comment" className="textarea" />
          </label>
          <button type="submit" className="button-primary">
            Оформить заказ
          </button>
          {status ? <p className="input-hint">{status}</p> : null}
          {createdOrder ? (
            <div className="button-row">
              <Link href="/account/orders" className="button-secondary ant-button-link">
                Перейти к заказам
              </Link>
            </div>
          ) : null}
        </form>

        <aside className="summary-card">
          <p className="eyebrow">Ваш заказ</p>
          {items.length === 0 ? (
            <div className="empty-state">В корзине нет товаров.</div>
          ) : (
            <ul className="spec-list">
              {items.map((item) => (
                <li key={item.id}>
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <strong>{formatPrice(Number(item.price) * item.quantity)}</strong>
                </li>
              ))}
            </ul>
          )}
          <p className="price-main">{formatPrice(total)}</p>
        </aside>
      </div>
    </section>
  );
}
