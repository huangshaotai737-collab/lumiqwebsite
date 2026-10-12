import type {Metadata} from "next";
import NestProductPage from "@/components/NestProductPage";

export const metadata: Metadata = {
  title: "Lumiq Orb — Smart Family Calendar",
  description: "A calm 15.6-inch family display for shared calendars, routines, weather, reminders, and everyday moments.",
};

export default function NestPage() {
  return <NestProductPage />;
}
