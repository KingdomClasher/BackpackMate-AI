import { useCedarStore, useChatInput } from "cedar-os";
import { useTripDispatch, useTripState } from "@/components/providers/TripProvider";

export const TasksTab = () => {
  const { tasks } = useTripState();
  const dispatch = useTripDispatch();
  const setShowChat = useCedarStore((store) => store.setShowChat);
  const { setOverrideInputContent } = useChatInput();

  const hasDestinationTasks = tasks?.destinationSpecificTasks.length ?? 0 > 0;

  const handleGeneralToggle = (id: string) => {
    dispatch({ type: "TOGGLE_GENERAL_TASK", id });
  };

  const handleDestinationToggle = (city: string, id: string) => {
    dispatch({ type: "TOGGLE_DESTINATION_TASK", city, id });
  };

  const handleAIHelp = (prompt: string) => {
    setShowChat(true);
    setOverrideInputContent(prompt);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">General tasks</h2>
            <p className="text-sm text-slate-500">
              Essentials that apply across your entire trip.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAIHelp("Help me review my general travel prep tasks.")}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            AI help
          </button>
        </header>
        <ul className="space-y-2">
          {tasks?.generalTasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleGeneralToggle(task.id)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                />
                <span className={task.done ? "line-through text-slate-400" : "text-slate-700"}>
                  {task.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Destination tasks</h2>
          <p className="text-sm text-slate-500">
            City-specific follow-ups appear once the itinerary is approved.
          </p>
        </header>

        {!hasDestinationTasks ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Approve the itinerary to generate tailored tasks for each city (e.g.,
            transit passes, local reservations, SIM cards).
          </div>
        ) : (
          <div className="space-y-4">
            {tasks?.destinationSpecificTasks.map((task) => (
              <div key={city} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">{city}</h3>
                  <button
                    type="button"
                    onClick={() =>
                      handleAIHelp(`Help me with travel tasks for ${city}.`)
                    }
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
                  >
                    AI help
                  </button>
                </div>
                <ul className="space-y-2 text-sm">
                  {tasks?.destinationSpecificTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <label className="flex flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => handleDestinationToggle(city, task.id)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                        />
                        <span className={task.done ? "line-through text-slate-400" : "text-slate-700"}>
                          {task.text}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
