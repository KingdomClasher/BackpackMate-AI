"use client";

import { useState } from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

interface MultipleChoiceProps {
  value: string[] | string;
  onChange: (value: string[] | string) => void;
  options: Option[];
  type?: 'checkbox' | 'radio';
  className?: string;
  columns?: number;
}

export const MultipleChoice = ({
  value,
  onChange,
  options,
  type = 'checkbox',
  className = "",
  columns = 1
}: MultipleChoiceProps) => {
  const isMultiple = type === 'checkbox';
  const selectedValues = Array.isArray(value) ? value : [value];

  const handleCheckboxChange = (optionValue: string, checked: boolean) => {
    if (!isMultiple) return;

    const currentValues = Array.isArray(value) ? value : [];
    if (checked) {
      onChange([...currentValues, optionValue]);
    } else {
      onChange(currentValues.filter(v => v !== optionValue));
    }
  };

  const handleRadioChange = (optionValue: string) => {
    if (isMultiple) return;
    onChange(optionValue);
  };

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }[columns] || 'grid-cols-1';

  if (type === 'radio') {
    return (
      <RadioGroup.Root
        className={`grid gap-3 ${gridCols} ${className}`}
        value={Array.isArray(value) ? value[0] : value}
        onValueChange={handleRadioChange}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-start space-x-3">
            <RadioGroup.Item
              className="aspect-square h-5 w-5 rounded-full border border-slate-300 text-slate-900 shadow focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
              value={option.value}
              id={option.value}
            >
              <RadioGroup.Indicator className="flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white" />
              </RadioGroup.Indicator>
            </RadioGroup.Item>
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor={option.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.icon && <span className="mr-2">{option.icon}</span>}
                {option.label}
              </label>
              {option.description && (
                <p className="text-xs text-slate-500">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup.Root>
    );
  }

  return (
    <div className={`grid gap-3 ${gridCols} ${className}`}>
      {options.map((option) => {
        const isChecked = selectedValues.includes(option.value);

        return (
          <div key={option.value} className="flex items-start space-x-3">
            <Checkbox.Root
              className="peer h-5 w-5 shrink-0 rounded border border-slate-300 shadow focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900 data-[state=checked]:text-white"
              checked={isChecked}
              onCheckedChange={(checked) => handleCheckboxChange(option.value, checked === true)}
              id={option.value}
            >
              <Checkbox.Indicator className="flex items-center justify-center text-current">
                <Check className="h-3 w-3" />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor={option.value}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.icon && <span className="mr-2">{option.icon}</span>}
                {option.label}
              </label>
              {option.description && (
                <p className="text-xs text-slate-500">{option.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
