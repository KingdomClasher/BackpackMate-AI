
// import { Mastra } from '@mastra/core/mastra';
// import { PinoLogger } from '@mastra/loggers';
// import { LibSQLStore } from '@mastra/libsql';
// import { weatherWorkflow } from './workflows/weather-workflow';
// import { weatherAgent } from './agents/weather-agent';

// export const mastra = new Mastra({
//   workflows: { weatherWorkflow },
//   agents: { weatherAgent },
//   storage: new LibSQLStore({
//     // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
//     url: ":memory:",
//   }),
//   logger: new PinoLogger({
//     name: 'Mastra',
//     level: 'info',
//   }),
// });

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { itineraryWorkflow } from './workflows/itinerary-workflow';
import { travelAgent } from './agents/travel-agent';

export const mastra = new Mastra({
  workflows: { itineraryWorkflow },
  agents: { travelAgent },
  storage: new LibSQLStore({
    url: ':memory:', // for hackathon speed; swap to file:../mastra.db if you want persistence
  }),
  logger: new PinoLogger({ name: 'Mastra', level: 'info' }),
});
