import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { Answers, ItineraryDay, ItineraryItem, ItineraryTask } from "../schemas/trip";

const DEFAULT_GENERAL_TASKS: ItineraryTask[] = [
  { id: "passport-check", text: "Confirm passport validity (6+ months)", done: false },
  { id: "travel-insurance", text: "Purchase travel insurance", done: false },
  { id: "vaccines", text: "Review vaccine or health requirements", done: false },
  { id: "visa-check", text: "Check visa requirements", done: false },
];

const CITY_PLAYBOOK: Record<string, string[]> = {
  paris: [
    "Louvre highlights tour",
    "Seine river cruise",
    "Montmartre food crawl",
    "Eiffel Tower sunset visit",
    "Versailles day trip",
  ],
  rome: [
    "Colosseum + Roman Forum walk",
    "Vatican Museums & Sistine Chapel",
    "Trastevere pasta workshop",
    "Villa Borghese bike ride",
    "Day trip to Tivoli Gardens",
  ],
  tokyo: [
    "Tsukiji outer market tasting tour",
    "TeamLab Planets immersive art",
    "Asakusa + Sumida river cruise",
    "Shibuya & Harajuku fashion crawl",
    "Nikko heritage day trip",
  ],
};

const createCityTasks = (city: string): ItineraryTask[] => {
  const slug = city.toLowerCase().replace(/\s+/g, "-");
  return [
    {
      id: `${slug}-museum-passes`,
      text: `Secure skip-the-line museum passes for ${city}`,
      done: false,
    },
    {
      id: `${slug}-transit`,
      text: `Sort out local transit / airport transfers for ${city}`,
      done: false,
    },
    {
      id: `${slug}-restaurants`,
      text: `Shortlist dinner spots and make reservations in ${city}`,
      done: false,
    },
  ];
};

const parseTripDates = (raw: string): { start: Date; end: Date } => {
  const rangeMatch = raw.match(/(\d{4}-\d{2}-\d{2}).*(\d{4}-\d{2}-\d{2})/);
  if (rangeMatch) {
    return {
      start: parse(rangeMatch[1], "yyyy-MM-dd", new Date()),
      end: parse(rangeMatch[2], "yyyy-MM-dd", new Date()),
    };
  }

  const fallbackStart = addDays(new Date(), 30);
  return {
    start: fallbackStart,
    end: addDays(fallbackStart, 4),
  };
};

const splitDestinations = (raw: string | string[]): string[] => {
  if (Array.isArray(raw)) {
    return raw.map((city) => city.replace(/(^[a-z])/g, (match) => match.toUpperCase()));
  }
  return raw
    .split(/,|\n|\/|and/) // handle various separators
    .map((token) => token.trim())
    .filter(Boolean)
    .map((city) => city.replace(/(^[a-z])/g, (match) => match.toUpperCase()));
};

const buildDayItems = (city: string, dayIndex: number): ItineraryItem[] => {
  const base = city.toLowerCase();
  const library = CITY_PLAYBOOK[base] ?? [];
  const primary = library[dayIndex % library.length] ?? `Explore ${city} like a local`;
  const secondary = library[(dayIndex + 1) % library.length] ?? `Optional experiences around ${city}`;

  return [
    {
      id: `${city}-breakfast-${dayIndex}`,
      timeStart: "08:30",
      timeEnd: "09:30",
      title: `Breakfast near hotel`,
      note: `Pick a cafe that suits your style in ${city}.`
    },
    {
      id: `${city}-morning-${dayIndex}`,
      timeStart: "10:00",
      timeEnd: "12:30",
      title: primary,
      note: `Reserve ahead if tickets required.`,
    },
    {
      id: `${city}-lunch-${dayIndex}`,
      timeStart: "12:45",
      timeEnd: "14:00",
      title: "Lunch + downtime",
      note: "Sample a recommended spot near your morning activity.",
    },
    {
      id: `${city}-afternoon-${dayIndex}`,
      timeStart: "14:30",
      timeEnd: "17:00",
      title: secondary,
      note: "Balance cultural highlights with personal interests.",
    },
    {
      id: `${city}-evening-${dayIndex}`,
      timeStart: "19:00",
      timeEnd: "21:00",
      title: `Dinner + evening stroll`,
      note: `End the day with a memorable local experience in ${city}.`,
    },
  ];
};
