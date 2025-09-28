"use client";

import { TripState } from "@/lib/types/trip";

interface BasicInfoTabProps {
  tripData: TripState;
}

export function BasicInfoTab({ tripData }: BasicInfoTabProps) {
  const { answers } = tripData;

  const formatArrayField = (field: string[]) => {
    return field.length > 0 ? field.join(", ") : "Not specified";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not specified";
    return dateString;
  };

  const infoSections = [
    {
      title: "🌍 Destinations",
      items: [
        { label: "Destinations", value: formatArrayField(answers.destinations) },
        { label: "Starting Point", value: answers.starting_point || "Not specified" },
        { label: "End Point", value: answers.end_point || "Not specified" },
      ],
    },
    {
      title: "📅 Travel Dates",
      items: [
        { label: "Dates", value: formatDate(answers.dates) },
        { label: "Flexible Dates", value: answers.flexible_dates ? "Yes" : "No" },
      ],
    },
    {
      title: "💰 Budget & Currency",
      items: [
        { label: "Budget", value: `${answers.currency} ${answers.budget}` },
        { label: "Currency", value: answers.currency },
      ],
    },
    {
      title: "🚗 Transportation",
      items: [
        { label: "Preferred Transportation", value: formatArrayField(answers.transportation) },
      ],
    },
    {
      title: "🎯 Trip Purpose",
      items: [
        { label: "Purpose of Trip", value: formatArrayField(answers.purpose_of_trip) },
      ],
    },
    {
      title: "🎨 Activities & Interests",
      items: [
        { label: "Things to Do", value: formatArrayField(answers.things_to_do) },
      ],
    },
    {
      title: "🍽️ Food & Dietary",
      items: [
        { label: "Food Preferences", value: formatArrayField(answers.food_dietary) },
      ],
    },
    {
      title: "📝 Additional Information",
      items: [
        { label: "Citizenship", value: answers.citizenship || "Not specified" },
        { label: "Other Preferences", value: answers.preferences || "None specified" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Trip Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Trip Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {answers.destinations.length}
            </div>
            <div className="text-sm text-slate-600">Destinations</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {answers.currency} {answers.budget}
            </div>
            <div className="text-sm text-slate-600">Budget</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {answers.transportation.length || 0}
            </div>
            <div className="text-sm text-slate-600">Transport Methods</div>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="grid gap-6 lg:grid-cols-2">
        {infoSections.map((section, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              {section.title}
            </h3>
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-slate-600">{item.label}</dt>
                  <dd className="text-sm text-slate-900">{item.value}</dd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Metadata */}
      {(tripData.createdAt || tripData.updatedAt) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">📊 Trip Metadata</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {tripData.createdAt && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Created</dt>
                <dd className="text-sm text-slate-900">
                  {new Date(tripData.createdAt).toLocaleString()}
                </dd>
              </div>
            )}
            {tripData.updatedAt && (
              <div>
                <dt className="text-sm font-medium text-slate-600">Last Updated</dt>
                <dd className="text-sm text-slate-900">
                  {new Date(tripData.updatedAt).toLocaleString()}
                </dd>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
