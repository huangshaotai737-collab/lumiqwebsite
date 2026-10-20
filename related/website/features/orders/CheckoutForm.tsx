"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCart } from "@/components/cart/CartProvider";
import type {
  ApiResult,
  Locale,
  Profile,
  ShippingAddress,
} from "@/lib/generated/platform/core";
import type {
  OrderingCatalog,
  CreateOrderInput,
} from "@/lib/generated/platform/commerce";
import { currencyMinorDigits } from "@/lib/generated/platform/commerce";
import { accountRevisionKey } from "@/features/account/session-event";
import { accountCopy } from "@/features/account/copy";
import { orderCopy } from "./copy";
import { orderMoney } from "./money";
const empty: ShippingAddress = {
  name: "",
  country: "",
  region: "",
  city: "",
  postalCode: "",
  line1: "",
  line2: "",
  phone: "",
};
export function CheckoutForm({
  locale,
  userId,
  profile,
  catalog,
}: {
  locale: Locale;
  userId: string | null;
  profile: Profile | null;
  catalog: ApiResult<OrderingCatalog>;
}) {
  const t = orderCopy[locale],
    a = accountCopy[locale],
    cart = useCart();
  const [address, setAddress] = useState(profile?.shippingAddress || empty);
  const [accepted, setAccepted] = useState(false),
    [pending, setPending] = useState(false),
    [closed, setClosed] = useState(false),
    [storageFault, setStorageFault] = useState(false),
    [message, setMessage] = useState("");
  const [saved, setSaved] = useState<CreateOrderInput | null>(null),
    [savedCatalog, setSavedCatalog] = useState<OrderingCatalog | null>(null),
    [ready, setReady] = useState(false),
    [identityValid, setIdentityValid] = useState(true);
  const busy = useRef(false);
  const storageKey = `lumiq-checkout-v1:${userId}`;
  useEffect(() => {
    try {
      for (const key of Object.keys(sessionStorage))
        if (key.startsWith("lumiq-checkout-v1:") && key !== storageKey)
          sessionStorage.removeItem(key);
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const pending = JSON.parse(raw) as {
          request: CreateOrderInput;
          catalog: OrderingCatalog;
        };
        if (
          !pending?.request ||
          !pending.catalog ||
          !Array.isArray(pending.request.items) ||
          !pending.request.items.length ||
          pending.request.items.some(
            (item) =>
              !item ||
              typeof item.skuId !== "string" ||
              !Number.isInteger(item.quantity) ||
              item.quantity < 1 ||
              item.quantity > 99,
          ) ||
          !pending.request.shippingAddress ||
          !Object.values(pending.request.shippingAddress).every(
            (v) => typeof v === "string",
          ) ||
          Object.keys(empty).some(
            (k) =>
              typeof pending.request.shippingAddress[
                k as keyof ShippingAddress
              ] !== "string",
          ) ||
          typeof pending.request.idempotencyKey !== "string" ||
          !/^[A-Za-z0-9_-]{8,128}$/.test(pending.request.idempotencyKey) ||
          !Array.isArray(pending.catalog.offerings) ||
          pending.catalog.offerings.some(
            (o) =>
              !Object.hasOwn(currencyMinorDigits, o.currency) ||
              !Number.isSafeInteger(o.unitMinor),
          ) ||
          !pending.catalog.terms?.locales?.[locale]?.terms ||
          pending.request.termsVersion !== pending.catalog.terms.releaseId
        )
          throw new Error("Invalid saved checkout");
        setSaved(pending.request);
        setSavedCatalog(pending.catalog);
        setAddress(pending.request.shippingAddress);
        setAccepted(true);
      }
    } catch {
      setStorageFault(true);
      setMessage(t.storage);
    }
    setReady(true);
  }, [storageKey, t.storage, locale]);
  useEffect(() => {
    let active = true;
    async function check() {
      if (!userId) return;
      setIdentityValid(false);
      try {
        const r = await (
          await fetch("/api/account/profile", { cache: "no-store" })
        ).json();
        if (!active) return;
        if (r.ok && r.data.userId === userId) {
          setIdentityValid(true);
          return;
        }
        if (r.ok || r.error === "UNAUTHENTICATED" || r.error === "FORBIDDEN") {
          sessionStorage.removeItem(storageKey);
          window.location.reload();
        } else setMessage(t.failed);
      } catch {
        if (active) setMessage(t.failed);
      }
    }
    const changed = (event: StorageEvent) => {
      if (event.key === accountRevisionKey) void check();
    };
    window.addEventListener("focus", check);
    window.addEventListener("storage", changed);
    return () => {
      active = false;
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", changed);
    };
  }, [userId, storageKey, t.failed]);
  const data = savedCatalog || (catalog.ok ? catalog.data : null);
  const currentItems = saved
    ? saved.items.map((item) => ({
        id:
          data?.offerings.find((o) => o.skuId === item.skuId)?.productId ||
          "ola-go",
        quantity: item.quantity,
      }))
    : cart.items;
  const rows = currentItems.map((item) => ({
    item,
    offer: data?.offerings.find((o) => o.productId === item.id),
  }));
  const currencies = new Set(
    rows.map((r) => r.offer?.currency).filter(Boolean),
  );
  const subtotal = rows.reduce(
    (n, r) => n + (r.offer?.unitMinor || 0) * r.item.quantity,
    0,
  );
  const blocked =
    rows.some((r) => !r.offer) ||
    currencies.size !== 1 ||
    !rows.length ||
    !Number.isSafeInteger(subtotal);
  const available = Boolean(data?.orderingEnabled && data.terms && !blocked);
  const terms = data?.terms?.locales[locale];
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !userId || !ready) return;
    const request =
      saved ||
      (available && data?.terms
        ? {
            idempotencyKey: crypto.randomUUID(),
            items: rows.map((r) => ({
              skuId: r.offer!.skuId,
              quantity: r.item.quantity,
            })),
            shippingAddress: address,
            termsVersion: data.terms.releaseId,
          }
        : null);
    if (!request) return;
    // Save before transport. Unknown results keep the exact request, including its key, across reloads.
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ request, catalog: data }),
      );
    } catch {
      setMessage(t.storage);
      return;
    }
    setSaved(request);
    setSavedCatalog(data);
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-lumiq-customer": userId,
        },
        body: JSON.stringify(request),
      });
      const result = await response.json();
      if (result.ok) {
        sessionStorage.removeItem(storageKey);
        window.location.assign(
          `/${locale}/members/orders/${result.data.order.id}`,
        );
        return;
      }
      if (
        result.error === "INVALID_INPUT" ||
        result.error === "ORDERING_DISABLED"
      ) {
        sessionStorage.removeItem(storageKey);
        setSaved(null);
        setSavedCatalog(null);
        setMessage(
          result.error === "INVALID_INPUT" ? t.invalid : t.unavailable,
        );
        if (result.error === "ORDERING_DISABLED") setClosed(true);
      } else
        setMessage(
          result.error === "CONFLICT"
            ? t.conflict
            : result.error === "UNAUTHENTICATED" || result.error === "FORBIDDEN"
              ? t.failed
              : t.uncertain,
        );
    } catch {
      setMessage(t.uncertain);
    }
    busy.current = false;
    setPending(false);
  }
  const labels = {
    name: a.recipient,
    country: a.country,
    region: a.region,
    city: a.city,
    postalCode: a.postalCode,
    line1: a.line1,
    line2: a.line2,
    phone: a.phone,
  };
  const limits = {
    name: 120,
    country: 2,
    region: 120,
    city: 120,
    postalCode: 32,
    line1: 500,
    line2: 500,
    phone: 40,
  };
  if (!identityValid)
    return (
      <p role="alert">
        {message || t.loading} <a href={`/${locale}/checkout`}>{t.refresh}</a>
      </p>
    );
  return (
    <>
      <p>{t.notice}</p>
      {!data?.orderingEnabled && <p>{t.unavailable}</p>}
      <a href={`/${locale}/prelaunch`}>{t.waitlist}</a>
      {!userId && (
        <p>
          <a
            className="orders-action"
            href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/checkout`)}`}
          >
            {t.signIn}
          </a>
        </p>
      )}
      <section className="orders-card">
        <ul>
          {rows.map(({ item, offer }) => (
            <li key={item.id}>
              {offer?.name || item.id} × {item.quantity}{" "}
              {offer &&
                orderMoney(
                  offer.unitMinor * item.quantity,
                  offer.currency,
                  locale,
                )}
              {!offer && (
                <p role="alert">
                  {item.id === "ola-go" ? t.go : t.unsupported}
                </p>
              )}
            </li>
          ))}
        </ul>
        {!rows.length && <p>{t.empty}</p>}
        {currencies.size > 1 && <p role="alert">{t.mixed}</p>}
        {!blocked && (
          <p>
            {t.subtotal}:{" "}
            {orderMoney(subtotal, rows[0].offer!.currency, locale)}
          </p>
        )}
        <p>{t.unknown}</p>
        <a href={`/${locale}/products`}>{a.help}</a>
      </section>
      {saved && <p role="status">{t.locked}</p>}
      <form method="POST" onSubmit={submit} className="orders-card">
        <fieldset disabled={pending || !!saved || !userId}>
          <legend>{a.address}</legend>
          {(Object.keys(labels) as (keyof ShippingAddress)[]).map((key) => (
            <label key={key}>
              {labels[key]}
              {key === "line1" || key === "line2" ? (
                <textarea
                  name={key}
                  maxLength={limits[key]}
                  required={key === "line1"}
                  value={address[key]}
                  onChange={(e) =>
                    setAddress({ ...address, [key]: e.target.value })
                  }
                />
              ) : (
                <input
                  name={key}
                  maxLength={limits[key]}
                  required={["name", "country", "city"].includes(key)}
                  value={address[key]}
                  onChange={(e) =>
                    setAddress({
                      ...address,
                      [key]:
                        key === "country"
                          ? e.target.value.toUpperCase()
                          : e.target.value,
                    })
                  }
                />
              )}
            </label>
          ))}
        </fieldset>
        {terms && (
          <details className="orders-terms">
            <summary>{t.terms}</summary>
            <p>
              {t.version}: {data!.terms!.releaseId}
            </p>
            <h2>{terms.terms.title}</h2>
            {Object.entries(terms.terms)
              .filter(([key]) => key !== "title")
              .map(([key, value]) =>
                key.startsWith("h") ? (
                  <h3 key={key}>{value}</h3>
                ) : (
                  <p key={key}>{value}</p>
                ),
              )}
            <p>{terms.shipping}</p>
            <p>{terms.returns}</p>
            <p>{terms.warranty}</p>
          </details>
        )}
        <label className="orders-check">
          <input
            type="checkbox"
            checked={accepted}
            disabled={pending || !!saved}
            required
            onChange={(e) => setAccepted(e.target.checked)}
          />
          {t.accept}
        </label>
        <p role="alert" aria-live="polite">
          {message}
        </p>
        <button
          disabled={
            !ready ||
            storageFault ||
            closed ||
            !cart.ready ||
            pending ||
            !userId ||
            (!saved && (!available || !accepted))
          }
        >
          {pending ? t.pending : saved ? t.retry : t.submit}
        </button>
      </form>
    </>
  );
}
