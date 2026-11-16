import {readContentAdapter} from "@/lib/content/server-adapter";
import NestProductPage from "@/components/NestProductPage";

export async function generateMetadata() {
  const cms = await readContentAdapter();
  return {
  title: cms.text("field_0371e492c69032cf"),
  description: cms.text("field_a697abdfe99b8f83"),
};
}

export default function NestPage() {
  return <NestProductPage />;
}
