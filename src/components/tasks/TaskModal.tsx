"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useCedarStore, useChatInput } from "cedar-os";
import { useTripDispatch, useTripState } from "@/components/providers/TripProvider";

const TaskModalContent = () => {
  const { approvedItinerary, activeModal } = useTripState();
  const dispatch = useTripDispatch();
  const setShowChat = useCedarStore((store) => store.setShowChat);
  const { setOverrideInputContent } = useChatInput();

  if (!activeModal) return null;

  const day = approvedItinerary?.find((d) => d.id === activeModal.dayId);
  const item = day?.items.find((i) => i.id === activeModal.itemId);

  if (!day || !item) {
    dispatch({ type: "CLOSE_MODAL" });
    return null;
  }

  const handleClose = () => dispatch({ type: "CLOSE_MODAL" });
  const handleHelp = () => {
    setShowChat(true);
    setOverrideInputContent(
      `Help me complete "${item.title}" in ${day.city} on ${day.date} from ${item.timeStart} to ${item.timeEnd}.`
    );
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {day.city} • {day.date}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-800">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {item.timeStart} – {item.timeEnd}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 transition hover:border-blue-400 hover:text-blue-600"
          >
            Close
          </button>
        </div>

        {item.note && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {item.note}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleHelp}
            className="rounded-xl border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Help me with this
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Mark complete
          </button>
        </div>
      </div>
    </div>
  );
};

export const TaskModal = () => {
  const { activeModal } = useTripState();

  useEffect(() => {
    if (!activeModal) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [activeModal]);

  if (typeof document === "undefined") return null;
  return createPortal(<TaskModalContent />, document.body);
};
