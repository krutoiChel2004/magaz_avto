"use client";

import { Button } from "antd";

import { useCart } from "@/components/cart-provider";
import type { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { addItem } = useCart();

  return (
    <Button
      type="primary"
      className={className ?? "button-primary"}
      onClick={() => addItem(product)}
    >
      Добавить в корзину
    </Button>
  );
}
