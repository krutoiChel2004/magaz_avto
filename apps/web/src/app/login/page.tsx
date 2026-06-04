"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Form, Input, Tabs } from "antd";
import type { TabsProps } from "antd";

import { useAuth } from "@/components/auth-provider";

type Mode = "login" | "register";

interface AuthFormValues {
  first_name?: string;
  last_name?: string;
  patronymic?: string;
  email: string;
  phone?: string;
  password: string;
}

export default function LoginPage() {
  const { login, register, user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: AuthFormValues) {
    setSubmitting(true);
    setMessage("");

    try {
      if (mode === "login") {
        await login({
          email: values.email,
          password: values.password,
        });
        setMessage("Вход выполнен.");
      } else {
        await register({
          first_name: values.first_name ?? "",
          last_name: values.last_name ?? "",
          patronymic: values.patronymic ?? "",
          email: values.email,
          phone: values.phone ?? "",
          password: values.password,
        });
        setMessage("Регистрация завершена.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка авторизации");
    } finally {
      setSubmitting(false);
    }
  }

  const authTabs: TabsProps["items"] = [
    { key: "login", label: "Вход" },
    { key: "register", label: "Регистрация" },
  ];

  return (
    <section className="site-shell">
      <div className="auth-grid">
        <div className="auth-panel">
          <p className="eyebrow">Аккаунт</p>
          <h1 className="page-title">вход и регистрация</h1>
          <p className="lead" style={{ color: "rgba(255,255,255,0.8)" }}>
            После входа можно отслеживать статусы заказов, сохранять контактные
            данные и быстрее оформлять повторные покупки.
          </p>
          <ul className="bullet-list">
            <li>История заказов и сообщения по каждому этапу.</li>
            <li>Быстрое оформление без повторного ввода контактов.</li>
            <li>Удобный доступ к оплате и текущему статусу доставки.</li>
          </ul>
          {user ? (
            <p className="status-chip" style={{ background: "rgba(255,255,255,0.14)" }}>
              Вы вошли как {user.email}
            </p>
          ) : null}
        </div>

        <div className="form-card auth-form-shell">
          <Tabs
            activeKey={mode}
            items={authTabs}
            onChange={(key) => setMode(key as Mode)}
            className="auth-antd-tabs"
          />

          <Form<AuthFormValues>
            layout="vertical"
            className="field-grid auth-antd-form"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            {mode === "register" ? (
              <>
                <Form.Item label="Имя" name="first_name" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Фамилия" name="last_name" rules={[{ required: true }]}>
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Отчество" name="patronymic">
                  <Input size="large" />
                </Form.Item>
                <Form.Item label="Телефон" name="phone">
                  <Input size="large" />
                </Form.Item>
              </>
            ) : null}

            <Form.Item
              label="E-mail"
              name="email"
              rules={[{ required: true }, { type: "email" }]}
            >
              <Input size="large" />
            </Form.Item>
            <Form.Item label="Пароль" name="password" rules={[{ required: true }]}>
              <Input.Password size="large" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              className="button-primary"
              loading={submitting}
            >
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </Button>
          </Form>

          {message ? (
            <Alert
              className="auth-alert"
              type={message.includes("Ошибка") || message.includes("Неверный") ? "error" : "success"}
              message={message}
              showIcon
            />
          ) : null}

          <div className="button-row">
            <Link href="/account/orders" className="button-secondary ant-button-link">
              Перейти к заказам
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
