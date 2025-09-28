"use client";

import { useState, useEffect } from "react";
import { TripState, Tasks } from "@/lib/types/trip";
import { updateTaskCompletion } from "@/lib/api/trip";

interface TasksTabContentProps {
  tripData: TripState;
  tripId: string;
  onTaskUpdate?: () => void; // Callback to refresh trip data after regeneration
}

export function TasksTabContent({ tripData, tripId, onTaskUpdate }: TasksTabContentProps) {
  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = useState<Tasks | undefined>(tripData.tasks);
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());

  // Update local state when tripData changes (from external updates)
  useEffect(() => {
    setLocalTasks(tripData.tasks);
  }, [tripData.tasks]);

  // Use local tasks for optimistic updates
  const generalTasks = localTasks?.generalTasks || [];
  const destinationSpecificTasks = localTasks?.destinationSpecificTasks || [];

  // Group destination-specific tasks by location for display
  const destinationTasksByLocation = destinationSpecificTasks.reduce((acc, task) => {
    if (!acc[task.location]) {
      acc[task.location] = [];
    }
    acc[task.location].push(task);
    return acc;
  }, {} as Record<string, typeof destinationSpecificTasks>);

  const hasDestinationTasks = destinationSpecificTasks.length > 0;

  const toggleTask = async (taskId: string, currentDone: boolean) => {
    const newDone = !currentDone;

    // Optimistic update - immediately update local state
    setLocalTasks(prevTasks => {
      if (!prevTasks) return prevTasks;

      return {
        generalTasks: prevTasks.generalTasks?.map(task =>
          task.id === taskId ? { ...task, done: newDone } : task
        ) || [],
        destinationSpecificTasks: prevTasks.destinationSpecificTasks?.map(task =>
          task.id === taskId ? { ...task, done: newDone } : task
        ) || [],
      };
    });

    // Add to updating set for visual feedback
    setUpdatingTasks(prev => new Set(prev).add(taskId));

    try {
      const result = await updateTaskCompletion(tripId, taskId, newDone);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }

      // Optionally refresh data in background (without causing UI flash)
      // We don't call onTaskUpdate() here to avoid re-rendering
    } catch (err) {
      console.error('Error updating task:', err);

      // Revert optimistic update on error
      setLocalTasks(prevTasks => {
        if (!prevTasks) return prevTasks;

        return {
          generalTasks: prevTasks.generalTasks?.map(task =>
            task.id === taskId ? { ...task, done: currentDone } : task
          ) || [],
          destinationSpecificTasks: prevTasks.destinationSpecificTasks?.map(task =>
            task.id === taskId ? { ...task, done: currentDone } : task
          ) || [],
        };
      });
    } finally {
      // Remove from updating set
      setUpdatingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };


  const getTaskStats = () => {
    const totalGeneral = generalTasks.length;
    const completedGeneral = generalTasks.filter(task => task.done).length;

    const totalDestination = destinationSpecificTasks.length;
    const completedDestination = destinationSpecificTasks.filter(task => task.done).length;

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
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-green-600"></div>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">Generating Your Tasks</h3>
          <p className="text-slate-600">
            Our AI is creating personalized travel preparation tasks...
          </p>
          <p className="mt-2 text-sm text-slate-500">
            This usually takes 30-60 seconds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Task Progress</h2>
        </div>
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
                const isUpdating = updatingTasks.has(task.id);
                return (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id, task.done)}
                        disabled={isUpdating}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className={`flex-1 ${task.done ? 'line-through text-slate-500' : 'text-slate-900'} ${isUpdating ? 'opacity-50' : ''}`}>
                        {task.text}
                      </span>
                      {isUpdating && (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>
                      )}
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
                const locationCompleted = tasks.filter(task => task.done).length;
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
                        const isUpdating = updatingTasks.has(task.id);
                        return (
                          <li
                            key={task.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                          >
                            <label className="flex flex-1 cursor-pointer items-center gap-3">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleTask(task.id, task.done)}
                                disabled={isUpdating}
                                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                              />
                              <span className={`flex-1 ${task.done ? 'line-through text-slate-500' : 'text-slate-900'} ${isUpdating ? 'opacity-50' : ''}`}>
                                {task.text}
                              </span>
                              {isUpdating && (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-purple-600"></div>
                              )}
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
