"use client";

import { useTripState } from "@/components/providers/TripProvider";
import { OnboardingView } from "@/components/onboarding/OnboardingView";
import { MainShell } from "@/components/shell/MainShell";

export const AppShell = () => {
  const state = useTripState();
  const hasApprovedItinerary =
    (state.approvedItinerary && state.approvedItinerary.length > 0) || false;

  return (
    <div className="min-h-screen bg-[#f6f5f4]">
      {hasApprovedItinerary ? <MainShell /> : <OnboardingView />}
    </div>
  );
};
