"use client";

import { useEffect, useState } from "react";
import { useCedarStore } from "cedar-os";
import { useTripDispatch } from "@/components/providers/TripProvider";
import { ItineraryTab } from "@/components/shell/ItineraryTab";
import { TasksTab } from "@/components/shell/TasksTab";
import { SidePanelCedarChat } from "@/app/cedar-os/components/chatComponents/SidePanelCedarChat";
import { TaskModal } from "@/components/tasks/TaskModal";

const TABS = [
  { id: "itinerary", label: "Itinerary" },
  { id: "tasks", label: "Tasks" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export const MainShell = () => {
  const [activeTab, setActiveTab] = useState<TabId>("itinerary");
  const dispatch = useTripDispatch();
  const showChat = useCedarStore((store) => store.showChat);
  const setShowChat = useCedarStore((store) => store.setShowChat);

  useEffect(() => {
    dispatch({ type: "SET_DOCK_OPEN", value: showChat });
  }, [dispatch, showChat]);

  const mainContent = (
    <div className="flex min-h-screen flex-col bg-[#f6f5f4]">
      <header className="px-8 py-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">BackpackMate AI</h1>
            <p className="text-sm text-slate-500">HackGT demo companion</p>
          </div>
          <button
            type="button"
            onClick={() => setShowChat(true)}
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            Open assistant
          </button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex w-full max-w-6xl gap-4 px-8">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-3 text-sm font-medium transition ${
                  isActive
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-8 py-10">
          <section className="min-h-[65vh] rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {activeTab === "itinerary" ? <ItineraryTab /> : <TasksTab />}
          </section>
        </div>
      </main>
    </div>
  );

  return (
    <SidePanelCedarChat
      side="right"
      title="Travel assistant"
      collapsedLabel="Need help planning?"
      className="bg-white border-l border-slate-200 shadow-none"
      showCollapsedButton
      topOffset={0}
    >
      {mainContent}
      <TaskModal />
    </SidePanelCedarChat>
  );
};
