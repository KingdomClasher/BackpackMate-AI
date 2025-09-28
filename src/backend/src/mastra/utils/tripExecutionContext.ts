import { AsyncLocalStorage } from 'async_hooks';

export interface TripExecutionState {
  tripId?: string;
}

const storage = new AsyncLocalStorage<TripExecutionState>();

export function runWithTripContext<T>(state: TripExecutionState, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(state, fn);
}

export function getTripContext(): TripExecutionState | undefined {
  return storage.getStore();
}
