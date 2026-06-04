"use client";

import { Badge, Button, Space, Tag } from "antd";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";

export function SiteHeader() {
  const { totalCount } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="site-shell pt-6">
      <div className="topbar">
        <div>
          <p className="eyebrow">Запчасти, багажники и расходники</p>
          <Link href="/" className="brand-link">
            MCM Auto Store
          </Link>
        </div>
        <div className="header-actions">
          <Tag className="status-chip" bordered={false}>
            Курган · розница и оптовые заказы
          </Tag>
          <Badge count={totalCount} size="small">
            <Link href="/cart" className="button-secondary ant-button-link">
              Корзина
            </Link>
          </Badge>
        </div>
      </div>
      <nav className="nav-panel">
        <div className="nav-links">
          <Link href="/catalog">Каталог</Link>
          <Link href="/checkout">Доставка и оплата</Link>
          <Link href="/account/orders">Мои заказы</Link>
        </div>
        <div className="nav-links">
          {user ? (
            <Space size="middle">
              <span className="muted-text">
                {user.first_name} · {user.role}
              </span>
              <Button type="text" className="link-button ant-link-button" onClick={logout}>
                Выйти
              </Button>
            </Space>
          ) : (
            <Link href="/login">Войти</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
