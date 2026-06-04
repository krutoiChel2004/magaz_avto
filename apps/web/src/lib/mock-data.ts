import type {
  DashboardPayload,
  Notification,
  Order,
} from "@/lib/types";

export const mockOrders: Order[] = [
  {
    id: 1,
    number: "MCM-DEMO-0001",
    status: "processing",
    customer_name: "Алексей Петров",
    customer_email: "client@msm-auto.ru",
    customer_phone: "+7 (900) 000-00-03",
    comment: "Нужна доставка в будний день",
    total_amount: "19980.00",
    payment_url: "/account/orders?pay=demo-payment-token",
    payment_token: "demo-payment-token",
    confirmed_at: "2026-05-20T11:00:00Z",
    paid_at: null,
    shipped_at: null,
    created_at: "2026-05-20T10:00:00Z",
    address: {
      id: 1,
      city: "Курган",
      street: "ул. Коли Мяготина",
      building: "84",
      apartment: "14",
      postal_code: "640000",
      comment: "Позвонить за час до доставки",
    },
    items: [
      {
        id: 1,
        product_id: 2,
        product_name_snapshot: "Багажник NordDrive 135",
        quantity: 1,
        unit_price: "16990.00",
      },
      {
        id: 2,
        product_id: 3,
        product_name_snapshot: "Тормозные колодки MSM BR-2104",
        quantity: 1,
        unit_price: "3490.00",
      },
    ],
  },
];

export const mockDashboardPayload: DashboardPayload = {
  metrics: [
    { label: "Заказов", value: "14", note: "За последние недели" },
    { label: "Товаров", value: "6", note: "Активных SKU в каталоге" },
    { label: "Выручка", value: "128 540 ₽", note: "Подтверждённые продажи" },
    { label: "Средний чек", value: "9 181 ₽", note: "Средняя сумма покупки" },
  ],
  recent_orders: mockOrders,
  low_stock: [
    {
      product_name: "Аэробокс CargoLine 620",
      article: "BX-620",
      stock: 4,
      min_quantity: 4,
    },
    {
      product_name: "Аэробокс TrailBox 480",
      article: "BX-480",
      stock: 8,
      min_quantity: 8,
    },
  ],
};

export const mockNotifications: Notification[] = [
  {
    id: 1,
    title: "Заказ подтверждён",
    message: "Заказ MCM-DEMO-0001 подтверждён. Перейдите к оплате по ссылке ниже.",
    link_url: "/account/orders?pay=demo-payment-token",
    is_read: false,
    created_at: "2026-05-20T11:00:00Z",
    order_id: 1,
  },
];
