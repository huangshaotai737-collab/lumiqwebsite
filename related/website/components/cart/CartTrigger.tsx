"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import { ShoppingCart } from "lucide-react";
import {useCartCopy} from "@/components/content/useCartCopy";
import { useCart } from "./CartProvider";

export default function CartTrigger({ onOpen }: { onOpen?: () => void }) {
  const cms = useContentAdapter();
  const copy = useCartCopy();
  const { quantity, isOpen, ready, openCart } = useCart();
  return <button type="button" className="cart-nav-trigger" disabled={!ready} aria-label={`${copy.open} · ${copy.countLabel(quantity)}`} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="lumiq-cart" onClick={(event) => { onOpen?.(); openCart(event.detail !== 0, event.currentTarget); }}>
    <ShoppingCart size={22} strokeWidth={1.6} aria-hidden="true" />
    {quantity ? <span className="cart-nav-count" aria-hidden="true">{quantity > 99 ? cms.text("field_9655987c15b2fe51") : quantity}</span> : null}
  </button>;
}
