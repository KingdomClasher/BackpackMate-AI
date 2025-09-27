import type { Plugin } from 'rollup';
import type { RegisterOptions } from 'typescript-paths';
export type PluginOptions = Omit<RegisterOptions, 'loggerID'> & {
    localResolve?: boolean;
};
export declare function tsConfigPaths({ tsConfigPath, respectCoreModule, localResolve }?: PluginOptions): Plugin;
//# sourceMappingURL=tsconfig-paths.d.ts.map