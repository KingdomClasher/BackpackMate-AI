import { ItineraryDay } from "@/lib/types/trip";

type GenerateOptions = {
  tripName?: string;
};

type DownloadOptions = GenerateOptions & {
  fileName?: string;
};

const VCALENDAR_HEADER = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//BackpackMate//Itinerary//EN",
];

const VCALENDAR_FOOTER = "END:VCALENDAR";

const escapeICS = (value: string | undefined) => {
  if (!value) return "";
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
};

const formatICSDate = (date: Date) => {
  const iso = date.toISOString();
  return iso.replace(/[-:]/g, "").split(".")[0] + "Z";
};

export const generateItineraryICS = (
  days: ItineraryDay[],
  { tripName }: GenerateOptions = {}
): string => {
  const now = formatICSDate(new Date());
  const events = days.flatMap((day) => {
    const dayDate = day.date ?? "";
    return day.items.map((item) => {
      const start = new Date(`${dayDate}T${item.timeStart}`);
      const end = new Date(`${dayDate}T${item.timeEnd}`);

      const dtStart = formatICSDate(start);
      const dtEnd = formatICSDate(end);

      const summary = escapeICS(item.title || "Activity");
      const description = escapeICS(item.note || "");
      const location = escapeICS(day.city || tripName || "Trip");
      const uid = `${item.id || Math.random().toString(36).slice(2)}@backpackmate`;

      const vevent = [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
      ];

      if (description) {
        vevent.push(`DESCRIPTION:${description}`);
      }
      if (location) {
        vevent.push(`LOCATION:${location}`);
      }

      vevent.push("END:VEVENT");

      return vevent.join("\r\n");
    });
  });

  const calendar = [
    ...VCALENDAR_HEADER,
    tripName ? `X-WR-CALNAME:${escapeICS(tripName)}` : undefined,
    ...events,
    VCALENDAR_FOOTER,
  ].filter(Boolean);

  return calendar.join("\r\n") + "\r\n";
};

export const downloadItineraryICS = (
  days: ItineraryDay[],
  { tripName, fileName }: DownloadOptions = {}
) => {
  if (typeof window === "undefined") return;

  const icsContent = generateItineraryICS(days, { tripName });
  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  const safeName = fileName ||
    (tripName ? tripName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") : "backpackmate-itinerary");
  link.href = url;
  link.download = `${safeName || "itinerary"}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};
