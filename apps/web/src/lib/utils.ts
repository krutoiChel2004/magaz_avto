export function formatPrice(value: number | string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function pluralizeItems(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "товар";
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "товара";
  }
  return "товаров";
}

export function normalizeAppHref(href: string) {
  if (href.startsWith("/")) {
    return href;
  }

  try {
    const url = new URL(href);
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return href;
  }
}

export function buildOrderPaymentHref(order: { payment_url: string | null; payment_token: string | null }) {
  if (order.payment_token) {
    return `/account/orders?pay=${encodeURIComponent(order.payment_token)}`;
  }

  return order.payment_url ? normalizeAppHref(order.payment_url) : null;
}

export function orderStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "Новый";
    case "confirmed":
      return "Подтвержден";
    case "processing":
      return "В работе";
    case "paid":
      return "Оплачен";
    case "shipped":
      return "Отправлен";
    case "completed":
      return "Завершён";
    case "cancelled":
      return "Отменён";
    default:
      return status;
  }
}

export function orderStatusColor(status: string) {
  switch (status) {
    case "paid":
      return "green";
    case "shipped":
      return "blue";
    case "confirmed":
    case "processing":
      return "orange";
    case "completed":
      return "default";
    case "cancelled":
      return "red";
    default:
      return "gold";
  }
}
