import { Mastra } from "@mastra/core/mastra";
import { apiRoutes } from "./apiRegistry";

export const mastra = new Mastra({
  agents: {},
  workflows: {},
  telemetry: {
    enabled: false,
  },
  server: {
    apiRoutes,
  },
});
