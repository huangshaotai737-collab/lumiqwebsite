import { permanentRedirect } from "next/navigation";

export default function LegacyBookPage() {
  permanentRedirect("/products/print");
}
