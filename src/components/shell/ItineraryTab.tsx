import { Fragment, useEffect, useMemo, useState } from "react";
import { useTripDispatch, useTripState } from "@/components/providers/TripProvider";
import { ItineraryDay } from "@/lib/types/trip";

const START_HOUR = 8;
const END_HOUR = 22;
const DAY_MINUTES = (END_HOUR - START_HOUR) * 60;

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatDisplayDate = (date: string) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
    return formatter.format(new Date(date));
  } catch {
    return date;
  }
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

const buildCalendarEvents = (items: ItineraryDay["items"]) => {
  const sorted = items
    .map((item) => ({
      item,
      start: timeToMinutes(item.timeStart),
      end: timeToMinutes(item.timeEnd),
    }))
    .sort((a, b) => a.start - b.start);

  const lanes: number[] = [];
  const events: CalendarEvent[] = [];

  sorted.forEach(({ item, start, end }) => {
    const clampedStart = Math.max(start, START_HOUR * 60);
    const clampedEnd = Math.min(end, END_HOUR * 60);
    if (clampedEnd <= clampedStart) return;

    let lane = lanes.findIndex((laneEnd) => laneEnd <= clampedStart);
    if (lane === -1) {
      lanes.push(clampedEnd);
      lane = lanes.length - 1;
    } else {
      lanes[lane] = clampedEnd;
    }

    events.push({
      id: item.id,
      title: item.title,
      note: item.note,
      startMinutes: clampedStart,
      endMinutes: clampedEnd,
      lane,
      laneCount: 0,
    });
  });

  const laneCount = Math.max(lanes.length, 1);
  return events.map((event) => ({ ...event, laneCount }));
};

export const ItineraryTab = () => {
  const { approvedItinerary, proposedItinerary } = useTripState();
  const dispatch = useTripDispatch();

  const itinerary = useMemo(
    () => approvedItinerary ?? proposedItinerary?.days ?? [],
    [approvedItinerary, proposedItinerary]
  );
  const [openDayId, setOpenDayId] = useState<string | null>(
    itinerary.length > 0 ? itinerary[0].id : null
  );

  useEffect(() => {
    if (itinerary.length === 0) {
      setOpenDayId(null);
      return;
    }
    setOpenDayId((prev) => {
      if (prev && itinerary.some((day) => day.id === prev)) {
        return prev;
      }
      return itinerary[0].id;
    });
  }, [itinerary]);

  const handleOpenTasks = (dayId: string, itemId: string) => {
    dispatch({ type: "OPEN_MODAL", payload: { dayId, itemId } });
  };

  if (itinerary.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
        Approve an itinerary to see the per-day plan and calendar view here.
      </div>
    );
  }

  const openDay = itinerary.find((day) => day.id === openDayId) ?? itinerary[0];

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.8fr)]">
      <div className="space-y-5">
        <header>
          <h2 className="text-xl font-semibold text-slate-900">Daily schedule</h2>
          <p className="text-sm text-slate-500">
            Expand a day to review the details or jump straight into tasks.
          </p>
        </header>

        <div className="space-y-3">
          {itinerary.map((day) => {
            const isOpen = day.id === openDay.id;
            return (
              <div key={day.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenDayId(day.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {formatDisplayDate(day.date)}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-800">{day.city}</h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    {isOpen ? "Collapse" : "Expand"}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-slate-200 px-4 py-4">
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex w-fit rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {item.timeStart} – {item.timeEnd}
                          </span>
                          <p className="text-sm font-medium text-slate-800">{item.title}</p>
                          {item.note && (
                            <p className="text-xs text-slate-500">{item.note}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenTasks(day.id, item.id)}
                          className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                        >
                          Open tasks
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Calendar</h2>
          <span className="text-xs text-slate-400">
            {formatDisplayDate(openDay.date)} • {openDay.city}
          </span>
        </div>

        <CalendarGrid
          day={openDay}
          onSelectEvent={(itemId) => handleOpenTasks(openDay.id, itemId)}
        />
      </div>
    </div>
  );
};

interface CalendarGridProps {
  day: ItineraryDay;
  onSelectEvent: (itemId: string) => void;
}

const CalendarGrid = ({ day, onSelectEvent }: CalendarGridProps) => {
  const events = useMemo(() => buildCalendarEvents(day.items), [day.items]);

  const hourMarks = useMemo(() => {
    const marks: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h += 1) {
      marks.push(h);
    }
    return marks;
  }, []);

  return (
    <div className="relative mt-6 h-[520px] rounded-2xl border border-slate-200 bg-white">
      <div className="absolute inset-y-0 left-0 w-16 border-r border-slate-200 bg-slate-50">
        {hourMarks.map((hour) => {
          const offset = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 -translate-y-1/2 px-2"
              style={{ top: `${offset}%` }}
            >
              <span className="text-[11px] font-medium text-slate-500">
                {hour.toString().padStart(2, "0")}:00
              </span>
            </div>
          );
        })}
      </div>

      <div className="ml-16 h-full">
        <div className="relative h-full">
          {hourMarks.map((hour) => {
            const offset = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * 100;
            return (
              <div
                key={`line-${hour}`}
                className="absolute left-0 right-0 h-px bg-slate-200/70"
                style={{ top: `${offset}%` }}
              />
            );
          })}
          {events.map((event) => {
            const startOffset = ((event.startMinutes - START_HOUR * 60) / DAY_MINUTES) * 100;
            const duration = ((event.endMinutes - event.startMinutes) / DAY_MINUTES) * 100;
            const width = 100 / event.laneCount;
            const left = event.lane * width;

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event.id)}
                className="absolute rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-[13px] font-medium text-slate-800 shadow-sm transition hover:border-slate-400"
                style={{
                  top: `${startOffset}%`,
                  height: `${duration}%`,
                  left: `${left}%`,
                  width: `${width}%`,
                }}
              >
                <div className="text-xs font-semibold text-slate-800">{event.title}</div>
                {event.note && (
                  <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                    {event.note}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
