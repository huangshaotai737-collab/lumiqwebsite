export type ProductId = "ola" | "ola-go" | "tablet" | "print" | "nest";

export type ProductPrice =
  | { kind: "usd"; amount: number }
  | { kind: "included"; includedWith: "ola" }
  | { kind: "pending" };

export type ProductCatalogEntry = {
  id: ProductId;
  name: string;
  shortName: string;
  category: string;
  href: `/products/${string}`;
  legacyHrefs: readonly string[];
  image: string;
  price: ProductPrice;
  summary: string;
  highlights: readonly string[];
  contentStatus: "pending_brand_confirmation";
};

export const PRODUCT_CATALOG = [
  {
    id: "ola",
    name: "Lumiq Ola",
    shortName: "Ola",
    category: "Personal holographic companion",
    href: "/products/ola",
    legacyHrefs: ["/products/pal"],
    image: "/assets/web/ola-hero-front.webp",
    price: { kind: "usd", amount: 599 },
    summary:
      "A personal holographic companion for conversation, reminders and gentle everyday support across generations.",
    highlights: [
      "Natural conversation",
      "Personalized routines",
      "Gentle everyday support",
    ],
    contentStatus: "pending_brand_confirmation",
  },
  {
    id: "ola-go",
    name: "Lumiq Ola Go",
    shortName: "Ola Go",
    category: "Pocket companion for Ola",
    href: "/products/ola-go",
    legacyHrefs: [],
    image: "/assets/web/lumiq-ola-go.webp",
    price: { kind: "included", includedWith: "ola" },
    summary:
      "A pocket-sized extension of Ola for synced reminders, weather and quick voice diaries away from home.",
    highlights: [
      "Synced reminders",
      "Quick voice diaries",
      "Optional 4G safety concept",
    ],
    contentStatus: "pending_brand_confirmation",
  },
  {
    id: "tablet",
    name: "Lumiq Tablet",
    shortName: "Tablet",
    category: "AI learning tablet for children",
    href: "/products/tablet",
    legacyHrefs: [],
    image: "/assets/web/lumiq-tablet.webp",
    price: { kind: "usd", amount: 399 },
    summary:
      "A distraction-free reading and learning device for stories, creative play and independent discovery.",
    highlights: [
      "ImagiMe stories",
      "Story Quest missions",
      "Distraction-free learning",
    ],
    contentStatus: "pending_brand_confirmation",
  },
  {
    id: "print",
    name: "Lumiq Print",
    shortName: "Print",
    category: "Personalized printed storybook",
    href: "/products/print",
    legacyHrefs: ["/products/book"],
    image: "/assets/web/lumiq-print.webp",
    price: { kind: "usd", amount: 69 },
    summary:
      "A premium personalized hardcover that turns a child into the hero of an original story.",
    highlights: [
      "Personalized hardcover",
      "The child as hero",
      "A lasting keepsake",
    ],
    contentStatus: "pending_brand_confirmation",
  },
  {
    id: "nest",
    name: "Lumiq Orb",
    shortName: "Orb",
    category: "Smart family calendar",
    href: "/products/nest",
    legacyHrefs: [],
    image: "/assets/web/nest15-oak-angle.webp",
    price: { kind: "pending" },
    summary:
      "A calm 15.6-inch shared display for family calendars, routines, weather, reminders and everyday moments.",
    highlights: [
      "Shared family calendar",
      "Daily routines",
      "Three home-ready finishes",
    ],
    contentStatus: "pending_brand_confirmation",
  },
] as const satisfies readonly ProductCatalogEntry[];

export const PRODUCT_BY_ID = Object.fromEntries(
  PRODUCT_CATALOG.map((product) => [product.id, product]),
) as Record<ProductId, (typeof PRODUCT_CATALOG)[number]>;

export const PURCHASABLE_PRODUCTS = PRODUCT_CATALOG.filter(
  (product) => product.price.kind === "usd",
);
