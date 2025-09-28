"use client";

import { useState } from "react";
import { useTripData } from "@/lib/api/trip";
import { BasicInfoTab } from "@/components/trip/BasicInfoTab";
import { ItineraryTabContent } from "@/components/trip/ItineraryTabContent";
import { TasksTabContent } from "@/components/trip/TasksTabContent";

interface TripDisplayProps {
  tripId: string;
}

type TabType = "overview" | "itinerary" | "tasks";

export function TripDisplay({ tripId }: TripDisplayProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { data: tripData, loading, error, refetch } = useTripData(tripId);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"></div>
          <p className="text-slate-600">Loading your trip...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 rounded-2xl bg-red-50 p-6">
            <div className="mb-2 text-red-800">⚠️ Error Loading Trip</div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!tripData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">🧳</div>
          <h1 className="mb-2 text-xl font-semibold text-slate-900">Trip Not Found</h1>
          <p className="text-slate-600">The trip you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📋" },
    { id: "itinerary", label: "Itinerary", icon: "🗓️" },
    { id: "tasks", label: "Tasks", icon: "✅" },
  ];

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">
          {tripData.answers.destinations.join(", ") || "Your Trip"}
        </h1>
        <p className="text-slate-600">
          {tripData.answers.dates && (
            <span className="mr-4">📅 {tripData.answers.dates}</span>
          )}
          {tripData.answers.budget && tripData.answers.currency && (
            <span>💰 {tripData.answers.currency} {tripData.answers.budget}</span>
          )}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && <BasicInfoTab tripData={tripData} />}
        {activeTab === "itinerary" && <ItineraryTabContent tripData={tripData} />}
        {activeTab === "tasks" && <TasksTabContent tripData={tripData} />}
      </div>
    </div>
  );
}
