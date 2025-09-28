"use client";

import { Fragment } from "react";
import { TripState, ItineraryDay } from "@/lib/types/trip";

interface ItineraryTabContentProps {
  tripData: TripState;
}

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

    let lane = 0;
    while (lanes[lane] && lanes[lane] > clampedStart) {
      lane++;
    }
    lanes[lane] = clampedEnd;

    events.push({
      id: item.id,
      title: item.title,
      note: item.note,
      startMinutes: clampedStart,
      endMinutes: clampedEnd,
      lane,
      laneCount: Math.max(...lanes.map((_, i) => i + 1)),
    });
  });

  // Update lane counts
  const maxLanes = Math.max(1, ...events.map((e) => e.lane + 1));
  events.forEach((event) => {
    event.laneCount = maxLanes;
  });

  return events;
};

export function ItineraryTabContent({ tripData }: ItineraryTabContentProps) {
  const itinerary = tripData.proposedItinerary?.days || [];

  if (itinerary.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">Generating Your Itinerary</h3>
          <p className="text-slate-600">
            Our AI is creating a personalized itinerary for your trip...
          </p>
          <p className="mt-2 text-sm text-slate-500">
            This usually takes 30-60 seconds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {itinerary.map((day: ItineraryDay, dayIndex: number) => {
        const events = buildCalendarEvents(day.items);

        return (
          <div
            key={dayIndex}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {/* Day Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Day {dayIndex + 1}
                </h3>
                <p className="text-sm text-slate-600">
                  {formatDisplayDate(day.date)} • {day.city}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                {day.items.length} activities
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Time axis */}
              <div className="absolute left-0 top-0 h-full w-16 border-r border-slate-200">
                {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                  const hour = START_HOUR + i;
                  return (
                    <div
                      key={hour}
                      className="absolute flex h-16 w-full items-start justify-center text-xs text-slate-500"
                      style={{ top: `${i * 64}px` }}
                    >
                      {hour === START_HOUR ? (
                        <span className="mt-1">{hour}:00</span>
                      ) : hour % 2 === 0 ? (
                        <span className="mt-1">{hour}:00</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Events */}
              <div className="ml-16 min-h-[896px] relative">
                {/* Hour grid lines */}
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t border-slate-100"
                    style={{ top: `${(i + 1) * 64}px` }}
                  />
                ))}

                {/* Event blocks */}
                {events.map((event) => {
                  const topOffset = ((event.startMinutes - START_HOUR * 60) / 60) * 64;
                  const height = ((event.endMinutes - event.startMinutes) / 60) * 64;
                  const leftOffset = (event.lane / event.laneCount) * 100;
                  const width = (1 / event.laneCount) * 100;

                  return (
                    <div
                      key={event.id}
                      className="absolute rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm shadow-sm"
                      style={{
                        top: `${topOffset}px`,
                        height: `${height}px`,
                        left: `${leftOffset}%`,
                        width: `${width - 1}%`,
                      }}
                    >
                      <div className="font-medium text-slate-900">
                        {event.title}
                      </div>
                      {event.note && (
                        <div className="mt-1 text-xs text-slate-600">
                          {event.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activities List (Alternative View) */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h4 className="mb-3 font-medium text-slate-900">Activities Summary</h4>
              <div className="space-y-2">
                {day.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex-shrink-0 text-xs font-medium text-slate-600">
                      {item.timeStart} - {item.timeEnd}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      {item.note && (
                        <div className="mt-1 text-sm text-slate-600">{item.note}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Summary Statistics */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">📊 Itinerary Summary</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {itinerary.length}
            </div>
            <div className="text-sm text-slate-600">Total Days</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {itinerary.reduce((total: number, day: ItineraryDay) => total + day.items.length, 0)}
            </div>
            <div className="text-sm text-slate-600">Total Activities</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {new Set(itinerary.map((day: ItineraryDay) => day.city)).size}
            </div>
            <div className="text-sm text-slate-600">Unique Locations</div>
          </div>
        </div>
      </div>
    </div>
  );
}
