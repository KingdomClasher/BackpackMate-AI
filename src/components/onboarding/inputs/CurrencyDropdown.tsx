"use client";

import { useState, useEffect } from "react";
import Select from "react-select";
import { DollarSign } from "lucide-react";

interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
  name: string;
}

interface CurrencyDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CURRENCIES: CurrencyOption[] = [
  { value: "USD", label: "USD - US Dollar", symbol: "$", name: "US Dollar" },
  { value: "EUR", label: "EUR - Euro", symbol: "€", name: "Euro" },
  { value: "GBP", label: "GBP - British Pound", symbol: "£", name: "British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen", symbol: "¥", name: "Japanese Yen" },
  { value: "CAD", label: "CAD - Canadian Dollar", symbol: "C$", name: "Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar", symbol: "A$", name: "Australian Dollar" },
  { value: "CHF", label: "CHF - Swiss Franc", symbol: "Fr", name: "Swiss Franc" },
  { value: "CNY", label: "CNY - Chinese Yuan", symbol: "¥", name: "Chinese Yuan" },
  { value: "SEK", label: "SEK - Swedish Krona", symbol: "kr", name: "Swedish Krona" },
  { value: "NOK", label: "NOK - Norwegian Krone", symbol: "kr", name: "Norwegian Krone" },
  { value: "DKK", label: "DKK - Danish Krone", symbol: "kr", name: "Danish Krone" },
  { value: "PLN", label: "PLN - Polish Złoty", symbol: "zł", name: "Polish Złoty" },
  { value: "CZK", label: "CZK - Czech Koruna", symbol: "Kč", name: "Czech Koruna" },
  { value: "HUF", label: "HUF - Hungarian Forint", symbol: "Ft", name: "Hungarian Forint" },
  { value: "RUB", label: "RUB - Russian Ruble", symbol: "₽", name: "Russian Ruble" },
  { value: "INR", label: "INR - Indian Rupee", symbol: "₹", name: "Indian Rupee" },
  { value: "KRW", label: "KRW - South Korean Won", symbol: "₩", name: "South Korean Won" },
  { value: "SGD", label: "SGD - Singapore Dollar", symbol: "S$", name: "Singapore Dollar" },
  { value: "HKD", label: "HKD - Hong Kong Dollar", symbol: "HK$", name: "Hong Kong Dollar" },
  { value: "NZD", label: "NZD - New Zealand Dollar", symbol: "NZ$", name: "New Zealand Dollar" },
  { value: "MXN", label: "MXN - Mexican Peso", symbol: "$", name: "Mexican Peso" },
  { value: "BRL", label: "BRL - Brazilian Real", symbol: "R$", name: "Brazilian Real" },
  { value: "ARS", label: "ARS - Argentine Peso", symbol: "$", name: "Argentine Peso" },
  { value: "CLP", label: "CLP - Chilean Peso", symbol: "$", name: "Chilean Peso" },
  { value: "ZAR", label: "ZAR - South African Rand", symbol: "R", name: "South African Rand" },
  { value: "TRY", label: "TRY - Turkish Lira", symbol: "₺", name: "Turkish Lira" },
  { value: "AED", label: "AED - UAE Dirham", symbol: "د.إ", name: "UAE Dirham" },
  { value: "SAR", label: "SAR - Saudi Riyal", symbol: "﷼", name: "Saudi Riyal" },
  { value: "THB", label: "THB - Thai Baht", symbol: "฿", name: "Thai Baht" },
  { value: "MYR", label: "MYR - Malaysian Ringgit", symbol: "RM", name: "Malaysian Ringgit" },
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
  singleValue: (provided: any) => ({
    ...provided,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  }),
};

export const CurrencyDropdown = ({
  value,
  onChange,
  placeholder = "Select currency",
  className = ""
}: CurrencyDropdownProps) => {
  const [isMounted, setIsMounted] = useState(false);
  const selectedOption = CURRENCIES.find(currency => currency.value === value);

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

  const formatOptionLabel = (option: CurrencyOption) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-semibold">{option.symbol}</span>
        <span className="font-medium">{option.value}</span>
      </div>
      <span className="text-sm text-slate-500">{option.name}</span>
    </div>
  );

  const formatSingleValue = (option: CurrencyOption) => (
    <div className="flex items-center gap-2">
      <span className="font-mono text-lg font-semibold">{option.symbol}</span>
      <span className="font-medium">{option.value}</span>
      <span className="text-slate-500">- {option.name}</span>
    </div>
  );

  return (
    <div className={className}>
      <Select
        instanceId="currency-select" // Consistent ID for hydration
        options={CURRENCIES}
        value={selectedOption}
        onChange={handleChange}
        placeholder={
          <div className="flex items-center gap-2 text-slate-400">
            <DollarSign className="h-4 w-4" />
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
          option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.value.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.data.name.toLowerCase().includes(inputValue.toLowerCase())
        }
      />
    </div>
  );
};
