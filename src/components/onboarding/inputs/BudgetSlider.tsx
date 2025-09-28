"use client";

import { useState, useEffect } from "react";
import * as Slider from "@radix-ui/react-slider";
import { DollarSign } from "lucide-react";

interface BudgetSliderProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  className?: string;
}

const BUDGET_RANGES = [
  { min: 0, max: 500, label: "Budget" },
  { min: 500, max: 1500, label: "Mid-range" },
  { min: 1500, max: 3000, label: "Comfortable" },
  { min: 3000, max: 5000, label: "Luxury" },
  { min: 5000, max: 10000, label: "Premium" },
  { min: 10000, max: 25000, label: "Ultra-luxury" },
];

const formatCurrency = (amount: number, currency: string = "USD") => {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$",
    CHF: "Fr", CNY: "¥", SEK: "kr", NOK: "kr", DKK: "kr"
  };

  const symbol = symbols[currency] || "$";

  if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${symbol}${amount.toLocaleString()}`;
};

const getBudgetCategory = (amount: number) => {
  for (const range of BUDGET_RANGES) {
    if (amount >= range.min && amount < range.max) {
      return range.label;
    }
  }
  return BUDGET_RANGES[BUDGET_RANGES.length - 1].label;
};

export const BudgetSlider = ({
  value,
  onChange,
  currency = "USD",
  className = ""
}: BudgetSliderProps) => {
  const [sliderValue, setSliderValue] = useState([2000]);

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
      if (!isNaN(numericValue)) {
        setSliderValue([Math.min(Math.max(numericValue, 100), 25000)]);
      }
    }
  }, [value]);

  const handleSliderChange = (newValue: number[]) => {
    setSliderValue(newValue);
    onChange(newValue[0].toString());
  };

  const currentValue = sliderValue[0];
  const category = getBudgetCategory(currentValue);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Display Value */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold text-slate-900">
            {formatCurrency(currentValue, currency)}
          </span>
        </div>
        <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full inline-block">
          {category} Travel
        </div>
      </div>

      {/* Slider */}
      <div className="px-3">
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          value={sliderValue}
          onValueChange={handleSliderChange}
          max={25000}
          min={100}
          step={100}
        >
          <Slider.Track className="bg-slate-200 relative grow rounded-full h-2">
            <Slider.Range className="absolute bg-gradient-to-r from-slate-600 to-slate-800 rounded-full h-full" />
          </Slider.Track>
          <Slider.Thumb
            className="block w-6 h-6 bg-white shadow-lg border-2 border-slate-600 rounded-full hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 cursor-grab active:cursor-grabbing transition-all duration-150"
            aria-label="Budget"
          />
        </Slider.Root>
      </div>

      {/* Range Labels */}
      <div className="flex justify-between text-xs text-slate-500 px-3">
        <span>{formatCurrency(100, currency)}</span>
        <span>{formatCurrency(25000, currency)}+</span>
      </div>

      {/* Budget Categories */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {BUDGET_RANGES.map((range, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg text-center transition-colors ${currentValue >= range.min && currentValue < range.max
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600'
              }`}
          >
            <div className="font-medium">{range.label}</div>
            <div className="text-xs opacity-75">
              {formatCurrency(range.min, currency)} - {formatCurrency(range.max, currency)}
            </div>
          </div>
        ))}
      </div>

      {/* Budget Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">Budget Tips</h4>
        <div className="text-sm text-blue-700 space-y-1">
          {currentValue < 1000 && (
            <p>• Consider hostels, local transport, and street food for budget travel</p>
          )}
          {currentValue >= 1000 && currentValue < 3000 && (
            <p>• Mix of mid-range hotels and experiences with some budget options</p>
          )}
          {currentValue >= 3000 && currentValue < 5000 && (
            <p>• Comfortable hotels, guided tours, and quality dining experiences</p>
          )}
          {currentValue >= 5000 && (
            <p>• Luxury accommodations, premium experiences, and fine dining</p>
          )}
        </div>
      </div>
    </div>
  );
};
