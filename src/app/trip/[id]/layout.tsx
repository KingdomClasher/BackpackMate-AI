import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trip Details - BackpackMate AI",
  description: "View your trip details and itinerary",
};

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
