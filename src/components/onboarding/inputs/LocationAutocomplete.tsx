"use client";

import { useState, useEffect } from "react";
import Select from "react-select";

interface LocationOption {
  value: string;
  label: string;
  type: 'city' | 'country' | 'airport';
}

interface LocationAutocompleteProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  isMulti?: boolean;
  className?: string;
  key?: string; // Add key prop to force remount
}

// Sample location data - in a real app, this would come from an API
const LOCATION_DATA: LocationOption[] = [
  // Major Cities
  { value: "New York, NY, USA", label: "New York, NY, USA", type: "city" },
  { value: "London, UK", label: "London, UK", type: "city" },
  { value: "Paris, France", label: "Paris, France", type: "city" },
  { value: "Tokyo, Japan", label: "Tokyo, Japan", type: "city" },
  { value: "Sydney, Australia", label: "Sydney, Australia", type: "city" },
  { value: "Rome, Italy", label: "Rome, Italy", type: "city" },
  { value: "Barcelona, Spain", label: "Barcelona, Spain", type: "city" },
  { value: "Amsterdam, Netherlands", label: "Amsterdam, Netherlands", type: "city" },
  { value: "Berlin, Germany", label: "Berlin, Germany", type: "city" },
  { value: "Vienna, Austria", label: "Vienna, Austria", type: "city" },
  { value: "Prague, Czech Republic", label: "Prague, Czech Republic", type: "city" },
  { value: "Budapest, Hungary", label: "Budapest, Hungary", type: "city" },
  { value: "Istanbul, Turkey", label: "Istanbul, Turkey", type: "city" },
  { value: "Dubai, UAE", label: "Dubai, UAE", type: "city" },
  { value: "Singapore", label: "Singapore", type: "city" },
  { value: "Bangkok, Thailand", label: "Bangkok, Thailand", type: "city" },
  { value: "Mumbai, India", label: "Mumbai, India", type: "city" },
  { value: "Delhi, India", label: "Delhi, India", type: "city" },
  { value: "Hong Kong", label: "Hong Kong", type: "city" },
  { value: "Seoul, South Korea", label: "Seoul, South Korea", type: "city" },

  // Countries
  { value: "United States", label: "United States", type: "country" },
  { value: "United Kingdom", label: "United Kingdom", type: "country" },
  { value: "France", label: "France", type: "country" },
  { value: "Germany", label: "Germany", type: "country" },
  { value: "Italy", label: "Italy", type: "country" },
  { value: "Spain", label: "Spain", type: "country" },
  { value: "Japan", label: "Japan", type: "country" },
  { value: "Australia", label: "Australia", type: "country" },
  { value: "Canada", label: "Canada", type: "country" },
  { value: "Netherlands", label: "Netherlands", type: "country" },

  // Major Airports
  { value: "JFK - John F. Kennedy International Airport", label: "JFK - John F. Kennedy International Airport", type: "airport" },
  { value: "LHR - London Heathrow Airport", label: "LHR - London Heathrow Airport", type: "airport" },
  { value: "CDG - Charles de Gaulle Airport", label: "CDG - Charles de Gaulle Airport", type: "airport" },
  { value: "NRT - Narita International Airport", label: "NRT - Narita International Airport", type: "airport" },
  { value: "SYD - Sydney Kingsford Smith Airport", label: "SYD - Sydney Kingsford Smith Airport", type: "airport" },
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
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: '#f1f5f9',
    borderRadius: '0.5rem',
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: '#1e293b',
    fontSize: '0.875rem',
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: '#64748b',
    '&:hover': {
      backgroundColor: '#e2e8f0',
      color: '#1e293b',
    },
  }),
};

export const LocationAutocomplete = ({
  value,
  onChange,
  placeholder = "Search for cities, countries, or airports...",
  isMulti = true,
  className = ""
}: LocationAutocompleteProps) => {
  const [options, setOptions] = useState<LocationOption[]>(LOCATION_DATA);
  const [selectKey, setSelectKey] = useState(0); // Force re-render key

  // Reset component state when placeholder changes (different question)
  useEffect(() => {
    setSelectKey(prev => prev + 1);
  }, [placeholder]);

  const selectedOptions = value.map(val =>
    options.find(opt => opt.value === val) || { value: val, label: val, type: 'city' as const }
  );

  const handleChange = (selectedOptions: any) => {
    if (isMulti) {
      const values = selectedOptions ? selectedOptions.map((opt: LocationOption) => opt.value) : [];
      onChange(values);
    } else {
      const singleValue = selectedOptions ? selectedOptions.value : "";
      onChange([singleValue]);
    }
  };

  const filterOptions = (option: any, inputValue: string) => {
    return option.label.toLowerCase().includes(inputValue.toLowerCase());
  };

  const formatOptionLabel = (option: LocationOption) => (
    <div className="flex items-center justify-between">
      <span>{option.label}</span>
      <span className="text-xs text-slate-400 capitalize">{option.type}</span>
    </div>
  );

  return (
    <div className={className}>
      <Select
        key={selectKey} // Force remount when key changes
        isMulti={isMulti}
        options={options}
        value={isMulti ? selectedOptions : selectedOptions[0]}
        onChange={handleChange}
        placeholder={placeholder}
        styles={customStyles}
        formatOptionLabel={formatOptionLabel}
        filterOption={filterOptions}
        isClearable
        isSearchable
        className="text-base"
        classNamePrefix="react-select"
        menuIsOpen={undefined} // Let component control its own menu state
        inputValue={undefined} // Let component control its own input state
      />
    </div>
  );
};
