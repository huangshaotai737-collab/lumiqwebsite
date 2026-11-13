import { describe, expect, test } from "vitest";
import { cartReducer, parseCart, serializeCart, summarizeCart } from "./cart";

describe("local product selections", () => {
  test("adding the same product increments its quantity without duplicate rows", () => {
    const first = cartReducer([], { type: "add", id: "tablet" });
    expect(first).toEqual([{ id: "tablet", quantity: 1 }]);
    expect(cartReducer(first, { type: "add", id: "tablet" })).toEqual([{ id: "tablet", quantity: 2 }]);
  });
  test("removing one selection preserves the others", () => {
    expect(cartReducer([{ id: "tablet", quantity: 2 }, { id: "print", quantity: 1 }], { type: "remove", id: "tablet" })).toEqual([{ id: "print", quantity: 1 }]);
  });
  test("setting zero quantity removes a selection", () => {
    expect(cartReducer([{ id: "tablet", quantity: 1 }], { type: "quantity", id: "tablet", quantity: 0 })).toEqual([]);
  });
  test("quantities stay within the supported integer range", () => {
    const state = [{ id: "tablet" as const, quantity: 99 }];
    expect(cartReducer(state, { type: "add", id: "tablet" })).toEqual(state);
    expect(cartReducer(state, { type: "quantity", id: "tablet", quantity: 2.8 })).toEqual([{ id: "tablet", quantity: 2 }]);
    expect(cartReducer(state, { type: "quantity", id: "tablet", quantity: NaN })).toEqual(state);
  });
  test("unknown products cannot be added from untrusted data", () => {
    expect(cartReducer([], { type: "add", id: "unknown" as "tablet" })).toEqual([]);
  });
  test("included and unpriced products can be saved without inventing a sale price", () => {
    const state = cartReducer(cartReducer([], { type: "add", id: "ola-go" }), { type: "add", id: "nest" });
    expect(state).toEqual([{ id: "ola-go", quantity: 1 }, { id: "nest", quantity: 1 }]);
    expect(summarizeCart(state)).toEqual({ quantity: 2, referenceTotal: 0, unpricedQuantity: 2, pricedQuantity: 0 });
  });
  test("reference total includes only published prices and respects quantities", () => {
    expect(summarizeCart([{ id: "tablet", quantity: 2 }, { id: "print", quantity: 1 }, { id: "nest", quantity: 3 }])).toEqual({ quantity: 6, referenceTotal: 867, unpricedQuantity: 3, pricedQuantity: 3 });
  });
});

describe("versioned local storage", () => {
  test("round-trips product IDs and quantities without persisting price or personal data", () => {
    const state = [{ id: "tablet" as const, quantity: 2 }];
    expect(serializeCart(state)).toBe('{"version":1,"items":[{"id":"tablet","quantity":2}]}');
    expect(parseCart(serializeCart(state))).toEqual(state);
  });
  test.each([null, "", "broken", "null", "[]", '{"version":2,"items":[]}', '{"version":1,"items":null}'])("ignores malformed or unsupported storage %s", (value) => {
    expect(parseCart(value)).toEqual([]);
  });
  test("restores valid entries while rejecting unknown IDs and invalid quantities", () => {
    expect(parseCart('{"version":1,"items":[{"id":"tablet","quantity":2,"price":1},{"id":"unknown","quantity":1},{"id":"print","quantity":0},{"id":"ola","quantity":1.5},{"id":"nest","quantity":100},null]}')).toEqual([{ id: "tablet", quantity: 2 }]);
  });
  test("merges duplicate saved entries with a bounded quantity", () => {
    expect(parseCart('{"version":1,"items":[{"id":"tablet","quantity":70},{"id":"tablet","quantity":70}]}')).toEqual([{ id: "tablet", quantity: 99 }]);
  });
});

test('reference totals use the same edited product snapshot, without changing cart identities', async () => {
  const {initialSnapshot}=await import('./content/initial-snapshot');
  const snapshot=structuredClone(initialSnapshot);
  snapshot.products.tablet.price={kind:'usd',amount:432.25};
  snapshot.products.nest.price={kind:'usd',amount:199.5};
  snapshot.products.ola.price={kind:'pending'};
  expect(summarizeCart([{id:'tablet',quantity:2},{id:'nest',quantity:1},{id:'ola',quantity:1}],snapshot.products)).toEqual({quantity:4,referenceTotal:1064,pricedQuantity:3,unpricedQuantity:1});
});
