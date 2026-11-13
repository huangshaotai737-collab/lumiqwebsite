import type { ProductId, ShippingAddress, UUID } from "./core";
export type OrderTotals = {
  itemsMinor: number;
  shippingMinor: number | null;
  taxMinor: number | null;
  payableMinor: number | null;
};
export type OrderItem = {
  skuId: UUID;
  productId: ProductId;
  name: string;
  quantity: number;
  unitMinor: number;
};
export type Order = {
  id: UUID;
  userId: UUID;
  status: "pending_payment_setup" | "cancelled";
  paymentStatus: "not_configured";
  fulfillmentStatus: "not_scheduled";
  currency: string;
  totals: OrderTotals;
  items: OrderItem[];
  createdAt: string;
};
export type CreateOrderResult = { order: Order; reused: boolean };
export type CreateOrderInput = {
  idempotencyKey: string;
  items: { skuId: UUID; quantity: number }[];
  shippingAddress: ShippingAddress;
  termsVersion: string;
};
export type CatalogOfferingInput = {
  skuId: UUID;
  currency: string;
  unitMinor: number;
  confirmed: boolean;
  enabled: boolean;
  expectedVersion: number;
};
// SIX ISO 4217 List One, published 2026-09-17; these are currency units, not provider support.
// https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml
export const currencyMinorDigits = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KRW: 0,
  TWD: 2,
} as const;
export type CatalogOffering = Omit<
  CatalogOfferingInput,
  "expectedVersion" | "currency" | "unitMinor"
> & {
  productId: ProductId;
  name: string;
  currency: string | null;
  unitMinor: number | null;
  version: number;
};
export type CommerceSettingsInput = {
  ordersEnabled: boolean;
  termsReleaseId: UUID | null;
  expectedVersion: number;
};
export type CatalogWorkspace = {
  termsCurrent: boolean;
  offerings: CatalogOffering[];
  settings: {
    ordersEnabled: boolean;
    termsReleaseId: UUID | null;
    version: number;
  };
  publishedReleaseId: UUID | null;
};
export type CommercialTermsLocale = {
  eyebrow: string;
  draft: string;
  terms: Record<
    | "title"
    | "intro"
    | "p1"
    | "h1"
    | "p2"
    | "h2"
    | "p3"
    | "h3"
    | "p4"
    | "h4"
    | "p5",
    string
  >;
  shipping: string;
  returns: string;
  warranty: string;
};
export type OrderingCatalog = {
  orderingEnabled: boolean;
  unavailableReason:
    "ORDERING_DISABLED" | "TERMS_NOT_APPROVED" | "TERMS_CHANGED" | null;
  terms: {
    releaseId: UUID;
    locales: Record<import("./core").Locale, CommercialTermsLocale>;
  } | null;
  offerings: {
    skuId: UUID;
    productId: Exclude<ProductId, "ola-go">;
    name: string;
    currency: string;
    unitMinor: number;
    version: number;
  }[];
};
