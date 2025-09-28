"use client";

import { MultipleChoice } from "./MultipleChoice";

interface TransportationPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

const TRANSPORTATION_OPTIONS = [
  {
    value: "flight",
    label: "Flights",
    description: "Commercial airlines for long distances",
    icon: "✈️"
  },
  {
    value: "train",
    label: "Trains",
    description: "Rail transport for scenic routes",
    icon: "🚄"
  },
  {
    value: "bus",
    label: "Buses",
    description: "Budget-friendly ground transport",
    icon: "🚌"
  },
  {
    value: "car_rental",
    label: "Car Rental",
    description: "Self-drive for flexibility",
    icon: "🚗"
  },
  {
    value: "rideshare",
    label: "Rideshare/Taxi",
    description: "Uber, Lyft, local taxis",
    icon: "🚕"
  },
  {
    value: "ferry",
    label: "Ferry",
    description: "Water transport between islands/coasts",
    icon: "⛴️"
  },
  {
    value: "bicycle",
    label: "Bicycle",
    description: "Eco-friendly city exploration",
    icon: "🚲"
  },
  {
    value: "walking",
    label: "Walking",
    description: "On foot for local exploration",
    icon: "🚶"
  },
  {
    value: "motorcycle",
    label: "Motorcycle",
    description: "Two-wheeler for adventure",
    icon: "🏍️"
  },
  {
    value: "public_transport",
    label: "Public Transport",
    description: "Local buses, metros, trams",
    icon: "🚇"
  }
];

export const TransportationPicker = ({ value, onChange, className = "" }: TransportationPickerProps) => {
  return (
    <MultipleChoice
      value={value}
      onChange={onChange as (value: string[] | string) => void}
      options={TRANSPORTATION_OPTIONS}
      type="checkbox"
      columns={2}
      className={className}
    />
  );
};
