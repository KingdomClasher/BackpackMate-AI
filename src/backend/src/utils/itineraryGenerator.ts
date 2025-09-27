import { addDays, differenceInCalendarDays, format, parse } from "date-fns";
import { Answers, ItineraryDay, ItineraryItem, ItineraryTask, ProposalResponse } from "../schemas/trip";

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

const splitDestinations = (raw: string): string[] =>
  raw
    .split(/,|\n|\/|and/) // handle various separators
    .map((token) => token.trim())
    .filter(Boolean)
    .map((city) => city.replace(/(^[a-z])/g, (match) => match.toUpperCase()));

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

export const generateItineraryProposal = (answers: Answers): ProposalResponse => {
  const destinations = splitDestinations(answers.destinations);
  const { start, end } = parseTripDates(answers.dates);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);

  const cityCount = Math.max(destinations.length, 1);
  const daysPerCity = Math.max(1, Math.floor(totalDays / cityCount));

  const days: ItineraryDay[] = [];
  let currentDate = start;
  let dayCounter = 0;

  destinations.forEach((city) => {
    const allocation = dayCounter + daysPerCity > totalDays ? totalDays - dayCounter : daysPerCity;
    for (let i = 0; i < allocation; i += 1) {
      const items = buildDayItems(city, i);
      days.push({
        id: `${city}-${format(currentDate, "yyyy-MM-dd")}`,
        date: format(currentDate, "yyyy-MM-dd"),
        city,
        items,
      });
      currentDate = addDays(currentDate, 1);
      dayCounter += 1;
    }
  });

  // If allocation leaves remaining days (e.g., more days than destinations), fill with last city
  while (dayCounter < totalDays) {
    const city = destinations[destinations.length - 1] ?? "Destination";
    const items = buildDayItems(city, dayCounter);
    days.push({
      id: `${city}-${format(currentDate, "yyyy-MM-dd")}`,
      date: format(currentDate, "yyyy-MM-dd"),
      city,
      items,
    });
    currentDate = addDays(currentDate, 1);
    dayCounter += 1;
  }

  const uniqueCities = Array.from(new Set(days.map((day) => day.city)));
  const destinationTasks = uniqueCities.reduce((acc, city) => {
    acc[city] = createCityTasks(city);
    return acc;
  }, {} as Record<string, ItineraryTask[]>);

  const summary = `A ${totalDays}-day getaway covering ${uniqueCities.join(
    ", "
  )}, balancing signature experiences with downtime tailored to your preferences.`;

  return {
    itinerary: {
      days,
      generatedAt: new Date().toISOString(),
      summary,
    },
    generalTasks: DEFAULT_GENERAL_TASKS,
    destinationTasks,
  };
};
