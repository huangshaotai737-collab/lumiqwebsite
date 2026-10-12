import type { Metadata } from "next";
import PlansContent from "@/components/PlansContent";

export const metadata: Metadata = {
  title: "Plans — Lumiq Studio",
  description: "Hardware and subscriptions for the Lumiq universe — calm pricing for the way you live.",
};

export default function PlansPage() {
  return <PlansContent />;
}
