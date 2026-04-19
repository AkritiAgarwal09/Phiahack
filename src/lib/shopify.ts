// Lightweight money formatter + a shared product type alias.
// (Shopify integration was removed; we keep the type name for backwards compat
// across components.)

import type { LocalProduct } from "@/data/shopProducts";

export type ShopifyProduct = LocalProduct;

export function formatMoney(amount: string | number, currencyCode = "USD") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
