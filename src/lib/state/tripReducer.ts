import { produce } from "immer";
import { createInitialTripState, ItineraryTask, TripAction, TripState } from "../types/trip";

const createCityTaskList = (city: string): ItineraryTask[] => [
  {
    id: `${city.toLowerCase().replace(/\s+/g, "-")}-research-highlights`,
    text: `Research top experiences in ${city}`,
    done: false,
  },
  {
    id: `${city.toLowerCase().replace(/\s+/g, "-")}-book-key-tickets`,
    text: `Book priority tickets for must-see attractions in ${city}`,
    done: false,
  },
  {
    id: `${city.toLowerCase().replace(/\s+/g, "-")}-offline-maps`,
    text: `Download offline maps & transit for ${city}`,
    done: false,
  },
];

export const tripInitialState = createInitialTripState();

export function tripReducer(state: TripState, action: TripAction): TripState {
  return produce(state, (draft) => {
    switch (action.type) {
      case "SET_ANSWER": {
        (draft.answers as any)[action.key] = action.value;
        if (!draft.answeredKeys.includes(action.key)) {
          draft.answeredKeys.push(action.key);
        }
        return;
      }
      case "SET_PROPOSED_ITINERARY": {
        draft.proposedItinerary = action.value;
        return;
      }
      case "APPROVE_ITINERARY": {
        if (draft.proposedItinerary) {
          draft.approvedItinerary = draft.proposedItinerary.days;
          const cities = new Set(
            draft.proposedItinerary.days.map((day) => day.city)
          );
          cities.forEach((city) => {
            if (!draft.destinationTasks[city]) {
              draft.destinationTasks[city] = createCityTaskList(city);
            }
          });
        }
        return;
      }
      case "SET_GENERAL_TASKS": {
        draft.generalTasks = action.value;
        return;
      }
      case "ADVANCE_QUESTION": {
        draft.questionIndex = Math.min(
          draft.questionIndex + 1,
          draft.answeredKeys.length
        );
        return;
      }
      case "GO_BACK_QUESTION": {
        draft.questionIndex = Math.max(draft.questionIndex - 1, 0);
        return;
      }
      case "TOGGLE_GENERAL_TASK": {
        const task = draft.generalTasks.find((t) => t.id === action.id);
        if (task) task.done = !task.done;
        return;
      }
      case "TOGGLE_DESTINATION_TASK": {
        const cityTasks = draft.destinationTasks[action.city];
        if (cityTasks) {
          const task = cityTasks.find((t) => t.id === action.id);
          if (task) task.done = !task.done;
        }
        return;
      }
      case "ADD_DESTINATION_TASK": {
        const { city, task } = action;
        if (!draft.destinationTasks[city]) {
          draft.destinationTasks[city] = [];
        }
        draft.destinationTasks[city].push(task);
        return;
      }
      case "SET_DESTINATION_TASKS": {
        draft.destinationTasks = action.value;
        return;
      }
      case "OPEN_MODAL": {
        draft.activeModal = action.payload;
        return;
      }
      case "CLOSE_MODAL": {
        draft.activeModal = null;
        return;
      }
      case "SET_DOCK_OPEN": {
        draft.dockOpen = action.value;
        return;
      }
      case "SET_PENDING_MESSAGE": {
        draft.pendingMessage = action.value;
        return;
      }
      case "SET_CALENDAR_SELECTION": {
        draft.calendarSelection = action.value;
        return;
      }
      case "UPDATE_APPROVED_ITINERARY": {
        draft.approvedItinerary = action.value;
        return;
      }
      case "HYDRATE": {
        return action.value;
      }
      case "RESET": {
        return createInitialTripState();
      }
      default:
        return state;
    }
  });
}
