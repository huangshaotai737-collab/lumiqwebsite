import type {ProductPresentation} from "./generated/platform/content";
import { PRODUCT_BY_ID, type ProductId } from "./products";
export type CartItem = { id: ProductId; quantity: number };
export type CartAction = { type: "add" | "remove"; id: ProductId } | { type: "quantity"; id: ProductId; quantity: number } | { type: "restore"; items: CartItem[] };

export const CART_STORAGE_KEY = "lumiq-cart-v1";
export const CART_MAX_QUANTITY = 99;

export function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && Object.hasOwn(PRODUCT_BY_ID, value);
}

export function cartReducer(items: CartItem[], action: CartAction): CartItem[] {
  if (action.type === "restore") return action.items;
  if (!isProductId(action.id)) return items;
  if (action.type === "remove") return items.filter((item) => item.id !== action.id);
  if (action.type === "quantity") {
    if (!Number.isFinite(action.quantity)) return items;
    const quantity = Math.min(CART_MAX_QUANTITY, Math.floor(action.quantity));
    return quantity <= 0
      ? items.filter((item) => item.id !== action.id)
      : items.map((item) => item.id === action.id ? { ...item, quantity } : item);
  }
  const existing = items.find((item) => item.id === action.id);
  return existing
    ? items.map((item) => item.id === action.id ? { ...item, quantity: Math.min(CART_MAX_QUANTITY, item.quantity + 1) } : item)
    : [...items, { id: action.id, quantity: 1 }];
}

export function parseCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const data: unknown = JSON.parse(value);
    if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("items" in data) || !Array.isArray(data.items)) return [];
    const items: CartItem[] = [];
    for (const entry of data.items) {
      if (!entry || typeof entry !== "object" || !isProductId(entry.id) || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > CART_MAX_QUANTITY) continue;
      const existing = items.find((item) => item.id === entry.id);
      if (existing) existing.quantity = Math.min(CART_MAX_QUANTITY, existing.quantity + entry.quantity);
      else items.push({ id: entry.id, quantity: entry.quantity });
    }
    return items;
  } catch {
    return [];
  }
}

export function serializeCart(items: CartItem[]): string {
  return JSON.stringify({ version: 1, items: items.map(({ id, quantity }) => ({ id, quantity })) });
}

export function summarizeCart(items: CartItem[], products: Record<ProductId, Pick<ProductPresentation,"price">> = PRODUCT_BY_ID) {
  return items.reduce((summary, item) => {
    const price = products[item.id].price;
    summary.quantity += item.quantity;
    if (price.kind === "usd") {
      summary.referenceTotal += price.amount * item.quantity;
      summary.pricedQuantity += item.quantity;
    } else summary.unpricedQuantity += item.quantity;
    return summary;
  }, { quantity: 0, referenceTotal: 0, unpricedQuantity: 0, pricedQuantity: 0 });
}
