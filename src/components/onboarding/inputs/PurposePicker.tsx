"use client";

import { MultipleChoice } from "./MultipleChoice";

interface PurposePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

const PURPOSE_OPTIONS = [
  {
    value: "leisure",
    label: "Leisure/Vacation",
    description: "Relaxation and sightseeing",
    icon: "🏖️"
  },
  {
    value: "business",
    label: "Business",
    description: "Work-related travel",
    icon: "💼"
  },
  {
    value: "honeymoon",
    label: "Honeymoon",
    description: "Romantic getaway for couples",
    icon: "💕"
  },
  {
    value: "family",
    label: "Family Trip",
    description: "Traveling with family members",
    icon: "👨‍👩‍👧‍👦"
  },
  {
    value: "adventure",
    label: "Adventure",
    description: "Outdoor activities and exploration",
    icon: "🏔️"
  },
  {
    value: "cultural",
    label: "Cultural",
    description: "Museums, history, local culture",
    icon: "🏛️"
  },
  {
    value: "education",
    label: "Educational",
    description: "Learning and skill development",
    icon: "📚"
  },
  {
    value: "medical",
    label: "Medical",
    description: "Health and wellness travel",
    icon: "🏥"
  },
  {
    value: "religious",
    label: "Religious/Pilgrimage",
    description: "Spiritual or religious journey",
    icon: "🕊️"
  },
  {
    value: "solo",
    label: "Solo Travel",
    description: "Independent personal journey",
    icon: "🎒"
  },
  {
    value: "group",
    label: "Group Travel",
    description: "Traveling with friends or groups",
    icon: "👥"
  },
  {
    value: "other",
    label: "Other",
    description: "Different purpose not listed",
    icon: "❓"
  }
];

export const PurposePicker = ({ value, onChange, className = "" }: PurposePickerProps) => {
  return (
    <MultipleChoice
      value={value}
      onChange={onChange as (value: string[] | string) => void}
      options={PURPOSE_OPTIONS}
      type="checkbox"
      columns={2}
      className={className}
    />
  );
};
