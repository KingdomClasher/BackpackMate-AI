import { ItineraryDay, ProposedItinerary } from "@/lib/types/trip";

interface ItineraryProposalPreviewProps {
  proposed: ProposedItinerary;
  onApprove: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  error: string | null;
}

const DayPreview = ({ day }: { day: ItineraryDay }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-blue-500">
          {day.date}
        </p>
        <h3 className="text-lg font-semibold">{day.city}</h3>
      </div>
      <span className="text-xs text-slate-400">{day.items.length} stops</span>
    </div>
    <ul className="mt-4 space-y-2 text-sm text-slate-600">
      {day.items.slice(0, 3).map((item) => (
        <li key={item.id} className="flex items-center gap-2">
          <span className="inline-flex min-w-[70px] justify-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
            {item.timeStart} – {item.timeEnd}
          </span>
          <span className="font-medium text-slate-700">{item.title}</span>
          {item.note && (
            <span className="line-clamp-1 text-xs text-slate-400">
              {item.note}
            </span>
          )}
        </li>
      ))}
    </ul>
  </div>
);

export const ItineraryProposalPreview = ({
  proposed,
  onApprove,
  onRegenerate,
  isRegenerating,
  error,
}: ItineraryProposalPreviewProps) => {
  return (
    <div className="min-h-screen bg-[#f6f5f4] px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Proposed itinerary
          </span>
          <h1 className="text-3xl font-semibold text-slate-900">
            Here&apos;s a first pass at your trip
          </h1>
          <p className="text-base text-slate-600">{proposed.summary}</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          {proposed.days.slice(0, 3).map((day) => (
            <DayPreview key={day.id} day={day} />
          ))}
          {proposed.days.length > 3 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              +{proposed.days.length - 3} more days planned
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex items-center rounded-2xl border border-slate-900 bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Approve itinerary
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="inline-flex items-center rounded-2xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-500 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRegenerating ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
};
