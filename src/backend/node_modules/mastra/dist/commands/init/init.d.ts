import type { Editor } from './mcp-docs-server-install.js';
import type { LLMProvider } from './utils.js';
export declare const init: ({ directory, addExample, components, llmProvider, llmApiKey, configureEditorWithDocsMCP, }: {
    directory: string;
    components: string[];
    llmProvider: LLMProvider;
    addExample: boolean;
    llmApiKey?: string;
    configureEditorWithDocsMCP?: Editor;
}) => Promise<{
    success: boolean;
}>;
//# sourceMappingURL=init.d.ts.map