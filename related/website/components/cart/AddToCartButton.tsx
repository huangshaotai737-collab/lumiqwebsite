"use client";
import { ShoppingCart } from "lucide-react";
import { useLocale } from "next-intl";
import { getCartMessages } from "@/lib/cart-messages";
import { isProductId } from "@/lib/cart";
import { useCart } from "./CartProvider";

export default function AddToCartButton({ productId }: { productId: string }) {
  const copy = getCartMessages(useLocale());
  const { add, ready } = useCart();
  if (!isProductId(productId)) return null;
  return <button type="button" className="cart-add-button" data-cart-add={productId} disabled={!ready} onClick={(event) => add(productId, event.detail !== 0, event.currentTarget)}><ShoppingCart size={18} strokeWidth={1.7} aria-hidden="true" /><span>{copy.add}</span></button>;
}
