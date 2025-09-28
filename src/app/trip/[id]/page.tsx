"use client";

import { useParams } from "next/navigation";
import { TripDisplay } from "@/components/trip/TripDisplay";

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default function TripPage() {
  const params = useParams();
  const tripId = params.id as string;

  return (
    <div className="min-h-screen bg-slate-50">
      <TripDisplay tripId={tripId} />
    </div>
  );
}
