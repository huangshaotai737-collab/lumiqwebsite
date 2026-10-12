import type { Metadata } from "next";
import ProductsShowcase from "@/components/ProductsShowcase";

export const metadata: Metadata = {
  title: "Products — Lumiq Studio",
  description: "Five objects, one quiet universe — Lumiq Ola, Lumiq Ola Go, Lumiq Tablet, Lumiq Print and Lumiq Orb.",
};

export default function ProductsPage() {
  return <ProductsShowcase />;
}
