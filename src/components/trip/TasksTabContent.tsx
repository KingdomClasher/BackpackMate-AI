"use client";

import { useState } from "react";
import { TripState } from "@/lib/types/trip";

interface TasksTabContentProps {
  tripData: TripState;
}

export function TasksTabContent({ tripData }: TasksTabContentProps) {
  // Local state for task completion (in a real app, this would sync with backend)
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // Use only the new tasks format
  const generalTasks = tripData.tasks?.generalTasks || [];
  const destinationSpecificTasks = tripData.tasks?.destinationSpecificTasks || [];

  // Group destination-specific tasks by location for display
  const destinationTasksByLocation = destinationSpecificTasks.reduce((acc, task) => {
    if (!acc[task.location]) {
      acc[task.location] = [];
    }
    acc[task.location].push(task);
    return acc;
  }, {} as Record<string, typeof destinationSpecificTasks>);

  const hasDestinationTasks = destinationSpecificTasks.length > 0;

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getTaskStats = () => {
    const totalGeneral = generalTasks.length;
    const completedGeneral = generalTasks.filter(task => completedTasks.has(task.id)).length;

    const totalDestination = destinationSpecificTasks.length;
    const completedDestination = destinationSpecificTasks.filter(task => completedTasks.has(task.id)).length;

    return {
      total: totalGeneral + totalDestination,
      completed: completedGeneral + completedDestination,
      generalTotal: totalGeneral,
      generalCompleted: completedGeneral,
      destinationTotal: totalDestination,
      destinationCompleted: completedDestination,
    };
  };

  const stats = getTaskStats();

  if (generalTasks.length === 0 && !hasDestinationTasks) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">No Tasks Available</h3>
          <p className="text-slate-600">
            Your tasks haven&apos;t been generated yet or aren&apos;t available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Task Progress</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {stats.completed}/{stats.total}
            </div>
            <div className="text-sm text-slate-600">Total Tasks</div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {stats.generalCompleted}/{stats.generalTotal}
            </div>
            <div className="text-sm text-slate-600">General Tasks</div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${stats.generalTotal > 0 ? (stats.generalCompleted / stats.generalTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-2xl font-bold text-slate-900">
              {stats.destinationCompleted}/{stats.destinationTotal}
            </div>
            <div className="text-sm text-slate-600">Destination Tasks</div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-purple-500 transition-all duration-300"
                style={{ width: `${stats.destinationTotal > 0 ? (stats.destinationCompleted / stats.destinationTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* General Tasks */}
        {generalTasks.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">General Tasks</h2>
                <p className="text-sm text-slate-500">
                  Essentials that apply across your entire trip.
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                {stats.generalCompleted}/{stats.generalTotal}
              </div>
            </header>
            <ul className="space-y-2">
              {generalTasks.map((task) => {
                const isCompleted = completedTasks.has(task.id);
                return (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => toggleTask(task.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`flex-1 ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {task.text}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Destination Tasks */}
        {hasDestinationTasks && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Destination Tasks</h2>
                <p className="text-sm text-slate-500">
                  Specific tasks for each destination.
                </p>
              </div>
              <div className="rounded-xl bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700">
                {stats.destinationCompleted}/{stats.destinationTotal}
              </div>
            </header>
            <div className="space-y-6">
              {Object.entries(destinationTasksByLocation).map(([location, tasks]) => {
                const locationCompleted = tasks.filter(task => completedTasks.has(task.id)).length;
                return (
                  <div key={location}>
                    <h3 className="mb-3 flex items-center justify-between text-base font-medium text-slate-900">
                      <span>📍 {location}</span>
                      <span className="text-sm font-normal text-slate-500">
                        {locationCompleted}/{tasks.length}
                      </span>
                    </h3>
                    <ul className="space-y-2">
                      {tasks.map((task) => {
                        const isCompleted = completedTasks.has(task.id);
                        return (
                          <li
                            key={task.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          >
                            <label className="flex flex-1 cursor-pointer items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => toggleTask(task.id)}
                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className={`flex-1 ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {task.text}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
