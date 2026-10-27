"use client";
import type { GlassProduct } from "./GlassCards";
import "./critical-loading.css";

/** Keep the original HTML carousel throughout loading and interaction.
 * This footprint preserves its layout without creating a WebGL renderer or
 * handing the visible cards over to a second, mirrored scene after loading.
 */
export default function HomeGlassProducts({ products }: { products: GlassProduct[] }) {
  return <div className="lh-glass-products" data-renderer="html" data-product-count={products.length} aria-hidden="true" />;
}
