"use client";

import { MultipleChoice } from "./MultipleChoice";

interface FlexibleDatesPickerProps {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

const FLEXIBILITY_OPTIONS = [
  {
    value: "true",
    label: "Yes, I'm flexible",
    description: "I can adjust my dates for better deals or availability",
    icon: "✅"
  },
  {
    value: "false",
    label: "No, dates are fixed",
    description: "I need to travel on specific dates",
    icon: "📅"
  }
];

export const FlexibleDatesPicker = ({ value, onChange, className = "" }: FlexibleDatesPickerProps) => {
  const handleChange = (selectedValue: string) => {
    onChange(selectedValue === "true");
  };

  return (
    <MultipleChoice
      value={value.toString()}
      onChange={handleChange as (value: string[] | string) => void}
      options={FLEXIBILITY_OPTIONS}
      type="radio"
      columns={1}
      className={className}
    />
  );
};
