"use client";

import { useState, useEffect } from "react";
import { TripState, Answers } from "@/lib/types/trip";
import { updateTrip } from "@/lib/api/trip";
import { LocationAutocomplete } from "@/components/onboarding/inputs/LocationAutocomplete";
import { DateRangePicker } from "@/components/onboarding/inputs/DateRangePicker";
import { CountryDropdown } from "@/components/onboarding/inputs/CountryDropdown";
import { CurrencyDropdown } from "@/components/onboarding/inputs/CurrencyDropdown";
import { BudgetSlider } from "@/components/onboarding/inputs/BudgetSlider";
import { TransportationPicker } from "@/components/onboarding/inputs/TransportationPicker";
import { PurposePicker } from "@/components/onboarding/inputs/PurposePicker";
import { FlexibleDatesPicker } from "@/components/onboarding/inputs/FlexibleDatesPicker";

interface BasicInfoTabProps {
  tripData: TripState;
  tripId: string;
  onUpdate?: () => void;
}

export function BasicInfoTab({ tripData, tripId, onUpdate }: BasicInfoTabProps) {
  const [editingField, setEditingField] = useState<keyof Answers | null>(null);
  const [localAnswers, setLocalAnswers] = useState<Answers>(tripData.answers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when tripData changes
  useEffect(() => {
    setLocalAnswers(tripData.answers);
  }, [tripData.answers]);

  const formatArrayField = (field: string[] | any, singular: string, plural: string) => {
    console.log('formatArrayField called with:', field, 'type:', typeof field);

    // Handle case where field might not be an array or might be undefined
    if (!field) return "Not specified";

    if (!Array.isArray(field)) {
      // If it's a string that looks like JSON, try to parse it
      if (typeof field === 'string') {
        if (field.startsWith('[') && field.endsWith(']')) {
          try {
            const parsed = JSON.parse(field);
            console.log('Parsed JSON:', parsed);
            if (Array.isArray(parsed)) {
              field = parsed;
            } else {
              return field;
            }
          } catch (e) {
            console.log('Failed to parse JSON:', e);
            return field;
          }
        } else {
          // It's just a regular string
          return field;
        }
      } else {
        console.log('Field is not array or string, returning "Not specified"');
        return "Not specified";
      }
    }

    console.log('Final field value:', field);
    if (field.length === 0) return "Not specified";
    if (field.length === 1) return field[0];
    return field.join(", ");
  };

  const formatArrayFieldWithCount = (field: string[], singular: string, plural: string) => {
    if (field.length === 0) return "Not specified";
    return `${field.length} ${field.length === 1 ? singular : plural}`;
  };

  const handleSave = async (field: keyof Answers, value: any) => {
    setSaving(true);
    setError(null);

    try {
      const updates = { [field]: value };
      const result = await updateTrip(tripId, updates);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update trip');
      }

      setLocalAnswers(prev => ({ ...prev, [field]: value }));
      setEditingField(null);

      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update trip');
      // Revert local state
      setLocalAnswers(tripData.answers);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalAnswers(tripData.answers);
    setEditingField(null);
    setError(null);
  };

  const renderEditableField = (field: keyof Answers, label: string, value: any) => {
    const isEditing = editingField === field;

    if (isEditing) {
      return (
        <div className="space-y-3">
          <dt className="text-sm font-medium text-slate-600">{label}</dt>
          <div className="space-y-2">
            {renderInputComponent(field, value)}
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(field, localAnswers[field])}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <dt className="text-sm font-medium text-slate-600">{label}</dt>
        <dd className="group flex items-center justify-between">
          <span className="text-sm text-slate-900">{getDisplayValue(field, value)}</span>
          <button
            onClick={() => setEditingField(field)}
            className="ml-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 opacity-75 transition hover:opacity-100 hover:bg-slate-100 hover:border-slate-300 group-hover:opacity-100"
          >
            ✏️ Edit
          </button>
        </dd>
      </div>
    );
  };

  const getDisplayValue = (field: keyof Answers, value: any): string => {
    // Debug logging for purpose_of_trip
    if (field === 'purpose_of_trip') {
      console.log('Purpose of trip value:', value, 'Type:', typeof value, 'Is Array:', Array.isArray(value));
    }

    switch (field) {
      case 'destinations':
        return formatArrayField(value, "destination", "destinations");
      case 'transportation':
        return formatArrayField(value, "method", "methods");
      case 'purpose_of_trip':
        return formatArrayField(value, "purpose", "purposes");
      case 'things_to_do':
        return formatArrayField(value, "activity", "activities");
      case 'food_dietary':
        return formatArrayField(value, "preference", "preferences");
      case 'flexible_dates':
        return value ? "Yes" : "No";
      default:
        return value || "Not specified";
    }
  };

  const renderInputComponent = (field: keyof Answers, currentValue: any) => {
    switch (field) {
      case 'destinations':
        return (
          <LocationAutocomplete
            value={localAnswers.destinations}
            onChange={(destinations) => setLocalAnswers(prev => ({ ...prev, destinations }))}
            placeholder="Add destinations..."
            className="w-full"
          />
        );

      case 'starting_point':
      case 'end_point':
        return (
          <input
            type="text"
            value={localAnswers[field] || ''}
            onChange={(e) => setLocalAnswers(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-0"
            placeholder={field === 'starting_point' ? 'Starting point' : 'End point'}
          />
        );

      case 'dates':
        return (
          <DateRangePicker
            value={localAnswers.dates}
            onChange={(dates) => setLocalAnswers(prev => ({ ...prev, dates }))}
            className="w-full"
          />
        );

      case 'flexible_dates':
        return (
          <FlexibleDatesPicker
            value={localAnswers.flexible_dates}
            onChange={(flexible) => setLocalAnswers(prev => ({ ...prev, flexible_dates: flexible }))}
            className="w-full"
          />
        );

      case 'citizenship':
        return (
          <CountryDropdown
            value={localAnswers.citizenship}
            onChange={(country) => setLocalAnswers(prev => ({ ...prev, citizenship: country }))}
            placeholder="Select your citizenship"
            className="w-full"
          />
        );

      case 'currency':
        return (
          <CurrencyDropdown
            value={localAnswers.currency}
            onChange={(currency) => setLocalAnswers(prev => ({ ...prev, currency }))}
            placeholder="Select currency"
            className="w-full"
          />
        );

      case 'budget':
        return (
          <BudgetSlider
            value={localAnswers.budget}
            onChange={(budget) => setLocalAnswers(prev => ({ ...prev, budget }))}
            currency={localAnswers.currency || "USD"}
            className="w-full"
          />
        );

      case 'transportation':
        return (
          <TransportationPicker
            value={localAnswers.transportation}
            onChange={(transport) => setLocalAnswers(prev => ({ ...prev, transportation: transport }))}
            className="w-full"
          />
        );

      case 'purpose_of_trip':
        return (
          <PurposePicker
            value={localAnswers.purpose_of_trip}
            onChange={(purposes) => setLocalAnswers(prev => ({ ...prev, purpose_of_trip: purposes }))}
            className="w-full"
          />
        );

      case 'preferences':
      case 'things_to_do':
      case 'food_dietary':
        return (
          <textarea
            value={Array.isArray(localAnswers[field]) ? localAnswers[field].join(', ') : localAnswers[field] || ''}
            onChange={(e) => {
              const value = e.target.value;
              const arrayValue = value.split(',').map(s => s.trim()).filter(s => s);
              setLocalAnswers(prev => ({ ...prev, [field]: field === 'preferences' ? value : arrayValue }));
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-0"
            rows={3}
            placeholder={`Enter ${field.replace('_', ' ')}...`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={localAnswers[field] || ''}
            onChange={(e) => setLocalAnswers(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-slate-400 focus:outline-none focus:ring-0"
          />
        );
    }
  };

  const infoSections = [
    {
      title: "🌍 Destinations",
      items: [
        { field: 'destinations' as keyof Answers, label: "Destinations", value: localAnswers.destinations },
        { field: 'starting_point' as keyof Answers, label: "Starting Point", value: localAnswers.starting_point },
        { field: 'end_point' as keyof Answers, label: "End Point", value: localAnswers.end_point },
      ],
    },
    {
      title: "📅 Travel Dates",
      items: [
        { field: 'dates' as keyof Answers, label: "Dates", value: localAnswers.dates },
        { field: 'flexible_dates' as keyof Answers, label: "Flexible Dates", value: localAnswers.flexible_dates },
      ],
    },
    {
      title: "💰 Budget & Currency",
      items: [
        { field: 'budget' as keyof Answers, label: "Budget", value: localAnswers.budget },
        { field: 'currency' as keyof Answers, label: "Currency", value: localAnswers.currency },
      ],
    },
    {
      title: "🚗 Transportation",
      items: [
        { field: 'transportation' as keyof Answers, label: "Preferred Transportation", value: localAnswers.transportation },
      ],
    },
    {
      title: "🎯 Trip Purpose",
      items: [
        { field: 'purpose_of_trip' as keyof Answers, label: "Purpose of Trip", value: localAnswers.purpose_of_trip },
      ],
    },
    {
      title: "🎨 Activities & Interests",
      items: [
        { field: 'things_to_do' as keyof Answers, label: "Things to Do", value: localAnswers.things_to_do },
      ],
    },
    {
      title: "🍽️ Food & Dietary",
      items: [
        { field: 'food_dietary' as keyof Answers, label: "Food Preferences", value: localAnswers.food_dietary },
      ],
    },
    {
      title: "📝 Additional Information",
      items: [
        { field: 'citizenship' as keyof Answers, label: "Citizenship", value: localAnswers.citizenship },
        { field: 'preferences' as keyof Answers, label: "Other Preferences", value: localAnswers.preferences },
      ],
    },
  ];

  return (
    <div className="space-y-6">
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
                <div key={itemIndex}>
                  {renderEditableField(item.field, item.label, item.value)}
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
