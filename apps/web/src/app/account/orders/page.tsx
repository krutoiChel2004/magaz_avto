"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { App, Button, Card, Empty, List, Tag } from "antd";

import { useAuth } from "@/components/auth-provider";
import { mockNotifications, mockOrders } from "@/lib/mock-data";
import type { Notification, Order } from "@/lib/types";
import {
  buildOrderPaymentHref,
  formatDate,
  formatPrice,
  normalizeAppHref,
  orderStatusColor,
  orderStatusLabel,
} from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export default function AccountOrdersPage() {
  return (
    <Suspense fallback={<section className="site-shell content-panel">Загрузка заказов...</section>}>
      <AccountOrdersContent />
    </Suspense>
  );
}

function AccountOrdersContent() {
  const { message } = App.useApp();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [payingToken, setPayingToken] = useState<string | null>(null);
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);
  const shouldLoadRemoteOrders = Boolean(user && token && !token.startsWith("demo-"));
  const payToken = searchParams.get("pay");

  useEffect(() => {
    if (!shouldLoadRemoteOrders || !token) {
      return;
    }

    void Promise.all([
      fetch(`${API_URL}/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => response.json() as Promise<Order[]>),
      fetch(`${API_URL}/orders/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => response.json() as Promise<Notification[]>),
    ])
      .then(([ordersData, notificationsData]) => {
        setOrders(ordersData);
        setNotifications(notificationsData);
      })
      .catch(() => {
        setOrders(mockOrders);
        setNotifications(mockNotifications);
      });
  }, [shouldLoadRemoteOrders, token]);

  const visibleOrders = useMemo(
    () => (user ? (shouldLoadRemoteOrders ? orders : mockOrders) : []),
    [orders, shouldLoadRemoteOrders, user],
  );
  const visibleNotifications = useMemo(
    () =>
      user
        ? shouldLoadRemoteOrders
          ? notifications
          : mockNotifications
        : [],
    [notifications, shouldLoadRemoteOrders, user],
  );

  const paymentOrder = useMemo(
    () => (payToken ? visibleOrders.find((order) => order.payment_token === payToken) : undefined),
    [payToken, visibleOrders],
  );
  const paymentHref = paymentOrder ? buildOrderPaymentHref(paymentOrder) : null;
  const canShowPaymentActions = Boolean(
    paymentOrder && ["confirmed", "processing"].includes(paymentOrder.status),
  );

  function clearPaymentQuery() {
    router.replace(pathname, { scroll: false });
  }

  async function refreshNotifications() {
    if (!token || !shouldLoadRemoteOrders) {
      return;
    }

    try {
      const notificationsResponse = await fetch(`${API_URL}/orders/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (notificationsResponse.ok) {
        setNotifications((await notificationsResponse.json()) as Notification[]);
      }
    } catch {
      // keep current notifications when the background refresh fails
    }
  }

  async function readErrorMessage(response: Response, fallback: string) {
    try {
      const payload = (await response.json()) as { detail?: string };
      return payload.detail || fallback;
    } catch {
      return fallback;
    }
  }

  async function handlePayment(paymentToken: string) {
    if (!token || !shouldLoadRemoteOrders) {
      message.warning("Для оплаты войдите в свой аккаунт.");
      return;
    }

    setPayingToken(paymentToken);
    try {
      const response = await fetch(`${API_URL}/orders/payments/${paymentToken}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Не удалось провести оплату"));
      }

      const updated = (await response.json()) as Order;
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      clearPaymentQuery();
      message.success("Оплата прошла успешно.");
      await refreshNotifications();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Не удалось провести оплату.");
    } finally {
      setPayingToken(null);
    }
  }

  async function handleCancelOrder(orderId: number) {
    if (!token || !shouldLoadRemoteOrders) {
      message.warning("Для отмены войдите в свой аккаунт.");
      return;
    }

    setCancelingOrderId(orderId);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Не удалось отменить заказ"));
      }

      const updated = (await response.json()) as Order;
      setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (payToken) {
        clearPaymentQuery();
      }
      message.success("Заказ отменён, остатки возвращены на склад.");
      await refreshNotifications();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Не удалось отменить заказ.");
    } finally {
      setCancelingOrderId(null);
    }
  }

  async function markNotificationRead(notificationId: number) {
    if (!token || !shouldLoadRemoteOrders) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/orders/notifications/${notificationId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        return;
      }

      const updated = (await response.json()) as Notification;
      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch {
      // ignore background notification errors
    }
  }

  return (
    <section className="site-shell content-panel">
      <div className="page-head">
        <div>
          <p className="eyebrow">Заказы</p>
          <h1 className="page-title">мои заказы</h1>
        </div>
        <p className="lead">
          Здесь отображаются статусы заказов, ссылки на оплату и сообщения по
          каждому этапу обработки.
        </p>
      </div>

      {!user ? (
        <div className="empty-state">
          <p>Чтобы увидеть заказы, сначала выполните вход.</p>
          <Link href="/login" className="button-primary">
            Перейти к авторизации
          </Link>
        </div>
      ) : (
        <div className="account-stack">
          <Card className="admin-card" title="Уведомления">
            <List
              dataSource={visibleNotifications}
              locale={{ emptyText: <Empty description="Новых уведомлений пока нет" /> }}
              renderItem={(notification) => (
                <List.Item
                  actions={[
                    notification.order_id && notification.link_url ? (
                      <Link
                        key="open"
                        href={normalizeAppHref(notification.link_url)}
                        onClick={() => void markNotificationRead(notification.id)}
                        className="button-secondary ant-button-link"
                      >
                        Перейти к оплате
                      </Link>
                    ) : null,
                    !notification.is_read ? (
                      <Button
                        key="read"
                        className="button-secondary"
                        onClick={() => void markNotificationRead(notification.id)}
                      >
                        Прочитано
                      </Button>
                    ) : null,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={
                      <div className="notification-title-row">
                        <span>{notification.title}</span>
                        {!notification.is_read ? <Tag color="gold">Новое</Tag> : null}
                      </div>
                    }
                    description={
                      <div className="notification-copy">
                        <span>{notification.message}</span>
                        <span className="muted-text">{formatDate(notification.created_at)}</span>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>

          {paymentOrder && paymentOrder.payment_token && canShowPaymentActions ? (
            <Card className="admin-card" title={`Оплата заказа ${paymentOrder.number}`}>
              <div className="payment-callout">
                <p className="lead">
                  Заказ подтверждён. После оплаты мы сразу передадим его в дальнейшую
                  обработку и подготовим к выдаче или отправке.
                </p>
                <div className="button-row">
                  {paymentHref ? (
                    <Link href={paymentHref} className="button-secondary ant-button-link">
                      Ссылка на оплату
                    </Link>
                  ) : null}
                  <Button
                    type="primary"
                    className="button-primary"
                    loading={payingToken === paymentOrder.payment_token}
                    onClick={() => void handlePayment(paymentOrder.payment_token!)}
                  >
                    Оплатить {formatPrice(paymentOrder.total_amount)}
                  </Button>
                  <Button
                    danger
                    loading={cancelingOrderId === paymentOrder.id}
                    onClick={() => void handleCancelOrder(paymentOrder.id)}
                  >
                    Отменить заказ
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="orders-grid">
            {visibleOrders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">{order.number}</p>
                    <h2>{order.customer_name}</h2>
                  </div>
                  <div className="order-meta">
                    <Tag color={orderStatusColor(order.status)}>{orderStatusLabel(order.status)}</Tag>
                    <strong>{formatPrice(order.total_amount)}</strong>
                  </div>
                </div>
                <p className="muted-text">
                  {formatDate(order.created_at)}
                  {order.confirmed_at ? ` · подтверждён ${formatDate(order.confirmed_at)}` : ""}
                  {order.paid_at ? ` · оплачен ${formatDate(order.paid_at)}` : ""}
                  {order.shipped_at ? ` · отправлен ${formatDate(order.shipped_at)}` : ""}
                </p>
                <ul className="spec-list">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.product_name_snapshot} × {item.quantity}
                      </span>
                      <strong>{formatPrice(item.unit_price)}</strong>
                    </li>
                  ))}
                </ul>
                {["confirmed", "processing"].includes(order.status) || order.status === "new" ? (
                  <div className="button-row" style={{ marginTop: "1rem" }}>
                    {["confirmed", "processing"].includes(order.status) && buildOrderPaymentHref(order) ? (
                      <Link
                        href={buildOrderPaymentHref(order)!}
                        className="button-secondary ant-button-link"
                      >
                        Перейти к оплате
                      </Link>
                    ) : null}
                    <Button
                      danger
                      loading={cancelingOrderId === order.id}
                      onClick={() => void handleCancelOrder(order.id)}
                    >
                      Отменить заказ
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
