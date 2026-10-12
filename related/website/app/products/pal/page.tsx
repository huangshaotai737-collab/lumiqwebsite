import { permanentRedirect } from "next/navigation";

export default function LegacyPalPage() {
  permanentRedirect("/products/ola");
}
