import type { IMastraLogger } from '@mastra/core/logger';
import type { ElicitRequest, ElicitResult } from '@modelcontextprotocol/sdk/types.js';
import type { InternalMastraMCPClient } from './client.js';
interface ElicitationClientActionsConfig {
    client: InternalMastraMCPClient;
    logger: IMastraLogger;
}
export declare class ElicitationClientActions {
    private readonly client;
    private readonly logger;
    constructor({ client, logger }: ElicitationClientActionsConfig);
    /**
     * Set a handler for elicitation requests.
     * @param handler The callback function to handle the elicitation request.
     */
    onRequest(handler: (request: ElicitRequest['params']) => Promise<ElicitResult>): void;
}
export {};
//# sourceMappingURL=elicitationActions.d.ts.map