'use client';

import { useEffect, useMemo, useState } from "react";
import { useTripDispatch, useTripState } from "@/components/providers/TripProvider";
import { ItineraryDay } from "@/lib/types/trip";
import { downloadItineraryICS } from "@/lib/utils/ics";

type ViewMode = "calendar" | "list";

const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 56;

const formatDisplayDate = (date: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(new Date(date));
  } catch {
    return date;
  }
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

interface CalendarEvent {
  id: string;
  title: string;
  note?: string;
  startMinutes: number;
  endMinutes: number;
  lane: number;
  laneCount: number;
}

const buildCalendarEvents = (items: ItineraryDay["items"]): CalendarEvent[] => {
  const sorted = items
    .map((item) => ({
      item,
      start: timeToMinutes(item.timeStart),
      end: timeToMinutes(item.timeEnd),
    }))
    .filter(({ start, end }) => end > start)
    .sort((a, b) => a.start - b.start);

  const lanes: number[] = [];
  const events: CalendarEvent[] = [];

  sorted.forEach(({ item, start, end }) => {
    const clampedStart = Math.max(start, START_HOUR * 60);
    const clampedEnd = Math.min(end, END_HOUR * 60);
    if (clampedEnd <= clampedStart) return;

    let laneIndex = lanes.findIndex((laneEnd) => laneEnd <= clampedStart);
    if (laneIndex === -1) {
      lanes.push(clampedEnd);
      laneIndex = lanes.length - 1;
    } else {
      lanes[laneIndex] = clampedEnd;
    }

    events.push({
      id: item.id,
      title: item.title,
      note: item.note,
      startMinutes: clampedStart,
      endMinutes: clampedEnd,
      lane: laneIndex,
      laneCount: 0,
    });
  });

  const laneCount = Math.max(lanes.length, 1);
  return events.map((event) => ({ ...event, laneCount }));
};

const ViewToggle = ({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) => (
  <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
    {(
      [
        { id: "calendar", label: "Calendar" },
        { id: "list", label: "List" },
      ] as const
    ).map((option) => {
      const isActive = mode === option.id;
      return (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            isActive
              ? "bg-slate-900 text-white shadow"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

const DayCalendarColumn = ({
  day,
  index,
  onSelectItem,
}: {
  day: ItineraryDay;
  index: number;
  onSelectItem?: (dayId: string, itemId: string) => void;
}) => {
  const events = useMemo(() => buildCalendarEvents(day.items), [day.items]);
  const totalMinutes = TOTAL_HOURS * 60;

  return (
    <div className="min-w-[260px] flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Day {index + 1}</p>
        <h3 className="text-lg font-semibold text-slate-900">{day.city}</h3>
        <p className="text-sm text-slate-500">{formatDisplayDate(day.date)}</p>
      </header>

      <div
        className="relative overflow-hidden rounded-xl bg-slate-50"
        style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
      >
        {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-slate-200"
            style={{ top: `${(i / TOTAL_HOURS) * 100}%` }}
          >
            <span className="absolute left-2 top-1 text-[10px] font-medium text-slate-400">
              {`${START_HOUR + i}:00`}
            </span>
          </div>
        ))}

        {events.map((event) => {
          const startOffset = ((event.startMinutes - START_HOUR * 60) / totalMinutes) * 100;
          const duration = ((event.endMinutes - event.startMinutes) / totalMinutes) * 100;
          const width = 100 / event.laneCount;
          const left = event.lane * width;

          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectItem?.(day.id, event.id)}
              className="absolute rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-left text-[13px] font-medium text-slate-800 shadow-sm transition hover:border-slate-400"
              style={{
                top: `${startOffset}%`,
                height: `${duration}%`,
                left: `${left}%`,
                width: `${width}%`,
              }}
            >
              <div>{event.title}</div>
              {event.note && <p className="mt-1 text-[11px] text-slate-500">{event.note}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DayListPanel = ({
  day,
  onSelectItem,
}: {
  day: ItineraryDay;
  onSelectItem?: (dayId: string, itemId: string) => void;
}) => (
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {formatDisplayDate(day.date)}
        </p>
        <h2 className="text-xl font-semibold text-slate-900">{day.city}</h2>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        {day.items.length} activities
      </span>
    </header>

    <div className="space-y-3">
      {day.items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="space-y-2">
            <span className="inline-flex w-fit rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
              {item.timeStart} – {item.timeEnd}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              {item.note && <p className="mt-1 text-sm text-slate-600">{item.note}</p>}
            </div>
          </div>
          {onSelectItem && (
            <button
              type="button"
              onClick={() => onSelectItem(day.id, item.id)}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
            >
              Open tasks
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

export const ItineraryTab = () => {
  const { approvedItinerary, proposedItinerary } = useTripState();
  const dispatch = useTripDispatch();

  const itinerary = useMemo(
    () => approvedItinerary ?? proposedItinerary?.days ?? [],
    [approvedItinerary, proposedItinerary]
  );
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const tripName = useMemo(() => {
    if (itinerary.length === 0) return undefined;
    const cities = itinerary
      .map((day) => day.city)
      .filter((city): city is string => !!city);
    if (cities.length === 0) return undefined;
    const unique = Array.from(new Set(cities));
    return unique.join(" • ");
  }, [itinerary]);

  useEffect(() => {
    if (itinerary.length === 0) {
      setActiveDayIndex(0);
      return;
    }
    setActiveDayIndex((prev) => (prev < itinerary.length ? prev : 0));
  }, [itinerary.length]);

  const handleOpenTasks = (dayId: string, itemId: string) => {
    dispatch({ type: "OPEN_MODAL", payload: { dayId, itemId } });
  };

  if (itinerary.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
        Approve an itinerary to explore the calendar and daily details here.
      </div>
    );
  }

  const totalActivities = itinerary.reduce((total, day) => total + day.items.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Trip itinerary</h2>
          <p className="text-sm text-slate-500">
            Scroll the full calendar or review a single day with the list view.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadItineraryICS(itinerary, {
              tripName,
              fileName: tripName?.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
            })}
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Download .ics
          </button>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-full gap-4">
            {itinerary.map((day, index) => (
              <DayCalendarColumn
                key={day.id ?? index}
                day={day}
                index={index}
                onSelectItem={handleOpenTasks}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {itinerary.map((day, index) => {
              const isActive = index === activeDayIndex;
              return (
                <button
                  key={day.id ?? index}
                  type="button"
                  onClick={() => setActiveDayIndex(index)}
                  className={`flex min-w-[120px] flex-1 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow"
                      : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Day {index + 1}
                </button>
              );
            })}
          </div>

          <DayListPanel
            day={itinerary[activeDayIndex]}
            onSelectItem={handleOpenTasks}
          />
        </div>
      )}

      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-3">
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Total days
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{itinerary.length}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Activities planned
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalActivities}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Unique locations
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {new Set(itinerary.map((day) => day.city)).size}
          </p>
        </div>
      </section>
    </div>
  );
};
