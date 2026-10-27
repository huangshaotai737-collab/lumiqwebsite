import "./critical-loading.css";

type Product = { name: string; image: string; body?: string; href?: string; explore?: string };

/** Reserve the same scene footprint without importing or starting a 3D renderer. */
export default function HomeGlassProducts({ products }: { products: Product[] }) {
  return <div className="lh-glass-products" data-renderer="static-mirror" data-product-count={products.length} aria-hidden="true" />;
}
