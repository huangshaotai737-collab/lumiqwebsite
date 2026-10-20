"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";

import { useLocale } from "next-intl";
import Image from "@/components/content/ContentImage";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import type { RefObject } from "react";
import { Link } from "@/i18n/navigation";
import { CART_MAX_QUANTITY, summarizeCart } from "@/lib/cart";
import {useCartCopy} from "@/components/content/useCartCopy";
import { useCart } from "./CartProvider";

export default function CartDrawer({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const cms = useContentAdapter();
  const locale = useLocale();
  const copy = useCartCopy();
  const { items, storageAvailable, closeCart, remove, setQuantity } = useCart();
  const summary = summarizeCart(items, cms.snapshot.products);
  const formatPrice = (amount: number) => `USD ${new Intl.NumberFormat(locale === "zh-hant" ? "zh-TW" : locale, { maximumFractionDigits: 2 }).format(amount)}`;

  return (
    <dialog
      ref={dialogRef}
      id="lumiq-cart"
      className="cart-drawer"
      aria-labelledby="cart-title"
      aria-describedby="cart-local-note"
      onCancel={(event) => { event.preventDefault(); closeCart(false); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')].filter((element) => element.getClientRects().length > 0);
        if (!controls.length) return;
        // Safari may omit buttons from its default Tab sequence, depending on OS settings.
        // Use the visible control order throughout this modal, not just at its boundaries.
        const currentIndex = controls.indexOf(document.activeElement as HTMLElement);
        const nextIndex = currentIndex < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (currentIndex + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
        event.preventDefault();
        controls[nextIndex]?.focus();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeCart(event.detail !== 0);
      }}
    >
      <div className="cart-panel">
        <header className="cart-header">
          <div><p className="cart-eyebrow">{cms.text("field_031f92cca3852a5b")}</p><h2 id="cart-title">{copy.title}</h2><p className="cart-count">{copy.countLabel(summary.quantity)}</p></div>
          <button type="button" className="cart-icon-button" aria-label={copy.close} autoFocus onClick={(event) => closeCart(event.detail !== 0)}><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="cart-content">
          {items.length ? (
            <ul className="cart-items">
              {items.map(({ id, quantity }) => {
                const product = cms.snapshot.products[id];
                const priceLabel = product.price.kind === "usd" ? formatPrice(product.price.amount) : product.price.kind === "included" ? copy.included : copy.pending;
                return <li className="cart-item" key={id} data-cart-product={id}>
                  <Link href={product.href} className="cart-product-art" aria-label={product.name} onClick={() => closeCart(false)}><Image src={product.image} alt="" width={120} height={120} sizes="96px" /></Link>
                  <div className="cart-item-copy">
                    <Link href={product.href} className="cart-product-name" onClick={() => closeCart(false)}>{product.name}</Link>
                    <p className="cart-item-price">{priceLabel}</p>
                    <div className="cart-item-controls">
                      <div className="cart-quantity" role="group" aria-label={`${product.name} · ${copy.quantity}`}>
                        <button type="button" aria-label={`${copy.decrease} · ${product.name}`} onClick={() => setQuantity(id, quantity - 1)}><Minus size={14} aria-hidden="true" /></button>
                        <output aria-label={copy.quantity} aria-live="polite">{quantity}</output>
                        <button type="button" disabled={quantity >= CART_MAX_QUANTITY} aria-label={`${copy.increase} · ${product.name}`} onClick={() => setQuantity(id, quantity + 1)}><Plus size={14} aria-hidden="true" /></button>
                      </div>
                      <button type="button" className="cart-remove" aria-label={`${copy.remove} · ${product.name}`} onClick={() => remove(id)}>{copy.remove}</button>
                    </div>
                  </div>
                </li>;
              })}
            </ul>
          ) : (
            <div className="cart-empty"><ShoppingCart size={44} strokeWidth={1.25} aria-hidden="true" /><h3>{copy.emptyTitle}</h3><p>{copy.emptyBody}</p><Link className="cart-primary" href="/products" onClick={() => closeCart(false)}>{copy.browse}</Link></div>
          )}
        </div>
        <footer className="cart-footer">
          {items.length ? <>
            <div className="cart-total"><span>{copy.referenceTotal}</span><strong>{summary.pricedQuantity ? formatPrice(summary.referenceTotal) : copy.noPublishedTotal}</strong></div>
            {summary.unpricedQuantity ? <p className="cart-price-note">{copy.unpriced(summary.unpricedQuantity)}</p> : null}
            <p className="cart-price-note">{copy.priceNote}</p>
            <Link href="/prelaunch" className="cart-primary" onClick={() => closeCart(false)}>{copy.interest}</Link>
            <button type="button" className="cart-continue" onClick={(event) => closeCart(event.detail !== 0)}>{copy.continue}</button>
          </> : null}
          <p id="cart-local-note" className="cart-local-note">{storageAvailable ? copy.note : `${copy.note} ${copy.storageUnavailable}`}</p>
        </footer>
      </div>
    </dialog>
  );
}
