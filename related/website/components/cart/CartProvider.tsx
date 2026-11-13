"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {useVisualPreview} from '@/components/content/SiteContentProvider';
import { usePathname } from "@/i18n/navigation";
import { CART_STORAGE_KEY, cartReducer, parseCart, serializeCart, summarizeCart, type CartItem } from "@/lib/cart";
import { type ProductId } from "@/lib/products";
import {useCartCopy} from "@/components/content/useCartCopy";
import CartDrawer from "./CartDrawer";

type CartContextValue = {
  items: CartItem[];
  quantity: number;
  isOpen: boolean;
  ready: boolean;
  storageAvailable: boolean;
  openCart: (animate?: boolean, trigger?: HTMLElement) => void;
  closeCart: (animate?: boolean) => void;
  add: (id: ProductId, animate?: boolean, trigger?: HTMLElement) => void;
  remove: (id: ProductId) => void;
  setQuantity: (id: ProductId, quantity: number) => void;
};
const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("Cart controls require CartProvider");
  return cart;
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const visual = useVisualPreview();
  const cms = useContentAdapter();
  const copy = useCartCopy();
  const pathname = usePathname();
  const [items, dispatch] = useReducer(cartReducer, []);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [isOpen, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (visual) { setReady(true); return; }
    try {
      dispatch({ type: "restore", items: parseCart(window.localStorage.getItem(CART_STORAGE_KEY)) });
    } catch { setStorageAvailable(false); }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY || event.key === null) {
        dispatch({ type: "restore", items: parseCart(event.newValue) });
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [visual]);

  useEffect(() => {
    if (!ready || visual) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
      setStorageAvailable(true);
    } catch { setStorageAvailable(false); }
  }, [items, ready, visual]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  const openCart = useCallback((animate = true, trigger?: HTMLElement) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    animationRef.current?.cancel();
    closingRef.current = false;
    if (!dialog.open) {
      returnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      dialog.showModal();
      setOpen(true);
      if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animationRef.current = dialog.animate([
          { transform: "translateX(100%)", opacity: 0 },
          { transform: "translateX(0)", opacity: 1 },
        ], { duration: 220, easing: "cubic-bezier(0.32, 0.72, 0, 1)" });
      }
    }
  }, []);

  const closeCart = useCallback((animate = true) => {
    const dialog = dialogRef.current;
    if (!dialog?.open || closingRef.current) return;
    const current = getComputedStyle(dialog);
    const startingTransform = current.transform;
    const startingOpacity = current.opacity;
    animationRef.current?.cancel();
    closingRef.current = true;
    const finish = () => {
      if (!closingRef.current) return;
      dialog.close();
      setOpen(false);
      closingRef.current = false;
      returnFocusRef.current?.focus({ preventScroll: true });
    };
    if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const animation = dialog.animate([
        { transform: startingTransform, opacity: startingOpacity },
        { transform: "translateX(100%)", opacity: 0 },
      ], { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
      animationRef.current = animation;
      animation.finished.then(finish).catch(() => {});
    } else finish();
  }, []);

  useEffect(() => {
    if (previousPathRef.current !== pathname) closeCart(false);
    previousPathRef.current = pathname;
  }, [pathname, closeCart]);

  useEffect(() => () => { animationRef.current?.cancel(); }, []);

  const add = useCallback((id: ProductId, animate = true, trigger?: HTMLElement) => {
    dispatch({ type: "add", id });
    setAnnouncement(copy.added(cms.snapshot.products[id].name));
    openCart(animate, trigger);
  }, [cms.snapshot.products, copy, openCart]);
  const remove = useCallback((id: ProductId) => dispatch({ type: "remove", id }), []);
  const setQuantity = useCallback((id: ProductId, quantity: number) => dispatch({ type: "quantity", id, quantity }), []);
  const quantity = summarizeCart(items).quantity;
  const value = useMemo(() => ({ items, quantity, isOpen, ready, storageAvailable, openCart, closeCart, add, remove, setQuantity }), [items, quantity, isOpen, ready, storageAvailable, openCart, closeCart, add, remove, setQuantity]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer dialogRef={dialogRef} />
      <p className="cart-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </CartContext.Provider>
  );
}
