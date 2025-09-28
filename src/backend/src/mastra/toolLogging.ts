import { inspect } from 'util';
import { getTripContext } from './utils/tripExecutionContext';

// Tool type from mastra core is not exported directly, so use structural typing instead.
type ToolLike = {
  id?: string;
  execute: (params: unknown) => Promise<unknown> | unknown;
} & Record<string, unknown>;

type ToolMap = Record<string, ToolLike>;

function formatPayload(value: unknown) {
  try {
    return inspect(value, {
      depth: 5,
      colors: false,
      maxArrayLength: 20,
      maxStringLength: 500,
    });
  } catch (error) {
    return value ?? error;
  }
}

function extractInput(params: unknown) {
  if (params && typeof params === 'object' && 'context' in (params as Record<string, unknown>)) {
    return (params as Record<string, unknown>).context;
  }
  return params;
}

function logEvent(
  phase: 'start' | 'success' | 'error',
  agentName: string,
  toolId: string,
  payload: unknown
) {
  const prefix = `[tool:${phase}] agent=${agentName} tool=${toolId}`;
  if (phase === 'error') {
    console.error(prefix, formatPayload(payload));
    return;
  }
  console.log(prefix, formatPayload(payload));
}

export function withToolLogging<T extends ToolMap>(tools: T, agentName: string): T {
  const wrappedEntries = Object.entries(tools).map(([key, tool]) => {
    if (!tool || typeof tool.execute !== 'function') {
      return [key, tool];
    }

    const toolId = tool.id ?? key;
    const originalExecute = tool.execute.bind(tool);
    const wrappedTool = Object.assign(
      Object.create(Object.getPrototypeOf(tool) ?? Object.prototype),
      tool
    ) as ToolLike;

    wrappedTool.execute = async (params: unknown) => {
      const tripContext = getTripContext();
      const enrichedParams = enrichParamsWithTripContext(params, toolId, tripContext?.tripId);

      logEvent('start', agentName, toolId, extractInput(enrichedParams.paramsForLogging));
      try {
        const result = await originalExecute(enrichedParams.mutatedParams);
        logEvent('success', agentName, toolId, result);
        return result;
      } catch (error) {
        logEvent('error', agentName, toolId, error);
        throw error;
      }
    };

    return [key, wrappedTool];
  });

  return Object.fromEntries(wrappedEntries) as T;
}

const TRIP_BOUND_TOOL_IDS = new Set([
  'get-trip',
  'update-trip',
  'delete-trip',
  'add-task',
  'update-task-status',
  'regenerate-content',
]);

function enrichParamsWithTripContext(params: unknown, toolId: string, enforcedTripId?: string) {
  if (!enforcedTripId) {
    console.debug(`[tool-guard] No trip context available for tool ${toolId}`);
    return { mutatedParams: params, paramsForLogging: params };
  }

  if (toolId === 'create-trip' || toolId === 'create-trip-from-answers') {
    const error = new Error(
      `Trip creation is not allowed while operating on existing trip ${enforcedTripId}`
    );
    throw error;
  }

  if (!params || typeof params !== 'object') {
    return { mutatedParams: params, paramsForLogging: params };
  }

  const casted = params as Record<string, unknown>;
  const context = (casted.context ?? casted) as Record<string, unknown>;

  if (TRIP_BOUND_TOOL_IDS.has(toolId)) {
    const originalTripId = context.tripId;
    if (originalTripId && originalTripId !== enforcedTripId) {
      console.warn(
        `[tool-guard] Overriding tripId ${originalTripId} with enforced tripId ${enforcedTripId} for tool ${toolId}`
      );
    }
    if (!originalTripId) {
      console.debug(`[tool-guard] Injecting tripId ${enforcedTripId} for tool ${toolId}`);
    }
    context.tripId = enforcedTripId;
  }

  return { mutatedParams: params, paramsForLogging: params };
}
