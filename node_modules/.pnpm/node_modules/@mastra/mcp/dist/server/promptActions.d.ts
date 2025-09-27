import type { IMastraLogger } from '@mastra/core/logger';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
interface ServerPromptActionsDependencies {
    getLogger: () => IMastraLogger;
    getSdkServer: () => Server;
    clearDefinedPrompts: () => void;
}
export declare class ServerPromptActions {
    private readonly getLogger;
    private readonly getSdkServer;
    private readonly clearDefinedPrompts;
    constructor(dependencies: ServerPromptActionsDependencies);
    /**
     * Notifies the server that the overall list of available prompts has changed.
     * This will clear the internal cache of defined prompts and send a list_changed notification to clients.
     */
    notifyListChanged(): Promise<void>;
}
export {};
//# sourceMappingURL=promptActions.d.ts.map