"use client";

import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { useRegisterState } from "cedar-os";
import { z } from "zod";
import {
  AnswerSchema,
  DestinationTasksSchema,
  ItineraryDay,
  ItineraryDaySchema,
  ItineraryTaskSchema,
  QAKeySchema,
  TripAction,
  TripState,
  TripStateSchema,
  createInitialTripState,
} from "@/lib/types/trip";
import { tripReducer } from "@/lib/state/tripReducer";
import { useStateBasedMentionProvider } from "cedar-os";

const TripStateContext = createContext<TripState | undefined>(undefined);
const TripDispatchContext =
  createContext<React.Dispatch<TripAction> | undefined>(undefined);

const STORAGE_KEY = "backpackmate-trip-state-v1";
const AnswerSetterSchema = z.object({ key: QAKeySchema, value: z.string() });
const ApprovedItineraryArgsSchema = z.object({ days: z.array(ItineraryDaySchema) });
const ToggleGeneralTaskSchema = z.object({ id: z.string() });
const ToggleDestinationTaskSchema = z.object({ city: z.string(), id: z.string() });
const AddDestinationTaskSchema = z.object({ city: z.string(), task: ItineraryTaskSchema });
const ReplaceDestinationTasksSchema = z.object({ tasks: DestinationTasksSchema });

export const TripProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(tripReducer, undefined, () => {
    if (typeof window === "undefined") {
      return createInitialTripState();
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return createInitialTripState();
      }

      const parsed = TripStateSchema.parse(JSON.parse(stored));
      return parsed;
    } catch (error) {
      console.warn("Failed to hydrate trip state", error);
      return createInitialTripState();
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const payload: TripState = {
        ...state,
        lastSavedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Failed to persist trip state", error);
    }
  }, [state]);

  const answerSetters = useMemo(
    () => ({
      setAnswer: {
        name: "setAnswer",
        description: "Update an onboarding answer",
        argsSchema: AnswerSetterSchema,
        execute: (_value: unknown, rawArgs: unknown) => {
          const args = AnswerSetterSchema.parse(rawArgs);
          dispatch({ type: "SET_ANSWER", key: args.key, value: args.value });
        },
      },
    }),
    [dispatch]
  );

  useRegisterState({
    key: "answers",
    description: "User onboarding answers collected during setup",
    value: state.answers,
    stateSetters: answerSetters,
  });

  useRegisterState({
    key: "proposedItinerary",
    description: "Latest itinerary proposed by the agent awaiting approval",
    value: state.proposedItinerary,
  });

  const itinerarySetters = useMemo(
    () => ({
      replaceItinerary: {
        name: "replaceItinerary",
        description: "Replace the approved itinerary with new days",
        argsSchema: ApprovedItineraryArgsSchema,
        execute: (_value: unknown, rawArgs: unknown) => {
          const args = ApprovedItineraryArgsSchema.parse(rawArgs);
          dispatch({ type: "UPDATE_APPROVED_ITINERARY", value: args.days });
        },
      },
      approveProposal: {
        name: "approveProposal",
        description: "Approve the currently proposed itinerary",
        execute: () => dispatch({ type: "APPROVE_ITINERARY" }),
      },
    }),
    [dispatch]
  );

  useRegisterState({
    key: "approvedItinerary",
    description: "Approved itinerary broken down by days and activities",
    value: state.approvedItinerary,
    stateSetters: itinerarySetters,
  });

  const generalTaskSetters = useMemo(
    () => ({
      toggleTask: {
        name: "toggleGeneralTask",
        description: "Toggle completion state of a general task",
        argsSchema: ToggleGeneralTaskSchema,
        execute: (_value: unknown, rawArgs: unknown) => {
          const args = ToggleGeneralTaskSchema.parse(rawArgs);
          dispatch({ type: "TOGGLE_GENERAL_TASK", id: args.id });
        },
      },
    }),
    [dispatch]
  );

  useRegisterState({
    key: "generalTasks",
    description: "Global travel preparation tasks",
    value: state.generalTasks,
    stateSetters: generalTaskSetters,
  });

  const destinationTaskSetters = useMemo(
    () => ({
      toggleTask: {
        name: "toggleDestinationTask",
        description: "Toggle completion state of a destination task",
        argsSchema: ToggleDestinationTaskSchema,
        execute: (_value: unknown, rawArgs: unknown) => {
          const args = ToggleDestinationTaskSchema.parse(rawArgs);
          dispatch({ type: "TOGGLE_DESTINATION_TASK", city: args.city, id: args.id });
        },
      },
      addTask: {
        name: "addDestinationTask",
        description: "Add a destination-specific task",
        argsSchema: AddDestinationTaskSchema,
        execute: (_value: unknown, rawArgs: unknown) => {
          const args = AddDestinationTaskSchema.parse(rawArgs);
          dispatch({ type: "ADD_DESTINATION_TASK", city: args.city, task: args.task });
        },
      },
      replaceAll: {
        name: "setDestinationTasks",
        description: "Replace destination tasks mapping",
        argsSchema: ReplaceDestinationTasksSchema,
        execute: (_value: unknown, rawArgs: unknown) => {
          const args = ReplaceDestinationTasksSchema.parse(rawArgs);
          dispatch({ type: "SET_DESTINATION_TASKS", value: args.tasks });
        },
      },
    }),
    [dispatch]
  );

  useRegisterState({
    key: "destinationTasks",
    description: "Destination specific tasks grouped by city",
    value: state.destinationTasks,
    stateSetters: destinationTaskSetters,
  });

  useStateBasedMentionProvider<ItineraryDay>({
    stateKey: "approvedItinerary",
    trigger: "@",
    labelField: (day) => `${day.city} • ${day.date}`,
    description: "Reference itinerary days in chat",
    color: "#2563eb",
  });

  const stateValue = useMemo(() => state, [state]);

  return (
    <TripStateContext.Provider value={stateValue}>
      <TripDispatchContext.Provider value={dispatch}>
        {children}
      </TripDispatchContext.Provider>
    </TripStateContext.Provider>
  );
};

export function useTripState() {
  const ctx = useContext(TripStateContext);
  if (!ctx) {
    throw new Error("useTripState must be used within TripProvider");
  }
  return ctx;
}

export function useTripDispatch() {
  const ctx = useContext(TripDispatchContext);
  if (!ctx) {
    throw new Error("useTripDispatch must be used within TripProvider");
  }
  return ctx;
}
