import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_BY_ID } from "@/lib/products";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx|json|css)$/.test(entry.name) ? [path] : [];
  });
}

describe("public content hygiene", () => {
  const files = ["app", "components", "messages"].flatMap(sourceFiles);
  const content = files.map((file) => readFileSync(file, "utf8")).join("\n");

  it("does not expose deprecated product names", () => {
    expect(content).not.toMatch(/LumiqPal|LumiqKobi|LumiqPrint/);
  });

  it("does not contain empty placeholder links", () => {
    expect(content).not.toMatch(/href=["']#["']/);
  });

  it("does not reference the oversized original product assets", () => {
    expect(content).not.toMatch(
      /ola-hero-front\.png|lumiq-tablet\.png|lumiqtab\.jpg/,
    );
  });

  it("keeps canonical product names, routes and price relationships", () => {
    expect(PRODUCT_BY_ID.ola).toMatchObject({
      name: "Lumiq Ola",
      href: "/products/ola",
      price: { kind: "usd", amount: 599 },
    });
    expect(PRODUCT_BY_ID["ola-go"]).toMatchObject({
      name: "Lumiq Ola Go",
      href: "/products/ola-go",
      price: { kind: "included", includedWith: "ola" },
    });
    expect(PRODUCT_BY_ID.tablet).toMatchObject({
      name: "Lumiq Tablet",
      href: "/products/tablet",
      price: { kind: "usd", amount: 399 },
    });
    expect(PRODUCT_BY_ID.print).toMatchObject({
      name: "Lumiq Print",
      href: "/products/print",
      price: { kind: "usd", amount: 69 },
    });
    expect(PRODUCT_BY_ID.nest).toMatchObject({
      name: "Lumiq Orb",
      href: "/products/nest",
      price: { kind: "pending" },
    });
  });
});
