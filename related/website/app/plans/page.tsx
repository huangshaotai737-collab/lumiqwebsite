import {readContentAdapter} from "@/lib/content/server-adapter";
import PlansContent from "@/components/PlansContent";

export async function generateMetadata() {
  const cms = await readContentAdapter();
  return {
  title: cms.text("field_7f1cd295aab7ea9c"),
  description: cms.text("field_77f016e56034e4f2"),
};
}

export default function PlansPage() {
  return <PlansContent />;
}
