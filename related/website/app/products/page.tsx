import {readContentAdapter} from "@/lib/content/server-adapter";
import ProductsShowcase from "@/components/ProductsShowcase";

export async function generateMetadata() {
  const cms = await readContentAdapter();
  return {
  title: cms.text("field_111b161da5642d3e"),
  description: cms.text("field_214766da1c1b9375"),
};
}

export default function ProductsPage() {
  return <ProductsShowcase />;
}
