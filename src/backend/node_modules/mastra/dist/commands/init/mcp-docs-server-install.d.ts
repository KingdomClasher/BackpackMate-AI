export declare const windsurfGlobalMCPConfigPath: string;
export declare const cursorGlobalMCPConfigPath: string;
export declare const vscodeMCPConfigPath: string;
export declare const vscodeGlobalMCPConfigPath: string;
export type Editor = 'cursor' | 'cursor-global' | 'windsurf' | 'vscode';
export declare function installMastraDocsMCPServer({ editor, directory }: {
    editor?: Editor;
    directory: string;
}): Promise<void>;
export declare function globalMCPIsAlreadyInstalled(editor: Editor): Promise<boolean>;
//# sourceMappingURL=mcp-docs-server-install.d.ts.map