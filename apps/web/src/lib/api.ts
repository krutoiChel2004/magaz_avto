import {
  mockDashboardPayload,
  mockOrders,
} from "@/lib/mock-data";
import type {
  Category,
  DashboardPayload,
  HomePayload,
  Order,
  Product,
  ProductPagePayload,
} from "@/lib/types";

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed with ${status}`);
    this.status = status;
  }
}

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api";

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new ApiRequestError(response.status);
  }
  return (await response.json()) as T;
}

async function requestJsonWithFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    return await requestJson<T>(path);
  } catch {
    return fallback;
  }
}

export async function getHomePayload(): Promise<HomePayload> {
  return requestJson("/home");
}

export async function getCategories(): Promise<Category[]> {
  return requestJson("/categories");
}

export async function getProducts(filters?: {
  category?: string;
  search?: string;
  sort?: string;
  featured?: boolean;
}): Promise<Product[]> {
  const params = new URLSearchParams();
  if (filters?.category) {
    params.set("category", filters.category);
  }
  if (filters?.search) {
    params.set("search", filters.search);
  }
  if (filters?.sort) {
    params.set("sort", filters.sort);
  }
  if (typeof filters?.featured === "boolean") {
    params.set("featured", String(filters.featured));
  }

  const query = params.toString();
  return requestJson(`/products${query ? `?${query}` : ""}`);
}

export async function getProduct(slug: string): Promise<ProductPagePayload | null> {
  try {
    return await requestJson(`/products/${slug}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }

    throw error;
  }
}

export async function getDemoOrders(): Promise<Order[]> {
  return requestJsonWithFallback("/orders/me", mockOrders);
}

export async function getDemoDashboard(): Promise<DashboardPayload> {
  return requestJsonWithFallback("/admin/dashboard", mockDashboardPayload);
}
