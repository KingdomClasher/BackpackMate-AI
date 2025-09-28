"use client";

import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, CalendarDays } from "lucide-react";

interface DateRangePickerProps {
  value: string;
  onChange: (dateRange: string) => void;
  placeholder?: string;
  className?: string;
}

export const DateRangePicker = ({
  value,
  onChange,
  placeholder = "Select your travel dates",
  className = ""
}: DateRangePickerProps) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      const parts = value.split(' to ');
      if (parts.length === 2) {
        const start = new Date(parts[0]);
        const end = new Date(parts[1]);
        if (!isNaN(start.getTime())) setStartDate(start);
        if (!isNaN(end.getTime())) setEndDate(end);
      } else {
        // Try to parse single date
        const date = new Date(value);
        if (!isNaN(date.getTime())) setStartDate(date);
      }
    }
  }, [value]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);

    if (start && end) {
      const startStr = start.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const endStr = end.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      onChange(`${startStr} to ${endStr}`);
    } else if (start) {
      const startStr = start.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      onChange(startStr);
    } else {
      onChange('');
    }
  };

  const customInput = (
    <div className={`flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm cursor-pointer hover:border-slate-500 focus-within:border-slate-500 focus-within:ring-2 focus-within:ring-slate-200 ${className}`}>
      <Calendar className="h-5 w-5 text-slate-400" />
      <div className="flex-1">
        {startDate && endDate ? (
          <div className="flex items-center gap-2">
            <span>{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="text-slate-400">→</span>
            <span>{endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        ) : startDate ? (
          <span>{startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </div>
      <CalendarDays className="h-4 w-4 text-slate-400" />
    </div>
  );

  return (
    <div className="w-full">
      <DatePicker
        selected={startDate}
        onChange={handleDateChange}
        startDate={startDate}
        endDate={endDate}
        selectsRange
        minDate={new Date()}
        customInput={customInput}
        dateFormat="MMMM d, yyyy"
        placeholderText={placeholder}
        className="w-full"
        calendarClassName="shadow-lg border border-slate-200 rounded-xl"
        dayClassName={(date) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0); // Reset time to compare only dates
          const dateToCheck = new Date(date);
          dateToCheck.setHours(0, 0, 0, 0); // Reset time to compare only dates
          const isToday = dateToCheck.getTime() === today.getTime();
          return `hover:bg-slate-100 rounded-lg transition-colors duration-150 ${isToday ? 'is-today' : ''}`;
        }}
        monthClassName={() => "text-slate-900 font-medium"}
        weekDayClassName={() => "text-slate-500 font-medium text-sm"}
        popperClassName="z-50"
        popperPlacement="bottom-start"
      />

      <style jsx global>{`
        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }


        .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          border-radius: 0.75rem 0.75rem 0 0;
          padding: 1rem;
        }

        .react-datepicker__current-month {
          color: #1e293b;
          font-weight: 600;
          font-size: 1rem;
        }

        .react-datepicker__day-name {
          color: #64748b;
          font-weight: 500;
          font-size: 0.875rem;
          margin: 0.25rem;
        }

        .react-datepicker__day {
          color: #1e293b;
          margin: 0.25rem;
          border-radius: 0.5rem;
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
        }

        .react-datepicker__day:hover {
          background-color: #f1f5f9;
        }


        /* Completely override react-datepicker's default today styling */
        .react-datepicker__day--today {
          background-color: transparent !important;
          color: #1e293b !important;
          font-weight: normal !important;
          border: none !important;
          box-shadow: none !important;
        }

        /* Ensure no other today-related classes interfere */
        .react-datepicker__day--today:hover {
          background-color: #f1f5f9 !important;
          color: #1e293b !important;
        }

        /* Apply today styling only to our verified today class */
        .react-datepicker__day.is-today {
          background-color: #3b82f6 !important;
          color: white !important;
          font-weight: 600 !important;
        }

        /* Ensure today styling doesn't interfere with selections */
        .react-datepicker__day.is-today.react-datepicker__day--selected {
          background-color: #1e293b !important;
          color: white !important;
        }

        .react-datepicker__day--selected {
          background-color: #1e293b !important;
          color: white !important;
        }

        .react-datepicker__day--selected.react-datepicker__day--today {
          background-color: #1e293b !important;
          color: white !important;
        }

        .react-datepicker__day--in-selecting-range,
        .react-datepicker__day--in-range {
          background-color: #e2e8f0 !important;
          color: #1e293b !important;
          background-image:
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(30, 41, 59, 0.15) 2px,
              rgba(30, 41, 59, 0.15) 4px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 2px,
              rgba(30, 41, 59, 0.08) 2px,
              rgba(30, 41, 59, 0.08) 4px
            ) !important;
          position: relative;
        }

        .react-datepicker__day--in-selecting-range:hover,
        .react-datepicker__day--in-range:hover {
          background-color: #cbd5e1 !important;
        }

        .react-datepicker__day--in-selecting-range.is-today,
        .react-datepicker__day--in-range.is-today {
          background-color: #3b82f6 !important;
          color: white !important;
          background-image:
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.2) 2px,
              rgba(255, 255, 255, 0.2) 4px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.1) 2px,
              rgba(255, 255, 255, 0.1) 4px
            ) !important;
        }

        .react-datepicker__day--range-start,
        .react-datepicker__day--range-end {
          background-color: #1e293b !important;
          color: white !important;
        }

        .react-datepicker__day--range-start.is-today,
        .react-datepicker__day--range-end.is-today {
          background-color: #1e293b !important;
          color: white !important;
          border: 2px solid #3b82f6;
          box-sizing: border-box;
        }

        .react-datepicker__navigation {
          top: 1.25rem;
        }

        .react-datepicker__navigation-icon::before {
          border-color: #64748b;
        }

        .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
          border-color: #1e293b;
        }
      `}</style>
    </div>
  );
};
