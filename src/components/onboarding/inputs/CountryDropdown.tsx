"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { Globe } from "lucide-react";

interface CountryOption {
  value: string;
  label: string;
  flag: string;
}

interface CountryDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const COUNTRIES: CountryOption[] = [
  { value: "United States", label: "United States", flag: "🇺🇸" },
  { value: "United Kingdom", label: "United Kingdom", flag: "🇬🇧" },
  { value: "Canada", label: "Canada", flag: "🇨🇦" },
  { value: "Australia", label: "Australia", flag: "🇦🇺" },
  { value: "Germany", label: "Germany", flag: "🇩🇪" },
  { value: "France", label: "France", flag: "🇫🇷" },
  { value: "Italy", label: "Italy", flag: "🇮🇹" },
  { value: "Spain", label: "Spain", flag: "🇪🇸" },
  { value: "Netherlands", label: "Netherlands", flag: "🇳🇱" },
  { value: "Switzerland", label: "Switzerland", flag: "🇨🇭" },
  { value: "Austria", label: "Austria", flag: "🇦🇹" },
  { value: "Belgium", label: "Belgium", flag: "🇧🇪" },
  { value: "Sweden", label: "Sweden", flag: "🇸🇪" },
  { value: "Norway", label: "Norway", flag: "🇳🇴" },
  { value: "Denmark", label: "Denmark", flag: "🇩🇰" },
  { value: "Finland", label: "Finland", flag: "🇫🇮" },
  { value: "Ireland", label: "Ireland", flag: "🇮🇪" },
  { value: "Portugal", label: "Portugal", flag: "🇵🇹" },
  { value: "Greece", label: "Greece", flag: "🇬🇷" },
  { value: "Czech Republic", label: "Czech Republic", flag: "🇨🇿" },
  { value: "Poland", label: "Poland", flag: "🇵🇱" },
  { value: "Hungary", label: "Hungary", flag: "🇭🇺" },
  { value: "Japan", label: "Japan", flag: "🇯🇵" },
  { value: "South Korea", label: "South Korea", flag: "🇰🇷" },
  { value: "China", label: "China", flag: "🇨🇳" },
  { value: "India", label: "India", flag: "🇮🇳" },
  { value: "Singapore", label: "Singapore", flag: "🇸🇬" },
  { value: "Thailand", label: "Thailand", flag: "🇹🇭" },
  { value: "Malaysia", label: "Malaysia", flag: "🇲🇾" },
  { value: "Indonesia", label: "Indonesia", flag: "🇮🇩" },
  { value: "Philippines", label: "Philippines", flag: "🇵🇭" },
  { value: "Vietnam", label: "Vietnam", flag: "🇻🇳" },
  { value: "Brazil", label: "Brazil", flag: "🇧🇷" },
  { value: "Argentina", label: "Argentina", flag: "🇦🇷" },
  { value: "Chile", label: "Chile", flag: "🇨🇱" },
  { value: "Mexico", label: "Mexico", flag: "🇲🇽" },
  { value: "South Africa", label: "South Africa", flag: "🇿🇦" },
  { value: "Egypt", label: "Egypt", flag: "🇪🇬" },
  { value: "Morocco", label: "Morocco", flag: "🇲🇦" },
  { value: "Turkey", label: "Turkey", flag: "🇹🇷" },
  { value: "Israel", label: "Israel", flag: "🇮🇱" },
  { value: "UAE", label: "United Arab Emirates", flag: "🇦🇪" },
  { value: "Saudi Arabia", label: "Saudi Arabia", flag: "🇸🇦" },
  { value: "Russia", label: "Russia", flag: "🇷🇺" },
  { value: "Ukraine", label: "Ukraine", flag: "🇺🇦" },
  { value: "New Zealand", label: "New Zealand", flag: "🇳🇿" },
];

const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    border: '1px solid #e2e8f0',
    borderRadius: '1rem',
    padding: '0.5rem',
    boxShadow: state.isFocused ? '0 0 0 2px #e2e8f0' : 'none',
    '&:hover': {
      borderColor: '#64748b',
    },
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#1e293b' : state.isFocused ? '#f1f5f9' : 'white',
    color: state.isSelected ? 'white' : '#1e293b',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  }),
};

export const CountryDropdown = ({
  value,
  onChange,
  placeholder = "Select your country",
  className = ""
}: CountryDropdownProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const selectedOption = COUNTRIES.find(country => country.value === value);

  // Ensure component is mounted before rendering to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className={`${className} h-14 rounded-2xl border border-slate-200 bg-white animate-pulse`}>
        <div className="h-full w-full rounded-2xl bg-slate-100"></div>
      </div>
    );
  }

  const handleChange = (selectedOption: any) => {
    onChange(selectedOption ? selectedOption.value : "");
  };

  const formatOptionLabel = (option: CountryOption) => (
    <div className="flex items-center gap-2">
      <span className="text-lg">{option.flag}</span>
      <span>{option.label}</span>
    </div>
  );

  return (
    <div className={className}>
      <Select
        instanceId="country-select" // Consistent ID for hydration
        options={COUNTRIES}
        value={selectedOption}
        onChange={handleChange}
        placeholder={
          <div className="flex items-center gap-2 text-slate-400">
            <Globe className="h-4 w-4" />
            <span>{placeholder}</span>
          </div>
        }
        styles={customStyles}
        formatOptionLabel={formatOptionLabel}
        isClearable
        isSearchable
        className="text-base"
        classNamePrefix="react-select"
        filterOption={(option, inputValue) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase())
        }
      />
    </div>
  );
};
