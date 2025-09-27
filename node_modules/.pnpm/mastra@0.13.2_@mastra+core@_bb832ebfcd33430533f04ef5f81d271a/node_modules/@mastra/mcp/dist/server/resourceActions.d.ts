import type { IMastraLogger } from '@mastra/core/logger';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
interface ServerResourceActionsDependencies {
    getSubscriptions: () => Set<string>;
    getLogger: () => IMastraLogger;
    getSdkServer: () => Server;
    clearDefinedResources: () => void;
    clearDefinedResourceTemplates: () => void;
}
export declare class ServerResourceActions {
    private readonly getSubscriptions;
    private readonly getLogger;
    private readonly getSdkServer;
    private readonly clearDefinedResources;
    private readonly clearDefinedResourceTemplates;
    constructor(dependencies: ServerResourceActionsDependencies);
    /**
     * Checks if any resources have been updated.
     * If the resource is subscribed to by clients, an update notification will be sent.
     */
    notifyUpdated({ uri }: {
        uri: string;
    }): Promise<void>;
    /**
     * Notifies the server that the overall list of available resources has changed.
     * This will clear the internal cache of defined resources and send a list_changed notification to clients.
     */
    notifyListChanged(): Promise<void>;
}
export {};
//# sourceMappingURL=resourceActions.d.ts.map