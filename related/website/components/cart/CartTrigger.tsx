"use client";
import { ShoppingCart } from "lucide-react";
import { useLocale } from "next-intl";
import { getCartMessages } from "@/lib/cart-messages";
import { useCart } from "./CartProvider";

export default function CartTrigger({ onOpen }: { onOpen?: () => void }) {
  const copy = getCartMessages(useLocale());
  const { quantity, isOpen, ready, openCart } = useCart();
  return <button type="button" className="cart-nav-trigger" disabled={!ready} aria-label={`${copy.open} · ${copy.countLabel(quantity)}`} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="lumiq-cart" onClick={(event) => { onOpen?.(); openCart(event.detail !== 0, event.currentTarget); }}>
    <ShoppingCart size={22} strokeWidth={1.6} aria-hidden="true" />
    {quantity ? <span className="cart-nav-count" aria-hidden="true">{quantity > 99 ? "99+" : quantity}</span> : null}
  </button>;
}
